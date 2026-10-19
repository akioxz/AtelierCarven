import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { ContentFrame, CustomerNavigation, PageHeader, PrimaryButton, StepIndicator } from "../../components/app-ui";
import { PressScale, Reveal, staggerDelay } from "../../components/motion";
import { ShimmerBlock } from "../../components/skeleton";
import { Design } from "../../constants/design";
import { goBackOr } from "../../lib/navigation";
import { supabase } from "../../lib/supabase";
import { fetchAllRows } from "../../lib/pagination";
import { cartTotal } from "../../lib/pricing";

const methods = [
  { key: "cod", icon: "package", title: "Cash on delivery", detail: "Pay when your order arrives." },
  { key: "gcash", icon: "smartphone", title: "GCash", detail: "Transfer from your GCash wallet." },
  { key: "maya", icon: "credit-card", title: "Maya Wallet", detail: "Transfer from your Maya wallet." },
  { key: "card", icon: "credit-card", title: "Credit / Debit Card (Demo)", detail: "Simulated only. Never enter real card details." },
] as const;

type MethodKey = (typeof methods)[number]["key"];

export default function CheckoutPayment() {
  const router = useRouter();
  const { fullName, address, city, mobile, notes } = useLocalSearchParams<{
    total?: string;
    fullName?: string;
    address?: string;
    city?: string;
    mobile?: string;
    notes?: string;
  }>();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [method, setMethod] = useState<MethodKey>("cod");

  const fetchCart = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) { router.replace("/(auth)/onboarding"); return; }
      const data = await fetchAllRows((from, to) => supabase.from("cart").select("*, furniture(*)", { count: "exact" }).eq("user_id", user.id).order("id").range(from, to));
      cartTotal(data);
      setCartItems(data);
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    void (async () => { await fetchCart(); })();
  }, [fetchCart]);

  const orderTotal = cartTotal(cartItems);

  const continueToReview = () => {
    if (cartItems.length === 0) return;
    const target = method === "card" ? "/(user)/payment" : "/(user)/checkout-review";
    router.push({
      pathname: target,
      params: { method, total: orderTotal.toString(), fullName, address, city, mobile, notes },
    } as never);
  };

  if (loadError) return <View style={styles.loading}><Text accessibilityRole="alert">Could not load checkout. Please try again.</Text><PrimaryButton label="RETRY" onPress={() => void fetchCart()} /></View>;

  if (loading) {
    return <View style={styles.loading}><ShimmerBlock width="100%" height={120} radius={Design.radius.card} /><ShimmerBlock width="100%" height={180} radius={Design.radius.card} /></View>;
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <CustomerNavigation active="cart" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ContentFrame style={styles.frame}>
          <Reveal>
            <StepIndicator currentStep={2} />
          </Reveal>
          <PageHeader title="Payment" subtitle="Choose how you'd like to pay." right={<PressScale onPress={() => goBackOr(router, "/(user)/checkout")} accessibilityLabel="Go back" style={styles.back}><Feather name="arrow-left" size={18} color={Design.color.ink} /></PressScale>} />
          <Reveal>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryMeta}>{cartItems.length} {cartItems.length === 1 ? "piece" : "pieces"} in your order</Text>
              <Text style={styles.summaryTotal}>₱{orderTotal.toLocaleString()}</Text>
            </View>
          </Reveal>
          <Reveal delay={staggerDelay(1)}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How would you like to pay?</Text>
              <View style={styles.card}>
                {methods.map((option) => {
                  const selected = option.key === method;
                  return (
                    <PressScale key={option.key} onPress={() => setMethod(option.key)} accessibilityRole="radio" accessibilityLabel={`Pay with ${option.title}`} accessibilityState={{ selected }} style={[styles.method, selected && styles.methodSelected]}>
                      <View style={styles.methodIcon}><Feather name={option.icon} size={17} color={selected ? Design.color.accent : Design.color.inkSoft} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.methodTitle}>{option.title}</Text>
                        <Text style={styles.methodDetail}>{option.detail}</Text>
                      </View>
                      <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                    </PressScale>
                  );
                })}
              </View>
            </View>
          </Reveal>
          <Reveal delay={staggerDelay(2)}>
            <PrimaryButton label={cartItems.length === 0 ? "CART IS EMPTY" : method === "card" ? "ENTER CARD DETAILS" : "CONTINUE TO REVIEW"} onPress={continueToReview} disabled={cartItems.length === 0} style={styles.continue} />
          </Reveal>
        </ContentFrame>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Design.color.canvas, flex: 1 },
  loading: { alignItems: "center", backgroundColor: Design.color.canvas, flex: 1, justifyContent: "center" },
  scroll: { paddingBottom: 112 },
  frame: { paddingHorizontal: 20, paddingTop: 30 },
  back: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.small, borderWidth: StyleSheet.hairlineWidth, height: 44, justifyContent: "center", width: 44 },
  section: { marginTop: 26 },
  sectionTitle: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 30, letterSpacing: -0.7, marginBottom: 12 },
  card: { backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", ...Design.shadow.card },
  summaryRow: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", padding: 17 },
  summaryMeta: { color: Design.color.inkSoft, fontFamily: Design.font.body, fontSize: 12 },
  summaryTotal: { color: Design.color.accent, fontFamily: Design.font.display, fontSize: 26 },
  method: { alignItems: "center", flexDirection: "row", gap: 14, paddingHorizontal: 17, paddingVertical: 15 },
  methodSelected: { backgroundColor: Design.color.surfaceMuted },
  methodIcon: { alignItems: "center", height: 34, justifyContent: "center", width: 34 },
  methodTitle: { color: Design.color.ink, fontFamily: Design.font.bodySemibold, fontSize: 12 },
  methodDetail: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 10, marginTop: 3 },
  radio: { alignItems: "center", borderColor: Design.color.line, borderRadius: 9, borderWidth: 1, height: 18, justifyContent: "center", width: 18 },
  radioSelected: { borderColor: Design.color.accent },
  radioDot: { backgroundColor: Design.color.accent, borderRadius: 5, height: 10, width: 10 },
  continue: { marginTop: 28 },
});