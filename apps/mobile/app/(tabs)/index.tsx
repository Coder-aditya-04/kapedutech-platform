import { ScrollView, StyleSheet, View, RefreshControl, ActivityIndicator } from "react-native";
import { Text, Surface, Chip, Divider } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useCallback } from "react";
import { getStudentAttendance, getTodayAttendance, type AttendanceRecord, type TodayAttendance } from "@/src/api/auth";

type Student = { id: string; name: string; enrollmentNo: string; batch: string };
type Parent = { id: string; name: string; phone: string; students: Student[] };

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

function greetingEmoji() {
  const h = new Date().getHours();
  if (h < 12) return "🌅";
  if (h < 17) return "☀️";
  return "🌙";
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDateFull() {
  return new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function DashboardScreen() {
  const { phone } = useAuth();
  const [parent, setParent] = useState<Parent | null>(null);
  const [today, setToday] = useState<TodayAttendance>({ punchIn: null, punchOut: null });
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const last7 = getLast7Days();
  const weeklyData = last7.map(date => ({
    day: new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" }),
    date,
    value: history.some(r => r.date === date) ? 1 : 0,
    isToday: date === new Date().toISOString().slice(0, 10),
  }));
  const attendancePct = Math.round((weeklyData.filter(d => d.value).length / 7) * 100);
  const recent = history.slice(0, 5);
  const student = parent?.students?.[0];

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
              <Text style={styles.greeting}>{getGreeting()} {greetingEmoji()}</Text>
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
                    <Text style={{ fontSize: 18 }}>{today.punchIn ? "✅" : "⏰"}</Text>
                  </View>
                  <Text style={styles.punchLabel}>Punch In</Text>
                  <Text style={[styles.punchTime, { color: today.punchIn ? "#16A34A" : "#9CA3AF" }]}>
                    {formatTime(today.punchIn)}
                  </Text>
                </View>
                <View style={styles.punchDivider} />
                <View style={styles.punchItem}>
                  <View style={[styles.punchIconWrap, { backgroundColor: today.punchOut ? "#DBEAFE" : "#F3F4F6" }]}>
                    <Text style={{ fontSize: 18 }}>{today.punchOut ? "🔵" : "⏳"}</Text>
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
              <Text style={{ fontSize: 32 }}>📋</Text>
              <Text style={{ color: "#9CA3AF", fontSize: 13, marginTop: 8 }}>No attendance records yet</Text>
            </View>
          ) : (
            recent.map((item, index) => (
              <View key={item.id}>
                <View style={styles.activityRow}>
                  <View style={[styles.activityIcon, {
                    backgroundColor: item.type === "PUNCH_IN" ? "#DCFCE7" : "#DBEAFE"
                  }]}>
                    <Text style={{ fontSize: 16 }}>{item.type === "PUNCH_IN" ? "✅" : "🔵"}</Text>
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
