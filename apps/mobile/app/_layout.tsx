import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PaperProvider, MD3LightTheme } from "react-native-paper";
import { AuthProvider } from "@/src/context/AuthContext";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

// Keep splash visible until we explicitly hide it
SplashScreen.preventAutoHideAsync();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#4F46E5",
    secondary: "#7C3AED",
  },
};

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen as soon as the layout mounts
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <PaperProvider theme={theme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal", headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </PaperProvider>
    </AuthProvider>
  );
}
