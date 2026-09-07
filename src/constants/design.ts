export const Design = {
  color: {
    canvas: "#F8F5F0",
    surface: "#FFFCF8",
    surfaceMuted: "#F1E9DE",
    ink: "#211A16",
    inkSoft: "#65594F",
    inkMuted: "#897B70",
    line: "#DED2C4",
    gold: "#A87842",
    goldSoft: "#E9D8C2",
    success: "#2F6D52",
    danger: "#A7473A",
  },
  font: {
    display: "CormorantGaramond_600SemiBold",
    displayMedium: "CormorantGaramond_500Medium",
    body: "Manrope_400Regular",
    bodyMedium: "Manrope_500Medium",
    bodySemibold: "Manrope_600SemiBold",
    bodyBold: "Manrope_700Bold",
  },
  space: { xs: 6, sm: 10, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { small: 10, card: 16, sheet: 24, pill: 999 },
} as const;

export const layout = {
  desktopBreakpoint: 900,
  pageMaxWidth: 1180,
};
