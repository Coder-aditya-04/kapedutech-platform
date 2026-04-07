import { ScrollView, StyleSheet, View } from "react-native";
import { Text, Surface, Avatar, Button, Divider, List } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";

// Placeholder data — replace with API call
const PARENT = {
  name: "Suresh Sharma",
  phone: "9876543210",
  student: "Rahul Sharma",
  class: "Grade 10 - A",
  school: "KapEduTech School",
};

export default function ProfileScreen() {
  const { logout } = useAuth();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar + Name */}
        <Surface style={styles.heroCard} elevation={1}>
          <Avatar.Text
            size={72}
            label={PARENT.name
              .split(" ")
              .map((w) => w[0])
              .join("")}
            style={styles.avatar}
            labelStyle={{ color: "#FFFFFF", fontSize: 24, fontWeight: "700" }}
          />
          <Text variant="titleLarge" style={styles.name}>
            {PARENT.name}
          </Text>
          <Text variant="bodyMedium" style={styles.phone}>
            +91 {PARENT.phone}
          </Text>
        </Surface>

        {/* Student Info */}
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Student Details
          </Text>
          <List.Item
            title={PARENT.student}
            description="Student Name"
            left={(props) => <List.Icon {...props} icon="account-school" color="#4F46E5" />}
            titleStyle={styles.listTitle}
            descriptionStyle={styles.listDesc}
          />
          <Divider />
          <List.Item
            title={PARENT.class}
            description="Class & Section"
            left={(props) => <List.Icon {...props} icon="google-classroom" color="#4F46E5" />}
            titleStyle={styles.listTitle}
            descriptionStyle={styles.listDesc}
          />
          <Divider />
          <List.Item
            title={PARENT.school}
            description="School"
            left={(props) => <List.Icon {...props} icon="school" color="#4F46E5" />}
            titleStyle={styles.listTitle}
            descriptionStyle={styles.listDesc}
          />
        </Surface>

        {/* Settings */}
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Settings
          </Text>
          <List.Item
            title="Notification Preferences"
            left={(props) => <List.Icon {...props} icon="bell-cog-outline" color="#6B7280" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            titleStyle={styles.listTitle}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="Language"
            description="English"
            left={(props) => <List.Icon {...props} icon="translate" color="#6B7280" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            titleStyle={styles.listTitle}
            descriptionStyle={styles.listDesc}
            onPress={() => {}}
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
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  avatar: { backgroundColor: "#4F46E5", marginBottom: 12 },
  name: { fontWeight: "700", color: "#111827" },
  phone: { color: "#6B7280", marginTop: 4 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 4 },
  sectionTitle: {
    fontWeight: "600",
    color: "#111827",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  listTitle: { color: "#111827", fontSize: 14 },
  listDesc: { color: "#6B7280", fontSize: 12 },
  logoutBtn: {
    borderColor: "#EF4444",
    borderRadius: 12,
    marginTop: 4,
  },
  logoutContent: { paddingVertical: 4 },
});
