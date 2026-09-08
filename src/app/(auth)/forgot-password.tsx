import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ContentFrame, TextLink } from "../../components/app-ui";
import { PressScale, Reveal } from "../../components/motion";
import { Design } from "../../constants/design";
import { supabase } from "../../lib/supabase";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Enter the email address you use to sign in.");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: "ateliercarven://reset-password",
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ContentFrame>
          <View style={styles.card}>
            <PressScale onPress={() => router.back()} style={styles.backBtn} hitSlop={8} accessibilityLabel="Go back">
              <Feather name="arrow-left" size={18} color={Design.color.ink} />
            </PressScale>
            <View style={styles.brand}>
              <Text style={styles.brandSmall}>ATELIER</Text>
              <Text style={styles.brandLarge}>Carvén</Text>
              <View style={styles.goldDivider} />
            </View>
            <View style={styles.form}>
              {sent ? (
                <Reveal>
                <View style={styles.success}>
                  <View style={styles.successIcon}>
                    <Feather name="check" size={22} color={Design.color.success} />
                  </View>
                  <Text style={styles.title}>Check your inbox.</Text>
                  <Text style={styles.subtitle}>
                    We sent a reset link to {email.trim()}. Open it to choose a new password. If it doesn&apos;t
                    arrive in a few minutes, check your spam folder.
                  </Text>
                  <PressScale style={styles.primaryButton} onPress={() => router.replace("/(auth)/login")} accessibilityLabel="Back to sign in">
                    <Text style={styles.primaryButtonText}>BACK TO SIGN IN</Text>
                  </PressScale>
                </View>
                </Reveal>
              ) : (
                <>
                  <Reveal>
                  <Text style={styles.title}>Reset your password.</Text>
                  <Text style={styles.subtitle}>
                    Enter the email linked to your account and we&apos;ll send you a secure reset link.
                  </Text>
                  {error ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}
                  </Reveal>
                  <Reveal delay={80}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>EMAIL ADDRESS</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="your@email.com"
                      placeholderTextColor={Design.color.inkMuted}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      textContentType="emailAddress"
                    />
                  </View>
                  </Reveal>
                  <Reveal delay={160}>
                  <PressScale style={styles.primaryButton} onPress={handleSubmit} disabled={loading} accessibilityLabel="Send reset link">
                    <Text style={styles.primaryButtonText}>{loading ? "SENDING..." : "SEND RESET LINK"}</Text>
                  </PressScale>
                  <TextLink label="Return to sign in" onPress={() => router.back()} style={styles.backLink} />
                  </Reveal>
                </>
              )}
            </View>
          </View>
        </ContentFrame>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Design.color.canvas },
  scroll: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  card: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: Design.color.surface,
    borderRadius: Design.radius.card,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  backBtn: { position: "absolute", top: 20, left: 20, zIndex: 2, backgroundColor: Design.color.surface, borderRadius: 20, padding: 8 },
  brand: { backgroundColor: Design.color.surfaceMuted, padding: 36, paddingTop: 64, paddingBottom: 28 },
  brandSmall: { fontSize: 11, letterSpacing: 4, color: Design.color.inkSoft, fontFamily: Design.font.bodySemibold },
  brandLarge: { fontFamily: Design.font.display, fontSize: 36, letterSpacing: -1.0, lineHeight: 36, color: Design.color.ink, marginBottom: 8, marginTop: 4 },
  goldDivider: { width: 40, height: 1.5, backgroundColor: Design.color.gold },
  form: { flex: 1, padding: 32, paddingTop: 36 },
  title: { fontSize: 26, fontFamily: Design.font.display, letterSpacing: -0.5, color: Design.color.ink, marginBottom: 8 },
  subtitle: { fontSize: 13, color: Design.color.inkMuted, lineHeight: 21, marginBottom: 32 },
  errorBox: { backgroundColor: "#FDF0F0", borderLeftWidth: 3, borderLeftColor: Design.color.danger, padding: 12, marginBottom: 20 },
  errorText: { fontSize: 13, color: Design.color.danger },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 11, letterSpacing: 2, color: Design.color.inkSoft, marginBottom: 8, fontFamily: Design.font.bodySemibold },
  input: { borderBottomWidth: 1, borderBottomColor: Design.color.line, paddingVertical: 12, fontSize: 15, color: Design.color.ink, backgroundColor: "transparent" },
  primaryButton: { backgroundColor: Design.color.ink, borderRadius: Design.radius.small, padding: 18, alignItems: "center", marginTop: 4 },
  primaryButtonText: { color: Design.color.surface, fontSize: 11, letterSpacing: 2, fontFamily: Design.font.bodyBold },
  backLink: { alignSelf: "center", marginTop: 20 },
  success: { alignItems: "flex-start" },
  successIcon: { backgroundColor: "#EAF3DE", borderRadius: 26, height: 52, justifyContent: "center", alignItems: "center", marginBottom: 18, width: 52 },
});