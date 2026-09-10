import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Modal, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { ContentFrame, CustomerNavigation, PageHeader, StepIndicator } from "../../components/app-ui";
import { PressScale, Reveal, staggerDelay } from "../../components/motion";
import { ShimmerBlock } from "../../components/skeleton";
import { Design } from "../../constants/design";
import { goBackOr } from "../../lib/navigation";
import { supabase } from "../../lib/supabase";

const methodTitles: Record<string, string> = {
  cod: "Cash on delivery",
  gcash: "GCash",
  maya: "Maya Wallet",
  card: "Credit / Debit Card (Demo)",
};

export default function CheckoutReview() {
  const router = useRouter();
  const { method = "cod", total, fullName, address, city, mobile, notes } = useLocalSearchParams<{
    method?: string;
    total?: string;
    fullName?: string;
    address?: string;
    city?: string;
    mobile?: string;
    notes?: string;
  }>();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const spin = useSharedValue(0);

  const fetchCart = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/(auth)/onboarding"); return; }
    const { data } = await supabase.from("cart").select("*, furniture(*)").eq("user_id", user.id);
    setCartItems(data || []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void (async () => { await fetchCart(); })();
  }, [fetchCart]);

  const orderTotal = total ? Number(total) : cartItems.reduce((sum, item) => sum + Number(item.furniture?.price || 0) * item.quantity, 0);

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const handleConfirm = async () => {
    setProcessing(true);
    spin.set(withRepeat(withTiming(1, { duration: 800, easing: Easing.linear }), -1));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { showAlert("Sign in required", "You need to be signed in to place an order."); cancelAnimation(spin); setProcessing(false); return; }

      const { data: cartItems, error: cartFetchErr } = await supabase
        .from("cart")
        .select("*, furniture(*)")
        .eq("user_id", user.id);

      if (cartFetchErr || !cartItems || cartItems.length === 0) {
        showAlert("Empty Cart", "No items in your cart to checkout.");
        cancelAnimation(spin);
        setProcessing(false);
        return;
      }

      const formattedAddress = `Name: ${fullName || ""} | Mobile: ${mobile || ""} | City: ${city || ""} | Address: ${address || ""} | Notes: ${notes || ""}`;

      const { data: newOrder, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          total: orderTotal,
          status: "Pending",
          address: formattedAddress,
          payment_method: method,
        })
        .select()
        .single();

      if (orderErr) {
        console.error("Orders Insert Error:", orderErr);
        showAlert("Checkout Error", "Failed to place your order. Please try again.");
        cancelAnimation(spin);
        setProcessing(false);
        return;
      }

      const itemsToInsert = cartItems.map((item) => ({
        order_id: newOrder.id,
        furniture_id: item.furniture_id,
        quantity: item.quantity,
        price: Number(item.furniture?.price || 0),
      }));

      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsErr) {
        console.error("Order Items Insert Error:", itemsErr);
      }

      await supabase.from("cart").delete().eq("user_id", user.id);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      router.replace("/(user)/order-success");
    } catch (err) {
      console.error("Confirm order payment transaction failed:", err);
      cancelAnimation(spin);
      setProcessing(false);
      showAlert("Payment Error", "Something went wrong. Please try again.");
    }
  };

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.get() * 360}deg` }],
  }));

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
            <StepIndicator currentStep={3} />
          </Reveal>
          <PageHeader title="Review order" subtitle="Confirm the details before we begin making your piece." right={<PressScale onPress={() => goBackOr(router, "/(user)/checkout-payment" as never)} disabled={processing} accessibilityLabel="Go back" style={styles.back}><Feather name="arrow-left" size={18} color={Design.color.ink} /></PressScale>} />
          <Reveal>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your order</Text>
              {cartItems.length === 0 ? <Text style={styles.muted}>Your cart is empty.</Text> : cartItems.map((item) => (
                <View key={item.id} style={styles.orderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderName}>{item.furniture?.name}</Text>
                    <Text style={styles.orderMeta}>{item.furniture?.category} · Qty {item.quantity}</Text>
                  </View>
                  <Text style={styles.orderPrice}>₱{(Number(item.furniture?.price) * item.quantity).toLocaleString()}</Text>
                </View>
              ))}
              <View style={styles.orderTotal}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₱{orderTotal.toLocaleString()}</Text>
              </View>
            </View>
          </Reveal>
          <Reveal delay={staggerDelay(1)}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DELIVERY</Text>
              <View style={styles.card}>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>NAME</Text><Text style={styles.detailValue}>{fullName || "—"}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>MOBILE</Text><Text style={styles.detailValue}>{mobile || "—"}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>ADDRESS</Text><Text style={styles.detailValue}>{address || "—"}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>CITY</Text><Text style={styles.detailValue}>{city || "—"}</Text></View>
                {notes ? <View style={styles.detailRow}><Text style={styles.detailLabel}>NOTE</Text><Text style={styles.detailValue}>{notes}</Text></View> : null}
              </View>
            </View>
          </Reveal>
          <Reveal delay={staggerDelay(2)}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PAYMENT</Text>
              <View style={styles.card}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>METHOD</Text>
                  <Text style={styles.detailValue}>{methodTitles[method] || "Cash on delivery"}</Text>
                </View>
                {method === "cod" ? (
                  <Text style={styles.methodNote}>Prepare exact cash of ₱{orderTotal.toLocaleString()} for the delivery rider.</Text>
                ) : method === "card" ? (
                  <Text style={styles.methodNote}>Simulated card payment. No real details were stored.</Text>
                ) : null}
              </View>
            </View>
          </Reveal>
          <Reveal delay={staggerDelay(3)}>
            <View style={styles.securityRow}>
              <Feather name="shield" size={13} color={Design.color.inkSoft} />
              <Text style={styles.securityText}>Your order details are securely stored. We never share your personal information.</Text>
            </View>
            <PressScale style={[styles.confirmBtn, processing && styles.confirmBtnDisabled]} onPress={handleConfirm} disabled={processing} accessibilityLabel={processing ? "Processing order" : "Confirm order"}>
              {processing ? (
                <Animated.View style={spinStyle}>
                  <Feather name="loader" size={18} color={Design.color.accent} />
                </Animated.View>
              ) : (
                <Feather name="check-circle" size={18} color={Design.color.accent} />
              )}
              <Text style={styles.confirmBtnText}>{processing ? "PLACING ORDER..." : "CONFIRM ORDER"}</Text>
            </PressScale>
            <Text style={styles.footerNote}>By confirming, you agree to our terms and return policy.</Text>
          </Reveal>
        </ContentFrame>
      </ScrollView>

      <Modal visible={alertVisible} animationType="fade" transparent onRequestClose={() => setAlertVisible(false)}>
        <View style={styles.alertOverlay}>
          <View style={styles.alertContent}>
            <View style={styles.alertIconWrap}>
              <Feather name="alert-circle" size={28} color={Design.color.accent} />
            </View>
            <Text style={styles.alertTitle}>{alertTitle.toUpperCase()}</Text>
            <View style={styles.alertDivider} />
            <Text style={styles.alertMessage}>{alertMessage}</Text>
            <PressScale style={styles.alertBtn} onPress={() => setAlertVisible(false)} accessibilityLabel="Dismiss alert">
              <Text style={styles.alertBtnText}>GOT IT</Text>
            </PressScale>
          </View>
        </View>
      </Modal>
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
  sectionLabel: { color: Design.color.inkSoft, fontFamily: Design.font.mono, fontSize: 10, letterSpacing: 2, marginBottom: 10 },
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
  detailRow: { borderTopColor: Design.color.line, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 16, paddingVertical: 10 },
  detailLabel: { color: Design.color.inkMuted, fontFamily: Design.font.mono, fontSize: 9, letterSpacing: 1.4, marginTop: 3, width: 74 },
  detailValue: { color: Design.color.ink, flex: 1, fontFamily: Design.font.body, fontSize: 12, lineHeight: 18 },
  methodNote: { color: Design.color.inkSoft, fontFamily: Design.font.body, fontSize: 11, lineHeight: 18, marginTop: 4 },
  securityRow: { alignItems: "flex-start", flexDirection: "row", gap: 8, marginTop: 22 },
  securityText: { color: Design.color.inkMuted, flex: 1, fontFamily: Design.font.body, fontSize: 11, lineHeight: 18 },
  confirmBtn: { alignItems: "center", backgroundColor: Design.color.ink, borderRadius: Design.radius.small, flexDirection: "row", gap: 10, justifyContent: "center", marginTop: 16, minHeight: 52 },
  confirmBtnDisabled: { opacity: 0.7 },
  confirmBtnText: { color: Design.color.surface, fontFamily: Design.font.bodySemibold, fontSize: 11, letterSpacing: 2 },
  footerNote: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 10, marginTop: 12, textAlign: "center" },
  alertOverlay: { alignItems: "center", backgroundColor: "rgba(29,27,23,0.5)", flex: 1, justifyContent: "center" },
  alertContent: { alignItems: "center", backgroundColor: Design.color.surface, borderRadius: Design.radius.card, marginHorizontal: 32, minWidth: 280, padding: 28 },
  alertIconWrap: { alignItems: "center", backgroundColor: Design.color.surfaceMuted, borderRadius: 30, height: 60, justifyContent: "center", marginBottom: 16, width: 60 },
  alertTitle: { color: Design.color.inkSoft, fontSize: 12, letterSpacing: 3, marginBottom: 12, textAlign: "center" },
  alertDivider: { backgroundColor: Design.color.accent, height: 1.5, marginBottom: 12, width: 40 },
  alertMessage: { color: Design.color.ink, fontSize: 14, lineHeight: 22, marginBottom: 24, textAlign: "center" },
  alertBtn: { alignItems: "center", backgroundColor: Design.color.ink, borderRadius: Design.radius.small, paddingHorizontal: 40, paddingVertical: 14 },
  alertBtnText: { color: Design.color.surface, fontSize: 11, letterSpacing: 2 },
});