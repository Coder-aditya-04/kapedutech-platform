import { useState, useRef, useEffect } from "react";
import {
  View, StyleSheet, KeyboardAvoidingView, Platform,
  Image, TouchableOpacity, TextInput as RNTextInput,
  ScrollView, NativeSyntheticEvent, TextInputKeyPressEventData,
} from "react-native";
import { Text } from "react-native-paper";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useAuth } from "@/src/context/AuthContext";
import { requestOtp, verifyOtp, savePushToken } from "@/src/api/auth";

async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Dynamic import — expo-notifications removed from Expo Go SDK 53+
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

export default function LoginScreen() {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const otpRefs = useRef<(RNTextInput | null)[]>([]);

  // Auto-focus first OTP box when step changes
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  async function handleSendOtp() {
    if (phone.length !== 10) { setError("Enter a valid 10-digit mobile number."); return; }
    setError(""); setLoading(true);
    try {
      await requestOtp(phone);
      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally { setLoading(false); }
  }

  async function handleVerifyOtp() {
    const otp = otpDigits.join("");
    if (otp.length !== OTP_LENGTH) { setError("Enter the 6-digit OTP."); return; }
    setError(""); setLoading(true);
    try {
      const { token, parent } = await verifyOtp(phone, otp);
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
    // Handle paste: if more than 1 char typed at once
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
      const newDigits = [...otpDigits];
      for (let i = 0; i < digits.length; i++) {
        newDigits[index + i < OTP_LENGTH ? index + i : OTP_LENGTH - 1] = digits[i];
      }
      setOtpDigits(newDigits);
      const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, "");
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setError("");
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyPress(e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) {
    if (e.nativeEvent.key === "Backspace" && !otpDigits[index] && index > 0) {
      const newDigits = [...otpDigits];
      newDigits[index - 1] = "";
      setOtpDigits(newDigits);
      otpRefs.current[index - 1]?.focus();
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Image
              source={require("@/assets/images/kap_logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandName}>
            <Text style={styles.brandKAP}>KAP </Text>
            <Text style={styles.brandEdutech}>Edutech</Text>
          </Text>
          <Text style={styles.brandSub}>Parent Attendance Portal</Text>
          <View style={styles.tagRow}>
            <View style={[styles.tag, { backgroundColor: "#FFF3E0", borderColor: "#FFB300" }]}>
              <Text style={[styles.tagText, { color: "#E65100" }]}>JEE</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: "#E8F5E9", borderColor: "#43A047" }]}>
              <Text style={[styles.tagText, { color: "#2E7D32" }]}>NEET</Text>
            </View>
          </View>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {step === "phone" ? (
            <>
              <Text style={styles.cardTitle}>Sign In</Text>
              <Text style={styles.cardSub}>Enter your registered mobile number to continue</Text>

              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.inputRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>🇮🇳  +91</Text>
                </View>
                <RNTextInput
                  style={styles.phoneInput}
                  placeholder="10-digit number"
                  placeholderTextColor="#BDBDBD"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={(t) => { setPhone(t); setError(""); }}
                  returnKeyType="done"
                  onSubmitEditing={handleSendOtp}
                />
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>
                  {loading ? "Sending OTP..." : "Send OTP"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Verify OTP</Text>
              <Text style={styles.cardSub}>
                Enter the 6-digit code sent to{"\n"}
                <Text style={styles.phoneHighlight}>+91 {phone}</Text>
              </Text>

              <Text style={styles.label}>One-Time Password</Text>
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
                    caretHidden={false}
                  />
                ))}
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>
                  {loading ? "Verifying..." : "Verify & Sign In"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setStep("phone"); setOtpDigits(Array(OTP_LENGTH).fill("")); setError(""); }}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>Change number</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSendOtp} style={styles.resendBtn}>
                <Text style={styles.resendText}>Didn't receive OTP? <Text style={styles.resendLink}>Resend</Text></Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.footer}>
          Secure login powered by KAP Edutech
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6FA" },
  scroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingVertical: 40 },

  // Header
  header: { alignItems: "center", marginBottom: 28 },
  logoWrap: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
    marginBottom: 14,
  },
  logo: { width: 56, height: 56 },
  brandName: { fontSize: 24, fontWeight: "800", color: "#1A1A2E", letterSpacing: 0.3 },
  brandKAP: { fontSize: 26, fontWeight: "900", color: "#1A1A2E", letterSpacing: 1 },
  brandEdutech: { fontSize: 22, fontWeight: "400", color: "#4A6FA5" },
  brandSub: { fontSize: 13, color: "#757575", marginTop: 4 },
  tagRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  tag: {
    paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  tagText: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },

  // Card
  card: {
    width: "100%", backgroundColor: "#FFFFFF",
    borderRadius: 20, padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 5,
  },
  cardTitle: { fontSize: 22, fontWeight: "800", color: "#1A1A2E", marginBottom: 6 },
  cardSub: { fontSize: 14, color: "#757575", marginBottom: 22, lineHeight: 20 },
  phoneHighlight: { color: "#3730A3", fontWeight: "700" },
  label: { fontSize: 12, fontWeight: "700", color: "#424242", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },

  // Phone input
  inputRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: "#E0E0E0",
    borderRadius: 12, marginBottom: 14,
    backgroundColor: "#FAFAFA", overflow: "hidden",
  },
  countryCode: {
    paddingHorizontal: 14, paddingVertical: 16,
    borderRightWidth: 1.5, borderRightColor: "#E0E0E0",
    backgroundColor: "#F5F5F5",
  },
  countryCodeText: { fontSize: 14, color: "#424242", fontWeight: "600" },
  phoneInput: {
    flex: 1, fontSize: 16, color: "#1A1A2E",
    paddingHorizontal: 14, paddingVertical: 16,
  },

  // OTP boxes
  otpRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 16 },
  otpBox: {
    flex: 1, height: 56,
    borderWidth: 1.5, borderColor: "#E0E0E0",
    borderRadius: 12, backgroundColor: "#FAFAFA",
    fontSize: 22, fontWeight: "700", color: "#1A1A2E",
    textAlign: "center",
  },
  otpBoxFilled: {
    borderColor: "#3730A3", backgroundColor: "#EEF2FF",
  },

  // Buttons
  primaryBtn: {
    backgroundColor: "#3730A3", borderRadius: 12,
    paddingVertical: 16, alignItems: "center", marginTop: 4,
    shadowColor: "#3730A3", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnDisabled: { opacity: 0.65 },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },

  secondaryBtn: {
    borderWidth: 1.5, borderColor: "#E0E0E0",
    borderRadius: 12, paddingVertical: 14,
    alignItems: "center", marginTop: 10,
    backgroundColor: "#FAFAFA",
  },
  secondaryBtnText: { color: "#424242", fontSize: 15, fontWeight: "600" },

  resendBtn: { alignItems: "center", marginTop: 16 },
  resendText: { fontSize: 13, color: "#9E9E9E" },
  resendLink: { color: "#3730A3", fontWeight: "700" },

  error: {
    color: "#C62828", fontSize: 13, marginBottom: 10,
    backgroundColor: "#FFEBEE", padding: 10, borderRadius: 8,
    borderLeftWidth: 3, borderLeftColor: "#C62828",
  },
  footer: { color: "#BDBDBD", fontSize: 12, marginTop: 24, textAlign: "center" },
});
