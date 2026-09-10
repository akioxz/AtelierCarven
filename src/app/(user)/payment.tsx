import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { ContentFrame, CustomerNavigation, PageHeader, PrimaryButton, StepIndicator } from "../../components/app-ui";
import { PressScale, Reveal } from "../../components/motion";
import { Design } from "../../constants/design";
import { goBackOr } from "../../lib/navigation";

export default function Payment() {
  const router = useRouter();
  const { total, fullName, address, city, mobile, notes } = useLocalSearchParams<{
    total?: string;
    fullName?: string;
    address?: string;
    city?: string;
    mobile?: string;
    notes?: string;
  }>();

  // Credit Card States
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");
  const [cardName, setCardName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleContinue = () => {
    setError("");
    if (!cardNumber || !cardExpiry || !cardCVV || !cardName) {
      setError("Please fill in all card details.");
      return;
    }
    if (cardNumber.replace(/\s/g, "").length < 16) {
      setError("Card number must be 16 digits.");
      return;
    }
    if (cardExpiry.length < 5) {
      setError("Please enter expiry date in MM/YY format.");
      return;
    }
    if (cardCVV.length < 3) {
      setError("CVV must be 3 or 4 digits.");
      return;
    }
    setLoading(true);
    router.push({
      pathname: "/(user)/checkout-review",
      params: { method: "card", total, fullName, address, city, mobile, notes },
    } as never);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <CustomerNavigation active="cart" />
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <ContentFrame>
          <Reveal>
            <StepIndicator currentStep={2} />
          </Reveal>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <PageHeader title="Card details" subtitle="This is a simulated payment flow." />
            </View>
            <PressScale onPress={() => goBackOr(router, "/(user)/checkout-payment" as never)} accessibilityLabel="Go back" style={styles.backButton}>
              <Feather name="arrow-left" size={19} color={Design.color.ink} />
            </PressScale>
          </View>

          {error ? (
            <Reveal>
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={15} color={Design.color.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            </Reveal>
          ) : null}

          <Reveal delay={80}>
          <View style={styles.demoNotice}>
            <Feather name="info" size={14} color={Design.color.inkSoft} />
            <Text style={styles.demoNoticeText}>
              Simulated only. Never enter real card details.
            </Text>
          </View>

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

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CARDHOLDER NAME *</Text>
              <TextInput
                style={styles.input}
                value={cardName}
                onChangeText={setCardName}
                placeholder="e.g. John Doe"
                placeholderTextColor={Design.color.inkMuted}
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
                placeholderTextColor={Design.color.inkMuted}
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
                    placeholderTextColor={Design.color.inkMuted}
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
                    placeholderTextColor={Design.color.inkMuted}
                    keyboardType="numeric"
                    secureTextEntry
                  />
                </View>
              </View>
            </View>
          </View>
          </Reveal>

          <Reveal delay={160}>
          <PrimaryButton label={loading ? "OPENING REVIEW..." : "CONTINUE TO REVIEW"} onPress={handleContinue} disabled={loading} style={styles.continueBtn} />
          </Reveal>
        </ContentFrame>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Design.color.canvas },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingBottom: 112 },
  headerRow: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between", marginBottom: 8 },
  headerCopy: { flex: 1 },
  backButton: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.small, borderWidth: StyleSheet.hairlineWidth, height: 44, justifyContent: "center", width: 44 },
  errorBox: { alignItems: "center", backgroundColor: "#F2DBD7", borderRadius: Design.radius.small, borderLeftColor: Design.color.danger, borderLeftWidth: 3, flexDirection: "row", gap: 8, marginBottom: 16, padding: 12 },
  errorText: { color: Design.color.danger, flex: 1, fontFamily: Design.font.body, fontSize: 12, lineHeight: 18 },
  demoNotice: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: "#FDF9F0", borderRadius: Design.radius.small, borderWidth: 0.5, borderColor: Design.color.line, padding: 12, marginBottom: 16 },
  demoNoticeText: { flex: 1, fontSize: 12, color: Design.color.inkMuted, lineHeight: 18 },
  creditCardContainer: { backgroundColor: Design.color.ink, borderRadius: Design.radius.card, padding: 24, borderWidth: 1, borderColor: Design.color.accent, shadowColor: "#1D1B17", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5, marginBottom: 24 },
  creditCardTitle: { fontSize: 9, letterSpacing: 3, color: Design.color.accent, fontWeight: "600", marginBottom: 16 },
  creditCardChip: { width: 40, height: 30, borderRadius: 6, backgroundColor: "#E6C587", opacity: 0.8, marginBottom: 20 },
  creditCardNumber: { fontSize: 20, letterSpacing: 2, color: Design.color.surface, fontFamily: Design.font.mono, marginBottom: 24 },
  creditCardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  creditCardLabel: { fontSize: 8, letterSpacing: 1, color: Design.color.inkSoft, marginBottom: 4 },
  creditCardValue: { fontSize: 12, color: Design.color.surface, fontWeight: "500", letterSpacing: 1 },
  creditCardBrand: { fontSize: 16, fontStyle: "italic", fontWeight: "bold", color: Design.color.accent },
  card: { backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, padding: 17, ...Design.shadow.card },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 10, letterSpacing: 2, color: Design.color.inkSoft, marginBottom: 6 },
  input: { borderBottomWidth: 1, borderBottomColor: Design.color.line, paddingVertical: 10, fontSize: 14, color: Design.color.ink },
  cardFieldsRow: { flexDirection: "row", gap: 16 },
  cardFieldHalf: { flex: 1 },
  continueBtn: { marginTop: 24 },
});