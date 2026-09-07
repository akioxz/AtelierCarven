import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Platform, Pressable, StatusBar, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandMark, PrimaryButton } from "../../components/app-ui";
import { Design, layout } from "../../constants/design";

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && width >= layout.desktopBreakpoint;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.shell, desktop && styles.shellDesktop, { paddingTop: Math.max(insets.top, 22), paddingBottom: Math.max(insets.bottom, 22) }]}>
        <View style={[styles.brandPanel, desktop && styles.brandPanelDesktop]}>
          <BrandMark />
          <View style={styles.brandRule} />
          <Text style={styles.established}>EST. 2026 · CURATED FOR HOME</Text>
          <Text style={[styles.brandStatement, desktop && styles.brandStatementDesktop]}>A considered home begins with a piece worth keeping.</Text>
          <Text style={styles.brandSupporting}>Explore furniture selected for the rituals, rooms, and quiet moments that make a space your own.</Text>
          {desktop ? <View style={styles.pillars}><Text style={styles.pillar}>MADE TO LAST</Text><Text style={styles.pillar}>CAREFULLY CURATED</Text><Text style={styles.pillar}>DELIVERED WITH CARE</Text></View> : null}
        </View>
        <View style={[styles.actionPanel, desktop && styles.actionPanelDesktop]}>
          <Text style={[styles.title, desktop && styles.titleDesktop]}>Find the piece that feels like home.</Text>
          <Text style={styles.copy}>Browse the collection, save what speaks to you, and place an order when you are ready.</Text>
          <PrimaryButton label="EXPLORE THE COLLECTION" onPress={() => router.push("/(auth)/signup")} />
          <Pressable onPress={() => router.push("/(auth)/login")} style={({ pressed }) => [styles.signIn, pressed && styles.signInPressed]}>
            <Text style={styles.signInText}>Already have an account?</Text><Text style={styles.signInLink}>Sign in</Text><Feather name="arrow-right" size={15} color={Design.color.gold} />
          </Pressable>
          <Text style={styles.note}>Create an account to save pieces, manage your cart, and track orders.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Design.color.canvas, flex: 1 },
  shell: { flex: 1, justifyContent: "space-between", paddingHorizontal: 24 },
  shellDesktop: { alignSelf: "center", flexDirection: "row", gap: 0, maxWidth: 1180, paddingHorizontal: 0, width: "100%" },
  brandPanel: { backgroundColor: Design.color.surfaceMuted, borderRadius: Design.radius.sheet, flex: 1, justifyContent: "center", marginBottom: 24, padding: 28 },
  brandPanelDesktop: { borderBottomRightRadius: 0, borderTopRightRadius: 0, marginBottom: 0, minHeight: 640, padding: 68 },
  brandRule: { backgroundColor: Design.color.gold, height: 1, marginTop: 28, width: 46 },
  established: { color: Design.color.inkMuted, fontFamily: Design.font.bodySemibold, fontSize: 10, letterSpacing: 1.4, marginTop: 24 },
  brandStatement: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 42, letterSpacing: -1.3, lineHeight: 43, marginTop: 12, maxWidth: 430 },
  brandStatementDesktop: { fontSize: 62, letterSpacing: -2, lineHeight: 61, maxWidth: 470 },
  brandSupporting: { color: Design.color.inkSoft, fontFamily: Design.font.body, fontSize: 13, lineHeight: 22, marginTop: 18, maxWidth: 390 },
  pillars: { gap: 10, marginTop: 42 }, pillar: { color: Design.color.inkMuted, fontFamily: Design.font.bodySemibold, fontSize: 10, letterSpacing: 1.2 },
  actionPanel: { backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.sheet, borderWidth: StyleSheet.hairlineWidth, padding: 28 },
  actionPanelDesktop: { borderBottomLeftRadius: 0, borderTopLeftRadius: 0, flex: 0.9, justifyContent: "center", padding: 68 },
  title: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 34, letterSpacing: -0.8, lineHeight: 36 }, titleDesktop: { fontSize: 47, letterSpacing: -1.3, lineHeight: 48 },
  copy: { color: Design.color.inkSoft, fontFamily: Design.font.body, fontSize: 13, lineHeight: 22, marginBottom: 28, marginTop: 12, maxWidth: 350 },
  signIn: { alignItems: "center", flexDirection: "row", gap: 7, justifyContent: "center", marginTop: 20, minHeight: 32 }, signInPressed: { opacity: 0.72 },
  signInText: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 12 }, signInLink: { color: Design.color.gold, fontFamily: Design.font.bodyBold, fontSize: 12 },
  note: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 10, lineHeight: 16, marginTop: 34, textAlign: "center" },
});
