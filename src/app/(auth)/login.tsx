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
import { supabase } from "../../lib/supabase";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // Fetch the user's profile to get their correct role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user?.id)
      .single();

    setLoading(false);

    const role = profile?.role || data.user?.user_metadata?.role;
    if (role === "admin") {
      router.replace("/(admin)/dashboard");
    } else {
      router.replace("/(user)/home");
    }
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
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={styles.brandRow}>
            <Text style={styles.brandSmall}>Atelier</Text>
            <Text style={styles.brandLarge}>Carvén</Text>
          </View>
          <View style={styles.goldDivider} />
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.title}>Welcome back.</Text>
          <Text style={styles.subtitle}>Sign in to continue your journey.</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor="#C4B8A8"
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
                placeholder="••••••••"
                placeholderTextColor="#C4B8A8"
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

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "SIGNING IN..." : "SIGN IN"}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/(auth)/signup")}
          >
            <Text style={styles.secondaryButtonText}>Create an account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAF8",
  },
  scroll: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: "#F5F0E8",
    padding: 40,
    paddingTop: 64,
    paddingBottom: 36,
  },
  backBtn: {
    marginBottom: 24,
  },
  backText: {
    fontSize: 22,
    color: "#1C1C1A",
  },
  brandRow: {
    marginBottom: 16,
  },
  brandSmall: {
    fontSize: 12,
    letterSpacing: 4,
    color: "#8B7355",
  },
  brandLarge: {
    fontSize: 36,
    fontWeight: "300",
    color: "#1C1C1A",
    letterSpacing: 2,
  },
  goldDivider: {
    width: 40,
    height: 1.5,
    backgroundColor: "#C9A96E",
  },
  form: {
    flex: 1,
    padding: 32,
    paddingTop: 36,
  },
  title: {
    fontSize: 26,
    fontWeight: "500",
    color: "#1C1C1A",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#9E8E7E",
    marginBottom: 32,
  },
  errorBox: {
    backgroundColor: "#FDF0F0",
    borderLeftWidth: 3,
    borderLeftColor: "#E07070",
    borderRadius: 0,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 13,
    color: "#C05050",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#8B7355",
    marginBottom: 8,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#E8E0D0",
    paddingVertical: 12,
    fontSize: 15,
    color: "#1C1C1A",
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
    color: "#C9A96E",
  },
  primaryButton: {
    backgroundColor: "#1C1C1A",
    borderRadius: 10,
    padding: 18,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 24,
  },
  primaryButtonText: {
    color: "#FAFAF8",
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
    backgroundColor: "#E8E0D0",
  },
  dividerText: {
    fontSize: 12,
    color: "#9E8E7E",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#C9A96E",
    borderRadius: 10,
    padding: 17,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#8B7355",
    fontSize: 13,
    letterSpacing: 1,
  },
});
