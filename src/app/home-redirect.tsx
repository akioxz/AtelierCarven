import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Design } from "../constants/design";
import { supabase } from "../lib/supabase";
import { ShimmerBlock } from "../components/skeleton";

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
      <ShimmerBlock height={26} radius={12} width={150} />
      <ShimmerBlock height={12} radius={6} width={90} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Design.color.surface,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
});
