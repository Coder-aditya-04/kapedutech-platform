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
    value: history.some(r => r.date === date) ? 1 : 0,
  }));
  const attendancePct = Math.round((weeklyData.filter(d => d.value).length / 7) * 100);
  const recent = history.slice(0, 5);
  const student = parent?.students?.[0];

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
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
          <Text variant="headlineSmall" style={styles.greeting}>Good Morning 👋</Text>
          <Text variant="bodySmall" style={styles.phone}>+91 {phone}</Text>
        </View>

        {/* Today's Status */}
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.cardTitle}>Today's Attendance</Text>
          {student ? (
            <>
              <Text variant="bodySmall" style={{ color: "#6B7280", marginBottom: 12 }}>{student.name}</Text>
              <View style={styles.punchRow}>
                <View style={styles.punchItem}>
                  <View style={[styles.statusDot, { backgroundColor: today.punchIn ? "#10B981" : "#D1D5DB" }]} />
                  <Text variant="bodySmall" style={styles.punchLabel}>Punch In</Text>
                  <Text variant="titleSmall" style={{ color: today.punchIn ? "#10B981" : "#9CA3AF", fontWeight: "700" }}>
                    {today.punchIn ?? "—"}
                  </Text>
                </View>
                <View style={styles.punchDivider} />
                <View style={styles.punchItem}>
                  <View style={[styles.statusDot, { backgroundColor: today.punchOut ? "#2563EB" : "#D1D5DB" }]} />
                  <Text variant="bodySmall" style={styles.punchLabel}>Punch Out</Text>
                  <Text variant="titleSmall" style={{ color: today.punchOut ? "#2563EB" : "#9CA3AF", fontWeight: "700" }}>
                    {today.punchOut ?? "—"}
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
            <Text variant="titleMedium" style={styles.cardTitle}>This Week</Text>
            <Chip compact style={styles.percentChip} textStyle={{ fontSize: 12 }}>
              {attendancePct}% attendance
            </Chip>
          </View>
          <View style={styles.barChart}>
            {weeklyData.map(item => (
              <View key={item.day} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, {
                    height: item.value ? "100%" : "20%",
                    backgroundColor: item.value ? "#4F46E5" : "#E5E7EB",
                  }]} />
                </View>
                <Text style={styles.barLabel}>{item.day}</Text>
              </View>
            ))}
          </View>
        </Surface>

        {/* Recent Activity */}
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.cardTitle}>Recent Activity</Text>
          {recent.length === 0 ? (
            <Text style={{ color: "#9CA3AF", fontSize: 13 }}>No attendance records yet</Text>
          ) : (
            recent.map((item, index) => (
              <View key={item.id}>
                <View style={styles.activityRow}>
                  <View>
                    <Text variant="bodyMedium" style={styles.activityDate}>
                      {new Date(item.date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </Text>
                    <Text variant="bodySmall" style={styles.activityTime}>
                      {new Date(item.markedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    </Text>
                  </View>
                  <Chip
                    compact
                    style={{ backgroundColor: item.type === "PUNCH_IN" ? "#D1FAE5" : "#DBEAFE" }}
                    textStyle={{ color: item.type === "PUNCH_IN" ? "#065F46" : "#1D4ED8", fontSize: 12 }}
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
  scroll: { padding: 16, gap: 16 },
  header: { marginBottom: 4 },
  greeting: { fontWeight: "700", color: "#111827" },
  phone: { color: "#6B7280", marginTop: 2 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16 },
  cardTitle: { fontWeight: "600", color: "#111827", marginBottom: 12 },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  percentChip: { backgroundColor: "#EEF2FF" },
  punchRow: { flexDirection: "row", alignItems: "center" },
  punchItem: { flex: 1, alignItems: "center", gap: 4 },
  punchDivider: { width: 1, height: 48, backgroundColor: "#E5E7EB" },
  punchLabel: { color: "#6B7280" },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  barChart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 80, gap: 4 },
  barColumn: { flex: 1, alignItems: "center", gap: 4 },
  barTrack: { flex: 1, width: "100%", justifyContent: "flex-end", borderRadius: 4, overflow: "hidden", backgroundColor: "#F3F4F6" },
  bar: { width: "100%", borderRadius: 4 },
  barLabel: { fontSize: 11, color: "#6B7280" },
  activityRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  activityDate: { fontWeight: "500", color: "#111827" },
  activityTime: { color: "#6B7280", marginTop: 2 },
  divider: { backgroundColor: "#F3F4F6" },
});
