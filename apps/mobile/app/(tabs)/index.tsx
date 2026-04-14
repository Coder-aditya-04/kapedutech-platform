import { ScrollView, StyleSheet, View, RefreshControl, ActivityIndicator, TouchableOpacity, AppState, AppStateStatus } from "react-native";
import { Text, Surface, Chip, Divider } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import { getStudentAttendance, getTodayAttendance, type AttendanceRecord, type TodayAttendance } from "@/src/api/auth";

type Student = { id: string; name: string; enrollmentNo: string; batch: string };
type Parent = { id: string; name: string; phone: string; students: Student[] };

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEK_LABELS = ["S","M","T","W","T","F","S"];

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
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

export default function DashboardScreen() {
  const { phone } = useAuth();
  const [parent, setParent] = useState<Parent | null>(null);
  const [today, setToday] = useState<TodayAttendance>({ punchIn: null, punchOut: null });
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const [calMonth, setCalMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
      const [todayData, hist] = await Promise.all([
        getTodayAttendance(student.id, token),
        getStudentAttendance(student.id, token),
      ]);
      setToday(todayData);
      setHistory(hist);
    } catch (e) {
      console.log("[Dashboard] load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh whenever this tab comes into focus + poll every 30s while on screen
  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(load, 30000);
      return () => clearInterval(interval);
    }, [load])
  );

  // Refresh when app returns to foreground from background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") load();
    });
    return () => sub.remove();
  }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  // Build attendance map from history: date -> { punchIn, punchOut }
  const attendanceMap = useMemo(() => {
    const map: Record<string, { punchIn: string | null; punchOut: string | null }> = {};
    history.forEach(r => {
      if (!map[r.date]) map[r.date] = { punchIn: null, punchOut: null };
      if (r.type === "PUNCH_IN") map[r.date].punchIn = r.markedAt;
      if (r.type === "PUNCH_OUT") map[r.date].punchOut = r.markedAt;
    });
    // Also include today from the today endpoint
    if (today.punchIn || today.punchOut) {
      map[todayStr] = { punchIn: today.punchIn, punchOut: today.punchOut };
    }
    return map;
  }, [history, today, todayStr]);

  const last7 = getLast7Days();
  const weeklyData = last7.map(date => ({
    day: new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" }),
    date,
    value: history.some(r => r.date === date) ? 1 : 0,
    isToday: date === todayStr,
  }));
  const attendancePct = Math.round((weeklyData.filter(d => d.value).length / 7) * 100);
  const recent = history.slice(0, 5);
  const student = parent?.students?.[0];

  const monthGrid = getMonthGrid(calMonth.year, calMonth.month);
  const isCurrentMonth = calMonth.year === now.getFullYear() && calMonth.month === now.getMonth();

  function goToPrevMonth() {
    setCalMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
    setSelectedDate(null);
  }

  function goToNextMonth() {
    if (isCurrentMonth) return;
    setCalMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
    setSelectedDate(null);
  }

  const selectedAttendance = selectedDate ? (attendanceMap[selectedDate] ?? null) : null;

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
              <Text style={styles.phone}>+91 {phone}</Text>
            </View>
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>{new Date().getDate()}</Text>
              <Text style={styles.dateBadgeMonth}>{new Date().toLocaleDateString("en-IN", { month: "short" })}</Text>
            </View>
          </View>
          <Text style={styles.dateText}>{formatDateFull()}</Text>
        </View>

        {/* Today's Status */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Today&apos;s Attendance</Text>
            <View style={[styles.statusBadge, {
              backgroundColor: today.punchIn && today.punchOut ? "#DCFCE7" : today.punchIn ? "#FEF9C3" : "#F3F4F6"
            }]}>
              <Text style={[styles.statusBadgeText, {
                color: today.punchIn && today.punchOut ? "#15803D" : today.punchIn ? "#92400E" : "#6B7280"
              }]}>
                {today.punchIn && today.punchOut ? "Complete" : today.punchIn ? "In Session" : "Not Marked"}
              </Text>
            </View>
          </View>

          {student ? (
            <>
              <Text style={styles.studentName}>{student.name}</Text>
              <View style={styles.punchRow}>
                <View style={styles.punchItem}>
                  <View style={[styles.punchIconWrap, { backgroundColor: today.punchIn ? "#DCFCE7" : "#F3F4F6" }]}>
                    <Ionicons
                      name={today.punchIn ? "checkmark-circle" : "time-outline"}
                      size={22}
                      color={today.punchIn ? "#16A34A" : "#9CA3AF"}
                    />
                  </View>
                  <Text style={styles.punchLabel}>Punch In</Text>
                  <Text style={[styles.punchTime, { color: today.punchIn ? "#16A34A" : "#9CA3AF" }]}>
                    {formatTime(today.punchIn)}
                  </Text>
                </View>
                <View style={styles.punchDivider} />
                <View style={styles.punchItem}>
                  <View style={[styles.punchIconWrap, { backgroundColor: today.punchOut ? "#DBEAFE" : "#F3F4F6" }]}>
                    <Ionicons
                      name={today.punchOut ? "log-out-outline" : "ellipsis-horizontal-circle-outline"}
                      size={22}
                      color={today.punchOut ? "#2563EB" : "#9CA3AF"}
                    />
                  </View>
                  <Text style={styles.punchLabel}>Punch Out</Text>
                  <Text style={[styles.punchTime, { color: today.punchOut ? "#2563EB" : "#9CA3AF" }]}>
                    {formatTime(today.punchOut)}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={{ color: "#9CA3AF", fontSize: 13 }}>No students linked to your account</Text>
          )}
        </Surface>

        {/* Attendance Calendar */}
        <Surface style={styles.card} elevation={1}>
          {/* Calendar header */}
          <View style={styles.calHeader}>
            <Text style={styles.cardTitle}>Attendance Calendar</Text>
            <View style={styles.calNav}>
              <TouchableOpacity onPress={goToPrevMonth} style={styles.calNavBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-back" size={16} color="#4F46E5" />
              </TouchableOpacity>
              <Text style={styles.calNavTitle}>
                {MONTH_NAMES[calMonth.month].slice(0, 3)} {calMonth.year}
              </Text>
              <TouchableOpacity
                onPress={goToNextMonth}
                style={styles.calNavBtn}
                disabled={isCurrentMonth}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-forward" size={16} color={isCurrentMonth ? "#D1D5DB" : "#4F46E5"} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Weekday labels */}
          <View style={styles.calWeekRow}>
            {WEEK_LABELS.map((label, i) => (
              <Text key={i} style={styles.calWeekLabel}>{label}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.calGrid}>
            {monthGrid.map((day, idx) => {
              if (!day) {
                return <View key={idx} style={styles.calCell} />;
              }
              const dateStr = toDateStr(calMonth.year, calMonth.month, day);
              const isPresent = !!attendanceMap[dateStr];
              const isTodayCell = dateStr === todayStr;
              const isSelected = selectedDate === dateStr;
              const isFuture = dateStr > todayStr;
              const isAbsent = dateStr < todayStr && !isPresent;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.calCell,
                    styles.calDay,
                    isSelected && styles.calDaySelected,
                    !isSelected && isTodayCell && styles.calDayToday,
                    !isSelected && !isTodayCell && isPresent && styles.calDayPresent,
                    !isSelected && !isTodayCell && isAbsent && styles.calDayAbsent,
                    isFuture && styles.calDayFuture,
                  ]}
                  onPress={() => {
                    if (!isFuture) setSelectedDate(isSelected ? null : dateStr);
                  }}
                  disabled={isFuture}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.calDayText,
                    (isSelected || isTodayCell) && { color: "#fff" },
                    !isSelected && !isTodayCell && isPresent && { color: "#15803D", fontWeight: "700" },
                    !isSelected && !isTodayCell && isAbsent && { color: "#DC2626" },
                    isFuture && { color: "#D1D5DB" },
                  ]}>
                    {day}
                  </Text>
                  {isPresent && !isSelected && !isTodayCell && (
                    <View style={[styles.calDot, { backgroundColor: "#16A34A" }]} />
                  )}
                  {isAbsent && !isSelected && (
                    <View style={[styles.calDot, { backgroundColor: "#EF4444" }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.calLegend}>
            <View style={styles.calLegendItem}>
              <View style={[styles.calLegendDot, { backgroundColor: "#DCFCE7", borderWidth: 1.5, borderColor: "#16A34A" }]} />
              <Text style={styles.calLegendText}>Present</Text>
            </View>
            <View style={styles.calLegendItem}>
              <View style={[styles.calLegendDot, { backgroundColor: "#FEF2F2", borderWidth: 1.5, borderColor: "#EF4444" }]} />
              <Text style={styles.calLegendText}>Absent</Text>
            </View>
            <View style={styles.calLegendItem}>
              <View style={[styles.calLegendDot, { backgroundColor: "#0064E0" }]} />
              <Text style={styles.calLegendText}>Today</Text>
            </View>
          </View>

          {/* Selected date detail */}
          {selectedDate && (
            <View style={styles.calDetail}>
              <Divider style={{ marginBottom: 14 }} />
              <Text style={styles.calDetailDate}>
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric"
                })}
              </Text>
              {selectedAttendance ? (
                <View style={styles.calDetailRow}>
                  <View style={styles.calDetailItem}>
                    <Ionicons name="log-in-outline" size={16} color="#16A34A" style={{ marginBottom: 4 }} />
                    <Text style={styles.calDetailLabel}>Punch In</Text>
                    <Text style={[styles.calDetailTime, { color: selectedAttendance.punchIn ? "#16A34A" : "#9CA3AF" }]}>
                      {formatTime(selectedAttendance.punchIn)}
                    </Text>
                  </View>
                  <View style={styles.calDetailDivider} />
                  <View style={styles.calDetailItem}>
                    <Ionicons name="log-out-outline" size={16} color="#2563EB" style={{ marginBottom: 4 }} />
                    <Text style={styles.calDetailLabel}>Punch Out</Text>
                    <Text style={[styles.calDetailTime, { color: selectedAttendance.punchOut ? "#2563EB" : "#9CA3AF" }]}>
                      {formatTime(selectedAttendance.punchOut)}
                    </Text>
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

        {/* Weekly Chart */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>This Week</Text>
            <Chip compact style={[styles.percentChip, { backgroundColor: attendancePct >= 75 ? "#DCFCE7" : attendancePct >= 50 ? "#FEF9C3" : "#FEE2E2" }]}
              textStyle={{ fontSize: 12, fontWeight: "700", color: attendancePct >= 75 ? "#15803D" : attendancePct >= 50 ? "#92400E" : "#B91C1C" }}>
              {attendancePct}% attendance
            </Chip>
          </View>
          <View style={styles.barChart}>
            {weeklyData.map(item => (
              <View key={item.day} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, {
                    height: item.value ? "100%" : "15%",
                    backgroundColor: item.value ? (item.isToday ? "#4F46E5" : "#818CF8") : "#E5E7EB",
                  }]} />
                </View>
                <Text style={[styles.barLabel, item.isToday && { color: "#4F46E5", fontWeight: "700" }]}>{item.day}</Text>
                {item.isToday && <View style={styles.todayDot} />}
              </View>
            ))}
          </View>
        </Surface>

        {/* Recent Activity */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.cardTitle}>Recent Activity</Text>
          {recent.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Ionicons name="document-text-outline" size={32} color="#D1D5DB" />
              <Text style={{ color: "#9CA3AF", fontSize: 13, marginTop: 8 }}>No attendance records yet</Text>
            </View>
          ) : (
            recent.map((item, index) => (
              <View key={item.id}>
                <View style={styles.activityRow}>
                  <View style={[styles.activityIcon, {
                    backgroundColor: item.type === "PUNCH_IN" ? "#DCFCE7" : "#DBEAFE"
                  }]}>
                    <Ionicons
                      name={item.type === "PUNCH_IN" ? "log-in-outline" : "log-out-outline"}
                      size={18}
                      color={item.type === "PUNCH_IN" ? "#16A34A" : "#2563EB"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityDate}>
                      {new Date(item.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}
                    </Text>
                    <Text style={styles.activityTime}>
                      {new Date(item.markedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    </Text>
                  </View>
                  <Chip
                    compact
                    style={{ backgroundColor: item.type === "PUNCH_IN" ? "#DCFCE7" : "#DBEAFE" }}
                    textStyle={{ color: item.type === "PUNCH_IN" ? "#15803D" : "#1D4ED8", fontSize: 12, fontWeight: "700" }}
                  >
                    {item.type === "PUNCH_IN" ? "Punch In" : "Punch Out"}
                  </Chip>
                </View>
                {index < recent.length - 1 && <Divider style={styles.divider} />}
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
  greeting: { fontSize: 24, fontWeight: "800", color: "#111827", letterSpacing: -0.3 },
  phone: { color: "#6B7280", marginTop: 3, fontSize: 13 },
  dateText: { color: "#9CA3AF", fontSize: 12, marginTop: 6 },
  dateBadge: { alignItems: "center", backgroundColor: "#4F46E5", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, minWidth: 44 },
  dateBadgeText: { color: "#fff", fontSize: 20, fontWeight: "800", lineHeight: 24 },
  dateBadgeMonth: { color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "600", textTransform: "uppercase" },

  card: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18 },
  cardTitle: { fontWeight: "700", color: "#111827", fontSize: 15, marginBottom: 12 },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },

  studentName: { color: "#6B7280", fontSize: 13, marginBottom: 16, marginTop: -4 },
  punchRow: { flexDirection: "row", alignItems: "center" },
  punchItem: { flex: 1, alignItems: "center", gap: 6 },
  punchDivider: { width: 1, height: 64, backgroundColor: "#E5E7EB" },
  punchLabel: { color: "#6B7280", fontSize: 12 },
  punchTime: { fontSize: 18, fontWeight: "800" },
  punchIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },

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

  calLegend: { flexDirection: "row", gap: 16, marginTop: 12, justifyContent: "center" },
  calLegendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  calLegendDot: { width: 10, height: 10, borderRadius: 5 },
  calLegendText: { fontSize: 11, color: "#9CA3AF" },

  calDetail: { marginTop: 4 },
  calDetailDate: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 12, textAlign: "center" },
  calDetailRow: { flexDirection: "row", alignItems: "center" },
  calDetailItem: { flex: 1, alignItems: "center", gap: 2 },
  calDetailDivider: { width: 1, height: 48, backgroundColor: "#E5E7EB" },
  calDetailLabel: { fontSize: 11, color: "#9CA3AF" },
  calDetailTime: { fontSize: 18, fontWeight: "800" },
  calDetailAbsent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  calDetailAbsentText: { fontSize: 13, color: "#9CA3AF" },

  percentChip: { borderRadius: 20 },
  barChart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 80, gap: 4, marginTop: 4 },
  barColumn: { flex: 1, alignItems: "center", gap: 4 },
  barTrack: { flex: 1, width: "100%", justifyContent: "flex-end", borderRadius: 6, overflow: "hidden", backgroundColor: "#F3F4F6" },
  bar: { width: "100%", borderRadius: 6 },
  barLabel: { fontSize: 10, color: "#9CA3AF" },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#4F46E5" },

  emptyActivity: { alignItems: "center", paddingVertical: 20 },
  activityRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 12 },
  activityIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  activityDate: { fontWeight: "600", color: "#111827", fontSize: 13 },
  activityTime: { color: "#6B7280", marginTop: 2, fontSize: 12 },
  divider: { backgroundColor: "#F9FAFB" },
});
