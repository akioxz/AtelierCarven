import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { ContentFrame, CustomerNavigation, PageHeader, PrimaryButton, RetryNotice } from "../../components/app-ui";
import { PressScale, Reveal, staggerDelay } from "../../components/motion";
import { ShimmerBlock } from "../../components/skeleton";
import { Design } from "../../constants/design";
import { goBackOr } from "../../lib/navigation";
import { supabase } from "../../lib/supabase";
import { fetchAllRows } from "../../lib/pagination";
import { cartTotal, effectivePrice } from "../../lib/pricing";

export default function Cart() {
  const router = useRouter(); const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const latestCart = useRef(0);
  const [actionError, setActionError] = useState("");
  const [mutating, setMutating] = useState(0);
  const [loadError, setLoadError] = useState("");
  const fetchCart = useCallback(async (showLoading = true) => {
    const request = ++latestCart.current;
    if (showLoading) setLoading(true);
    setLoadError("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) { router.replace("/(auth)/onboarding"); return; }
      const data = await fetchAllRows((from, to) => supabase.from("cart").select("*, furniture(*)", { count: "exact" }).eq("user_id", user.id).order("id").range(from, to));
      cartTotal(data);
      if (request === latestCart.current) { setItems(data || []); setActionError(""); }
    } catch { if (request === latestCart.current) setLoadError("Could not load your cart. Please retry."); }
    finally { if (request === latestCart.current) setLoading(false); }
  }, [router]);
  useEffect(() => {
    let cancelled = false;
    const tracker = latestCart;
    void Promise.resolve().then(() => { if (!cancelled) return fetchCart(); });
    return () => { cancelled = true; tracker.current++; };
  }, [fetchCart]);
  const remove = async (id: string) => {
    setMutating(value => value + 1);
    try {
      const { error } = await supabase.from("cart").delete().eq("id", id);
      if (error) throw error;
      setActionError("");
      await fetchCart(false);
    } catch { setActionError("Could not remove this item. Please try again."); }
    finally { setMutating(value => value - 1); }
  };
  const setQuantity = async (id: string, delta: number) => {
    setMutating(value => value + 1);
    try {
      const { error } = await supabase.rpc("change_cart_quantity", { p_cart_id: id, p_delta: delta });
      if (error) throw error;
      setActionError("");
      await fetchCart(false);
    } catch { setActionError("Could not update the quantity. Please try again."); }
    finally { setMutating(value => value - 1); }
  };
  const count = items.reduce((sum, item) => sum + item.quantity, 0); const total = cartTotal(items);
  return <View style={styles.screen}><StatusBar barStyle="dark-content" /><CustomerNavigation active="cart" />
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}><ContentFrame style={styles.frame}>
      <PageHeader title="Your cart" subtitle={count ? `${count} selected piece${count === 1 ? "" : "s"}, ready when you are.` : "Your saved selections will appear here."} right={<PressScale onPress={() => goBackOr(router, "/(user)/home")} accessibilityLabel="Go back" style={styles.back}><Feather name="arrow-left" size={18} color={Design.color.ink} /></PressScale>} />
      {actionError && items.length === 0 ? <Text accessibilityRole="alert" style={{ color: Design.color.danger, padding: 12 }}>{actionError}</Text> : null}
      {loading ? <View style={styles.list}>{[0, 1].map((skeleton) => <View key={skeleton} style={styles.item}><ShimmerBlock width={92} height={96} radius={12} /><View style={styles.itemCopy}><ShimmerBlock width="70%" height={12} /><ShimmerBlock width="40%" height={12} /></View></View>)}</View> : loadError ? <RetryNotice message={loadError} onRetry={() => void fetchCart()} /> : items.length === 0 ? <View style={styles.empty}><View style={styles.emptyIcon}><Feather name="shopping-bag" size={27} color={Design.color.accent} /></View><Text style={styles.emptyTitle}>Nothing here yet.</Text><Text style={styles.emptyCopy}>Discover furniture that brings character to your space.</Text><PrimaryButton label="BROWSE THE COLLECTION" onPress={() => router.push("/(user)/home")} style={styles.emptyButton} /></View> : <>
        <View style={styles.list}>{items.map((item, itemIndex) => <Reveal key={item.id} delay={staggerDelay(itemIndex, 60, 5)}><View style={styles.item}><PressScale onPress={() => router.push({ pathname: "/(user)/product", params: { id: item.furniture?.id } })} accessibilityLabel={`View ${item.furniture?.name}`} style={styles.imageWrap}>{item.furniture?.image_url ? <Image source={{ uri: item.furniture.image_url }} style={styles.image} contentFit="cover" transition={200} /> : <Feather name="box" size={28} color={Design.color.inkMuted} />}</PressScale><View style={styles.itemCopy}><View style={styles.itemTop}><View style={{ flex: 1 }}><Text style={styles.itemCategory}>{item.furniture?.category}</Text><Text style={styles.itemName} numberOfLines={2}>{item.furniture?.name}</Text>{item.color || item.material ? <Text style={styles.variation}>{[item.color, item.material].filter(Boolean).join(" · ")}</Text> : null}</View><PressScale onPress={() => remove(item.id)} accessibilityLabel="Remove item" hitSlop={8}><Feather name="x" size={17} color={Design.color.inkMuted} /></PressScale></View><View style={styles.itemBottom}><Text style={styles.itemPrice}>₱{(effectivePrice(item.furniture) * item.quantity).toLocaleString()}</Text><View style={styles.stepper}><PressScale onPress={() => setQuantity(item.id, -1)} accessibilityLabel="Decrease quantity" style={styles.step}><Feather name="minus" size={13} color={Design.color.ink} /></PressScale><Text style={styles.quantity}>{item.quantity}</Text><PressScale onPress={() => setQuantity(item.id, 1)} accessibilityLabel="Increase quantity" style={styles.step}><Feather name="plus" size={13} color={Design.color.ink} /></PressScale></View></View></View></View></Reveal>)}</View>
        {actionError ? <RetryNotice message={actionError} onRetry={() => void fetchCart()} /> : null}
        <View style={styles.summary}><Text style={styles.summaryTitle}>Order summary</Text><Row label={`Subtotal · ${count} item${count === 1 ? "" : "s"}`} value={`₱${total.toLocaleString()}`} /><Row label="Delivery" value="Free" green /><View style={styles.divider} /><Row label="Total" value={`₱${total.toLocaleString()}`} total /></View>
        <PrimaryButton disabled={mutating > 0 || !!actionError || !!loadError} label="CONTINUE TO CHECKOUT" onPress={() => router.push("/(user)/checkout")} style={styles.checkout} />
      </>}
    </ContentFrame></ScrollView>
      <CustomerNavigation active="cart" placement="footer" />
  </View>;
}
function Row({ label, value, total = false, green = false }: { label: string; value: string; total?: boolean; green?: boolean }) { return <View style={styles.row}><Text style={[styles.rowLabel, total && styles.totalLabel]}>{label}</Text><Text style={[styles.rowValue, total && styles.totalValue, green && styles.green]}>{value}</Text></View>; }
const styles = StyleSheet.create({ screen: { backgroundColor: Design.color.canvas, flex: 1 }, scroll: { paddingBottom: 24 }, frame: { paddingHorizontal: 20, paddingTop: 30 }, back: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.small, borderWidth: StyleSheet.hairlineWidth, height: 44, justifyContent: "center", width: 44 }, loading: { marginTop: 64 }, list: { gap: 12 }, item: { backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 13, padding: 12, ...Design.shadow.card }, imageWrap: { alignItems: "center", backgroundColor: Design.color.surfaceMuted, borderRadius: 12, height: 96, justifyContent: "center", overflow: "hidden", width: 92 }, image: { height: "100%", width: "100%" }, itemCopy: { flex: 1, justifyContent: "space-between" }, itemTop: { flexDirection: "row", gap: 8 }, itemCategory: { color: Design.color.inkMuted, fontFamily: Design.font.bodySemibold, fontSize: 9, letterSpacing: 0.7, textTransform: "uppercase" }, itemName: { color: Design.color.ink, fontFamily: Design.font.bodySemibold, fontSize: 13, lineHeight: 19, marginTop: 4 }, variation: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 10, marginTop: 4 }, itemBottom: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }, itemPrice: { color: Design.color.accent, fontFamily: Design.font.bodyBold, fontSize: 13 }, stepper: { alignItems: "center", backgroundColor: Design.color.surfaceMuted, borderRadius: 16, flexDirection: "row", gap: 4, padding: 4 }, step: { alignItems: "center", backgroundColor: Design.color.surface, borderRadius: 13, height: 44, justifyContent: "center", width: 44 }, quantity: { color: Design.color.ink, fontFamily: Design.font.bodyBold, fontSize: 11, minWidth: 12, textAlign: "center" }, summary: { backgroundColor: Design.color.surfaceMuted, borderRadius: Design.radius.card, marginTop: 22, padding: 18 }, summaryTitle: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 28, letterSpacing: -0.6, marginBottom: 16 }, row: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 }, rowLabel: { color: Design.color.inkSoft, fontFamily: Design.font.body, fontSize: 12 }, rowValue: { color: Design.color.ink, fontFamily: Design.font.bodySemibold, fontSize: 12 }, divider: { backgroundColor: Design.color.line, height: StyleSheet.hairlineWidth, marginTop: 15 }, totalLabel: { color: Design.color.ink, fontFamily: Design.font.bodyBold, fontSize: 14 }, totalValue: { color: Design.color.accent, fontFamily: Design.font.display, fontSize: 24, lineHeight: 25 }, green: { color: Design.color.success }, checkout: { marginTop: 14 }, empty: { alignItems: "center", alignSelf: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, maxWidth: 480, padding: 38, ...Design.shadow.card }, emptyIcon: { alignItems: "center", backgroundColor: Design.color.surfaceMuted, borderRadius: 28, height: 56, justifyContent: "center", width: 56 }, emptyTitle: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 32, marginTop: 18 }, emptyCopy: { color: Design.color.inkSoft, fontFamily: Design.font.body, fontSize: 12, lineHeight: 19, marginTop: 5, textAlign: "center" }, emptyButton: { alignSelf: "stretch", marginTop: 24 }, pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] } });
