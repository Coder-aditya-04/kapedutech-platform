import { ScrollView, StyleSheet, View, RefreshControl, ActivityIndicator, TouchableOpacity, AppState, AppStateStatus } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useFocusEffect, router } from "expo-router";
import {
  getStudentAttendance, getTodayAttendance, getAttendanceSummary,
  type AttendanceRecord, type TodayAttendance, type AttendanceSummary,
} from "@/src/api/auth";

type Student = { id: string; name: string; enrollmentNo: string; batch: string };
type Parent = { id: string; name: string; phone: string; students: Student[] };

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
function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

// Pure-RN circular progress ring — no SVG needed
function CircularProgress({ pct, size = 160, stroke = 14, color = "#4F46E5", children }: {
  pct: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode;
}) {
  const half = size / 2;
  const angle = Math.max(0, Math.min(100, pct)) / 100 * 360;
  const leftDeg = Math.min(angle, 180) - 180;
  const rightDeg = Math.max(0, angle - 180) - 180;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: "absolute", width: size, height: size, borderRadius: half, borderWidth: stroke, borderColor: "#EEF2FF" }} />
      {angle > 0 && (
        <View style={{ position: "absolute", width: half, height: size, left: 0, overflow: "hidden" }}>
          <View style={{ position: "absolute", left: 0, width: size, height: size, borderRadius: half, borderWidth: stroke, borderColor: color, transform: [{ rotate: `${leftDeg}deg` }] }} />
        </View>
      )}
      {angle > 180 && (
        <View style={{ position: "absolute", width: half, height: size, left: half, overflow: "hidden" }}>
          <View style={{ position: "absolute", right: 0, width: size, height: size, borderRadius: half, borderWidth: stroke, borderColor: color, transform: [{ rotate: `${rightDeg}deg` }] }} />
        </View>
      )}
      <View style={{ position: "absolute", top: stroke, left: stroke, width: size - stroke * 2, height: size - stroke * 2, borderRadius: (size - stroke * 2) / 2, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
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
  const [weekOffset, setWeekOffset] = useState(0);

  const todayStr = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    try {
      const [raw, token] = await Promise.all([AsyncStorage.getItem("parent"), AsyncStorage.getItem("auth_token")]);
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

  const student = parent?.students?.[0];
  // Ring is always indigo — looks premium regardless of %. Text inside shows status.
  const ringColor = "#4F46E5";
  const pctTextColor = summary.allTimePct >= 75 ? "#059669" : summary.allTimePct >= 50 ? "#D97706" : "#EF4444";
  const todayStatus = today.punchIn && today.punchOut ? "complete" : today.punchIn ? "partial" : "none";

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1A1C2E", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#818CF8" />
        <Text style={{ color: "rgba(255,255,255,0.5)", marginTop: 14, fontSize: 14 }}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#1A1C2E" }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1, backgroundColor: "#F0F2F8" }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
      >
        {/* ─── Header (dark) ─── */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.studentName} numberOfLines={1}>{student?.name ?? `+91 ${phone}`}</Text>
              {student?.batch ? (
                <View style={styles.batchTag}>
                  <Text style={styles.batchTagText}>{student.batch}</Text>
                </View>
              ) : null}
            </View>
            {student ? (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(student.name)}</Text>
              </View>
            ) : null}
          </View>
          {/* Curved bottom edge that blends into content */}
          <View style={styles.headerCurve} />
        </View>

        {/* ─── Cards ─── */}
        <View style={styles.content}>

          {/* ── Attendance Overview ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Attendance Overview</Text>
              {summary.currentStreak > 0 && (
                <View style={styles.streakChip}>
                  <Text style={styles.streakText}>🔥 {summary.currentStreak} day streak</Text>
                </View>
              )}
            </View>
            <View style={styles.ringWrap}>
              <CircularProgress pct={summary.allTimePct} size={164} stroke={15} color={ringColor}>
                <Text style={[styles.pctBig, { color: pctTextColor }]}>{summary.allTimePct}%</Text>
                <Text style={styles.pctSub}>attendance</Text>
              </CircularProgress>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{summary.totalWorkingDays}</Text>
                <Text style={styles.statLbl}>Working{"\n"}Days</Text>
              </View>
              <View style={styles.statDiv} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: "#059669" }]}>{summary.totalPresent}</Text>
                <Text style={styles.statLbl}>Present{"\n"}Days</Text>
              </View>
              <View style={styles.statDiv} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: "#EF4444" }]}>{Math.max(0, summary.totalWorkingDays - summary.totalPresent)}</Text>
                <Text style={styles.statLbl}>Absent{"\n"}Days</Text>
              </View>
            </View>
          </View>

          {/* ── Today's Attendance ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Today&apos;s Attendance</Text>
              <View style={[styles.statusPill, {
                backgroundColor: todayStatus === "complete" ? "#DCFCE7" : todayStatus === "partial" ? "#FEF3C7" : "#F1F5F9",
              }]}>
                <View style={[styles.statusDot, {
                  backgroundColor: todayStatus === "complete" ? "#16A34A" : todayStatus === "partial" ? "#D97706" : "#94A3B8",
                }]} />
                <Text style={[styles.statusText, {
                  color: todayStatus === "complete" ? "#15803D" : todayStatus === "partial" ? "#92400E" : "#64748B",
                }]}>
                  {todayStatus === "complete" ? "Complete" : todayStatus === "partial" ? "In Session" : "Not Marked"}
                </Text>
              </View>
            </View>
            {student ? (
              <View style={styles.punchRow}>
                <View style={styles.punchBox}>
                  <View style={[styles.punchIconWrap, { backgroundColor: today.punchIn ? "#DCFCE7" : "#F1F5F9" }]}>
                    <Ionicons name={today.punchIn ? "arrow-up-circle" : "time-outline"} size={26} color={today.punchIn ? "#16A34A" : "#94A3B8"} />
                  </View>
                  <Text style={styles.punchLbl}>Punch In</Text>
                  <Text style={[styles.punchTime, { color: today.punchIn ? "#059669" : "#94A3B8" }]}>{formatTime(today.punchIn)}</Text>
                </View>
                <View style={styles.punchSep} />
                <View style={styles.punchBox}>
                  <View style={[styles.punchIconWrap, { backgroundColor: today.punchOut ? "#DBEAFE" : "#F1F5F9" }]}>
                    <Ionicons name={today.punchOut ? "arrow-down-circle" : "ellipsis-horizontal-circle-outline"} size={26} color={today.punchOut ? "#2563EB" : "#94A3B8"} />
                  </View>
                  <Text style={styles.punchLbl}>Punch Out</Text>
                  <Text style={[styles.punchTime, { color: today.punchOut ? "#2563EB" : "#94A3B8" }]}>{formatTime(today.punchOut)}</Text>
                </View>
              </View>
            ) : (
              <Text style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", paddingVertical: 12 }}>No students linked to your account</Text>
            )}
          </View>

          {/* ── Weekly Report ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Weekly Report</Text>
            </View>
            <View style={styles.weekNav}>
              <TouchableOpacity onPress={() => setWeekOffset(o => o - 1)} style={styles.weekNavBtn}>
                <Ionicons name="chevron-back" size={16} color="#4F46E5" />
              </TouchableOpacity>
              <Text style={styles.weekNavLabel}>{weekLabel}</Text>
              <TouchableOpacity
                onPress={() => setWeekOffset(o => Math.min(0, o + 1))}
                style={[styles.weekNavBtn, weekOffset >= 0 && styles.weekNavBtnDim]}
                disabled={weekOffset >= 0}
              >
                <Ionicons name="chevron-forward" size={16} color={weekOffset >= 0 ? "#CBD5E1" : "#4F46E5"} />
              </TouchableOpacity>
            </View>
            <View style={styles.weekRow}>
              {weekDays.map((date) => {
                const isPresent = !!attendanceMap[date];
                const isPast = date < todayStr;
                const isToday = date === todayStr;
                const isFuture = date > todayStr;
                const isAbsent = isPast && !isPresent;
                const dayName = ["Su","Mo","Tu","We","Th","Fr","Sa"][new Date(date + "T00:00:00").getDay()];
                const dayNum = new Date(date + "T00:00:00").getDate();
                return (
                  <View key={date} style={styles.weekDayCol}>
                    <Text style={[styles.weekDayName, isToday && { color: "#4F46E5", fontWeight: "700" }]}>{dayName}</Text>
                    <View style={[
                      styles.weekDayCircle,
                      isPresent && !isToday && styles.weekPresent,
                      isAbsent && styles.weekAbsent,
                      isToday && styles.weekToday,
                      isFuture && styles.weekFuture,
                    ]}>
                      {isPresent && !isToday
                        ? <Ionicons name="checkmark" size={15} color="#16A34A" />
                        : isAbsent
                        ? <Ionicons name="close" size={15} color="#EF4444" />
                        : <Text style={[styles.weekNum, isToday && { color: "#fff" }, isFuture && { color: "#CBD5E1" }]}>{dayNum}</Text>
                      }
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={styles.weekLegend}>
              <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: "#DCFCE7", borderColor: "#16A34A" }]} /><Text style={styles.legendLbl}>Present</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: "#FEE2E2", borderColor: "#EF4444" }]} /><Text style={styles.legendLbl}>Absent</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: "#4F46E5", borderColor: "#4F46E5" }]} /><Text style={styles.legendLbl}>Today</Text></View>
            </View>
          </View>

          {/* ── Calendar CTA ── */}
          <TouchableOpacity style={styles.calCTA} onPress={() => router.push("/attendance-calendar" as never)} activeOpacity={0.82}>
            <View style={styles.calCTALeft}>
              <View style={styles.calCTAIcon}>
                <MaterialCommunityIcons name="calendar-month" size={22} color="#4F46E5" />
              </View>
              <View>
                <Text style={styles.calCTATitle}>Attendance Calendar</Text>
                <Text style={styles.calCTASub}>View monthly &amp; year-wise history</Text>
              </View>
            </View>
            <View style={styles.calCTAArrow}>
              <Ionicons name="chevron-forward" size={16} color="#4F46E5" />
            </View>
          </TouchableOpacity>

          {/* ── Recent Activity ── */}
          {history.length > 0 && (
            <View style={styles.card}>
              <Text style={[styles.cardTitle, { marginBottom: 8 }]}>Recent Activity</Text>
              {history.slice(0, 6).map((item, i) => (
                <View key={item.id}>
                  {i > 0 && <View style={styles.actDivider} />}
                  <View style={styles.actRow}>
                    <View style={[styles.actIcon, { backgroundColor: item.type === "PUNCH_IN" ? "#DCFCE7" : "#DBEAFE" }]}>
                      <Ionicons name={item.type === "PUNCH_IN" ? "arrow-up" : "arrow-down"} size={14} color={item.type === "PUNCH_IN" ? "#16A34A" : "#2563EB"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.actDate}>
                        {new Date(item.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}
                      </Text>
                      <Text style={styles.actTime}>
                        {new Date(item.markedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                      </Text>
                    </View>
                    <View style={[styles.actBadge, { backgroundColor: item.type === "PUNCH_IN" ? "#DCFCE7" : "#DBEAFE" }]}>
                      <Text style={[styles.actBadgeText, { color: item.type === "PUNCH_IN" ? "#15803D" : "#1D4ED8" }]}>
                        {item.type === "PUNCH_IN" ? "In" : "Out"}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Dark header
  header: { backgroundColor: "#1A1C2E", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 0 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 20 },
  greeting: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "500", letterSpacing: 0.2 },
  studentName: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", marginTop: 3, letterSpacing: -0.3 },
  batchTag: { marginTop: 8, alignSelf: "flex-start", backgroundColor: "rgba(79,70,229,0.3)", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(129,140,248,0.4)" },
  batchTagText: { color: "#A5B4FC", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#4F46E5", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "rgba(129,140,248,0.4)" },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerCurve: { height: 28, backgroundColor: "#F0F2F8", borderTopLeftRadius: 24, borderTopRightRadius: 24 },

  // Content area
  content: { backgroundColor: "#F0F2F8", paddingHorizontal: 16, gap: 14, paddingBottom: 8 },

  // Card base
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 18, shadowColor: "#3730A3", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },

  // Streak chip
  streakChip: { backgroundColor: "#FFF7ED", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: "#FED7AA" },
  streakText: { fontSize: 11, fontWeight: "700", color: "#C2410C" },

  // Ring
  ringWrap: { alignItems: "center", paddingVertical: 8 },
  pctBig: { fontSize: 36, fontWeight: "900", lineHeight: 40 },
  pctSub: { fontSize: 11, color: "#94A3B8", marginTop: 2 },

  // Stats row
  statsRow: { flexDirection: "row", marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statDiv: { width: 1, backgroundColor: "#E2E8F0", marginVertical: 2 },
  statNum: { fontSize: 26, fontWeight: "800", color: "#0F172A" },
  statLbl: { fontSize: 11, color: "#94A3B8", textAlign: "center", lineHeight: 15 },

  // Today's card
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  punchRow: { flexDirection: "row", alignItems: "center" },
  punchBox: { flex: 1, alignItems: "center", gap: 8, paddingVertical: 8 },
  punchSep: { width: 1, height: 80, backgroundColor: "#E2E8F0" },
  punchIconWrap: { width: 54, height: 54, borderRadius: 17, justifyContent: "center", alignItems: "center" },
  punchLbl: { fontSize: 12, color: "#64748B", fontWeight: "500" },
  punchTime: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },

  // Weekly report
  weekNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  weekNavBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center" },
  weekNavBtnDim: { backgroundColor: "#F1F5F9" },
  weekNavLabel: { fontSize: 13, fontWeight: "600", color: "#374151" },
  weekRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  weekDayCol: { alignItems: "center", gap: 6, flex: 1 },
  weekDayName: { fontSize: 10, fontWeight: "600", color: "#94A3B8", letterSpacing: 0.3 },
  weekDayCircle: { width: 36, height: 36, borderRadius: 11, justifyContent: "center", alignItems: "center", backgroundColor: "#F1F5F9" },
  weekPresent: { backgroundColor: "#DCFCE7", borderWidth: 1.5, borderColor: "#16A34A" },
  weekAbsent: { backgroundColor: "#FEE2E2", borderWidth: 1.5, borderColor: "#EF4444" },
  weekToday: { backgroundColor: "#4F46E5" },
  weekFuture: { opacity: 0.35 },
  weekNum: { fontSize: 13, fontWeight: "600", color: "#374151" },
  weekLegend: { flexDirection: "row", gap: 16, justifyContent: "center", paddingTop: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendSwatch: { width: 11, height: 11, borderRadius: 3, borderWidth: 1.5 },
  legendLbl: { fontSize: 11, color: "#94A3B8" },

  // Calendar CTA
  calCTA: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", shadowColor: "#3730A3", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  calCTALeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  calCTAIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center" },
  calCTATitle: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  calCTASub: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  calCTAArrow: { width: 30, height: 30, borderRadius: 9, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center" },

  // Recent activity
  actDivider: { height: 1, backgroundColor: "#F8FAFC", marginVertical: 2 },
  actRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 12 },
  actIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: "center", alignItems: "center" },
  actDate: { fontSize: 13, fontWeight: "600", color: "#0F172A" },
  actTime: { fontSize: 12, color: "#64748B", marginTop: 1 },
  actBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  actBadgeText: { fontSize: 11, fontWeight: "700" },
});
