import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { supabase } from "../../lib/supabase";

export default function AdminLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verify = async () => {
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

        if (role !== "admin") {
          router.replace("/(user)/home");
          return;
        }

        setChecking(false);
      } catch {
        router.replace("/(auth)/onboarding");
      }
    };

    verify();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FAFAF8" }}>
        <ActivityIndicator color="#C9A96E" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
