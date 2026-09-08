import { useEffect } from "react";
import { StyleSheet, View, type DimensionValue, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { Design } from "../constants/design";

export function ShimmerBlock({ width, height, radius = Design.radius.small, style }: { width: DimensionValue; height: number; radius?: number; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    if (reduced) {
      opacity.value = 0.55;
      return;
    }
    opacity.value = withRepeat(withTiming(0.85, { duration: 900 }), -1, true);
  }, [opacity, reduced]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <View style={[{ width, height, borderRadius: radius, overflow: "hidden" }, style]}>
      <Animated.View style={[styles.shimmer, animatedStyle]} />
    </View>
  );
}

export function CardSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <ShimmerBlock width="100%" height={148} radius={Design.radius.card} />
      <ShimmerBlock width="62%" height={12} />
      <ShimmerBlock width="38%" height={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  shimmer: { backgroundColor: Design.color.surfaceMuted, height: "100%", width: "100%" },
  card: { backgroundColor: Design.color.surface, borderRadius: Design.radius.card, gap: 10, padding: 12 },
});
