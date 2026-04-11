import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useRef, useState } from "react";

const { width } = Dimensions.get("window");

type Slide = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  ringColor: string;
  title: string;
  subtitle: string;
  accentColor: string;
  bg: string;
  tagLine: string;
};

const slides: Slide[] = [
  {
    id: "1",
    icon: "calendar-outline",
    iconBg: "#EEF2FF",
    iconColor: "#4F46E5",
    ringColor: "#C7D2FE",
    title: "Track Daily Attendance",
    subtitle: "Stay updated with your child's punch in and out times, right from your phone.",
    accentColor: "#4F46E5",
    bg: "#F5F3FF",
    tagLine: "Real-time updates",
  },
  {
    id: "2",
    icon: "notifications-outline",
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
    ringColor: "#FDE68A",
    title: "Instant Notifications",
    subtitle: "Get real-time alerts the moment your child checks in or out of class.",
    accentColor: "#D97706",
    bg: "#FFFBEB",
    tagLine: "Never miss a moment",
  },
  {
    id: "3",
    icon: "bar-chart-outline",
    iconBg: "#D1FAE5",
    iconColor: "#059669",
    ringColor: "#A7F3D0",
    title: "Smart Analytics",
    subtitle: "Monitor weekly trends and attendance percentage to keep your child on track.",
    accentColor: "#4F46E5",
    bg: "#ECFDF5",
    tagLine: "Data-driven insights",
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  async function finish() {
    await AsyncStorage.setItem("onboarding_done", "true");
    router.replace("/login");
  }

  function handleNext() {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      finish();
    }
  }

  const slide = slides[currentIndex];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <Text style={styles.logoKap}>KAP</Text>
          <Text style={styles.logoEdu}> Edutech</Text>
        </View>
        {currentIndex < slides.length - 1 ? (
          <TouchableOpacity onPress={finish} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 50 }} />}
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            {/* Illustration */}
            <View style={[styles.illustrationWrap, { backgroundColor: item.bg }]}>
              {/* Decorative rings */}
              <View style={[styles.ring3, { borderColor: item.ringColor + "40" }]} />
              <View style={[styles.ring2, { borderColor: item.ringColor + "70" }]} />
              <View style={[styles.ring1, { borderColor: item.ringColor }]} />
              {/* Icon */}
              <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon} size={80} color={item.iconColor} />
              </View>
              {/* Tag pill */}
              <View style={[styles.tagPill, { backgroundColor: item.iconBg, borderColor: item.ringColor }]}>
                <Text style={[styles.tagText, { color: item.iconColor }]}>{item.tagLine}</Text>
              </View>
            </View>

            {/* Text */}
            <View style={styles.textWrap}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </View>
        )}
      />

      {/* Bottom */}
      <View style={styles.bottom}>
        {/* Dots */}
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex
                  ? [styles.dotActive, { backgroundColor: slide.accentColor }]
                  : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity
          onPress={handleNext}
          style={[styles.btn, { backgroundColor: slide.accentColor }]}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {currentIndex === slides.length - 1 ? "Get Started" : "Next"}
          </Text>
          <Ionicons
            name={currentIndex === slides.length - 1 ? "checkmark-circle-outline" : "arrow-forward-outline"}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          KAP Edutech · JEE &amp; NEET Attendance System
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  logoRow: { flexDirection: "row", alignItems: "center" },
  logoKap: { fontSize: 18, fontWeight: "900", color: "#1E1B4B" },
  logoEdu: { fontSize: 18, fontWeight: "400", color: "#4F46E5" },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  skipText: { fontSize: 14, color: "#9CA3AF", fontWeight: "500" },

  slide: { alignItems: "center" },

  illustrationWrap: {
    width: "100%",
    height: 300,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  ring3: { position: "absolute", width: 280, height: 280, borderRadius: 140, borderWidth: 1 },
  ring2: { position: "absolute", width: 220, height: 220, borderRadius: 110, borderWidth: 1.5 },
  ring1: { position: "absolute", width: 160, height: 160, borderRadius: 80, borderWidth: 2 },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  tagPill: {
    position: "absolute",
    bottom: 28,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },

  textWrap: { paddingHorizontal: 36, paddingTop: 28, alignItems: "center" },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 23,
  },

  bottom: { paddingHorizontal: 24, paddingBottom: 20, gap: 20 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 28 },
  dotInactive: { width: 8, backgroundColor: "#E5E7EB" },

  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 0.3 },

  footerNote: { textAlign: "center", fontSize: 12, color: "#D1D5DB" },
});
