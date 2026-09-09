import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, StatusBar, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandMark, PrimaryButton } from "../../components/app-ui";
import { PressScale, Reveal } from "../../components/motion";
import { Design, layout } from "../../constants/design";

const STYLE_OPTIONS = ["Minimalist", "Mid-Century", "Industrial", "Bohemian", "Classic", "Modern", "Rustic", "Eclectic"];

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && width >= layout.desktopBreakpoint;
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  const toggleStyle = (style: string) => {
    setSelectedStyles(prev => 
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    );
  };

  const handleContinue = () => {
    router.push({
      pathname: "/(auth)/signup",
      params: { styles: selectedStyles.join(",") }
    });
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.shell, desktop && styles.shellDesktop, { paddingTop: Math.max(insets.top, 22), paddingBottom: Math.max(insets.bottom, 22) }]}>
        <View style={[styles.brandPanel, desktop && styles.brandPanelDesktop]}>
          <Reveal>
          <BrandMark />
          <View style={styles.brandRule} />
          <Text style={styles.established}>EST. 2026 · CURATED FOR HOME</Text>
          <Text style={[styles.brandStatement, desktop && styles.brandStatementDesktop]}>A considered home begins with a piece worth keeping.</Text>
          <Text style={styles.brandSupporting}>Explore furniture selected for the rituals, rooms, and quiet moments that make a space your own.</Text>
          {desktop ? <View style={styles.pillars}><Text style={styles.pillar}>MADE TO LAST</Text><Text style={styles.pillar}>CAREFULLY CURATED</Text><Text style={styles.pillar}>DELIVERED WITH CARE</Text></View> : null}
          </Reveal>
        </View>
        <View style={[styles.actionPanel, desktop && styles.actionPanelDesktop]}>
          <Reveal delay={120}>
          <Text style={[styles.title, desktop && styles.titleDesktop]}>What is your style?</Text>
          <Text style={styles.copy}>Select a few styles to help us curate pieces that feel like home.</Text>
          </Reveal>

          <Reveal delay={200}>
          <View style={styles.chipsContainer}>
            {STYLE_OPTIONS.map(style => {
              const isSelected = selectedStyles.includes(style);
              return (
                <PressScale
                  key={style}
                  onPress={() => toggleStyle(style)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{style}</Text>
                </PressScale>
              );
            })}
          </View>
          </Reveal>

          <Reveal delay={280}>
          <PrimaryButton label="EXPLORE THE COLLECTION" onPress={handleContinue} />
          <PressScale onPress={() => router.push("/(auth)/login")} style={styles.signIn}>
            <Text style={styles.signInText}>Already have an account?</Text><Text style={styles.signInLink}>Sign in</Text><Feather name="arrow-right" size={15} color={Design.color.accent} />
          </PressScale>
          <Text style={styles.note}>Create an account to save pieces, manage your cart, and track orders.</Text>
          </Reveal>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Design.color.canvas, flex: 1 },
  shell: { flex: 1, justifyContent: "space-between", paddingHorizontal: 24 },
  shellDesktop: { alignSelf: "center", flexDirection: "row", gap: 0, maxWidth: layout.pageMaxWidth, paddingHorizontal: 0, width: "100%" },
  brandPanel: { backgroundColor: Design.color.surfaceMuted, borderRadius: Design.radius.sheet, flex: 1, justifyContent: "center", marginBottom: 24, padding: 28 },
  brandPanelDesktop: { borderBottomRightRadius: 0, borderTopRightRadius: 0, marginBottom: 0, minHeight: 640, padding: 68 },
  brandRule: { backgroundColor: Design.color.accent, height: 1, marginTop: 28, width: 46 },
  established: { color: Design.color.inkMuted, fontFamily: Design.font.mono, fontSize: 10, letterSpacing: 1.4, marginTop: 24 },
  brandStatement: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 42, letterSpacing: -1.3, lineHeight: 43, marginTop: 12, maxWidth: 430 },
  brandStatementDesktop: { fontSize: 62, letterSpacing: -2, lineHeight: 61, maxWidth: 470 },
  brandSupporting: { color: Design.color.inkSoft, fontFamily: Design.font.body, fontSize: 13, lineHeight: 22, marginTop: 18, maxWidth: 390 },
  pillars: { gap: 10, marginTop: 42 }, pillar: { color: Design.color.inkMuted, fontFamily: Design.font.mono, fontSize: 10, letterSpacing: 1.2 },
  actionPanel: { backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.sheet, borderWidth: StyleSheet.hairlineWidth, padding: 28 },
  actionPanelDesktop: { borderBottomLeftRadius: 0, borderTopLeftRadius: 0, flex: 0.9, justifyContent: "center", padding: 68 },
  title: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 34, letterSpacing: -0.8, lineHeight: 36 }, titleDesktop: { fontSize: 47, letterSpacing: -1.3, lineHeight: 48 },
  copy: { color: Design.color.inkSoft, fontFamily: Design.font.body, fontSize: 13, lineHeight: 22, marginBottom: 28, marginTop: 12, maxWidth: 350 },
  signIn: { alignItems: "center", flexDirection: "row", gap: 7, justifyContent: "center", marginTop: 20, minHeight: 32 },
  signInText: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 12 }, signInLink: { color: Design.color.accent, fontFamily: Design.font.bodyBold, fontSize: 12 },
  note: { color: Design.color.inkMuted, fontFamily: Design.font.mono, fontSize: 10, lineHeight: 16, marginTop: 34, textAlign: "center" },
  chipsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 32 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Design.radius.small, borderWidth: StyleSheet.hairlineWidth, borderColor: Design.color.line, backgroundColor: Design.color.surface },
  chipSelected: { backgroundColor: Design.color.ink, borderColor: Design.color.ink },
  chipText: { color: Design.color.inkSoft, fontFamily: Design.font.bodyMedium, fontSize: 12 },
  chipTextSelected: { color: Design.color.surface },
});
