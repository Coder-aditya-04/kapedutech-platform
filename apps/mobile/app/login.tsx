import { useState, useRef, useEffect } from "react";
import {
  View, StyleSheet, KeyboardAvoidingView, Platform,
  TouchableOpacity, TextInput as RNTextInput, ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { Text } from "react-native-paper";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { SafeAreaView } from "react-native-safe-area-context";
import auth, { type FirebaseAuthTypes } from "@react-native-firebase/auth";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { verifyFirebaseToken, savePushToken } from "@/src/api/auth";

async function registerForPushNotifications(): Promise<string | null> {
  try {
    const Notifications = await import("expo-notifications");
    const { status: existing } = await Notifications.getPermissionsAsync();
    const { status } = existing === "granted"
      ? { status: existing }
      : await Notifications.requestPermissionsAsync();
    if (status !== "granted") return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch {
    return null;
  }
}

type Step = "phone" | "otp";
const OTP_LENGTH = 6;

// Floating feature card used in the illustration
function FeatureCard({ icon, label, color, bg, style }: {
  icon: string; label: string; color: string; bg: string; style?: object;
}) {
  return (
    <View style={[styles.floatCard, { backgroundColor: bg }, style]}>
      <MaterialCommunityIcons name={icon as never} size={18} color={color} />
      <Text style={[styles.floatCardText, { color }]}>{label}</Text>
    </View>
  );
}

export default function LoginScreen() {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const confirmationRef = useRef<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const otpRefs = useRef<(RNTextInput | null)[]>([]);

  useEffect(() => {
    if (step === "otp") setTimeout(() => otpRefs.current[0]?.focus(), 100);
  }, [step]);

  async function handleSendOtp() {
    if (!/^\d{10}$/.test(phone)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setError(""); setLoading(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(`+91${phone}`);
      confirmationRef.current = confirmation;
      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally { setLoading(false); }
  }

  async function handleVerifyOtp() {
    const otp = otpDigits.join("");
    if (otp.length !== OTP_LENGTH) { setError("Enter the 6-digit OTP."); return; }
    if (!confirmationRef.current) { setError("Session expired. Please resend OTP."); return; }
    setError(""); setLoading(true);
    try {
      const credential = await confirmationRef.current.confirm(otp);
      if (!credential?.user) throw new Error("Verification failed.");
      const idToken = await credential.user.getIdToken();
      const { token, parent } = await verifyFirebaseToken(idToken);
      await AsyncStorage.setItem("auth_token", token);
      await AsyncStorage.setItem("parent", JSON.stringify(parent));
      login(phone);
      router.replace("/(tabs)");
      registerForPushNotifications()
        .then((pushToken) => { if (pushToken) savePushToken(parent.id, pushToken); })
        .catch((e) => console.log("[Push] Registration failed:", e));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally { setLoading(false); }
  }

  function handleOtpChange(value: string, index: number) {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
      const newDigits = [...otpDigits];
      for (let i = 0; i < digits.length; i++) {
        newDigits[index + i < OTP_LENGTH ? index + i : OTP_LENGTH - 1] = digits[i];
      }
      setOtpDigits(newDigits);
      otpRefs.current[Math.min(index + digits.length, OTP_LENGTH - 1)]?.focus();
      return;
    }
    const digit = value.replace(/\D/g, "");
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setError("");
    if (digit && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyPress(e: { nativeEvent: { key: string } }, index: number) {
    if (e.nativeEvent.key === "Backspace" && !otpDigits[index] && index > 0) {
      const newDigits = [...otpDigits];
      newDigits[index - 1] = "";
      setOtpDigits(newDigits);
      otpRefs.current[index - 1]?.focus();
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Hero illustration area ─── */}
          <View style={styles.hero}>
            {/* Background bubbles */}
            <View style={styles.bubble1} />
            <View style={styles.bubble2} />
            <View style={styles.bubble3} />

            {/* Logo */}
            <View style={styles.logoWrap}>
              <Image
                source={require("@/assets/images/kap_logo.png")}
                style={styles.logo}
                contentFit="contain"
              />
            </View>

            {/* Central illustration — floating cards around a hub icon */}
            <View style={styles.illustrationHub}>
              {/* Central circle */}
              <View style={styles.hubCircle}>
                <MaterialCommunityIcons name="shield-check" size={36} color="#4F46E5" />
              </View>

              {/* Floating feature cards */}
              <FeatureCard icon="qrcode-scan" label="QR Scan" color="#0891B2" bg="#E0F7FA" style={styles.fc1} />
              <FeatureCard icon="bell-ring" label="Alerts" color="#7C3AED" bg="#EDE9FE" style={styles.fc2} />
              <FeatureCard icon="chart-donut" label="Reports" color="#059669" bg="#D1FAE5" style={styles.fc3} />
              <FeatureCard icon="calendar-check" label="Attendance" color="#D97706" bg="#FEF3C7" style={styles.fc4} />
            </View>

            <Text style={styles.heroTagline}>Real-time student attendance{"\n"}tracking for parents</Text>
          </View>


          {/* ─── Form card ─── */}
          <View style={styles.formCard}>
            {step === "phone" ? (
              <>
                <Text style={styles.formTitle}>Sign In</Text>
                <Text style={styles.formSub}>Enter your registered mobile number</Text>

                {/* Phone field */}
                <Text style={styles.fieldLabel}>Mobile Number</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputIconWrap}>
                    <Ionicons name="phone-portrait-outline" size={20} color="#64748B" />
                  </View>
                  <View style={styles.inputDivider} />
                  <View style={styles.countryTag}>
                    <Text style={styles.countryTagText}>+91</Text>
                  </View>
                  <RNTextInput
                    style={styles.inputField}
                    placeholder="Enter your mobile number"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={(t) => { setPhone(t.replace(/\D/g, "")); setError(""); }}
                    returnKeyType="done"
                    onSubmitEditing={handleSendOtp}
                  />
                </View>

                {error ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.cta, loading && styles.ctaDisabled]}
                  onPress={handleSendOtp}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  {loading ? (
                    <Text style={styles.ctaText}>Sending OTP...</Text>
                  ) : (
                    <View style={styles.ctaInner}>
                      <Text style={styles.ctaText}>Send OTP</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Secure Login</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Security badges */}
                <View style={styles.badgeRow}>
                  <View style={styles.badge}>
                    <Ionicons name="shield-checkmark-outline" size={14} color="#059669" />
                    <Text style={styles.badgeText}>OTP Verified</Text>
                  </View>
                  <View style={styles.badge}>
                    <Ionicons name="lock-closed-outline" size={14} color="#4F46E5" />
                    <Text style={styles.badgeText}>End-to-End Secure</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* Back button */}
                <TouchableOpacity
                  onPress={() => { setStep("phone"); setOtpDigits(Array(OTP_LENGTH).fill("")); setError(""); confirmationRef.current = null; }}
                  style={styles.backRow}
                >
                  <Ionicons name="arrow-back" size={18} color="#4F46E5" />
                  <Text style={styles.backText}>Change number</Text>
                </TouchableOpacity>

                <Text style={styles.formTitle}>Verify OTP</Text>
                <Text style={styles.formSub}>
                  6-digit code sent to{" "}
                  <Text style={styles.phoneHighlight}>+91 {phone}</Text>
                </Text>

                <Text style={styles.fieldLabel}>One-Time Password</Text>
                <View style={styles.otpRow}>
                  {otpDigits.map((digit, i) => (
                    <RNTextInput
                      key={i}
                      ref={(ref) => { otpRefs.current[i] = ref; }}
                      style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                      value={digit}
                      onChangeText={(v) => handleOtpChange(v, i)}
                      onKeyPress={(e) => handleOtpKeyPress(e, i)}
                      keyboardType="number-pad"
                      maxLength={6}
                      selectTextOnFocus
                      textAlign="center"
                    />
                  ))}
                </View>

                {error ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.cta, loading && styles.ctaDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  {loading ? (
                    <Text style={styles.ctaText}>Verifying...</Text>
                  ) : (
                    <View style={styles.ctaInner}>
                      <Text style={styles.ctaText}>Verify &amp; Sign In</Text>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSendOtp} style={styles.resendBtn}>
                  <Text style={styles.resendText}>
                    Didn&apos;t receive the code?{" "}
                    <Text style={styles.resendLink}>Resend OTP</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* ─── Footer ─── */}
          <Text style={styles.footer}>
            By logging in, you agree to our{"\n"}
            <Text style={styles.footerLink}>Terms &amp; Conditions</Text>
            {" "}and{" "}
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: "#FFFFFF" },

  // ─── Hero
  hero: {
    backgroundColor: "#FFFFFF",
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
    minHeight: 300,
  },
  bubble1: { position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(79,70,229,0.05)" },
  bubble2: { position: "absolute", bottom: 20, left: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(79,70,229,0.04)" },
  bubble3: { position: "absolute", top: 60, left: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(79,70,229,0.05)" },

  logoWrap: { alignItems: "center", marginBottom: 20, zIndex: 2 },
  logo: { width: 180, height: 56 },

  illustrationHub: { width: 220, height: 160, alignItems: "center", justifyContent: "center", position: "relative", zIndex: 2, marginBottom: 16 },
  hubCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 6,
    borderWidth: 2, borderColor: "#E0E7FF",
  },

  // Floating cards
  floatCard: {
    position: "absolute", flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  floatCardText: { fontSize: 11, fontWeight: "700" },
  fc1: { top: 10, left: 0 },
  fc2: { top: 10, right: 0 },
  fc3: { bottom: 10, left: 0 },
  fc4: { bottom: 10, right: 0 },

  heroTagline: { fontSize: 13, color: "#64748B", textAlign: "center", lineHeight: 20, zIndex: 2 },

  // ─── Form card
  formCard: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    flex: 1,
  },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  backText: { color: "#4F46E5", fontSize: 14, fontWeight: "600" },

  formTitle: { fontSize: 24, fontWeight: "800", color: "#0F172A", marginBottom: 6, letterSpacing: -0.3 },
  formSub: { fontSize: 14, color: "#64748B", marginBottom: 22, lineHeight: 20 },
  phoneHighlight: { color: "#4F46E5", fontWeight: "700" },

  fieldLabel: {
    fontSize: 12, fontWeight: "700", color: "#374151",
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
  },

  // Input field (icon + divider + text)
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1.5, borderColor: "#E2E8F0",
    marginBottom: 16, overflow: "hidden",
  },
  inputIconWrap: { paddingHorizontal: 14, paddingVertical: 14 },
  inputDivider: { width: 1, height: 24, backgroundColor: "#E2E8F0" },
  countryTag: { paddingHorizontal: 12 },
  countryTagText: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  inputField: {
    flex: 1, fontSize: 15, color: "#0F172A",
    paddingHorizontal: 12, paddingVertical: 14,
  },

  // OTP
  otpRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 16 },
  otpBox: {
    flex: 1, height: 58,
    borderWidth: 1.5, borderColor: "#E2E8F0",
    borderRadius: 14, backgroundColor: "#F8FAFC",
    fontSize: 24, fontWeight: "800", color: "#0F172A",
  },
  otpBoxFilled: { borderColor: "#4F46E5", backgroundColor: "#EEF2FF" },

  // Error
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FEF2F2", borderRadius: 10,
    padding: 12, marginBottom: 12,
    borderLeftWidth: 3, borderLeftColor: "#DC2626",
  },
  errorText: { color: "#DC2626", fontSize: 13, flex: 1 },

  // CTA button
  cta: {
    backgroundColor: "#1A1C6B",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#1A1C6B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },

  // Divider
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  dividerText: { fontSize: 12, color: "#94A3B8", fontWeight: "600", letterSpacing: 0.5 },

  // Security badges
  badgeRow: { flexDirection: "row", gap: 10, justifyContent: "center" },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#F8FAFC", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  badgeText: { fontSize: 12, color: "#374151", fontWeight: "500" },

  // Resend
  resendBtn: { alignItems: "center", marginTop: 18 },
  resendText: { fontSize: 13, color: "#94A3B8" },
  resendLink: { color: "#4F46E5", fontWeight: "700" },

  // Footer
  footer: {
    fontSize: 12, color: "#94A3B8",
    textAlign: "center", lineHeight: 18,
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32,
    backgroundColor: "#FFFFFF",
  },
  footerLink: { color: "#4F46E5", fontWeight: "600" },
});
