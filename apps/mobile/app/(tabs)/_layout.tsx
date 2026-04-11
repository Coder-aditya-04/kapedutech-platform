import { Tabs, router } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { savePushToken } from "@/src/api/auth";

// Guard: expo-notifications removed from Expo Go in SDK 53+
// In production APK it works fine; in Expo Go we just skip it
async function ensurePushToken() {
  try {
    // Dynamic import so Expo Go doesn't crash the whole module on import
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
    // Silently skip in Expo Go or if notifications not available
    console.log("[Push] Skipped:", (e as Error)?.message ?? e);
  }
}

export default function TabLayout() {
  const { phone } = useAuth();

  useEffect(() => {
    if (!phone) {
      setTimeout(() => router.replace("/login"), 0);
    } else {
      ensurePushToken();
    }
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
