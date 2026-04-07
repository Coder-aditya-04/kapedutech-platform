import { ScrollView, StyleSheet, View } from "react-native";
import { Text, Surface, Chip, Divider } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/context/AuthContext";

// Placeholder data — replace with API calls
const ATTENDANCE_TODAY = true;
const PUNCH_INS = [
  { date: "04 Apr 2026", time: "08:45 AM", status: "Present" },
  { date: "03 Apr 2026", time: "08:52 AM", status: "Present" },
  { date: "02 Apr 2026", time: "09:10 AM", status: "Late" },
  { date: "01 Apr 2026", time: "08:40 AM", status: "Present" },
];
const WEEKLY_DATA = [
  { day: "Mon", value: 1 },
  { day: "Tue", value: 1 },
  { day: "Wed", value: 0 },
  { day: "Thu", value: 1 },
  { day: "Fri", value: 1 },
  { day: "Sat", value: 1 },
  { day: "Sun", value: 0 },
];
const ATTENDANCE_PERCENT = Math.round(
  (WEEKLY_DATA.filter((d) => d.value).length / WEEKLY_DATA.length) * 100
);

export default function DashboardScreen() {
  const { phone } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.greeting}>
            Good Morning 👋
          </Text>
          <Text variant="bodySmall" style={styles.phone}>
            +91 {phone}
          </Text>
        </View>

        {/* Today's Status */}
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Today's Attendance
          </Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: ATTENDANCE_TODAY ? "#10B981" : "#EF4444" },
              ]}
            />
            <Text
              variant="headlineSmall"
              style={{ color: ATTENDANCE_TODAY ? "#10B981" : "#EF4444", fontWeight: "700" }}
            >
              {ATTENDANCE_TODAY ? "Present" : "Absent"}
            </Text>
          </View>
          <Text variant="bodySmall" style={styles.subText}>
            {ATTENDANCE_TODAY
              ? "Rahul checked in at 08:45 AM"
              : "No check-in recorded today"}
          </Text>
        </Surface>

        {/* Performance Graph */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.cardTitleRow}>
            <Text variant="titleMedium" style={styles.cardTitle}>
              This Week
            </Text>
            <Chip compact style={styles.percentChip} textStyle={{ fontSize: 12 }}>
              {ATTENDANCE_PERCENT}% attendance
            </Chip>
          </View>
          <View style={styles.barChart}>
            {WEEKLY_DATA.map((item) => (
              <View key={item.day} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: item.value ? "100%" : "20%",
                        backgroundColor: item.value ? "#4F46E5" : "#E5E7EB",
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{item.day}</Text>
              </View>
            ))}
          </View>
        </Surface>

        {/* Recent Punch-ins */}
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Recent Punch-ins
          </Text>
          {PUNCH_INS.map((item, index) => (
            <View key={index}>
              <View style={styles.punchRow}>
                <View>
                  <Text variant="bodyMedium" style={styles.punchDate}>
                    {item.date}
                  </Text>
                  <Text variant="bodySmall" style={styles.punchTime}>
                    {item.time}
                  </Text>
                </View>
                <Chip
                  compact
                  style={{
                    backgroundColor: item.status === "Present" ? "#D1FAE5" : "#FEF3C7",
                  }}
                  textStyle={{
                    color: item.status === "Present" ? "#065F46" : "#92400E",
                    fontSize: 12,
                  }}
                >
                  {item.status}
                </Chip>
              </View>
              {index < PUNCH_INS.length - 1 && <Divider style={styles.divider} />}
            </View>
          ))}
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
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  percentChip: { backgroundColor: "#EEF2FF" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  subText: { color: "#6B7280" },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 80,
    gap: 4,
  },
  barColumn: { flex: 1, alignItems: "center", gap: 4 },
  barTrack: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  bar: { width: "100%", borderRadius: 4 },
  barLabel: { fontSize: 11, color: "#6B7280" },
  punchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  punchDate: { fontWeight: "500", color: "#111827" },
  punchTime: { color: "#6B7280", marginTop: 2 },
  divider: { backgroundColor: "#F3F4F6" },
});
