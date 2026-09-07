import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Design } from "../../constants/design";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export default function OrderSuccess() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : 0.8);
  const fade = useSharedValue(0);
  const slide = useSharedValue(reduced ? 0 : 40);

  useEffect(() => {
    scale.set(withSpring(1, { duration: 420, dampingRatio: 0.65, reduceMotion: ReduceMotion.System }));
    fade.set(withDelay(120, withTiming(1, { duration: 380, easing: EASE_OUT, reduceMotion: ReduceMotion.System })));
    slide.set(withDelay(120, withTiming(0, { duration: 380, easing: EASE_OUT, reduceMotion: ReduceMotion.System })));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [scale, fade, slide]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: scale.get(),
    transform: [{ scale: scale.get() }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ translateY: slide.get() }],
  }));
  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: fade.get(),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.circleOuter} />
      <View style={styles.circleInner} />

      {/* Animated checkmark */}
      <Animated.View style={[styles.iconWrapper, iconStyle]}>
        <View style={styles.iconCircle}>
          <Feather name="check" size={40} color={Design.color.surface} />
        </View>
      </Animated.View>

      {/* Text */}
      <Animated.View style={[styles.textBlock, textStyle]}>
        <Text style={styles.title}>Order Placed!</Text>
        <View style={styles.goldDivider} />
        <Text style={styles.subtitle}>
          Thank you for your purchase.{"\n"}Your order is being processed.
        </Text>

        <View style={styles.infoRow}>
          <Feather name="truck" size={14} color={Design.color.inkSoft} />
          <Text style={styles.infoText}>
            Estimated delivery: 3–5 business days
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Feather name="mail" size={14} color={Design.color.inkSoft} />
          <Text style={styles.infoText}>
            Confirmation will be sent to your email
          </Text>
        </View>
      </Animated.View>

      {/* Buttons */}
      <Animated.View style={[styles.buttons, buttonsStyle]}>
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace("/(user)/home")}
        >
          <Feather name="home" size={15} color={Design.color.surface} />
          <Text style={styles.homeBtnText}>BACK TO HOME</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Design.color.canvas,
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
    borderColor: Design.color.gold,
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
    borderColor: Design.color.gold,
    opacity: 0.1,
  },
  iconWrapper: { marginBottom: 32 },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Design.color.ink,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: Design.color.gold,
  },
  textBlock: { alignItems: "center", marginBottom: 40 },
  title: {
    fontSize: 36,
    fontFamily: Design.font.display,
    color: Design.color.ink,
    letterSpacing: -0.8,
    marginBottom: 16,
  },
  goldDivider: {
    width: 40,
    height: 1.5,
    backgroundColor: Design.color.gold,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Design.font.body,
    color: Design.color.inkSoft,
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
  infoText: { fontSize: 12, fontFamily: Design.font.body, color: Design.color.inkMuted },
  buttons: { width: "100%" },
  homeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Design.color.ink,
    borderRadius: Design.radius.small,
    padding: 18,
  },
  homeBtnText: { color: Design.color.surface, fontSize: 11, fontFamily: Design.font.bodyBold, letterSpacing: 2 },
});
