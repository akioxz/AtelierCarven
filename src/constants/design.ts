export const Design = {
  color: {
    canvas: "#E9E3D6",
    surface: "#F5F0E4",
    surfaceMuted: "#DDD5C4",
    ink: "#1D1B17",
    inkSoft: "#5A554B",
    inkMuted: "#76705F",
    line: "#CFC6B2",
    accent: "#B5501E",
    accentDeep: "#8A3A12",
    accentSoft: "#E3C6A3",
    inkWash: "rgba(29,27,23,0.55)",
    success: "#39553A",
    danger: "#A3312F",
  },
  shadow: {
    card: { shadowColor: "#1D1B17", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  },
  font: {
    display: "Archivo_700Bold",
    displayMedium: "Archivo_600SemiBold",
    body: "Archivo_400Regular",
    bodyMedium: "Archivo_500Medium",
    bodySemibold: "Archivo_600SemiBold",
    bodyBold: "Archivo_700Bold",
    mono: "IBMPlexMono_400Regular",
    monoMedium: "IBMPlexMono_500Medium",
    monoBold: "IBMPlexMono_600SemiBold",
  },
  space: { xs: 6, sm: 10, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 72 },
  radius: { small: 4, card: 10, sheet: 14, pill: 999 },
  motion: {
    stagger: 70,
    quick: 140,
    base: 240,
    slow: 400,
    revealY: 18,
    spring: { damping: 22, stiffness: 260 },
    pressScale: 0.972,
  },
} as const;

export const layout = {
  narrowBreakpoint: 500,
  desktopBreakpoint: 900,
  pageMaxWidth: 1180,
};