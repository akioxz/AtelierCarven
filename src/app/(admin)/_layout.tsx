import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Design } from "../../constants/design";
import { supabase } from "../../lib/supabase";
import { ShimmerBlock } from "../../components/skeleton";

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
  }, [router]);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 14, backgroundColor: Design.color.surface }}>
        <ShimmerBlock height={26} radius={12} width={150} />
        <ShimmerBlock height={12} radius={6} width={90} />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
