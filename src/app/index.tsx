import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { Design } from "../constants/design";
import { supabase } from "../lib/supabase";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export default function Index() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const fade = useSharedValue(0);
  const slide = useSharedValue(30);
  const line = useSharedValue(0);

  useEffect(() => {
    if (!reduced) {
      fade.set(withTiming(1, { duration: 900, easing: EASE_OUT, reduceMotion: ReduceMotion.System }));
      slide.set(withTiming(0, { duration: 900, easing: EASE_OUT, reduceMotion: ReduceMotion.System }));
      line.set(withDelay(700, withTiming(1, { duration: 550, easing: EASE_OUT, reduceMotion: ReduceMotion.System })));
    } else {
      fade.set(1);
      slide.set(0);
      line.set(1);
    }

    const timer = setTimeout(async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          await supabase.auth.signOut();
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
        await supabase.auth.signOut();
        router.replace("/(auth)/onboarding");
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [fade, line, reduced, router, slide]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ translateY: slide.get() }],
  }));
  const lineStyle = useAnimatedStyle(() => ({
    width: `${line.get() * 30}%`,
  }));
  const bottomStyle = useAnimatedStyle(() => ({
    opacity: fade.get(),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.circleOuter} />
      <View style={styles.circleInner} />

      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <Text style={styles.estText}>EST. 2026</Text>
        <Text style={styles.atelierText}>Atelier</Text>
        <Text style={styles.carvenText}>Carvén</Text>

        <Animated.View style={[styles.goldLine, lineStyle]} />

        <Text style={styles.tagline}>
          Handcrafted furniture for the discerning home.
        </Text>
      </Animated.View>

      <Animated.View style={[styles.bottom, bottomStyle]}>
        <Text style={styles.bottomText}>LUXURY · CRAFTED · TIMELESS</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Design.color.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  circleOuter: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: Design.color.gold,
    opacity: 0.2,
  },
  circleInner: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: Design.color.gold,
    opacity: 0.15,
  },
  logoContainer: {
    alignItems: "center",
    gap: 8,
  },
  estText: {
    fontSize: 10,
    letterSpacing: 4,
    color: Design.color.inkSoft,
    marginBottom: 8,
  },
  atelierText: {
    fontSize: 16,
    letterSpacing: 6,
    color: Design.color.inkSoft,
    fontWeight: "300",
  },
  carvenText: {
    fontSize: 52,
    fontWeight: "300",
    color: Design.color.ink,
    letterSpacing: 4,
    marginBottom: 8,
  },
  goldLine: {
    height: 1.5,
    backgroundColor: Design.color.gold,
    alignSelf: "center",
    marginBottom: 16,
  },
  tagline: {
    fontSize: 12,
    color: Design.color.inkMuted,
    letterSpacing: 1,
    textAlign: "center",
    maxWidth: 220,
    lineHeight: 20,
  },
  bottom: {
    position: "absolute",
    bottom: 48,
  },
  bottomText: {
    fontSize: 9,
    letterSpacing: 3,
    color: Design.color.gold,
  },
});
