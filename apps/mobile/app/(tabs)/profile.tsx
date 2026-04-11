import { ScrollView, StyleSheet, View } from "react-native";
import { Text, Surface, Avatar, Button, Divider, List, Chip } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

type Student = { id: string; name: string; enrollmentNo: string; batch: string };
type Parent = { id: string; name: string; phone: string; students: Student[] };

export default function ProfileScreen() {
  const { logout } = useAuth();
  const [parent, setParent] = useState<Parent | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("parent").then(raw => {
      if (raw) setParent(JSON.parse(raw));
    });
  }, []);

  async function handleLogout() {
    await AsyncStorage.multiRemove(["auth_token", "parent", "notifications"]);
    logout();
    router.replace("/login");
  }

  const initials = parent?.name
    ? parent.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "P";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar + Name */}
        <Surface style={styles.heroCard} elevation={1}>
          <Avatar.Text
            size={72}
            label={initials}
            style={styles.avatar}
            labelStyle={{ color: "#FFFFFF", fontSize: 24, fontWeight: "700" }}
          />
          <Text variant="titleLarge" style={styles.name}>
            {parent?.name ?? "Parent"}
          </Text>
          <Text variant="bodyMedium" style={styles.phone}>
            +91 {parent?.phone ?? "—"}
          </Text>
        </Surface>

        {/* Students */}
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Linked Students</Text>
          {parent?.students?.length ? parent.students.map((s, i) => (
            <View key={s.id}>
              {i > 0 && <Divider />}
              <List.Item
                title={s.name}
                description={s.enrollmentNo}
                left={props => <List.Icon {...props} icon="account-school" color="#4F46E5" />}
                right={() => (
                  <View style={{ justifyContent: "center", paddingRight: 8 }}>
                    <Chip compact style={{ backgroundColor: "#EEF2FF" }} textStyle={{ color: "#4F46E5", fontSize: 11 }}>
                      {s.batch || "—"}
                    </Chip>
                  </View>
                )}
                titleStyle={styles.listTitle}
                descriptionStyle={styles.listDesc}
              />
            </View>
          )) : (
            <Text style={{ color: "#9CA3AF", padding: 12, fontSize: 13 }}>No students linked</Text>
          )}
        </Surface>

        {/* App Info */}
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>App Info</Text>
          <List.Item
            title="App Version"
            description="1.0.0"
            left={props => <List.Icon {...props} icon="information-outline" color="#6B7280" />}
            titleStyle={styles.listTitle}
            descriptionStyle={styles.listDesc}
          />
          <Divider />
          <List.Item
            title="KAP Edutech Platform"
            description="Attendance Management System"
            left={props => <List.Icon {...props} icon="school" color="#6B7280" />}
            titleStyle={styles.listTitle}
            descriptionStyle={styles.listDesc}
          />
        </Surface>

        {/* Logout */}
        <Button
          mode="outlined"
          onPress={handleLogout}
          icon="logout"
          textColor="#EF4444"
          style={styles.logoutBtn}
          contentStyle={styles.logoutContent}
        >
          Log Out
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },
  scroll: { padding: 16, gap: 16 },
  heroCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, alignItems: "center" },
  avatar: { backgroundColor: "#4F46E5", marginBottom: 12 },
  name: { fontWeight: "700", color: "#111827" },
  phone: { color: "#6B7280", marginTop: 4 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 4 },
  sectionTitle: { fontWeight: "600", color: "#111827", paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  listTitle: { color: "#111827", fontSize: 14 },
  listDesc: { color: "#6B7280", fontSize: 12 },
  logoutBtn: { borderColor: "#EF4444", borderRadius: 12, marginTop: 4 },
  logoutContent: { paddingVertical: 4 },
});
