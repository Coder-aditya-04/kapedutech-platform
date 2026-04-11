import { Tabs, router } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { savePushToken } from "@/src/api/auth";

// Guard: expo-notifications removed from Expo Go in SDK 53+
// In production APK it works fine; in Expo Go we just skip it
type StoredNotification = { id: string; title: string; body: string; time: string; read: boolean };

async function storeNotification(title: string, body: string) {
  try {
    const raw = await AsyncStorage.getItem("notifications");
    const existing: StoredNotification[] = raw ? JSON.parse(raw) : [];
    const newItem: StoredNotification = {
      id: Date.now().toString(),
      title: title ?? "Notification",
      body: body ?? "",
      time: new Date().toISOString(),
      read: false,
    };
    const updated = [newItem, ...existing].slice(0, 50);
    await AsyncStorage.setItem("notifications", JSON.stringify(updated));
  } catch {}
}

async function ensurePushToken() {
  try {
    const Notifications = await import("expo-notifications");

    const parentStr = await AsyncStorage.getItem("parent");
    if (!parentStr) return;
    const parent = JSON.parse(parentStr);

    const { status: existing } = await Notifications.getPermissionsAsync();
    const { status } = existing === "granted"
      ? { status: existing }
      : await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    if (token.data) {
      await savePushToken(parent.id, token.data);
      console.log("[Push] Token registered:", token.data);
    }
  } catch (e) {
    console.log("[Push] Skipped:", (e as Error)?.message ?? e);
  }
}

export default function TabLayout() {
  const { phone } = useAuth();

  useEffect(() => {
    if (!phone) {
      setTimeout(() => router.replace("/login"), 0);
      return;
    }
    ensurePushToken();

    let sub1: { remove: () => void } | null = null;
    let sub2: { remove: () => void } | null = null;

    (async () => {
      try {
        const Notifications = await import("expo-notifications");
        // App is open — store notification as it arrives
        sub1 = Notifications.addNotificationReceivedListener((n) => {
          storeNotification(
            n.request.content.title ?? "Notification",
            n.request.content.body ?? ""
          );
        });
        // App was backgrounded — store when user taps the notification
        sub2 = Notifications.addNotificationResponseReceivedListener((r) => {
          storeNotification(
            r.notification.request.content.title ?? "Notification",
            r.notification.request.content.body ?? ""
          );
        });
      } catch {}
    })();

    return () => { sub1?.remove(); sub2?.remove(); };
  }, [phone]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#4F46E5",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: { backgroundColor: "#FFFFFF", borderTopColor: "#E5E7EB" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bell" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
