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
    circleBg: "rgba(99,91,255,0.12)",
    title: "Track Daily Attendance",
    subtitle: "Stay updated with your child's punch in and out times, right from your phone.",
  },
  {
    id: "2",
    icon: "notifications-outline" as const,
    color: "#0064E0",
    lightBg: "#E8F3FF",
    circleBg: "rgba(0,100,224,0.12)",
    title: "Instant Notifications",
    subtitle: "Get real-time alerts the moment your child checks in or out of class.",
  },
  {
    id: "3",
    icon: "bar-chart-outline" as const,
    color: "#059669",
    lightBg: "#D1FAE5",
    circleBg: "rgba(5,150,105,0.12)",
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
        {currentIndex < slides.length - 1 ? (
          <TouchableOpacity onPress={finish} hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : <View />}
      </View>

      {/* Illustration card */}
      <View style={[styles.illustrationCard, { backgroundColor: slide.lightBg }]}>

        {/* Decorative background circles */}
        <View style={[styles.decorCircle1, { backgroundColor: slide.circleBg }]} />
        <View style={[styles.decorCircle2, { backgroundColor: slide.circleBg }]} />

        {/* KAP Logo */}
        <Image
          source={require("../assets/images/kap_logo.png")}
          style={styles.logo}
          contentFit="contain"
        />

        {/* Big icon square */}
        <View style={[styles.iconWrap, { backgroundColor: slide.color }]}>
          <Ionicons name={slide.icon} size={60} color="#fff" />
        </View>

        {/* Slide number pill */}
        <View style={[styles.stepPill, { backgroundColor: slide.color }]}>
          <Text style={styles.stepText}>{currentIndex + 1} / {slides.length}</Text>
        </View>
      </View>

      {/* Text content */}
      <View style={styles.content}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>

      {/* Bottom: dots + button */}
      <View style={styles.bottom}>
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
            size={20}
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
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 4,
  },
  skipText: { fontSize: 14, color: "#9CA3AF", fontWeight: "600" },

  illustrationCard: {
    marginHorizontal: 20,
    borderRadius: 32,
    height: width * 0.76,
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
    overflow: "hidden",
    position: "relative",
  },

  decorCircle1: {
    position: "absolute",
    width: width * 0.72,
    height: width * 0.72,
    borderRadius: width * 0.36,
    top: -width * 0.22,
    right: -width * 0.18,
  },
  decorCircle2: {
    position: "absolute",
    width: width * 0.52,
    height: width * 0.52,
    borderRadius: width * 0.26,
    bottom: -width * 0.18,
    left: -width * 0.1,
  },

  logo: {
    width: width * 0.48,
    height: 46,
    zIndex: 1,
  },

  iconWrap: {
    width: 108,
    height: 108,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 1,
  },

  stepPill: {
    position: "absolute",
    bottom: 18,
    right: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    zIndex: 1,
  },
  stepText: { color: "#fff", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },

  content: {
    paddingHorizontal: 28,
    paddingTop: 30,
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 12,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },

  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 36,
    gap: 20,
    backgroundColor: "#FFFFFF",
  },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, alignItems: "center" },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 32 },
  dotInactive: { width: 8, backgroundColor: "#E5E7EB" },

  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 17, letterSpacing: 0.2 },
});
