import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PaperProvider, MD3LightTheme } from "react-native-paper";
import { AuthProvider } from "@/src/context/AuthContext";
import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#4F46E5",
    secondary: "#7C3AED",
  },
};

// Global notification listener — runs regardless of which tab is active
function NotificationListener() {
  useEffect(() => {
    let receivedSub: { remove: () => void } | null = null;
    let responseSub: { remove: () => void } | null = null;

    (async () => {
      try {
        const Notifications = await import("expo-notifications");

        // Allow notifications to show as banners while app is in foreground
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        async function saveNotification(title: string, body: string, id: string) {
          try {
            const raw = await AsyncStorage.getItem("notifications");
            const existing = raw ? JSON.parse(raw) : [];
            // Avoid duplicates
            if (existing.some((n: { id: string }) => n.id === id)) return;
            const updated = [
              { id, title: title || "KAP Edutech", body: body || "", time: new Date().toISOString(), read: false },
              ...existing,
            ].slice(0, 50);
            await AsyncStorage.setItem("notifications", JSON.stringify(updated));
          } catch {}
        }

        // Foreground notifications
        receivedSub = Notifications.addNotificationReceivedListener((notification) => {
          const title = notification.request.content.title ?? "";
          const body = notification.request.content.body ?? "";
          const id = notification.request.identifier;
          saveNotification(title, body, id);
        });

        // Background/killed — fires when user taps the notification
        responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
          const title = response.notification.request.content.title ?? "";
          const body = response.notification.request.content.body ?? "";
          const id = response.notification.request.identifier;
          saveNotification(title, body, id);
        });
      } catch (e) {
        console.log("[NotificationListener] skipped:", e);
      }
    })();

    return () => {
      receivedSub?.remove();
      responseSub?.remove();
    };
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <PaperProvider theme={theme}>
        <NotificationListener />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="modal" />
        </Stack>
        <StatusBar style="auto" />
      </PaperProvider>
    </AuthProvider>
  );
}
