import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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

export default function Checkout() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [mobile, setMobile] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "gcash" | "maya" | "card">("cod");

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/(auth)/onboarding"); return; }

    const [cartRes, profileRes] = await Promise.all([
      supabase.from("cart").select("*, furniture(*)").eq("user_id", user.id),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
    ]);

    setCartItems(cartRes.data || []);

    if (profileRes.data) {
      setFullName(profileRes.data.username || "");
      setAddress(profileRes.data.address || "");
      setMobile(profileRes.data.mobile_number || "");
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getTotal = () =>
    cartItems.reduce((sum, item) => sum + Number(item.furniture?.price || 0) * item.quantity, 0);

  const handlePlaceOrder = () => {
    if (!fullName || !address || !city || !mobile) {
      Alert.alert("Missing Info", "Please fill in all required fields.");
      return;
    }
    router.push({
      pathname: "/(user)/payment",
      params: {
        method: paymentMethod,
        total: getTotal().toString()
      }
    });
  };

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator color="#C9A96E" size="large" />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContainer} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#1C1C1A" />
          </TouchableOpacity>
          <View style={{ marginTop: 20 }}>
            <Text style={styles.headerSmall}>ALMOST THERE</Text>
            <Text style={styles.headerLarge}>Checkout</Text>
            <View style={styles.goldDivider} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ORDER SUMMARY</Text>
          <View style={styles.card}>
            {cartItems.map((item, index) => (
              <View key={item.id}>
                <View style={styles.orderRow}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderName} numberOfLines={1}>{item.furniture?.name}</Text>
                    <Text style={styles.orderMeta}>{item.furniture?.category} · Qty {item.quantity}</Text>
                  </View>
                  <Text style={styles.orderPrice}>
                    ₱{(Number(item.furniture?.price) * item.quantity).toLocaleString()}
                  </Text>
                </View>
                {index < cartItems.length - 1 && <View style={styles.rowDivider} />}
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalAmount}>₱{getTotal().toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DELIVERY DETAILS</Text>
          <View style={styles.card}>
            {[
              { label: "FULL NAME *", value: fullName, setter: setFullName, placeholder: "Your full name", keyboard: "default" },
              { label: "MOBILE NUMBER *", value: mobile, setter: setMobile, placeholder: "+63 XXX XXX XXXX", keyboard: "phone-pad" },
              { label: "ADDRESS *", value: address, setter: setAddress, placeholder: "Street, Barangay", keyboard: "default" },
              { label: "CITY / MUNICIPALITY *", value: city, setter: setCity, placeholder: "City or municipality", keyboard: "default" },
            ].map((field) => (
              <View style={styles.inputGroup} key={field.label}>
                <Text style={styles.inputLabel}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  value={field.value}
                  onChangeText={field.setter}
                  placeholder={field.placeholder}
                  placeholderTextColor="#C4B8A8"
                  keyboardType={field.keyboard as any}
                />
              </View>
            ))}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>DELIVERY NOTES</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Leave at the gate, call upon arrival..."
                placeholderTextColor="#C4B8A8"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
          <View style={styles.card}>
            {[
              { key: "cod", icon: "package", title: "Cash on Delivery", sub: "Pay when your order arrives" },
              { key: "gcash", icon: "smartphone", title: "GCash", sub: "Pay via GCash mobile wallet" },
              { key: "maya", icon: "tablet", title: "Maya Wallet", sub: "Pay via Maya mobile wallet" },
              { key: "card", icon: "credit-card", title: "Credit / Debit Card", sub: "Visa, Mastercard, JCB, or AMEX" },
            ].map((method, i) => (
              <View key={method.key}>
                {i > 0 && <View style={styles.rowDivider} />}
                <TouchableOpacity style={styles.paymentOption} onPress={() => setPaymentMethod(method.key as any)}>
                  <View style={styles.paymentLeft}>
                    <View style={styles.paymentIconBox}>
                      <Feather name={method.icon as any} size={16} color="#8B7355" />
                    </View>
                    <View>
                      <Text style={styles.paymentTitle}>{method.title}</Text>
                      <Text style={styles.paymentSub}>{method.sub}</Text>
                    </View>
                  </View>
                  <View style={[styles.radio, paymentMethod === method.key && styles.radioActive]}>
                    {paymentMethod === method.key && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Footer and nav stacked naturally — no absolute positioning */}
      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>ORDER TOTAL</Text>
          <Text style={styles.footerTotalAmount}>₱{getTotal().toLocaleString()}</Text>
        </View>
        <TouchableOpacity style={styles.placeOrderBtn} onPress={handlePlaceOrder}>
          <Feather name="check-circle" size={16} color="#C9A96E" />
          <Text style={styles.placeOrderText}>PLACE ORDER</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomNav}>
        {BOTTOM_NAV.map((item) => (
          <TouchableOpacity key={item.label} style={styles.navItem} onPress={() => router.push(item.route as any)}>
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
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FAFAF8" },
  header: { backgroundColor: "#F5F0E8", padding: 28, paddingTop: 56, paddingBottom: 28 },
  headerSmall: { fontSize: 10, letterSpacing: 4, color: "#8B7355" },
  headerLarge: { fontSize: 36, fontWeight: "300", color: "#1C1C1A", letterSpacing: 2, marginBottom: 16 },
  goldDivider: { width: 40, height: 1.5, backgroundColor: "#C9A96E" },
  section: { paddingHorizontal: 24, paddingTop: 24 },
  sectionLabel: { fontSize: 10, letterSpacing: 2, color: "#8B7355", marginBottom: 12 },
  card: { backgroundColor: "#F5F0E8", borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: "#E8E0D0" },
  orderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  orderInfo: { flex: 1, marginRight: 12 },
  orderName: { fontSize: 13, fontWeight: "500", color: "#1C1C1A", marginBottom: 2 },
  orderMeta: { fontSize: 11, color: "#9E8E7E" },
  orderPrice: { fontSize: 13, color: "#C9A96E" },
  rowDivider: { height: 0.5, backgroundColor: "#E8E0D0", marginVertical: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, marginTop: 8, borderTopWidth: 0.5, borderTopColor: "#E8E0D0" },
  totalLabel: { fontSize: 10, letterSpacing: 2, color: "#8B7355" },
  totalAmount: { fontSize: 18, fontWeight: "500", color: "#1C1C1A" },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 10, letterSpacing: 2, color: "#8B7355", marginBottom: 6 },
  input: { borderBottomWidth: 1, borderBottomColor: "#E8E0D0", paddingVertical: 10, fontSize: 14, color: "#1C1C1A" },
  textArea: { borderWidth: 1, borderColor: "#E8E0D0", borderRadius: 8, padding: 10, height: 80, textAlignVertical: "top", marginTop: 4 },
  paymentOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  paymentLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  paymentIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#EDE5D8", justifyContent: "center", alignItems: "center" },
  paymentTitle: { fontSize: 13, fontWeight: "500", color: "#1C1C1A", marginBottom: 2 },
  paymentSub: { fontSize: 11, color: "#9E8E7E" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: "#E8E0D0", justifyContent: "center", alignItems: "center" },
  radioActive: { borderColor: "#C9A96E" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#C9A96E" },
  scrollContainer: { flex: 1 },
  footer: { backgroundColor: "#FAFAF8", borderTopWidth: 0.5, borderTopColor: "#E8E0D0", padding: 20 },
  footerTotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  footerTotalLabel: { fontSize: 10, letterSpacing: 2, color: "#8B7355" },
  footerTotalAmount: { fontSize: 20, fontWeight: "500", color: "#1C1C1A" },
  placeOrderBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1C1C1A", borderRadius: 10, padding: 18 },
  placeOrderText: { color: "#FAFAF8", fontSize: 11, letterSpacing: 2 },
  bottomNav: { backgroundColor: "#FAFAF8", borderTopWidth: 0.5, borderTopColor: "#E8E0D0", flexDirection: "row", justifyContent: "space-around", paddingVertical: 12, paddingBottom: 24 },
  navItem: { alignItems: "center", gap: 3 },
  navLabel: { fontSize: 8, color: "#C4B8A8", letterSpacing: 1 },
});
