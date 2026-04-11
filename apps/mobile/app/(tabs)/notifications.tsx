import { ScrollView, StyleSheet, View } from "react-native";
import { Text, Surface, Divider } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

type StoredNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function formatFullDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dStr = d.toDateString();
  if (dStr === today.toDateString()) return "Today";
  if (dStr === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
}

function groupByDay(items: StoredNotification[]) {
  const groups: { label: string; items: StoredNotification[] }[] = [];
  const seen = new Map<string, number>();
  for (const item of items) {
    const label = formatFullDate(item.time);
    if (seen.has(label)) {
      groups[seen.get(label)!].items.push(item);
    } else {
      seen.set(label, groups.length);
      groups.push({ label, items: [item] });
    }
  }
  return groups;
}

export default function NotificationsScreen() {
  const [items, setItems] = useState<StoredNotification[]>([]);

  async function loadNotifications() {
    try {
      const raw = await AsyncStorage.getItem("notifications");
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }

  useEffect(() => {
    loadNotifications();

    let sub: { remove: () => void } | null = null;

    (async () => {
      try {
        const Notifications = await import("expo-notifications");
        sub = Notifications.addNotificationReceivedListener(async (notification) => {
          const newItem: StoredNotification = {
            id: notification.request.identifier,
            title: notification.request.content.title ?? "Notification",
            body: notification.request.content.body ?? "",
            time: new Date().toISOString(),
            read: false,
          };
          try {
            const raw = await AsyncStorage.getItem("notifications");
            const existing: StoredNotification[] = raw ? JSON.parse(raw) : [];
            const updated = [newItem, ...existing].slice(0, 50);
            await AsyncStorage.setItem("notifications", JSON.stringify(updated));
            setItems(updated);
          } catch {}
        });
      } catch (e) {
        console.log("[Notifications] Listener skipped:", e);
      }
    })();

    return () => { sub?.remove(); };
  }, []);

  const groups = groupByDay(items);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Text variant="headlineSmall" style={styles.heading}>Notifications</Text>
        {items.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{items.length}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="bell-sleep-outline" size={48} color="#C7D2FE" />
            </View>
            <Text variant="titleMedium" style={styles.emptyTitle}>No notifications yet</Text>
            <Text variant="bodySmall" style={styles.emptyBody}>
              You&apos;ll see attendance alerts here when your child scans in or out at school.
            </Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.label}>
              {/* Day label */}
              <View style={styles.dayLabelRow}>
                <View style={styles.dayLine} />
                <Text style={styles.dayLabel}>{group.label}</Text>
                <View style={styles.dayLine} />
              </View>

              <Surface style={styles.card} elevation={1}>
                {group.items.map((item, index) => (
                  <View key={item.id}>
                    <View style={styles.row}>
                      <View style={[styles.iconWrap, {
                        backgroundColor: item.body.toLowerCase().includes("punch in") || item.body.toLowerCase().includes("punched in")
                          ? "#DCFCE7" : item.body.toLowerCase().includes("punch out") || item.body.toLowerCase().includes("punched out")
                          ? "#DBEAFE" : "#EEF2FF"
                      }]}>
                        <Text style={{ fontSize: 18 }}>
                          {item.body.toLowerCase().includes("punch in") || item.body.toLowerCase().includes("punched in")
                            ? "✅"
                            : item.body.toLowerCase().includes("punch out") || item.body.toLowerCase().includes("punched out")
                            ? "🔵" : "🔔"}
                        </Text>
                      </View>
                      <View style={styles.content}>
                        <View style={styles.titleRow}>
                          <Text variant="bodyMedium" style={[styles.title, !item.read && styles.unread]}>
                            {item.title}
                          </Text>
                          {!item.read && <View style={styles.dot} />}
                        </View>
                        <Text variant="bodySmall" style={styles.body}>{item.body}</Text>
                        <View style={styles.timeRow}>
                          <MaterialCommunityIcons name="clock-outline" size={11} color="#9CA3AF" />
                          <Text variant="bodySmall" style={styles.time}>{formatTime(item.time)}</Text>
                          <Text style={styles.timeSep}>·</Text>
                          <Text style={styles.timeAbsolute}>
                            {new Date(item.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {index < group.items.length - 1 && <Divider style={styles.divider} />}
                  </View>
                ))}
              </Surface>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },
  headerRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  heading: { fontWeight: "700", color: "#111827" },
  countBadge: { backgroundColor: "#4F46E5", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  scroll: { padding: 16, gap: 8, flexGrow: 1, paddingBottom: 32 },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyIcon: { width: 88, height: 88, borderRadius: 28, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontWeight: "700", color: "#374151" },
  emptyBody: { color: "#9CA3AF", textAlign: "center", paddingHorizontal: 40, lineHeight: 20 },

  dayLabelRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8, marginTop: 4 },
  dayLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  dayLabel: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8 },

  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 4, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "flex-start", padding: 12, gap: 12 },
  iconWrap: { width: 42, height: 42, borderRadius: 13, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  content: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  title: { color: "#374151", flex: 1 },
  unread: { fontWeight: "700", color: "#111827" },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#4F46E5", flexShrink: 0 },
  body: { color: "#6B7280", lineHeight: 18, marginBottom: 4 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  time: { color: "#9CA3AF", fontSize: 11 },
  timeSep: { color: "#D1D5DB", fontSize: 11 },
  timeAbsolute: { color: "#9CA3AF", fontSize: 11 },
  divider: { backgroundColor: "#F9FAFB", marginHorizontal: 12 },
});
