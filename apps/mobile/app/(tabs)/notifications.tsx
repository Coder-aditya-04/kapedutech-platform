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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Text variant="headlineSmall" style={styles.heading}>Notifications</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="bell-sleep-outline" size={56} color="#D1D5DB" />
            <Text variant="titleMedium" style={styles.emptyTitle}>No notifications yet</Text>
            <Text variant="bodySmall" style={styles.emptyBody}>
              You'll see attendance alerts here when your child scans in or out.
            </Text>
          </View>
        ) : (
          <Surface style={styles.card} elevation={1}>
            {items.map((item, index) => (
              <View key={item.id}>
                <View style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: item.read ? "#F3F4F6" : "#EEF2FF" }]}>
                    <MaterialCommunityIcons
                      name="bell-outline"
                      size={20}
                      color={item.read ? "#9CA3AF" : "#4F46E5"}
                    />
                  </View>
                  <View style={styles.content}>
                    <View style={styles.titleRow}>
                      <Text variant="bodyMedium" style={[styles.title, !item.read && styles.unread]}>
                        {item.title}
                      </Text>
                      {!item.read && <View style={styles.dot} />}
                    </View>
                    <Text variant="bodySmall" style={styles.body}>{item.body}</Text>
                    <Text variant="bodySmall" style={styles.time}>{formatTime(item.time)}</Text>
                  </View>
                </View>
                {index < items.length - 1 && <Divider style={styles.divider} />}
              </View>
            ))}
          </Surface>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },
  headerRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  heading: { fontWeight: "700", color: "#111827" },
  scroll: { padding: 16, gap: 16, flexGrow: 1 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontWeight: "600", color: "#374151" },
  emptyBody: { color: "#9CA3AF", textAlign: "center", paddingHorizontal: 32 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 4 },
  row: { flexDirection: "row", alignItems: "flex-start", padding: 12, gap: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  content: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  title: { color: "#374151" },
  unread: { fontWeight: "600", color: "#111827" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4F46E5" },
  body: { color: "#6B7280", lineHeight: 18 },
  time: { color: "#9CA3AF", marginTop: 4 },
  divider: { backgroundColor: "#F9FAFB", marginHorizontal: 12 },
});
