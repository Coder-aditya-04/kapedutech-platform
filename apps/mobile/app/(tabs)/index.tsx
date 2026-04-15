import { ScrollView, StyleSheet, View, RefreshControl, ActivityIndicator, TouchableOpacity, AppState, AppStateStatus } from "react-native";
import { Text, Surface, Divider } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import { getStudentAttendance, getTodayAttendance, getAttendanceSummary, type AttendanceRecord, type TodayAttendance, type AttendanceSummary } from "@/src/api/auth";

type Student = { id: string; name: string; enrollmentNo: string; batch: string };
type Parent = { id: string; name: string; phone: string; students: Student[] };

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEK_LABELS = ["S","M","T","W","T","F","S"];

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}
function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function formatDateFull() {
  return new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function getMonthGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Pure-RN circular progress ring (no SVG dependency)
function CircularProgress({ pct, size = 180, color = "#4F46E5", children }: {
  pct: number; size?: number; color?: string; children?: React.ReactNode;
}) {
  const sw = 16; // stroke width
  const half = size / 2;
  const angle = Math.max(0, Math.min(100, pct)) / 100 * 360;
  // Left arc: rotates from -180° (hidden) to 0° (50% full)
  const leftDeg = Math.min(angle, 180) - 180;
  // Right arc: rotates from -180° (hidden) to 0° (100% full), only shown when >50%
  const rightDeg = Math.max(0, angle - 180) - 180;

  return (
    <View style={{ width: size, height: size }}>
      {/* Track */}
      <View style={{ position: "absolute", width: size, height: size, borderRadius: half, borderWidth: sw, borderColor: "#E8EAF6" }} />

      {/* Left half arc */}
      {angle > 0 && (
        <View style={{ position: "absolute", width: half, height: size, left: 0, overflow: "hidden" }}>
          <View style={{
            position: "absolute", left: 0, width: size, height: size,
            borderRadius: half, borderWidth: sw, borderColor: color,
            transform: [{ rotate: `${leftDeg}deg` }],
          }} />
        </View>
      )}

      {/* Right half arc (only when >50%) */}
      {angle > 180 && (
        <View style={{ position: "absolute", width: half, height: size, left: half, overflow: "hidden" }}>
          <View style={{
            position: "absolute", right: 0, width: size, height: size,
            borderRadius: half, borderWidth: sw, borderColor: color,
            transform: [{ rotate: `${rightDeg}deg` }],
          }} />
        </View>
      )}

      {/* White donut hole */}
      <View style={{
        position: "absolute", top: sw, left: sw,
        width: size - sw * 2, height: size - sw * 2,
        borderRadius: (size - sw * 2) / 2,
        backgroundColor: "#fff",
        alignItems: "center", justifyContent: "center",
      }}>
        {children}
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { phone } = useAuth();
  const [parent, setParent] = useState<Parent | null>(null);
  const [today, setToday] = useState<TodayAttendance>({ punchIn: null, punchOut: null });
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({ totalPresent: 0, totalWorkingDays: 0, currentStreak: 0, allTimePct: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const [calMonth, setCalMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0); // 0=current week, -1=prev, etc.

  const load = useCallback(async () => {
    try {
      const [raw, token] = await Promise.all([
        AsyncStorage.getItem("parent"),
        AsyncStorage.getItem("auth_token"),
      ]);
      if (!raw || !token) return;
      const p: Parent = JSON.parse(raw);
      setParent(p);
      const student = p.students?.[0];
      if (!student) return;
      const [todayData, hist, summ] = await Promise.all([
        getTodayAttendance(student.id, token),
        getStudentAttendance(student.id, token),
        getAttendanceSummary(student.id, token),
      ]);
      setToday(todayData);
      setHistory(hist);
      setSummary(summ);
    } catch (e) {
      console.log("[Dashboard] load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]));

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") load();
    });
    return () => sub.remove();
  }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const attendanceMap = useMemo(() => {
    const map: Record<string, { punchIn: string | null; punchOut: string | null }> = {};
    history.forEach(r => {
      if (!map[r.date]) map[r.date] = { punchIn: null, punchOut: null };
      if (r.type === "PUNCH_IN") map[r.date].punchIn = r.markedAt;
      if (r.type === "PUNCH_OUT") map[r.date].punchOut = r.markedAt;
    });
    if (today.punchIn || today.punchOut) map[todayStr] = { punchIn: today.punchIn, punchOut: today.punchOut };
    return map;
  }, [history, today, todayStr]);

  // Week navigation
  function getWeekDays(offset: number) {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      const startOfWeek = d.getDate() - d.getDay() + (offset * 7);
      d.setDate(startOfWeek + i);
      return d.toISOString().slice(0, 10);
    });
  }
  const weekDays = getWeekDays(weekOffset);
  const weekLabel = (() => {
    const s = new Date(weekDays[0] + "T00:00:00");
    const e = new Date(weekDays[6] + "T00:00:00");
    const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    return `${fmt(s)} – ${fmt(e)}`;
  })();

  const monthGrid = getMonthGrid(calMonth.year, calMonth.month);
  const isCurrentMonth = calMonth.year === now.getFullYear() && calMonth.month === now.getMonth();

  function goToPrevMonth() {
    setCalMonth(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 });
    setSelectedDate(null);
  }
  function goToNextMonth() {
    if (isCurrentMonth) return;
    setCalMonth(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 });
    setSelectedDate(null);
  }

  const selectedAttendance = selectedDate ? (attendanceMap[selectedDate] ?? null) : null;
  const student = parent?.students?.[0];

  const pctColor = summary.allTimePct >= 75 ? "#4F46E5" : summary.allTimePct >= 50 ? "#D97706" : "#DC2626";
  const todayStatusColor = today.punchIn && today.punchOut ? "#15803D" : today.punchIn ? "#92400E" : "#6B7280";
  const todayStatusBg = today.punchIn && today.punchOut ? "#DCFCE7" : today.punchIn ? "#FEF9C3" : "#F3F4F6";
  const todayStatusLabel = today.punchIn && today.punchOut ? "Complete" : today.punchIn ? "In Session" : "Not Marked";

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ color: "#6B7280", marginTop: 12, fontSize: 14 }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4F46E5"]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.studentNameHeader}>{student?.name ?? `+91 ${phone}`}</Text>
            </View>
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>{new Date().getDate()}</Text>
              <Text style={styles.dateBadgeMonth}>{new Date().toLocaleDateString("en-IN", { month: "short" })}</Text>
            </View>
          </View>
          <Text style={styles.dateText}>{formatDateFull()}</Text>
        </View>

        {/* ── Circular attendance chart (PW-style) ── */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.circularSection}>
            <CircularProgress pct={summary.allTimePct} size={180} color={pctColor}>
              <Text style={[styles.pctBig, { color: pctColor }]}>{summary.allTimePct}%</Text>
              <Text style={styles.pctLabel}>attendance</Text>
            </CircularProgress>

            {/* Streak badge */}
            {summary.currentStreak > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>🔥 {summary.currentStreak} day streak</Text>
              </View>
            )}
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{summary.totalWorkingDays}</Text>
              <Text style={styles.statLabel}>Total Study Days</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: "#4F46E5" }]}>{summary.totalPresent}</Text>
              <Text style={styles.statLabel}>Present Days</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: "#DC2626" }]}>{summary.totalWorkingDays - summary.totalPresent}</Text>
              <Text style={styles.statLabel}>Absent Days</Text>
            </View>
          </View>
        </Surface>

        {/* ── Today's Attendance ── */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Today&apos;s Attendance</Text>
            <View style={[styles.statusBadge, { backgroundColor: todayStatusBg }]}>
              <Text style={[styles.statusBadgeText, { color: todayStatusColor }]}>{todayStatusLabel}</Text>
            </View>
          </View>
          {student ? (
            <View style={styles.punchRow}>
              <View style={styles.punchItem}>
                <View style={[styles.punchIconWrap, { backgroundColor: today.punchIn ? "#DCFCE7" : "#F3F4F6" }]}>
                  <Ionicons name={today.punchIn ? "checkmark-circle" : "time-outline"} size={22} color={today.punchIn ? "#16A34A" : "#9CA3AF"} />
                </View>
                <Text style={styles.punchLabel}>Punch In</Text>
                <Text style={[styles.punchTime, { color: today.punchIn ? "#16A34A" : "#9CA3AF" }]}>{formatTime(today.punchIn)}</Text>
              </View>
              <View style={styles.punchDivider} />
              <View style={styles.punchItem}>
                <View style={[styles.punchIconWrap, { backgroundColor: today.punchOut ? "#DBEAFE" : "#F3F4F6" }]}>
                  <Ionicons name={today.punchOut ? "log-out-outline" : "ellipsis-horizontal-circle-outline"} size={22} color={today.punchOut ? "#2563EB" : "#9CA3AF"} />
                </View>
                <Text style={styles.punchLabel}>Punch Out</Text>
                <Text style={[styles.punchTime, { color: today.punchOut ? "#2563EB" : "#9CA3AF" }]}>{formatTime(today.punchOut)}</Text>
              </View>
            </View>
          ) : (
            <Text style={{ color: "#9CA3AF", fontSize: 13 }}>No students linked to your account</Text>
          )}
        </Surface>

        {/* ── Weekly Report (navigable) ── */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Weekly Report</Text>
          </View>
          <View style={styles.weekNav}>
            <TouchableOpacity onPress={() => setWeekOffset(o => o - 1)} style={styles.weekNavBtn}>
              <Ionicons name="chevron-back" size={16} color="#4F46E5" />
            </TouchableOpacity>
            <Text style={styles.weekNavLabel}>{weekLabel}</Text>
            <TouchableOpacity
              onPress={() => setWeekOffset(o => Math.min(0, o + 1))}
              style={styles.weekNavBtn}
              disabled={weekOffset >= 0}
            >
              <Ionicons name="chevron-forward" size={16} color={weekOffset >= 0 ? "#D1D5DB" : "#4F46E5"} />
            </TouchableOpacity>
          </View>

          {/* Day circles */}
          <View style={styles.weekRow}>
            {weekDays.map((date) => {
              const isPresent = !!attendanceMap[date];
              const isAbsent = date < todayStr && !isPresent;
              const isTodayCell = date === todayStr;
              const isFuture = date > todayStr;
              const dayName = new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 1);
              const dayNum = new Date(date + "T00:00:00").getDate();

              return (
                <View key={date} style={styles.weekDayCol}>
                  <View style={[
                    styles.weekDayCircle,
                    isPresent && !isTodayCell && styles.weekDayPresent,
                    isAbsent && styles.weekDayAbsent,
                    isTodayCell && styles.weekDayToday,
                    isFuture && styles.weekDayFuture,
                  ]}>
                    <Text style={[
                      styles.weekDayNum,
                      (isPresent && !isTodayCell) && { color: "#15803D" },
                      isAbsent && { color: "#DC2626" },
                      isTodayCell && { color: "#fff" },
                      isFuture && { color: "#D1D5DB" },
                    ]}>{dayNum}</Text>
                    {isPresent && !isTodayCell && <View style={[styles.weekDot, { backgroundColor: "#16A34A" }]} />}
                    {isAbsent && <View style={[styles.weekDot, { backgroundColor: "#EF4444" }]} />}
                  </View>
                  <Text style={[styles.weekDayLabel, isTodayCell && { color: "#4F46E5", fontWeight: "700" }]}>{dayName}</Text>
                </View>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.weekLegend}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: "#DCFCE7", borderColor: "#16A34A" }]} /><Text style={styles.legendText}>Present</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: "#FEF2F2", borderColor: "#EF4444" }]} /><Text style={styles.legendText}>Absent</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: "#4F46E5" }]} /><Text style={styles.legendText}>Today</Text></View>
          </View>
        </Surface>

        {/* ── Monthly Calendar ── */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.calHeader}>
            <Text style={styles.cardTitle}>Attendance Calendar</Text>
            <View style={styles.calNav}>
              <TouchableOpacity onPress={goToPrevMonth} style={styles.calNavBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-back" size={16} color="#4F46E5" />
              </TouchableOpacity>
              <Text style={styles.calNavTitle}>{MONTH_NAMES[calMonth.month].slice(0, 3)} {calMonth.year}</Text>
              <TouchableOpacity onPress={goToNextMonth} style={styles.calNavBtn} disabled={isCurrentMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-forward" size={16} color={isCurrentMonth ? "#D1D5DB" : "#4F46E5"} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.calWeekRow}>
            {WEEK_LABELS.map((label, i) => <Text key={i} style={styles.calWeekLabel}>{label}</Text>)}
          </View>
          <View style={styles.calGrid}>
            {monthGrid.map((day, idx) => {
              if (!day) return <View key={idx} style={styles.calCell} />;
              const dateStr2 = toDateStr(calMonth.year, calMonth.month, day);
              const isPresent = !!attendanceMap[dateStr2];
              const isTodayCell = dateStr2 === todayStr;
              const isSelected = selectedDate === dateStr2;
              const isFuture = dateStr2 > todayStr;
              const isAbsent = dateStr2 < todayStr && !isPresent;
              return (
                <TouchableOpacity key={idx} style={[styles.calCell, styles.calDay,
                  isSelected && styles.calDaySelected,
                  !isSelected && isTodayCell && styles.calDayToday,
                  !isSelected && !isTodayCell && isPresent && styles.calDayPresent,
                  !isSelected && !isTodayCell && isAbsent && styles.calDayAbsent,
                  isFuture && styles.calDayFuture,
                ]} onPress={() => { if (!isFuture) setSelectedDate(isSelected ? null : dateStr2); }} disabled={isFuture} activeOpacity={0.7}>
                  <Text style={[styles.calDayText,
                    (isSelected || isTodayCell) && { color: "#fff" },
                    !isSelected && !isTodayCell && isPresent && { color: "#15803D", fontWeight: "700" },
                    !isSelected && !isTodayCell && isAbsent && { color: "#DC2626" },
                    isFuture && { color: "#D1D5DB" },
                  ]}>{day}</Text>
                  {isPresent && !isSelected && !isTodayCell && <View style={[styles.calDot, { backgroundColor: "#16A34A" }]} />}
                  {isAbsent && !isSelected && <View style={[styles.calDot, { backgroundColor: "#EF4444" }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedDate && (
            <View style={styles.calDetail}>
              <Divider style={{ marginBottom: 14 }} />
              <Text style={styles.calDetailDate}>
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </Text>
              {selectedAttendance ? (
                <View style={styles.calDetailRow}>
                  <View style={styles.calDetailItem}>
                    <Ionicons name="log-in-outline" size={16} color="#16A34A" style={{ marginBottom: 4 }} />
                    <Text style={styles.calDetailLabel}>Punch In</Text>
                    <Text style={[styles.calDetailTime, { color: selectedAttendance.punchIn ? "#16A34A" : "#9CA3AF" }]}>{formatTime(selectedAttendance.punchIn)}</Text>
                  </View>
                  <View style={styles.calDetailDivider} />
                  <View style={styles.calDetailItem}>
                    <Ionicons name="log-out-outline" size={16} color="#2563EB" style={{ marginBottom: 4 }} />
                    <Text style={styles.calDetailLabel}>Punch Out</Text>
                    <Text style={[styles.calDetailTime, { color: selectedAttendance.punchOut ? "#2563EB" : "#9CA3AF" }]}>{formatTime(selectedAttendance.punchOut)}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.calDetailAbsent}>
                  <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                  <Text style={styles.calDetailAbsentText}>No attendance recorded</Text>
                </View>
              )}
            </View>
          )}
        </Surface>

        {/* ── Recent Activity ── */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.cardTitle}>Recent Activity</Text>
          {history.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Ionicons name="document-text-outline" size={32} color="#D1D5DB" />
              <Text style={{ color: "#9CA3AF", fontSize: 13, marginTop: 8 }}>No attendance records yet</Text>
            </View>
          ) : (
            history.slice(0, 5).map((item, index) => (
              <View key={item.id}>
                <View style={styles.activityRow}>
                  <View style={[styles.activityIcon, { backgroundColor: item.type === "PUNCH_IN" ? "#DCFCE7" : "#DBEAFE" }]}>
                    <Ionicons name={item.type === "PUNCH_IN" ? "log-in-outline" : "log-out-outline"} size={18} color={item.type === "PUNCH_IN" ? "#16A34A" : "#2563EB"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityDate}>
                      {new Date(item.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}
                    </Text>
                    <Text style={styles.activityTime}>
                      {new Date(item.markedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: item.type === "PUNCH_IN" ? "#DCFCE7" : "#DBEAFE", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: item.type === "PUNCH_IN" ? "#15803D" : "#1D4ED8", fontSize: 11, fontWeight: "700" }}>
                      {item.type === "PUNCH_IN" ? "Punch In" : "Punch Out"}
                    </Text>
                  </View>
                </View>
                {index < Math.min(history.length, 5) - 1 && <Divider style={styles.divider} />}
              </View>
            ))
          )}
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },

  header: { marginBottom: 4 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting: { fontSize: 22, fontWeight: "800", color: "#111827", letterSpacing: -0.3 },
  studentNameHeader: { color: "#6B7280", marginTop: 3, fontSize: 13 },
  dateText: { color: "#9CA3AF", fontSize: 12, marginTop: 6 },
  dateBadge: { alignItems: "center", backgroundColor: "#4F46E5", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, minWidth: 44 },
  dateBadgeText: { color: "#fff", fontSize: 20, fontWeight: "800", lineHeight: 24 },
  dateBadgeMonth: { color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "600", textTransform: "uppercase" },

  card: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18 },
  cardTitle: { fontWeight: "700", color: "#111827", fontSize: 15, marginBottom: 12 },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },

  // Circular chart
  circularSection: { alignItems: "center", paddingVertical: 8 },
  pctBig: { fontSize: 38, fontWeight: "900", lineHeight: 44 },
  pctLabel: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  streakBadge: { marginTop: 12, backgroundColor: "#FFF7ED", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1, borderColor: "#FED7AA" },
  streakText: { fontSize: 13, fontWeight: "700", color: "#C2410C" },
  statsRow: { flexDirection: "row", marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, backgroundColor: "#E5E7EB", marginVertical: 4 },
  statValue: { fontSize: 24, fontWeight: "800", color: "#111827" },
  statLabel: { fontSize: 11, color: "#9CA3AF", textAlign: "center" },

  // Today punch
  punchRow: { flexDirection: "row", alignItems: "center" },
  punchItem: { flex: 1, alignItems: "center", gap: 6 },
  punchDivider: { width: 1, height: 64, backgroundColor: "#E5E7EB" },
  punchLabel: { color: "#6B7280", fontSize: 12 },
  punchTime: { fontSize: 18, fontWeight: "800" },
  punchIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },

  // Weekly report
  weekNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  weekNavBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center" },
  weekNavLabel: { fontSize: 13, fontWeight: "600", color: "#374151" },
  weekRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  weekDayCol: { alignItems: "center", gap: 4, flex: 1 },
  weekDayCircle: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", backgroundColor: "#F3F4F6" },
  weekDayPresent: { backgroundColor: "#DCFCE7", borderWidth: 1.5, borderColor: "#16A34A" },
  weekDayAbsent: { backgroundColor: "#FEF2F2", borderWidth: 1.5, borderColor: "#EF4444" },
  weekDayToday: { backgroundColor: "#4F46E5" },
  weekDayFuture: { opacity: 0.4 },
  weekDayNum: { fontSize: 13, fontWeight: "600", color: "#374151" },
  weekDayLabel: { fontSize: 10, color: "#9CA3AF" },
  weekDot: { width: 4, height: 4, borderRadius: 2, position: "absolute", bottom: 2 },
  weekLegend: { flexDirection: "row", gap: 16, justifyContent: "center", marginTop: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  legendText: { fontSize: 11, color: "#9CA3AF" },

  // Calendar
  calHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  calNav: { flexDirection: "row", alignItems: "center", gap: 8 },
  calNavBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center" },
  calNavTitle: { fontSize: 13, fontWeight: "700", color: "#374151", minWidth: 64, textAlign: "center" },
  calWeekRow: { flexDirection: "row", marginBottom: 6 },
  calWeekLabel: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600", color: "#9CA3AF", paddingVertical: 4 },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: { width: "14.2857%", aspectRatio: 1, justifyContent: "center", alignItems: "center" },
  calDay: { borderRadius: 8 },
  calDaySelected: { backgroundColor: "#4F46E5" },
  calDayToday: { backgroundColor: "#0064E0" },
  calDayPresent: { backgroundColor: "#DCFCE7" },
  calDayAbsent: { backgroundColor: "#FEF2F2" },
  calDayFuture: { opacity: 0.35 },
  calDayText: { fontSize: 13, color: "#374151" },
  calDot: { width: 5, height: 5, borderRadius: 3, position: "absolute", bottom: 2 },
  calDetail: { marginTop: 4 },
  calDetailDate: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 12, textAlign: "center" },
  calDetailRow: { flexDirection: "row", alignItems: "center" },
  calDetailItem: { flex: 1, alignItems: "center", gap: 2 },
  calDetailDivider: { width: 1, height: 48, backgroundColor: "#E5E7EB" },
  calDetailLabel: { fontSize: 11, color: "#9CA3AF" },
  calDetailTime: { fontSize: 18, fontWeight: "800" },
  calDetailAbsent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  calDetailAbsentText: { fontSize: 13, color: "#9CA3AF" },

  emptyActivity: { alignItems: "center", paddingVertical: 20 },
  activityRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 12 },
  activityIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  activityDate: { fontWeight: "600", color: "#111827", fontSize: 13 },
  activityTime: { color: "#6B7280", marginTop: 2, fontSize: 12 },
  divider: { backgroundColor: "#F9FAFB" },
});
