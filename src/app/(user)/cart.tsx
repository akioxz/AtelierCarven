import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Sofa": return "airplay";
    case "Chair": return "sidebar";
    case "Table": return "minus-square";
    case "Bed": return "moon";
    default: return "box";
  }
};

export default function Cart() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("cart")
      .select("*, furniture(*)")
      .eq("user_id", user.id);
    setCartItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const removeItem = async (id: string) => {
    await supabase.from("cart").delete().eq("id", id);
    fetchCart();
  };

  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity < 1) { removeItem(id); return; }
    await supabase.from("cart").update({ quantity }).eq("id", id);
    fetchCart();
  };

  const getTotal = () =>
    cartItems.reduce((sum, item) => sum + Number(item.furniture?.price || 0) * item.quantity, 0);

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#1C1C1A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerSmall}>YOUR</Text>
          <Text style={styles.headerLarge}>Cart</Text>
          <View style={styles.goldDivider} />
        </View>
        {itemCount > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{itemCount}</Text>
            <Text style={styles.headerBadgeLabel}>item{itemCount > 1 ? "s" : ""}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#C9A96E" style={{ marginTop: 40 }} />
      ) : cartItems.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Feather name="shopping-cart" size={36} color="#C9A96E" />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtext}>Discover our curated furniture collection</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.push("/(user)/home")}>
            <Text style={styles.shopBtnText}>BROWSE COLLECTION</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {cartItems.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                {/* Image */}
                <TouchableOpacity
                  onPress={() => router.push({ pathname: "/(user)/product", params: { id: item.furniture?.id } })}
                >
                  <View style={styles.imageWrap}>
                    {item.furniture?.image_url ? (
                      <Image
                        source={{ uri: item.furniture.image_url }}
                        style={styles.cartImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <Feather name={getCategoryIcon(item.furniture?.category) as any} size={28} color="#8B7355" />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Info */}
                <View style={styles.cartInfo}>
                  <View style={styles.cartInfoTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartCategory}>{item.furniture?.category?.toUpperCase()}</Text>
                      <Text style={styles.cartName} numberOfLines={2}>{item.furniture?.name}</Text>
                      {(item.color || item.material) && (
                        <Text style={styles.cartVariation}>
                          {[item.color, item.material].filter(Boolean).join(" · ")}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeBtn}>
                      <Feather name="x" size={14} color="#C4B8A8" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.cartInfoBottom}>
                    <Text style={styles.cartPrice}>
                      ₱{(Number(item.furniture?.price) * item.quantity).toLocaleString()}
                    </Text>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Feather name="minus" size={12} color="#1C1C1A" />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Feather name="plus" size={12} color="#1C1C1A" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))}

            {/* Order Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>ORDER SUMMARY</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal ({itemCount} item{itemCount > 1 ? "s" : ""})</Text>
                <Text style={styles.summaryValue}>₱{getTotal().toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery</Text>
                <Text style={[styles.summaryValue, { color: "#3B6D11" }]}>Free</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotal}>TOTAL</Text>
                <Text style={styles.summaryTotalAmt}>₱{getTotal().toLocaleString()}</Text>
              </View>
            </View>

            <View style={{ height: 160 }} />
          </ScrollView>

          {/* Checkout Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.checkoutBtn}
              onPress={() => router.push("/(user)/checkout")}
            >
              <Feather name="arrow-right" size={16} color="#C9A96E" />
              <Text style={styles.checkoutBtnText}>PROCEED TO CHECKOUT</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/(user)/home")}>
          <Feather name="home" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/(user)/favorites")}>
          <Feather name="heart" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>SAVED</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/(user)/image-placement")}>
          <Feather name="image" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>PLACE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Feather name="shopping-cart" size={20} color="#1C1C1A" />
          <View style={styles.navDot} />
          <Text style={styles.navLabelActive}>CART</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/(user)/profile")}>
          <Feather name="user" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>PROFILE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF8" },

  header: {
    backgroundColor: "#F5F0E8",
    padding: 28,
    paddingTop: 56,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EDE5D8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  headerCenter: { flex: 1, paddingHorizontal: 16 },
  headerSmall: { fontSize: 10, letterSpacing: 4, color: "#8B7355" },
  headerLarge: { fontSize: 36, fontWeight: "300", color: "#1C1C1A", letterSpacing: 2, marginBottom: 12 },
  goldDivider: { width: 40, height: 1.5, backgroundColor: "#C9A96E" },
  headerBadge: {
    alignItems: "center",
    backgroundColor: "#1C1C1A",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  headerBadgeText: { fontSize: 18, fontWeight: "500", color: "#C9A96E" },
  headerBadgeLabel: { fontSize: 9, letterSpacing: 1, color: "#9E8E7E" },

  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 14,
    paddingBottom: 120,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F5F0E8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8E0D0",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: "500", color: "#1C1C1A" },
  emptySubtext: { fontSize: 13, color: "#9E8E7E", textAlign: "center" },
  shopBtn: {
    backgroundColor: "#1C1C1A",
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 16,
    marginTop: 8,
  },
  shopBtnText: { color: "#FAFAF8", fontSize: 11, letterSpacing: 2 },

  list: { flex: 1 },
  listContent: { padding: 20, gap: 12 },

  cartItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
  },
  imageWrap: {
    width: 100,
    height: 110,
    backgroundColor: "#F5F0E8",
    justifyContent: "center",
    alignItems: "center",
  },
  cartImg: { width: 100, height: 110 },
  cartInfo: {
    flex: 1,
    padding: 14,
    justifyContent: "space-between",
  },
  cartInfoTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cartCategory: { fontSize: 9, letterSpacing: 1.5, color: "#8B7355", marginBottom: 3 },
  cartName: { fontSize: 13, fontWeight: "500", color: "#1C1C1A", lineHeight: 18 },
  cartVariation: { fontSize: 10, color: "#9E8E7E", marginTop: 3, letterSpacing: 0.5 },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F5F0E8",
    justifyContent: "center",
    alignItems: "center",
  },
  cartInfoBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  cartPrice: { fontSize: 15, fontWeight: "500", color: "#C9A96E" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F5F0E8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
  },
  qtyText: { fontSize: 14, fontWeight: "500", color: "#1C1C1A", minWidth: 16, textAlign: "center" },

  summaryCard: {
    backgroundColor: "#F5F0E8",
    borderRadius: 16,
    padding: 20,
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
    marginTop: 8,
  },
  summaryTitle: { fontSize: 10, letterSpacing: 2, color: "#8B7355", marginBottom: 16 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  summaryLabel: { fontSize: 13, color: "#6B5E4E" },
  summaryValue: { fontSize: 13, color: "#1C1C1A" },
  summaryDivider: { height: 0.5, backgroundColor: "#E8E0D0", marginVertical: 12 },
  summaryTotal: { fontSize: 12, letterSpacing: 2, color: "#8B7355", fontWeight: "500" },
  summaryTotalAmt: { fontSize: 20, fontWeight: "500", color: "#1C1C1A" },

  footer: {
    position: "absolute",
    bottom: 72,
    left: 0,
    right: 0,
    backgroundColor: "#FAFAF8",
    borderTopWidth: 0.5,
    borderTopColor: "#E8E0D0",
    padding: 16,
  },
  checkoutBtn: {
    backgroundColor: "#1C1C1A",
    borderRadius: 12,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  checkoutBtnText: { color: "#FAFAF8", fontSize: 11, letterSpacing: 2 },

  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FAFAF8",
    borderTopWidth: 0.5,
    borderTopColor: "#E8E0D0",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    paddingBottom: 20,
  },
  navItem: { alignItems: "center", gap: 3 },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#C9A96E" },
  navLabel: { fontSize: 8, color: "#C4B8A8", letterSpacing: 1 },
  navLabelActive: { fontSize: 8, color: "#1C1C1A", letterSpacing: 1 },
});
