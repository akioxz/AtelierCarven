import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
    Animated,
    Easing,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function OrderSuccess() {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [scaleAnim, fadeAnim, slideAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.circleOuter} />
      <View style={styles.circleInner} />

      {/* Animated checkmark */}
      <Animated.View
        style={[styles.iconWrapper, { transform: [{ scale: scaleAnim }] }]}
      >
        <View style={styles.iconCircle}>
          <Feather name="check" size={40} color="#FAFAF8" />
        </View>
      </Animated.View>

      {/* Text */}
      <Animated.View
        style={[
          styles.textBlock,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.title}>Order Placed!</Text>
        <View style={styles.goldDivider} />
        <Text style={styles.subtitle}>
          Thank you for your purchase.{"\n"}Your order is being processed.
        </Text>

        <View style={styles.infoRow}>
          <Feather name="truck" size={14} color="#8B7355" />
          <Text style={styles.infoText}>
            Estimated delivery: 3–5 business days
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Feather name="mail" size={14} color="#8B7355" />
          <Text style={styles.infoText}>
            Confirmation will be sent to your email
          </Text>
        </View>
      </Animated.View>

      {/* Buttons */}
      <Animated.View style={[styles.buttons, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace("/(user)/home")}
        >
          <Feather name="home" size={15} color="#FAFAF8" />
          <Text style={styles.homeBtnText}>BACK TO HOME</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F0E8",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  circleOuter: {
    position: "absolute",
    bottom: -100,
    left: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    borderWidth: 1,
    borderColor: "#C9A96E",
    opacity: 0.15,
  },
  circleInner: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#C9A96E",
    opacity: 0.1,
  },
  iconWrapper: { marginBottom: 32 },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#1C1C1A",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#C9A96E",
  },
  textBlock: { alignItems: "center", marginBottom: 40 },
  title: {
    fontSize: 32,
    fontWeight: "300",
    color: "#1C1C1A",
    letterSpacing: 2,
    marginBottom: 16,
  },
  goldDivider: {
    width: 40,
    height: 1.5,
    backgroundColor: "#C9A96E",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B5E4E",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  infoText: { fontSize: 12, color: "#8B7355" },
  buttons: { width: "100%" },
  homeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#1C1C1A",
    borderRadius: 12,
    padding: 18,
  },
  homeBtnText: { color: "#FAFAF8", fontSize: 11, letterSpacing: 2 },
});
