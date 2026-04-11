import { Redirect } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { View, ActivityIndicator, Text } from "react-native";

export default function Index() {
  const { phone, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#4F46E5" }}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ color: "#ffffff", marginTop: 12, fontSize: 14 }}>Loading...</Text>
      </View>
    );
  }

  return <Redirect href={phone ? "/(tabs)" : "/login"} />;
}
