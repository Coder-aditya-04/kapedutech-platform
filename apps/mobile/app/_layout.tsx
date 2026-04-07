import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PaperProvider, MD3LightTheme } from "react-native-paper";
import { AuthProvider } from "@/src/context/AuthContext";

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#4F46E5",
    secondary: "#7C3AED",
  },
};

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <PaperProvider theme={theme}>
        <Stack>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </PaperProvider>
    </AuthProvider>
  );
}
