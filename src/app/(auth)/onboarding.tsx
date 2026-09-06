import { useRouter } from "expo-router";
import {
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

const { height } = Dimensions.get("window");

export default function Onboarding() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web" || width > 768;

  if (isWeb) {
    return (
      <View style={styles.webContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.webCard}>
          <View style={styles.webHero}>
            <View style={styles.arcOuter} />
            <View style={styles.arcInner} />
            <View style={styles.tag}>
              <Text style={styles.tagText}>EST. 2026</Text>
            </View>
            <Text style={styles.atelierText}>Atelier</Text>
            <Text style={styles.carvenText}>Carvén</Text>
            <View style={styles.goldDivider} />
            <Text style={styles.heroTagline}>Handcrafted furniture for the discerning home.</Text>
          </View>
          <View style={styles.webBottom}>
            <Text style={styles.headline}>Where elegance meets everyday living.</Text>
            <Text style={styles.subtext}>Explore our curated collection of premium furniture pieces designed for modern professionals.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/(auth)/signup")}>
              <Text style={styles.primaryButtonText}>EXPLORE COLLECTION</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.secondaryButtonText}>Sign in to your account</Text>
            </TouchableOpacity>
            <View style={styles.indicators}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.hero}>
        <View style={styles.arcOuter} />
        <View style={styles.arcInner} />
        <View style={styles.tag}>
          <Text style={styles.tagText}>EST. 2026</Text>
        </View>
        <Text style={styles.atelierText}>Atelier</Text>
        <Text style={styles.carvenText}>Carvén</Text>
        <View style={styles.goldDivider} />
        <Text style={styles.heroTagline}>Handcrafted furniture for the discerning home.</Text>
      </View>
      <View style={styles.bottom}>
        <Text style={styles.headline}>Where elegance meets everyday living.</Text>
        <Text style={styles.subtext}>Explore our curated collection of premium furniture pieces designed for modern professionals.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/(auth)/signup")}>
          <Text style={styles.primaryButtonText}>EXPLORE COLLECTION</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push("/(auth)/login")}>
          <Text style={styles.secondaryButtonText}>Sign in to your account</Text>
        </TouchableOpacity>
        <View style={styles.indicators}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF8" },
  webContainer: {
    flex: 1,
    backgroundColor: "#F0EBE1",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh" as any,
  },
  webCard: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#FAFAF8",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  webHero: {
    backgroundColor: "#F5F0E8",
    padding: 36,
    paddingTop: 48,
    paddingBottom: 32,
    overflow: "hidden",
  },
  webBottom: { padding: 32 },
  hero: {
    height: height * 0.52,
    backgroundColor: "#F5F0E8",
    padding: 40,
    paddingTop: 64,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  arcOuter: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: "#C9A96E",
    opacity: 0.25,
  },
  arcInner: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: "#C9A96E",
    opacity: 0.18,
  },
  tag: {
    backgroundColor: "#EDE5D8",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 28,
  },
  tagText: { fontSize: 10, letterSpacing: 3, color: "#8B7355" },
  atelierText: { fontSize: 14, letterSpacing: 4, color: "#8B7355", marginBottom: 2 },
  carvenText: { fontSize: 48, fontWeight: "300", color: "#1C1C1A", letterSpacing: 2, marginBottom: 20 },
  goldDivider: { width: 48, height: 1.5, backgroundColor: "#C9A96E", marginBottom: 20 },
  heroTagline: { fontSize: 13, color: "#6B5E4E", lineHeight: 22, maxWidth: 220 },
  bottom: { flex: 1, backgroundColor: "#FAFAF8", padding: 32, paddingTop: 36 },
  headline: { fontSize: 24, fontWeight: "500", color: "#1C1C1A", lineHeight: 34, marginBottom: 12 },
  subtext: { fontSize: 13, color: "#9E8E7E", lineHeight: 22, marginBottom: 32 },
  primaryButton: { backgroundColor: "#1C1C1A", borderRadius: 10, padding: 18, alignItems: "center", marginBottom: 12 },
  primaryButtonText: { color: "#FAFAF8", fontSize: 11, letterSpacing: 2 },
  secondaryButton: { borderWidth: 1, borderColor: "#C9A96E", borderRadius: 10, padding: 17, alignItems: "center" },
  secondaryButtonText: { color: "#8B7355", fontSize: 13, letterSpacing: 1 },
  indicators: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 28 },
  dot: { width: 6, height: 2, backgroundColor: "#E8E0D0", borderRadius: 2 },
  dotActive: { width: 20, backgroundColor: "#C9A96E" },
});