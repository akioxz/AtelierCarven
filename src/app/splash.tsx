import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Design } from "../constants/design";

export default function Splash() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const lineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
      ]),
      Animated.timing(lineAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: false,
        easing: Easing.out(Easing.ease),
      }),
    ]).start();

    const timer = setTimeout(() => {
      router.replace("/home-redirect");
    }, 2500);

    return () => clearTimeout(timer);
  }, [fadeAnim, slideAnim, lineAnim, router]);

  return (
    <View style={styles.container}>
      <View style={styles.circleOuter} />
      <View style={styles.circleInner} />

      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.estText}>EST. 2026</Text>
        <Text style={styles.atelierText}>Atelier</Text>
        <Text style={styles.carvenText}>Carvén</Text>

        <Animated.View
          style={[
            styles.goldLine,
            {
              width: lineAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "30%"],
              }),
            },
          ]}
        />

        <Text style={styles.tagline}>
          Handcrafted furniture for the discerning home.
        </Text>
      </Animated.View>

      <Animated.View style={[styles.bottom, { opacity: fadeAnim }]}>
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
