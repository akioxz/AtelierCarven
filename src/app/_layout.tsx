import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useFonts } from "expo-font";
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import {
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
} from "@expo-google-fonts/cormorant-garamond";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    ...AntDesign.font,
    ...Feather.font,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

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
  }, [router]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
