import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Design } from "../constants/design";
import { supabase } from "../lib/supabase";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          router.replace("/(auth)/onboarding");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        const role = profile?.role || session.user.user_metadata?.role;
        if (role === "admin") {
          router.replace("/(admin)/dashboard");
        } else {
          router.replace("/(user)/home");
        }
      } catch {
        router.replace("/(auth)/onboarding");
      }
    })();
  }, [router]);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: { backgroundColor: Design.color.canvas, flex: 1 },
});