import { useEffect } from "react";
import { Pressable, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Design } from "../constants/design";

/** Cap stagger delays so long lists don't cascade forever. */
export function staggerDelay(index: number, step: number = Design.motion.stagger, cap: number = 6): number {
  return Math.min(index, cap) * step;
}

function revealEntering(delay: number) {
  return FadeInUp.duration(Design.motion.base).delay(delay).springify().damping(Design.motion.spring.damping);
}

export function Reveal({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}) {
  const reduced = useReducedMotion();
  if (reduced) {
    return <Animated.View entering={FadeIn.duration(Design.motion.quick)} style={style}>{children}</Animated.View>;
  }
  return <Animated.View entering={revealEntering(delay)} style={style}>{children}</Animated.View>;
}

export function ScreenFade({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  if (reduced) return <Animated.View style={style}>{children}</Animated.View>;
  return <Animated.View entering={FadeIn.duration(Design.motion.base)} style={style}>{children}</Animated.View>;
}

export function PressScale({
  children,
  onPress,
  onPressIn,
  onPressOut,
  style,
  accessibilityRole = "button",
  accessibilityLabel,
  accessibilityState,
  disabled = false,
  hitSlop,
}: {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: "button" | "tab" | "link" | "radio";
  accessibilityLabel?: string;
  accessibilityState?: { selected?: boolean; checked?: boolean; disabled?: boolean };
  disabled?: boolean;
  hitSlop?: number;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    if (disabled) scale.value = 1;
  }, [disabled, scale]);

  return (
    <Pressable
      style={style}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={(event) => {
        if (!reduced) void Haptics.selectionAsync().catch(() => {});
        onPress?.(event);
      }}
      onPressIn={() => {
        if (!reduced) scale.value = withSpring(Design.motion.pressScale, Design.motion.spring);
        onPressIn?.();
      }}
      onPressOut={() => {
        if (!reduced) scale.value = withSpring(1, Design.motion.spring);
        onPressOut?.();
      }}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
}
