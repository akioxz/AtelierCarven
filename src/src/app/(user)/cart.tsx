import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
    case "Sofa":
      return "airplay";
    case "Chair":
      return "sidebar";
    case "Table":
      return "minus-square";
    case "Bed":
      return "moon";
    default:
      return "box";
  }
};

export default function Cart() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("cart")
      .select("*, furniture(*)")
      .eq("user_id", user.id);
    setCartItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const removeItem = async (id: string) => {
    await supabase.from("cart").delete().eq("id", id);
    fetchCart();
  };

  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(id);
      return;
    }
    await supabase.from("cart").update({ quantity }).eq("id", id);
    fetchCart();
  };

  const getTotal = () =>
    cartItems.reduce(
      (sum, item) => sum + Number(item.furniture?.price || 0) * item.quantity,
      0,
    );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#1C1C1A" />
        </TouchableOpacity>
        <View style={{ marginTop: 20 }}>
          <Text style={styles.headerSmall}>YOUR</Text>
          <Text style={styles.headerLarge}>Cart</Text>
          <View style={styles.goldDivider} />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#C9A96E" style={{ marginTop: 40 }} />
      ) : cartItems.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="shopping-cart" size={48} color="#E8E0D0" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtext}>
            Discover our curated furniture collection
          </Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => router.push("/(user)/home")}
          >
            <Text style={styles.shopBtnText}>BROWSE COLLECTION</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {cartItems.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <View style={styles.cartItemImage}>
                  <Feather
                    name={getCategoryIcon(item.furniture?.category) as any}
                    size={24}
                    color="#8B7355"
                  />
                </View>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName} numberOfLines={1}>
                    {item.furniture?.name}
                  </Text>
                  <Text style={styles.cartItemCategory}>
                    {item.furniture?.category}
                  </Text>
                  <Text style={styles.cartItemPrice}>
                    ₱{Number(item.furniture?.price).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.cartItemActions}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Feather name="minus" size={14} color="#1C1C1A" />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Feather name="plus" size={14} color="#1C1C1A" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <View style={{ height: 160 }} />
          </ScrollView>
          <View style={styles.checkout}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalAmount}>
                ₱{getTotal().toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.checkoutBtn}
              onPress={() => router.push("/(user)/checkout")}
            >
              <Text style={styles.checkoutBtnText}>PROCEED TO CHECKOUT</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

            <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(user)/home")}
        >
          <Feather name="home" size={20} color={"#C4B8A8"} />
          <Text style={styles.navLabel}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(user)/favorites")}
        >
          <Feather name="heart" size={20} color={"#C4B8A8"} />
          <Text style={styles.navLabel}>SAVED</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(user)/image-placement")}
        >
          <Feather name="image" size={20} color={"#C4B8A8"} />
          <Text style={styles.navLabel}>PLACE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
        >
          <Feather name="shopping-cart" size={20} color={"#1C1C1A"} />
          <View style={styles.navDot} />
          <Text style={styles.navLabelActive}>CART</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(user)/profile")}
        >
          <Feather name="user" size={20} color={"#C4B8A8"} />
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
    paddingBottom: 28,
  },
  headerSmall: { fontSize: 10, letterSpacing: 4, color: "#8B7355" },
  headerLarge: {
    fontSize: 36,
    fontWeight: "300",
    color: "#1C1C1A",
    letterSpacing: 2,
    marginBottom: 16,
  },
  goldDivider: { width: 40, height: 1.5, backgroundColor: "#C9A96E" },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 12,
    paddingBottom: 100,
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
  list: { flex: 1, padding: 24 },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F0E8",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
    gap: 12,
  },
  cartItemImage: {
    width: 56,
    height: 56,
    backgroundColor: "#EDE5D8",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cartItemInfo: { flex: 1 },
  cartItemName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1C1C1A",
    marginBottom: 2,
  },
  cartItemCategory: { fontSize: 11, color: "#9E8E7E", marginBottom: 4 },
  cartItemPrice: { fontSize: 13, color: "#C9A96E" },
  cartItemActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EDE5D8",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1C1C1A",
    minWidth: 16,
    textAlign: "center",
  },
  checkout: {
    position: "absolute",
    bottom: 72,
    left: 0,
    right: 0,
    backgroundColor: "#FAFAF8",
    borderTopWidth: 0.5,
    borderTopColor: "#E8E0D0",
    padding: 24,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  totalLabel: { fontSize: 10, letterSpacing: 2, color: "#8B7355" },
  totalAmount: { fontSize: 22, fontWeight: "500", color: "#1C1C1A" },
  checkoutBtn: {
    backgroundColor: "#1C1C1A",
    borderRadius: 10,
    padding: 18,
    alignItems: "center",
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
    paddingVertical: 12,
    paddingBottom: 24,
  },
  navItem: { alignItems: "center", gap: 3 },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#C9A96E" },
  navLabel: { fontSize: 8, color: "#C4B8A8", letterSpacing: 1 },
  navLabelActive: { fontSize: 8, color: "#1C1C1A", letterSpacing: 1 },
});
