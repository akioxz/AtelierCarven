import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "TOKEN_REFRESHED") return;

        if (
          event === "SIGNED_OUT" ||
          (event === "INITIAL_SESSION" && !session)
        ) {
          router.replace("/(auth)/onboarding");
          return;
        }

        // Handle invalid/expired token errors
        if (!session) {
          await supabase.auth.signOut();
          router.replace("/(auth)/onboarding");
        }
      }
    );

    // Also handle refresh token errors globally
    const handleTokenError = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          await supabase.auth.signOut();
          router.replace("/(auth)/onboarding");
        }
      } catch {
        await supabase.auth.signOut();
        router.replace("/(auth)/onboarding");
      }
    };

    handleTokenError();

    return () => subscription.unsubscribe();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}