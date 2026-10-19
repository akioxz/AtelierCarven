import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { ContentFrame, CustomerNavigation, PageHeader, PrimaryButton, StepIndicator } from "../../components/app-ui";
import { PressScale, Reveal, staggerDelay } from "../../components/motion";
import { ShimmerBlock } from "../../components/skeleton";
import { Design } from "../../constants/design";
import { goBackOr } from "../../lib/navigation";
import { supabase } from "../../lib/supabase";
import { fetchAllRows } from "../../lib/pagination";
import { cartTotal, effectivePrice } from "../../lib/pricing";

export default function Checkout() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [mobile, setMobile] = useState("");
  const [notes, setNotes] = useState("");
  const [showError, setShowError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) { router.replace("/(auth)/onboarding"); return; }
      const [cart, profile] = await Promise.all([
        fetchAllRows((from, to) => supabase.from("cart").select("*, furniture(*)", { count: "exact" }).eq("user_id", user.id).order("id").range(from, to)),
        supabase.from("profiles").select("*").eq("id", user.id).single(),
      ]);
      if (profile.error) throw profile.error;
      cartTotal(cart);
      setCartItems(cart);
      setFullName(profile.data?.username || "");
      setAddress(profile.data?.address || "");
      setMobile(profile.data?.mobile_number || "");
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    void (async () => { await fetchData(); })();
  }, [fetchData]);

  const total = cartTotal(cartItems);

  const continueToPayment = () => {
    if (cartItems.length === 0) return;
    if (!fullName.trim() || !mobile.trim() || !address.trim() || !city.trim()) { setShowError(true); return; }
    router.push({
      pathname: "/(user)/checkout-payment",
      params: { total: total.toString(), fullName, address, city, mobile, notes },
    } as never);
  };

  if (loadError) return <View style={styles.loading}><Text accessibilityRole="alert">Could not load checkout. Please try again.</Text><PrimaryButton label="RETRY" onPress={() => void fetchData()} /></View>;

  if (loading) {
    return <View style={styles.loading}><ShimmerBlock width="100%" height={120} radius={Design.radius.card} /><ShimmerBlock width="100%" height={220} radius={Design.radius.card} /></View>;
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <CustomerNavigation active="cart" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ContentFrame style={styles.frame}>
          <Reveal>
            <StepIndicator currentStep={1} />
          </Reveal>
          <PageHeader title="Delivery details" subtitle="Tell us where this piece should find its home." right={<PressScale onPress={() => goBackOr(router, "/(user)/cart")} accessibilityLabel="Go back" style={styles.back}><Feather name="arrow-left" size={18} color={Design.color.ink} /></PressScale>} />
          <Reveal>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your order</Text>
              {cartItems.length === 0 ? <Text style={styles.muted}>Your cart is empty.</Text> : cartItems.map((item) => (
                <View key={item.id} style={styles.orderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderName}>{item.furniture?.name}</Text>
                    <Text style={styles.orderMeta}>{item.furniture?.category} · Qty {item.quantity}</Text>
                  </View>
                  <Text style={styles.orderPrice}>₱{(effectivePrice(item.furniture) * item.quantity).toLocaleString()}</Text>
                </View>
              ))}
              <View style={styles.orderTotal}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₱{total.toLocaleString()}</Text>
              </View>
            </View>
          </Reveal>
          <Reveal delay={staggerDelay(1)}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Where should we deliver?</Text>
              <View style={styles.card}>
                {showError ? (
                  <View style={styles.error}>
                    <Feather name="alert-circle" size={16} color={Design.color.danger} />
                    <Text style={styles.errorText}>Add your name, mobile number, address, and city to continue.</Text>
                  </View>
                ) : null}
                <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your full name" />
                <Field label="Mobile number" value={mobile} onChangeText={setMobile} placeholder="+63 XXX XXX XXXX" keyboardType="phone-pad" />
                <Field label="Address" value={address} onChangeText={setAddress} placeholder="Street, Barangay" />
                <Field label="City / municipality" value={city} onChangeText={setCity} placeholder="City or municipality" />
                <Field label="Delivery note (optional)" value={notes} onChangeText={setNotes} placeholder="Gate code, landmark, or delivery preference" multiline />
              </View>
            </View>
          </Reveal>
          <Reveal delay={staggerDelay(2)}>
            <PrimaryButton label={cartItems.length === 0 ? "CART IS EMPTY" : "CONTINUE TO PAYMENT"} onPress={continueToPayment} disabled={cartItems.length === 0} style={styles.continue} />
          </Reveal>
        </ContentFrame>
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType = "default", multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "default" | "phone-pad"; multiline?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={Design.color.inkMuted} keyboardType={keyboardType} multiline={multiline} style={[styles.input, multiline && styles.textarea]} />
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
  card: { backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", padding: 17, ...Design.shadow.card },
  cardTitle: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 28, letterSpacing: -0.6, marginBottom: 9 },
  orderRow: { alignItems: "center", borderTopColor: Design.color.line, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 12, paddingVertical: 12 },
  orderName: { color: Design.color.ink, fontFamily: Design.font.bodySemibold, fontSize: 12 },
  orderMeta: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 10, marginTop: 3 },
  orderPrice: { color: Design.color.ink, fontFamily: Design.font.bodyBold, fontSize: 12 },
  orderTotal: { alignItems: "center", borderTopColor: Design.color.line, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", marginTop: 2, paddingTop: 13 },
  totalLabel: { color: Design.color.ink, fontFamily: Design.font.bodyBold, fontSize: 13 },
  totalValue: { color: Design.color.accent, fontFamily: Design.font.display, fontSize: 26 },
  muted: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 12 },
  error: { alignItems: "center", backgroundColor: "#F2DBD7", borderRadius: Design.radius.small, borderLeftColor: Design.color.danger, borderLeftWidth: 3, flexDirection: "row", gap: 8, marginBottom: 14, padding: 10 },
  errorText: { color: Design.color.danger, flex: 1, fontFamily: Design.font.body, fontSize: 12, lineHeight: 18 },
  field: { marginBottom: 16 },
  fieldLabel: { color: Design.color.inkSoft, fontFamily: Design.font.mono, fontSize: 10, letterSpacing: 1.4, marginBottom: 6 },
  input: { backgroundColor: "transparent", borderBottomColor: Design.color.line, borderBottomWidth: 1, color: Design.color.ink, fontFamily: Design.font.body, fontSize: 14, paddingVertical: 8 },
  textarea: { minHeight: 56, textAlignVertical: "top" },
  continue: { marginTop: 28 },
});