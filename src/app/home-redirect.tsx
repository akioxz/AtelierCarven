import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/(auth)/onboarding");
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (error || !profile) {
          // Fallback to user metadata if profile table fetch fails
          const role = session.user.user_metadata?.role;
          if (role === "admin") {
            router.replace("/(admin)/dashboard");
          } else {
            router.replace("/(user)/home");
          }
          return;
        }

        if (profile.role === "admin") {
          router.replace("/(admin)/dashboard");
        } else {
          router.replace("/(user)/home");
        }
      } catch {
        router.replace("/(auth)/onboarding");
      }
    };

    checkSession();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#C9A96E" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F0E8",
    justifyContent: "center",
    alignItems: "center",
  },
});
