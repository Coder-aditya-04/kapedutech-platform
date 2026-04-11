import { Redirect } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { View, ActivityIndicator, Text } from "react-native";

export default function Index() {
  const { phone, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ color: "#4F46E5", marginTop: 16, fontSize: 16, fontWeight: "600" }}>Loading...</Text>
      </View>
    );
  }

  return <Redirect href={phone ? "/(tabs)" : "/login"} />;
}
