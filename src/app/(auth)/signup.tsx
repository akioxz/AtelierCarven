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
    TouchableOpacity,
    View,
} from "react-native";
import { Design } from "../../constants/design";
import { supabase } from "../../lib/supabase";

export default function Signup() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async () => {
    if (!username || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, role: "user" },
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    router.replace("/(user)/home");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>â†</Text>
          </TouchableOpacity>
          <View style={styles.brandRow}>
            <Text style={styles.brandSmall}>Atelier</Text>
            <Text style={styles.brandLarge}>CarvÃ©n</Text>
          </View>
          <View style={styles.goldDivider} />
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.title}>Create account.</Text>
          <Text style={styles.subtitle}>
            Join us and discover luxury furniture.
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>USERNAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={Design.color.inkMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="words"
            />
          </View>

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
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Min. 8 characters"
                placeholderTextColor={Design.color.inkMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeText}>
                  {showPassword ? "HIDE" : "SHOW"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor={Design.color.inkMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.secondaryButtonText}>
              Sign in to existing account
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Design.color.surface,
  },
  scroll: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: Design.color.surfaceMuted,
    padding: 40,
    paddingTop: 64,
    paddingBottom: 36,
  },
  backBtn: {
    marginBottom: 24,
  },
  backText: {
    fontSize: 22,
    color: Design.color.ink,
  },
  brandRow: {
    marginBottom: 16,
  },
  brandSmall: {
    fontSize: 12,
    letterSpacing: 4,
    color: Design.color.inkSoft,
  },
  brandLarge: {
    fontSize: 36,
    fontWeight: "300",
    color: Design.color.ink,
    letterSpacing: 2,
  },
  goldDivider: {
    width: 40,
    height: 1.5,
    backgroundColor: Design.color.gold,
  },
  form: {
    flex: 1,
    padding: 32,
    paddingTop: 36,
  },
  title: {
    fontSize: 26,
    fontWeight: "500",
    color: Design.color.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: Design.color.inkMuted,
    marginBottom: 32,
  },
  errorBox: {
    backgroundColor: "#FDF0F0",
    borderLeftWidth: 3,
    borderLeftColor: Design.color.danger,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 13,
    color: Design.color.danger,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 10,
    letterSpacing: 2,
    color: Design.color.inkSoft,
    marginBottom: 8,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: Design.color.line,
    paddingVertical: 12,
    fontSize: 15,
    color: Design.color.ink,
    backgroundColor: "transparent",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  eyeBtn: {
    paddingLeft: 12,
    paddingVertical: 12,
  },
  eyeText: {
    fontSize: 10,
    letterSpacing: 1,
    color: Design.color.gold,
  },
  primaryButton: {
    backgroundColor: Design.color.ink,
    borderRadius: Design.radius.small,
    padding: 18,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 24,
  },
  primaryButtonText: {
    color: Design.color.surface,
    fontSize: 11,
    letterSpacing: 2,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Design.color.line,
  },
  dividerText: {
    fontSize: 12,
    color: Design.color.inkMuted,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Design.color.gold,
    borderRadius: Design.radius.small,
    padding: 17,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: Design.color.inkSoft,
    fontSize: 13,
    letterSpacing: 1,
  },
});

