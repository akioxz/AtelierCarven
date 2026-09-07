import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { CustomerNavigation } from "../../components/app-ui";

export default function Payment() {
  const router = useRouter();
  const { method, total, fullName, address, city, mobile, notes } = useLocalSearchParams<{
    method: string;
    total: string;
    fullName?: string;
    address?: string;
    city?: string;
    mobile?: string;
    notes?: string;
  }>();
  const paymentMethod = method || "cod";
  const orderTotal = total ? Number(total) : 0;

  const [processing, setProcessing] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Alert modal state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  // Credit Card States
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");
  const [cardName, setCardName] = useState("");

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
  }, [pulseAnim]);

  const handleCardNumberChange = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, "");
    const formatted = cleanText.match(/.{1,4}/g)?.join(" ") || "";
    setCardNumber(formatted.substring(0, 19));
  };

  const handleExpiryChange = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, "");
    let formatted = cleanText;
    if (cleanText.length > 2) {
      formatted = cleanText.substring(0, 2) + "/" + cleanText.substring(2, 4);
    }
    setCardExpiry(formatted.substring(0, 5));
  };

  const handleCVVChange = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, "");
    setCardCVV(cleanText.substring(0, 4));
  };

  const handleConfirmPayment = async () => {
    if (paymentMethod === "card") {
      if (!cardNumber || !cardExpiry || !cardCVV || !cardName) {
        showAlert("Missing Details", "Please fill in all card details.");
        return;
      }
      if (cardNumber.replace(/\s/g, "").length < 16) {
        showAlert("Invalid Card Number", "Card number must be 16 digits.");
        return;
      }
      if (cardExpiry.length < 5) {
        showAlert("Invalid Expiry", "Please enter expiry date in MM/YY format.");
        return;
      }
      if (cardCVV.length < 3) {
        showAlert("Invalid CVV", "CVV must be 3 or 4 digits.");
        return;
      }
    }

    setProcessing(true);

    // Start spin animation
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.linear })
    ).start();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/(auth)/onboarding"); return; }

      // Retrieve user's current cart items
      const { data: cartItems, error: cartFetchErr } = await supabase
        .from("cart")
        .select("*, furniture(*)")
        .eq("user_id", user.id);

      if (cartFetchErr || !cartItems || cartItems.length === 0) {
        showAlert("Empty Cart", "No items in your cart to checkout.");
        setProcessing(false);
        return;
      }

      // Format shipping details in a single clean string for address column
      const formattedAddress = `Name: ${fullName || ""} | Mobile: ${mobile || ""} | City: ${city || ""} | Address: ${address || ""} | Notes: ${notes || ""}`;

      // Insert new order row
      const { data: newOrder, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          total: orderTotal,
          status: "Pending",
          address: formattedAddress,
          payment_method: paymentMethod
        })
        .select()
        .single();

      if (orderErr) {
        console.error("Orders Insert Error:", orderErr);
        showAlert("Checkout Error", "Failed to place your order. Please try again.");
        setProcessing(false);
        return;
      }

      // Insert order items
      const itemsToInsert = cartItems.map((item) => ({
        order_id: newOrder.id,
        furniture_id: item.furniture_id,
        quantity: item.quantity,
        price: Number(item.furniture?.price || 0)
      }));

      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsErr) {
        console.error("Order Items Insert Error:", itemsErr);
      }

      // Clear the cart after successful payment
      await supabase.from("cart").delete().eq("user_id", user.id);

      // Simulate processing delay for UX
      await new Promise((resolve) => setTimeout(resolve, 1500));

      router.replace("/(user)/order-success");
    } catch (err) {
      console.error("Confirm order payment transaction failed:", err);
      setProcessing(false);
      showAlert("Payment Error", "Something went wrong. Please try again.");
    }
  };

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <CustomerNavigation active="cart" />
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContainer} contentContainerStyle={{ paddingBottom: 24 }}>
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
        {paymentMethod === "gcash" && (
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
                  "Tap Send Money → Express Send",
                  "Enter the number above",
                  `Enter exact total: ₱${orderTotal.toLocaleString()}`,
                  "Use your full name as reference",
                  "Take a screenshot of the receipt",
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
        )}

        {/* Maya Instructions */}
        {paymentMethod === "maya" && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PAYMENT INSTRUCTIONS</Text>
            <View style={styles.card}>
              <View style={styles.gcashHeader}>
                <View style={styles.mayaIconBox}>
                  <Feather name="tablet" size={22} color="#00B159" />
                </View>
                <View>
                  <Text style={styles.gcashTitle}>Maya Wallet Payment</Text>
                  <Text style={styles.gcashSub}>Transfer to the number below</Text>
                </View>
              </View>

              <View style={styles.gcashDivider} />

              <View style={styles.gcashDetail}>
                <Text style={styles.gcashLabel}>MAYA NUMBER</Text>
                <Text style={styles.gcashNumber}>0917 123 4567</Text>
                <Text style={styles.gcashName}>Atelier Carvén Store</Text>
              </View>

              <View style={styles.stepList}>
                {[
                  "Open your Maya app",
                  "Tap Send Money → to Maya Number",
                  "Enter the number above",
                  `Enter exact total: ₱${orderTotal.toLocaleString()}`,
                  "Use your full name as reference",
                  "Take a screenshot of the receipt",
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
        )}

        {/* COD Note */}
        {paymentMethod === "cod" && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CASH ON DELIVERY</Text>
            <View style={styles.card}>
              <View style={[styles.codRow, { alignItems: "center", gap: 16, paddingVertical: 12 }]}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#EDE5D8", justifyContent: "center", alignItems: "center" }}>
                  <Feather name="package" size={22} color="#8B7355" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.gcashTitle, { marginBottom: 4 }]}>Confirm Your COD Order</Text>
                  <Text style={[styles.codText, { lineHeight: 18 }]}>
                    Prepare exact cash of ₱{orderTotal.toLocaleString()} for the delivery rider when your packages arrive.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Credit/Debit Card Form */}
        {paymentMethod === "card" && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CREDIT / DEBIT CARD (DEMO)</Text>

            <View style={styles.demoNotice}>
              <Feather name="info" size={14} color="#8B7355" />
              <Text style={styles.demoNoticeText}>
                This is a simulated payment flow. Do not enter real card details.
              </Text>
            </View>

            {/* Elegant Luxury Credit Card UI */}
            <View style={styles.creditCardContainer}>
              <Text style={styles.creditCardTitle}>ATELIER CARVÉN</Text>
              <View style={styles.creditCardChip} />

              <Text style={styles.creditCardNumber}>
                {cardNumber || "•••• •••• •••• ••••"}
              </Text>

              <View style={styles.creditCardBottom}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.creditCardLabel}>CARDHOLDER NAME</Text>
                  <Text style={styles.creditCardValue} numberOfLines={1}>
                    {cardName.toUpperCase() || "YOUR NAME"}
                  </Text>
                </View>
                <View style={{ width: 60 }}>
                  <Text style={styles.creditCardLabel}>EXPIRES</Text>
                  <Text style={styles.creditCardValue}>
                    {cardExpiry || "MM/YY"}
                  </Text>
                </View>
                <Text style={styles.creditCardBrand}>VISA</Text>
              </View>
            </View>

            {/* Input fields */}
            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CARDHOLDER NAME *</Text>
                <TextInput
                  style={styles.input}
                  value={cardName}
                  onChangeText={setCardName}
                  placeholder="e.g. John Doe"
                  placeholderTextColor="#C4B8A8"
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CARD NUMBER *</Text>
                <TextInput
                  style={styles.input}
                  value={cardNumber}
                  onChangeText={handleCardNumberChange}
                  placeholder="0000 0000 0000 0000"
                  placeholderTextColor="#C4B8A8"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.cardFieldsRow}>
                <View style={styles.cardFieldHalf}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>EXPIRY DATE *</Text>
                    <TextInput
                      style={styles.input}
                      value={cardExpiry}
                      onChangeText={handleExpiryChange}
                      placeholder="MM/YY"
                      placeholderTextColor="#C4B8A8"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={styles.cardFieldHalf}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>CVV *</Text>
                    <TextInput
                      style={styles.input}
                      value={cardCVV}
                      onChangeText={handleCVVChange}
                      placeholder="000"
                      placeholderTextColor="#C4B8A8"
                      keyboardType="numeric"
                      secureTextEntry
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Security Note */}
        <View style={styles.section}>
          <View style={styles.securityRow}>
            <Feather name="shield" size={13} color="#8B7355" />
            <Text style={styles.securityText}>
              Your order details are securely stored. We never share your personal information.
            </Text>
          </View>
        </View>

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

      {/* Custom Alert Modal */}
      <Modal visible={alertVisible} animationType="fade" transparent>
        <View style={styles.alertOverlay}>
          <View style={styles.alertContent}>
            <View style={styles.alertIconWrap}>
              <Feather name="alert-circle" size={28} color="#C9A96E" />
            </View>
            <Text style={styles.alertTitle}>{alertTitle.toUpperCase()}</Text>
            <View style={styles.alertDivider} />
            <Text style={styles.alertMessage}>{alertMessage}</Text>
            <TouchableOpacity style={styles.alertBtn} onPress={() => setAlertVisible(false)}>
              <Text style={styles.alertBtnText}>GOT IT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  mayaIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#E6F7F0", justifyContent: "center", alignItems: "center" },
  creditCardContainer: { backgroundColor: "#1C1C1A", borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "#C9A96E", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5, marginBottom: 24 },
  creditCardTitle: { fontSize: 9, letterSpacing: 3, color: "#C9A96E", fontWeight: "600", marginBottom: 16 },
  creditCardChip: { width: 40, height: 30, borderRadius: 6, backgroundColor: "#E6C587", opacity: 0.8, marginBottom: 20 },
  creditCardNumber: { fontSize: 20, letterSpacing: 2, color: "#FAFAF8", fontFamily: "Courier", marginBottom: 24 },
  creditCardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  creditCardLabel: { fontSize: 8, letterSpacing: 1, color: "#8B7355", marginBottom: 4 },
  creditCardValue: { fontSize: 12, color: "#FAFAF8", fontWeight: "500", letterSpacing: 1 },
  creditCardBrand: { fontSize: 16, fontStyle: "italic", fontWeight: "bold", color: "#C9A96E" },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 10, letterSpacing: 2, color: "#8B7355", marginBottom: 6 },
  input: { borderBottomWidth: 1, borderBottomColor: "#E8E0D0", paddingVertical: 10, fontSize: 14, color: "#1C1C1A" },
  cardFieldsRow: { flexDirection: "row", gap: 16 },
  cardFieldHalf: { flex: 1 },
  gcashLabel: { fontSize: 9, letterSpacing: 2, color: "#8B7355", marginBottom: 6 },
  gcashNumber: { fontSize: 22, fontWeight: "500", color: "#1C1C1A", letterSpacing: 2, marginBottom: 4 },
  gcashName: { fontSize: 12, color: "#6B5E4E" },
  demoNotice: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: "#FDF9F0", borderRadius: 10, borderWidth: 0.5, borderColor: "#E8E0D0", padding: 12, marginBottom: 16 },
  demoNoticeText: { flex: 1, fontSize: 12, color: "#6B5E4E", lineHeight: 18 },
  stepList: { gap: 12 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#C9A96E", justifyContent: "center", alignItems: "center", marginTop: 1 },
  stepBadgeText: { fontSize: 11, fontWeight: "500", color: "#FAFAF8" },
  stepText: { flex: 1, fontSize: 13, color: "#1C1C1A", lineHeight: 22 },
  codRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  codText: { flex: 1, fontSize: 13, color: "#6B5E4E", lineHeight: 22 },
  securityRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  securityText: { flex: 1, fontSize: 12, color: "#9E8E7E", lineHeight: 20 },
  scrollContainer: { flex: 1 },
  footer: { backgroundColor: "#FAFAF8", borderTopWidth: 0.5, borderTopColor: "#E8E0D0", padding: 20 },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#1C1C1A", borderRadius: 12, padding: 18, marginBottom: 10 },
  confirmBtnDisabled: { opacity: 0.7 },
  confirmBtnText: { color: "#FAFAF8", fontSize: 11, letterSpacing: 2 },
  footerNote: { fontSize: 10, color: "#C4B8A8", textAlign: "center", letterSpacing: 0.5 },

  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertContent: {
    backgroundColor: "#FAFAF8",
    borderRadius: 20,
    padding: 28,
    marginHorizontal: 32,
    alignItems: "center",
    minWidth: 280,
  },
  alertIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F5F0E8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 12,
    letterSpacing: 3,
    color: "#8B7355",
    marginBottom: 12,
    textAlign: "center",
  },
  alertDivider: {
    width: 40,
    height: 1.5,
    backgroundColor: "#C9A96E",
    marginBottom: 12,
  },
  alertMessage: {
    fontSize: 14,
    color: "#1C1C1A",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  alertBtn: {
    backgroundColor: "#1C1C1A",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  alertBtnText: { fontSize: 11, letterSpacing: 2, color: "#FAFAF8" },
});
