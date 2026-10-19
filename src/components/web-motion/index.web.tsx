import { Design } from "../../constants/design";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

let gsapLoader: Promise<typeof import("gsap")> | null = null;
function loadGsap() {
  gsapLoader ||= import("gsap");
  return gsapLoader;
}

export function EntryVeil() {
  const [done, setDone] = useState(false);
  const ref = useRef<View>(null);

  useEffect(() => {
    const node = ref.current;
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!node || reduce) {
      setDone(true);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        const { gsap } = await loadGsap();
        if (cancelled) return;
        gsap.fromTo(
          node,
          { opacity: 1 },
          {
            opacity: 0,
            duration: 0.45,
            delay: 0.15,
            ease: "power2.inOut",
            onComplete: () => {
              if (!cancelled) setDone(true);
            },
          }
        );
      } catch {
        if (!cancelled) setDone(true);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (done) return null;

  return (
    <View
      ref={ref}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.veil}
    />
  );
}

const styles = StyleSheet.create({
  veil: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    backgroundColor: Design.color.surfaceMuted,
    zIndex: 1000,
  },
});