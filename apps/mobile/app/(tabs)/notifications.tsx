import { ScrollView, StyleSheet, View } from "react-native";
import { Text, Surface, Divider } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Placeholder data — replace with API calls
const NOTIFICATIONS = [
  {
    id: "1",
    title: "Attendance Marked",
    body: "Rahul checked in at 08:45 AM today.",
    time: "Today, 8:45 AM",
    read: false,
  },
  {
    id: "2",
    title: "Attendance Marked",
    body: "Rahul checked in at 08:52 AM.",
    time: "Yesterday, 8:52 AM",
    read: true,
  },
  {
    id: "3",
    title: "Late Arrival",
    body: "Rahul arrived late at 09:10 AM.",
    time: "2 Apr 2026, 9:10 AM",
    read: true,
  },
  {
    id: "4",
    title: "Attendance Marked",
    body: "Rahul checked in at 08:40 AM.",
    time: "1 Apr 2026, 8:40 AM",
    read: true,
  },
];

export default function NotificationsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Text variant="headlineSmall" style={styles.heading}>
          Notifications
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Surface style={styles.card} elevation={1}>
          {NOTIFICATIONS.map((item, index) => (
            <View key={item.id}>
              <View style={styles.row}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: item.read ? "#F3F4F6" : "#EEF2FF" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="bell-outline"
                    size={20}
                    color={item.read ? "#9CA3AF" : "#4F46E5"}
                  />
                </View>
                <View style={styles.content}>
                  <View style={styles.titleRow}>
                    <Text
                      variant="bodyMedium"
                      style={[styles.title, !item.read && styles.unread]}
                    >
                      {item.title}
                    </Text>
                    {!item.read && <View style={styles.dot} />}
                  </View>
                  <Text variant="bodySmall" style={styles.body}>
                    {item.body}
                  </Text>
                  <Text variant="bodySmall" style={styles.time}>
                    {item.time}
                  </Text>
                </View>
              </View>
              {index < NOTIFICATIONS.length - 1 && <Divider style={styles.divider} />}
            </View>
          ))}
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },
  headerRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  heading: { fontWeight: "700", color: "#111827" },
  scroll: { padding: 16, gap: 16 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 4 },
  row: { flexDirection: "row", alignItems: "flex-start", padding: 12, gap: 12 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  content: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  title: { color: "#374151" },
  unread: { fontWeight: "600", color: "#111827" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4F46E5" },
  body: { color: "#6B7280", lineHeight: 18 },
  time: { color: "#9CA3AF", marginTop: 4 },
  divider: { backgroundColor: "#F9FAFB", marginHorizontal: 12 },
});
