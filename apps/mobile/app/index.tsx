import { Redirect } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { View, ActivityIndicator, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export default function Index() {
  const { phone, isLoading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("onboarding_done").then(val => {
      setOnboardingDone(val === "true");
    });
  }, []);

  if (isLoading || onboardingDone === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ color: "#4F46E5", marginTop: 16, fontSize: 16, fontWeight: "600" }}>Loading...</Text>
      </View>
    );
  }

  if (!onboardingDone) return <Redirect href="/onboarding" />;
  return <Redirect href={phone ? "/(tabs)" : "/login"} />;
}
