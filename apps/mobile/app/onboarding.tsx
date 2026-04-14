import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useState } from "react";

const { width } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    icon: "calendar-outline" as const,
    color: "#4F46E5",
    lightBg: "#EEF2FF",
    title: "Track Daily Attendance",
    subtitle: "Stay updated with your child's punch in and out times, right from your phone.",
  },
  {
    id: "2",
    icon: "notifications-outline" as const,
    color: "#0064E0",
    lightBg: "#E8F3FF",
    title: "Instant Notifications",
    subtitle: "Get real-time alerts the moment your child checks in or out of class.",
  },
  {
    id: "3",
    icon: "bar-chart-outline" as const,
    color: "#059669",
    lightBg: "#D1FAE5",
    title: "Smart Analytics",
    subtitle: "Monitor weekly trends and attendance percentage to keep your child on track.",
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slide = slides[currentIndex];

  async function finish() {
    await AsyncStorage.setItem("onboarding_done", "true");
    router.replace("/login");
  }

  function handleNext() {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finish();
    }
  }

  return (
    <SafeAreaView style={styles.safe}>

      {/* Skip */}
      <View style={styles.topRow}>
        <View />
        {currentIndex < slides.length - 1 ? (
          <TouchableOpacity onPress={finish} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : <View />}
      </View>

      {/* Illustration card */}
      <View style={[styles.illustrationCard, { backgroundColor: slide.lightBg }]}>
        {/* KAP Logo at top of illustration */}
        <Image
          source={require("../assets/images/kap_logo.png")}
          style={styles.logo}
          contentFit="contain"
        />

        {/* Big icon circle */}
        <View style={[styles.iconWrap, { backgroundColor: slide.color }]}>
          <Ionicons name={slide.icon} size={64} color="#fff" />
        </View>

        {/* Slide number pill */}
        <View style={[styles.stepPill, { backgroundColor: slide.color }]}>
          <Text style={styles.stepText}>{currentIndex + 1} of {slides.length}</Text>
        </View>
      </View>

      {/* Text content */}
      <View style={styles.content}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>

      {/* Bottom: dots + button */}
      <View style={styles.bottom}>
        {/* Dots */}
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex
                  ? [styles.dotActive, { backgroundColor: slide.color }]
                  : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity
          onPress={handleNext}
          style={[styles.btn, { backgroundColor: slide.color }]}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {currentIndex === slides.length - 1 ? "Get Started" : "Next"}
          </Text>
          <Ionicons
            name={currentIndex === slides.length - 1 ? "checkmark-outline" : "arrow-forward-outline"}
            size={18}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },

  topRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  skipText: { fontSize: 14, color: "#9CA3AF", fontWeight: "500" },

  illustrationCard: {
    marginHorizontal: 20,
    borderRadius: 28,
    height: width * 0.72,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    overflow: "hidden",
    position: "relative",
  },

  logo: {
    width: width * 0.45,
    height: 44,
  },

  iconWrap: {
    width: 112,
    height: 112,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },

  stepPill: {
    position: "absolute",
    bottom: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
  },
  stepText: { color: "#fff", fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },

  content: {
    paddingHorizontal: 28,
    paddingTop: 28,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 10,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 23,
  },

  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 16,
    backgroundColor: "#FFFFFF",
  },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 28 },
  dotInactive: { width: 8, backgroundColor: "#E5E7EB" },

  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
