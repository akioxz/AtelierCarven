import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

export default function ResetPassword() {
  const router = useRouter();
  const url = Linking.useURL();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!url || ready) return;
    const currentUrl = url;
    let cancelled = false;
    async function resolveLink() {
      const { queryParams } = Linking.parse(currentUrl);
      const accessToken = queryParams?.access_token;
      const refreshToken = queryParams?.refresh_token;
      if (typeof accessToken === "string" && typeof refreshToken === "string") {
        const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        return sessionError ? "This reset link is invalid or has expired. Request a new one." : "";
      }
      return "This reset link is missing its verification tokens. Request a new one.";
    }
    async function prepare() {
      const message = await resolveLink();
      if (cancelled) return;
      setReady(true);
      if (message) setError(message);
    }
    void prepare();
    return () => { cancelled = true; };
  }, [url, ready]);

  const handleSubmit = async () => {
    if (!password || password.length < 6) {
      setError("Your new password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ContentFrame>
          <View style={styles.card}>
            <View style={styles.brand}>
              <Text style={styles.brandSmall}>ATELIER</Text>
              <Text style={styles.brandLarge}>Carvén</Text>
              <View style={styles.accentDivider} />
            </View>
            <View style={styles.form}>
              {done ? (
                <Reveal>
                <View style={styles.success}>
                  <View style={styles.successIcon}>
                    <Feather name="check" size={22} color={Design.color.success} />
                  </View>
                  <Text style={styles.title}>Password updated.</Text>
                  <Text style={styles.subtitle}>Sign in with your new password to continue.</Text>
                  <PressScale style={styles.primaryButton} onPress={() => router.replace("/(auth)/login")} accessibilityLabel="Continue to sign in">
                    <Text style={styles.primaryButtonText}>CONTINUE TO SIGN IN</Text>
                  </PressScale>
                </View>
                </Reveal>
              ) : (
                <>
                  <Reveal>
                  <Text style={styles.title}>Choose a new password.</Text>
                  <Text style={styles.subtitle}>
                    Make it at least 6 characters long, and avoid reusing it elsewhere.
                  </Text>
                  {error ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}
                  </Reveal>
                  {ready ? (
                    <>
                      <Reveal delay={80}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>NEW PASSWORD</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="At least 6 characters"
                          placeholderTextColor={Design.color.inkMuted}
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry
                          autoCapitalize="none"
                          autoComplete="new-password"
                          textContentType="newPassword"
                        />
                      </View>
                      </Reveal>
                      <Reveal delay={160}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Repeat your new password"
                          placeholderTextColor={Design.color.inkMuted}
                          value={confirm}
                          onChangeText={setConfirm}
                          secureTextEntry
                          autoCapitalize="none"
                          autoComplete="new-password"
                          textContentType="newPassword"
                        />
                      </View>
                      </Reveal>
                      <Reveal delay={240}>
                      <PressScale style={styles.primaryButton} onPress={handleSubmit} disabled={loading} accessibilityLabel="Reset password">
                        <Text style={styles.primaryButtonText}>{loading ? "UPDATING..." : "RESET PASSWORD"}</Text>
                      </PressScale>
                      </Reveal>
                    </>
                  ) : null}
                  <Reveal delay={320}>
                  <TextLink label="Return to sign in" onPress={() => router.replace("/(auth)/login")} style={styles.backLink} />
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
    shadowColor: "#1D1B17",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  brand: { backgroundColor: Design.color.surfaceMuted, padding: 36, paddingTop: 64, paddingBottom: 28 },
  brandSmall: { fontSize: 11, letterSpacing: 4, color: Design.color.inkSoft, fontFamily: Design.font.bodySemibold },
  brandLarge: { fontFamily: Design.font.display, fontSize: 36, letterSpacing: -1.0, lineHeight: 36, color: Design.color.ink, marginBottom: 8, marginTop: 4 },
  accentDivider: { width: 40, height: 1.5, backgroundColor: Design.color.accent },
  form: { flex: 1, padding: 32, paddingTop: 36 },
  title: { fontSize: 26, fontFamily: Design.font.display, letterSpacing: -0.5, color: Design.color.ink, marginBottom: 8 },
  subtitle: { fontSize: 13, color: Design.color.inkMuted, lineHeight: 21, marginBottom: 32 },
  errorBox: { backgroundColor: "#F2DBD7", borderLeftWidth: 3, borderLeftColor: Design.color.danger, padding: 12, marginBottom: 20 },
  errorText: { fontSize: 13, color: Design.color.danger },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 11, letterSpacing: 2, color: Design.color.inkSoft, marginBottom: 8, fontFamily: Design.font.bodySemibold },
  input: { borderBottomWidth: 1, borderBottomColor: Design.color.line, paddingVertical: 12, fontSize: 15, color: Design.color.ink, backgroundColor: "transparent" },
  primaryButton: { backgroundColor: Design.color.ink, borderRadius: Design.radius.small, padding: 18, alignItems: "center", marginTop: 4 },
  primaryButtonText: { color: Design.color.surface, fontSize: 11, letterSpacing: 2, fontFamily: Design.font.bodyBold },
  backLink: { alignSelf: "center", marginTop: 20 },
  success: { alignItems: "flex-start" },
  successIcon: { backgroundColor: "#E2EAD9", borderRadius: Design.radius.small, height: 52, justifyContent: "center", alignItems: "center", marginBottom: 18, width: 52 },
});