import { Redirect } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { phone, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F3F4F6" }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return <Redirect href={phone ? "/(tabs)" : "/login"} />;
}
