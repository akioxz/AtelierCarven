import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const BOTTOM_NAV = [
  { label: "HOME", icon: "home", route: "/(user)/home" },
  { label: "SAVED", icon: "heart", route: "/(user)/favorites" },
  { label: "PLACE", icon: "image", route: "/(user)/image-placement" },
  { label: "CART", icon: "shopping-cart", route: "/(user)/cart" },
  { label: "PROFILE", icon: "user", route: "/(user)/profile" },
] as const;

export default function Payment() {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
  }, []);

  const handleConfirmPayment = async () => {
    setProcessing(true);

    // Start spin animation
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.linear })
    ).start();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/(auth)/onboarding"); return; }

      // Clear the cart after successful payment
      await supabase.from("cart").delete().eq("user_id", user.id);

      // Simulate processing delay for UX
      await new Promise((resolve) => setTimeout(resolve, 1500));

      router.replace("/(user)/order-success");
    } catch {
      setProcessing(false);
      Alert.alert("Payment Error", "Something went wrong. Please try again.");
    }
  };

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} disabled={processing}>
            <Feather name="arrow-left" size={22} color="#1C1C1A" />
          </TouchableOpacity>
          <View style={{ marginTop: 20 }}>
            <Text style={styles.headerSmall}>FINAL STEP</Text>
            <Text style={styles.headerLarge}>Payment</Text>
            <View style={styles.goldDivider} />
          </View>
        </View>

        {/* GCash Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PAYMENT INSTRUCTIONS</Text>
          <View style={styles.card}>
            <View style={styles.gcashHeader}>
              <View style={styles.gcashIconBox}>
                <Feather name="smartphone" size={22} color="#007AFF" />
              </View>
              <View>
                <Text style={styles.gcashTitle}>GCash Payment</Text>
                <Text style={styles.gcashSub}>Transfer to the number below</Text>
              </View>
            </View>

            <View style={styles.gcashDivider} />

            <View style={styles.gcashDetail}>
              <Text style={styles.gcashLabel}>GCASH NUMBER</Text>
              <Text style={styles.gcashNumber}>0917 123 4567</Text>
              <Text style={styles.gcashName}>Atelier Carvén Store</Text>
            </View>

            <View style={styles.stepList}>
              {[
                "Open your GCash app",
                "Tap Send Money → GCash",
                "Enter the number above",
                "Enter your exact order total",
                "Use your name as reference",
                "Take a screenshot of receipt",
              ].map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* COD Note */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CASH ON DELIVERY</Text>
          <View style={styles.card}>
            <View style={styles.codRow}>
              <Feather name="info" size={16} color="#8B7355" />
              <Text style={styles.codText}>
                If you selected Cash on Delivery, simply confirm your order and pay the rider upon delivery. No transfer needed.
              </Text>
            </View>
          </View>
        </View>

        {/* Security Note */}
        <View style={styles.section}>
          <View style={styles.securityRow}>
            <Feather name="shield" size={13} color="#8B7355" />
            <Text style={styles.securityText}>
              Your order details are securely stored. We never share your personal information.
            </Text>
          </View>
        </View>

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmBtn, processing && styles.confirmBtnDisabled]}
          onPress={handleConfirmPayment}
          disabled={processing}
        >
          {processing ? (
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Feather name="loader" size={18} color="#C9A96E" />
            </Animated.View>
          ) : (
            <Feather name="check-circle" size={18} color="#C9A96E" />
          )}
          <Text style={styles.confirmBtnText}>
            {processing ? "PROCESSING..." : "CONFIRM ORDER"}
          </Text>
        </TouchableOpacity>
        <Text style={styles.footerNote}>
          By confirming, you agree to our terms and return policy.
        </Text>
      </View>

      <View style={styles.bottomNav}>
        {BOTTOM_NAV.map((item) => (
          <TouchableOpacity key={item.label} style={styles.navItem} onPress={() => !processing && router.push(item.route as any)}>
            <Feather name={item.icon as any} size={20} color="#C4B8A8" />
            <Text style={styles.navLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF8" },
  header: { backgroundColor: "#F5F0E8", padding: 28, paddingTop: 56, paddingBottom: 28 },
  headerSmall: { fontSize: 10, letterSpacing: 4, color: "#8B7355" },
  headerLarge: { fontSize: 36, fontWeight: "300", color: "#1C1C1A", letterSpacing: 2, marginBottom: 16 },
  goldDivider: { width: 40, height: 1.5, backgroundColor: "#C9A96E" },
  section: { paddingHorizontal: 24, paddingTop: 24 },
  sectionLabel: { fontSize: 10, letterSpacing: 2, color: "#8B7355", marginBottom: 12 },
  card: { backgroundColor: "#F5F0E8", borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: "#E8E0D0" },
  gcashHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  gcashIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#EAF2FF", justifyContent: "center", alignItems: "center" },
  gcashTitle: { fontSize: 15, fontWeight: "500", color: "#1C1C1A", marginBottom: 2 },
  gcashSub: { fontSize: 12, color: "#9E8E7E" },
  gcashDivider: { height: 0.5, backgroundColor: "#E8E0D0", marginBottom: 16 },
  gcashDetail: { backgroundColor: "#EDE5D8", borderRadius: 10, padding: 16, alignItems: "center", marginBottom: 20 },
  gcashLabel: { fontSize: 9, letterSpacing: 2, color: "#8B7355", marginBottom: 6 },
  gcashNumber: { fontSize: 22, fontWeight: "500", color: "#1C1C1A", letterSpacing: 2, marginBottom: 4 },
  gcashName: { fontSize: 12, color: "#6B5E4E" },
  stepList: { gap: 12 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#C9A96E", justifyContent: "center", alignItems: "center", marginTop: 1 },
  stepBadgeText: { fontSize: 11, fontWeight: "500", color: "#FAFAF8" },
  stepText: { flex: 1, fontSize: 13, color: "#1C1C1A", lineHeight: 22 },
  codRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  codText: { flex: 1, fontSize: 13, color: "#6B5E4E", lineHeight: 22 },
  securityRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  securityText: { flex: 1, fontSize: 12, color: "#9E8E7E", lineHeight: 20 },
  footer: { position: "absolute", bottom: 72, left: 0, right: 0, backgroundColor: "#FAFAF8", borderTopWidth: 0.5, borderTopColor: "#E8E0D0", padding: 20 },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#1C1C1A", borderRadius: 12, padding: 18, marginBottom: 10 },
  confirmBtnDisabled: { opacity: 0.7 },
  confirmBtnText: { color: "#FAFAF8", fontSize: 11, letterSpacing: 2 },
  footerNote: { fontSize: 10, color: "#C4B8A8", textAlign: "center", letterSpacing: 0.5 },
  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FAFAF8", borderTopWidth: 0.5, borderTopColor: "#E8E0D0", flexDirection: "row", justifyContent: "space-around", paddingVertical: 12, paddingBottom: 24 },
  navItem: { alignItems: "center", gap: 3 },
  navLabel: { fontSize: 8, color: "#C4B8A8", letterSpacing: 1 },
});
