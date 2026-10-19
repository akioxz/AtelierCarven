import { useEffect } from "react";
import { Pressable, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  FadeIn,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Cap stagger delays so long lists don't cascade forever. */
export function staggerDelay(index: number, step: number = 24, cap: number = 4): number {
  return Math.min(Math.min(index, cap) * step, 120);
}

function revealEntering(delay: number) {
  return FadeIn.duration(160).delay(Math.min(delay, 120)).easing(Easing.out(Easing.quad));
}

export function Reveal({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  if (reduced) {
    return <Animated.View style={style}>{children}</Animated.View>;
  }
  return <Animated.View entering={revealEntering(delay)} style={style}>{children}</Animated.View>;
}

export function ScreenFade({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  if (reduced) return <Animated.View style={style}>{children}</Animated.View>;
  return <Animated.View entering={FadeIn.duration(160).easing(Easing.out(Easing.quad))} style={style}>{children}</Animated.View>;
}

export function PressScale({
  children,
  onPress,
  onPressIn,
  onPressOut,
  style,
  contentStyle,
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
  contentStyle?: StyleProp<ViewStyle>;
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
    if (disabled) {
      // eslint-disable-next-line react-hooks/immutability
      scale.value = 1;
    }
  }, [disabled, scale]);

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
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
        if (!reduced) {
          // eslint-disable-next-line react-hooks/immutability
          scale.value = withTiming(0.985, { duration: 80, easing: Easing.out(Easing.quad) });
        }
        onPressIn?.();
      }}
      onPressOut={() => {
        if (!reduced) {
          // eslint-disable-next-line react-hooks/immutability
          scale.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) });
        }
        onPressOut?.();
      }}
    >
      {contentStyle ? <View style={contentStyle}>{children}</View> : children}
    </AnimatedPressable>
  );
}
