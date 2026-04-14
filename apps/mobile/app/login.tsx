import { useState, useRef, useEffect } from "react";
import {
  View, StyleSheet, KeyboardAvoidingView, Platform,
  TouchableOpacity, TextInput as RNTextInput,
  ScrollView, NativeSyntheticEvent, TextInputKeyPressEventData,
} from "react-native";
import { Image } from "expo-image";
import { Text } from "react-native-paper";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useAuth } from "@/src/context/AuthContext";
import { requestOtpEmail, verifyOtpEmail, savePushToken } from "@/src/api/auth";

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

type Step = "email" | "otp";
const OTP_LENGTH = 6;

export default function LoginScreen() {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const otpRefs = useRef<(RNTextInput | null)[]>([]);

  useEffect(() => {
    if (step === "otp") setTimeout(() => otpRefs.current[0]?.focus(), 100);
  }, [step]);

  async function handleSendOtp() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(""); setLoading(true);
    try {
      await requestOtpEmail(email);
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
      const { token, parent } = await verifyOtpEmail(email, otp);
      await AsyncStorage.setItem("auth_token", token);
      await AsyncStorage.setItem("parent", JSON.stringify(parent));
      login(email);
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
        {/* Header — white background so logo blends in */}
        <View style={styles.header}>
          <Image
            source={require("@/assets/images/kap_logo.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.brandSub}>Parent Attendance Portal</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {step === "email" ? (
            <>
              <Text style={styles.cardTitle}>Sign In</Text>
              <Text style={styles.cardSub}>Enter your registered email address to continue</Text>

              <Text style={styles.label}>Email Address</Text>
              <RNTextInput
                style={styles.emailInput}
                placeholder="yourname@gmail.com"
                placeholderTextColor="#BDBDBD"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(""); }}
                returnKeyType="done"
                onSubmitEditing={handleSendOtp}
              />

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
                <Text style={styles.emailHighlight}>{email}</Text>
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
                onPress={() => { setStep("email"); setOtpDigits(Array(OTP_LENGTH).fill("")); setError(""); }}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>Change email</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSendOtp} style={styles.resendBtn}>
                <Text style={styles.resendText}>
                  Didn&apos;t receive OTP? <Text style={styles.resendLink}>Resend</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.footer}>Secure login powered by KAP Edutech</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingVertical: 40 },

  header: { alignItems: "center", marginBottom: 28, backgroundColor: "#FFFFFF" },
  logo: { width: 200, height: 64, marginBottom: 10 },
  brandSub: { fontSize: 13, color: "#9CA3AF", marginTop: 4 },

  card: {
    width: "100%", backgroundColor: "#FFFFFF",
    borderRadius: 20, padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 5,
    borderWidth: 1, borderColor: "#F3F4F6",
  },
  cardTitle: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 6 },
  cardSub: { fontSize: 14, color: "#757575", marginBottom: 22, lineHeight: 20 },
  emailHighlight: { color: "#0064E0", fontWeight: "700" },
  label: { fontSize: 12, fontWeight: "700", color: "#424242", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },

  emailInput: {
    width: "100%", fontSize: 15, color: "#111827",
    paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: "#E5E7EB",
    borderRadius: 12, marginBottom: 14,
    backgroundColor: "#FAFAFA",
  },

  otpRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 16 },
  otpBox: {
    flex: 1, height: 56,
    borderWidth: 1.5, borderColor: "#E5E7EB",
    borderRadius: 12, backgroundColor: "#FAFAFA",
    fontSize: 22, fontWeight: "700", color: "#111827",
    textAlign: "center",
  },
  otpBoxFilled: { borderColor: "#0064E0", backgroundColor: "#EEF6FF" },

  primaryBtn: {
    backgroundColor: "#0064E0", borderRadius: 100,
    paddingVertical: 16, alignItems: "center", marginTop: 4,
    shadowColor: "#0064E0", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  btnDisabled: { opacity: 0.65 },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },

  secondaryBtn: {
    borderWidth: 1.5, borderColor: "#E5E7EB",
    borderRadius: 12, paddingVertical: 14,
    alignItems: "center", marginTop: 10,
    backgroundColor: "#FAFAFA",
  },
  secondaryBtnText: { color: "#424242", fontSize: 15, fontWeight: "600" },

  resendBtn: { alignItems: "center", marginTop: 16 },
  resendText: { fontSize: 13, color: "#9E9E9E" },
  resendLink: { color: "#0064E0", fontWeight: "700" },

  error: {
    color: "#C62828", fontSize: 13, marginBottom: 10,
    backgroundColor: "#FFEBEE", padding: 10, borderRadius: 8,
    borderLeftWidth: 3, borderLeftColor: "#C62828",
  },
  footer: { color: "#BDBDBD", fontSize: 12, marginTop: 24, textAlign: "center" },
});
