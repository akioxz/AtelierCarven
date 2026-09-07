import { AntDesign, Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { PrimaryButton } from "../../components/app-ui";
import { Design, layout } from "../../constants/design";
import { supabase } from "../../lib/supabase";

const COLORS = [{ name: "Black", hex: "#211A16" }, { name: "White", hex: "#FFFCF8" }, { name: "Gray", hex: "#929292" }, { name: "Beige", hex: "#C6A27C" }];
const MATERIALS = ["Wood", "Metal", "Leather", "Fabric", "Marble"];

export default function Product() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const wide = Platform.OS === "web" && width >= layout.desktopBreakpoint;
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLORS[0].name);
  const [selectedMaterial, setSelectedMaterial] = useState(MATERIALS[0]);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [intent, setIntent] = useState<"cart" | "buy">("cart");
  const [reviews, setReviews] = useState<any[]>([]);
  const [sizeGuide, setSizeGuide] = useState<any>(null);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchItem = useCallback(async () => { const { data } = await supabase.from("furniture").select("*").eq("id", id).single(); setItem(data); setLoading(false); }, [id]);
  const fetchReviews = useCallback(async () => { const { data } = await supabase.from("reviews").select("id, rating, comment, created_at, profiles(username)").eq("furniture_id", id).order("created_at", { ascending: false }); setReviews(data || []); }, [id]);
  const fetchSizeGuide = useCallback(async () => { const { data } = await supabase.from("size_guides").select("*").eq("furniture_id", id).maybeSingle(); setSizeGuide(data || null); }, [id]);
  const fetchFavorite = useCallback(async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) return; const { data } = await supabase.from("favorites").select("id").eq("user_id", user.id).eq("furniture_id", id).single(); setIsFavorite(Boolean(data)); }, [id]);
  useEffect(() => { fetchItem(); fetchFavorite(); fetchReviews(); fetchSizeGuide(); }, [fetchFavorite, fetchItem, fetchReviews, fetchSizeGuide]);
  const toggleFavorite = async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) return; setIsFavorite((value) => !value); if (isFavorite) await supabase.from("favorites").delete().eq("user_id", user.id).eq("furniture_id", id); else await supabase.from("favorites").insert({ user_id: user.id, furniture_id: id }); };
  const openSelection = (nextIntent: "cart" | "buy") => { setIntent(nextIntent); setQuantity(1); setSheetOpen(true); };
  const submit = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: existing } = await supabase.from("cart").select("*").eq("user_id", user.id).eq("furniture_id", id).eq("color", selectedColor).eq("material", selectedMaterial).single();
      if (existing) await supabase.from("cart").update({ quantity: existing.quantity + quantity }).eq("id", existing.id);
      else await supabase.from("cart").insert({ user_id: user.id, furniture_id: id, quantity, color: selectedColor, material: selectedMaterial });
      setSheetOpen(false);
      if (intent === "buy") router.push("/(user)/checkout");
    } finally {
      setSubmitting(false);
    }
  };
  const submitReview = async () => {
    if (reviewRating === 0) return;
    setSubmittingReview(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("reviews").insert({ furniture_id: id, user_id: user.id, rating: reviewRating, comment: reviewComment.trim() || null });
      setReviewSheetOpen(false);
      setReviewRating(0);
      setReviewComment("");
      fetchItem();
      fetchReviews();
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator color={Design.color.gold} /></View>;
  if (!item) return <View style={styles.loading}><Text style={styles.notFound}>This piece is no longer available.</Text><Pressable onPress={() => router.back()}><Text style={styles.return}>Return to collection</Text></Pressable></View>;
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.frame, wide && styles.frameWide]}>
          <View style={styles.utility}><Pressable onPress={() => router.back()} style={({ pressed }) => [styles.utilityButton, pressed && styles.pressed]}><Feather name="arrow-left" size={19} color={Design.color.ink} /></Pressable><Pressable onPress={toggleFavorite} style={({ pressed }) => [styles.utilityButton, pressed && styles.pressed]}>{isFavorite ? <AntDesign name="heart" size={18} color={Design.color.gold} /> : <Feather name="heart" size={18} color={Design.color.ink} />}</Pressable></View>
          <View style={[styles.content, wide && styles.contentWide]}>
            <View style={[styles.imagePanel, wide && styles.imagePanelWide]}>{item.image_url ? <Image source={{ uri: item.image_url }} style={styles.image} /> : <Feather name="box" size={88} color={Design.color.inkMuted} />}</View>
            <View style={styles.details}>
              <Text style={styles.category}>{item.category}</Text><Text style={styles.name}>{item.name}</Text><View style={styles.rule} />
              {item.rating != null ? <View style={styles.rating}><View style={styles.stars}>{[1, 2, 3, 4, 5].map((star) => <Feather key={star} name="star" size={13} color={star <= Math.round(item.rating) ? Design.color.gold : Design.color.line} />)}</View><Text style={styles.ratingText}>{Number(item.rating).toFixed(1)}{item.review_count != null ? ` · ${item.review_count} reviews` : ""}</Text></View> : null}
              <Text style={styles.price}>₱{Number(item.price).toLocaleString()}</Text>
              <Text style={styles.description}>{item.description || "A carefully selected piece designed to bring lasting comfort and character to your home."}</Text>
              <View style={styles.detailNote}><Feather name="package" size={16} color={Design.color.gold} /><Text style={styles.detailNoteText}>Choose your preferred finish and material before adding this piece to your cart.</Text></View>
              <View style={styles.metaLinks}>{sizeGuide ? <Pressable onPress={() => setSizeGuideOpen(true)} style={({ pressed }) => [styles.metaLink, pressed && styles.pressed]}><Feather name="maximize" size={14} color={Design.color.gold} /><Text style={styles.metaLinkText}>SIZE GUIDE</Text></Pressable> : null}<Pressable onPress={() => setReviewSheetOpen(true)} style={({ pressed }) => [styles.metaLink, pressed && styles.pressed]}><Feather name="edit-3" size={14} color={Design.color.gold} /><Text style={styles.metaLinkText}>WRITE A REVIEW</Text></Pressable></View>
              <View style={styles.reviewsSection}>
                <View style={styles.reviewsHeader}><Text style={styles.reviewsTitle}>Reviews</Text>{item.rating != null ? <Text style={styles.reviewsCount}>{Number(item.rating).toFixed(1)} · {item.review_count ?? 0} review{item.review_count === 1 ? "" : "s"}</Text> : null}</View>
                {reviews.length === 0 ? <Text style={styles.noReviews}>No reviews yet — be the first to share your thoughts.</Text> : reviews.map((review) => (
                  <View key={review.id} style={styles.reviewItem}>
                    <View style={styles.reviewTop}><Text style={styles.reviewAuthor}>{review.profiles?.username || "Customer"}</Text><View style={styles.stars}>{[1, 2, 3, 4, 5].map((star) => <Feather key={star} name="star" size={11} color={star <= review.rating ? Design.color.gold : Design.color.line} />)}</View></View>
                    {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
                    <Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</Text>
                  </View>
                ))}
              </View>
              {wide ? <View style={styles.desktopActions}><Pressable onPress={() => openSelection("cart")} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}><Text style={styles.secondaryActionText}>ADD TO CART</Text></Pressable><PrimaryButton label="BUY NOW" onPress={() => openSelection("buy")} style={styles.primaryAction} /></View> : null}
            </View>
          </View>
        </View>
      </ScrollView>
      {!wide ? <View style={styles.bottomActions}><Pressable onPress={() => openSelection("cart")} style={({ pressed }) => [styles.secondaryAction, styles.bottomSecondary, pressed && styles.pressed]}><Text style={styles.secondaryActionText}>ADD TO CART</Text></Pressable><Pressable onPress={() => openSelection("buy")} style={({ pressed }) => [styles.buyAction, pressed && styles.pressed]}><Text style={styles.buyActionText}>BUY NOW</Text></Pressable></View> : null}
      <Modal visible={sheetOpen} animationType="slide" transparent onRequestClose={() => setSheetOpen(false)}>
        <View style={styles.overlay}><View style={styles.sheet}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><View><Text style={styles.sheetTitle}>Make it yours</Text><Text style={styles.sheetSub}>{item.name}</Text></View><Pressable onPress={() => setSheetOpen(false)} style={styles.close}><Feather name="x" size={18} color={Design.color.ink} /></Pressable></View>
          <Text style={styles.optionLabel}>Colour</Text><View style={styles.colorChoices}>{COLORS.map((color) => <Pressable key={color.name} onPress={() => setSelectedColor(color.name)} style={({ pressed }) => [styles.colorChoice, selectedColor === color.name && styles.colorChoiceSelected, pressed && styles.pressed]}><View style={[styles.swatch, { backgroundColor: color.hex }, color.name === "White" && styles.whiteSwatch]} /><Text style={styles.choiceText}>{color.name}</Text></Pressable>)}</View>
          <Text style={styles.optionLabel}>Material</Text><View style={styles.materialChoices}>{MATERIALS.map((material) => <Pressable key={material} onPress={() => setSelectedMaterial(material)} style={({ pressed }) => [styles.material, selectedMaterial === material && styles.materialSelected, pressed && styles.pressed]}><Text style={[styles.materialText, selectedMaterial === material && styles.materialTextSelected]}>{material}</Text></Pressable>)}</View>
          <View style={styles.quantityRow}><View><Text style={styles.optionLabel}>Quantity</Text><Text style={styles.quantityHint}>Select the number of pieces.</Text></View><View style={styles.stepper}><Pressable onPress={() => setQuantity((value) => Math.max(1, value - 1))} style={styles.step}><Feather name="minus" size={15} color={Design.color.ink} /></Pressable><Text style={styles.quantity}>{quantity}</Text><Pressable onPress={() => setQuantity((value) => value + 1)} style={styles.step}><Feather name="plus" size={15} color={Design.color.ink} /></Pressable></View></View>
          <PrimaryButton label={submitting ? "ADDING…" : intent === "buy" ? "CONTINUE TO CHECKOUT" : "ADD TO CART"} disabled={submitting} onPress={submit} />
        </View></View>
      </Modal>
      <Modal visible={reviewSheetOpen} animationType="slide" transparent onRequestClose={() => setReviewSheetOpen(false)}>
        <View style={styles.overlay}><View style={styles.sheet}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><View><Text style={styles.sheetTitle}>Write a review</Text><Text style={styles.sheetSub}>{item.name}</Text></View><Pressable onPress={() => setReviewSheetOpen(false)} style={styles.close}><Feather name="x" size={18} color={Design.color.ink} /></Pressable></View>
          <Text style={styles.optionLabel}>Your rating</Text>
          <View style={styles.reviewStars}>{[1, 2, 3, 4, 5].map((star) => <Pressable key={star} accessibilityLabel={`Rate ${star} of 5`} onPress={() => setReviewRating(star)} hitSlop={4} style={({ pressed }) => [styles.reviewStar, pressed && styles.pressed]}>{star <= reviewRating ? <AntDesign name="star" size={30} color={Design.color.gold} /> : <Feather name="star" size={30} color={Design.color.line} />}</Pressable>)}</View>
          <Text style={styles.reviewHint}>{reviewRating === 0 ? "Tap to rate this piece" : `${reviewRating} of 5`}</Text>
          <Text style={styles.optionLabel}>Comment (optional)</Text>
          <TextInput value={reviewComment} onChangeText={setReviewComment} placeholder="What did you like or dislike?" placeholderTextColor={Design.color.inkMuted} style={styles.reviewInput} multiline numberOfLines={4} />
          <PrimaryButton label={submittingReview ? "SUBMITTING…" : "SUBMIT REVIEW"} disabled={submittingReview || reviewRating === 0} onPress={submitReview} />
        </View></View>
      </Modal>
      <Modal visible={sizeGuideOpen} animationType="slide" transparent onRequestClose={() => setSizeGuideOpen(false)}>
        <View style={styles.overlay}><View style={styles.sheet}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><View><Text style={styles.sheetTitle}>Size guide</Text><Text style={styles.sheetSub}>{item.name}</Text></View><Pressable onPress={() => setSizeGuideOpen(false)} style={styles.close}><Feather name="x" size={18} color={Design.color.ink} /></Pressable></View>
          <View style={styles.measureRow}><Text style={styles.measureLabel}>Width</Text><Text style={styles.measureValue}>{sizeGuide.width_cm != null ? `${Number(sizeGuide.width_cm)} cm` : "—"}</Text></View>
          <View style={styles.measureDivider} />
          <View style={styles.measureRow}><Text style={styles.measureLabel}>Height</Text><Text style={styles.measureValue}>{sizeGuide.height_cm != null ? `${Number(sizeGuide.height_cm)} cm` : "—"}</Text></View>
          <View style={styles.measureDivider} />
          <View style={styles.measureRow}><Text style={styles.measureLabel}>Depth</Text><Text style={styles.measureValue}>{sizeGuide.depth_cm != null ? `${Number(sizeGuide.depth_cm)} cm` : "—"}</Text></View>
          <View style={styles.measureDivider} />
          <View style={styles.measureRow}><Text style={styles.measureLabel}>Weight</Text><Text style={styles.measureValue}>{sizeGuide.weight_kg != null ? `${Number(sizeGuide.weight_kg)} kg` : "—"}</Text></View>
        </View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Design.color.canvas, flex: 1 }, loading: { alignItems: "center", backgroundColor: Design.color.canvas, flex: 1, gap: 16, justifyContent: "center" }, notFound: { color: Design.color.ink, fontFamily: Design.font.bodyMedium, fontSize: 14 }, return: { color: Design.color.gold, fontFamily: Design.font.bodyBold, fontSize: 12 }, scroll: { paddingBottom: 112 }, frame: { padding: 20 }, frameWide: { alignSelf: "center", maxWidth: layout.pageMaxWidth, width: "100%" }, utility: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 }, utilityButton: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, height: 44, justifyContent: "center", width: 44 }, content: { gap: 28 }, contentWide: { alignItems: "flex-start", flexDirection: "row", gap: 56 }, imagePanel: { alignItems: "center", aspectRatio: 1, backgroundColor: Design.color.surfaceMuted, borderRadius: Design.radius.sheet, justifyContent: "center", overflow: "hidden", width: "100%" }, imagePanelWide: { width: "52%" }, image: { height: "100%", width: "100%" }, details: { flex: 1, width: "100%" }, category: { color: Design.color.inkMuted, fontFamily: Design.font.bodySemibold, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }, name: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 43, letterSpacing: -1.3, lineHeight: 44, marginTop: 8 }, rule: { backgroundColor: Design.color.gold, height: 1, marginTop: 21, width: 42 }, rating: { alignItems: "center", flexDirection: "row", gap: 9, marginTop: 20 }, stars: { flexDirection: "row", gap: 3 }, ratingText: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 11 }, price: { color: Design.color.gold, fontFamily: Design.font.display, fontSize: 31, marginTop: 18 }, description: { color: Design.color.inkSoft, fontFamily: Design.font.body, fontSize: 13, lineHeight: 23, marginTop: 18 }, detailNote: { alignItems: "flex-start", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.small, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 10, marginTop: 24, padding: 14 }, detailNoteText: { color: Design.color.inkSoft, flex: 1, fontFamily: Design.font.body, fontSize: 11, lineHeight: 18 }, desktopActions: { flexDirection: "row", gap: 10, marginTop: 28 }, primaryAction: { flex: 1 }, secondaryAction: { alignItems: "center", borderColor: Design.color.ink, borderRadius: Design.radius.small, borderWidth: 1, justifyContent: "center", minHeight: 52, paddingHorizontal: 18 }, secondaryActionText: { color: Design.color.ink, fontFamily: Design.font.bodyBold, fontSize: 11, letterSpacing: 1.1 }, bottomActions: { backgroundColor: Design.color.surface, borderTopColor: Design.color.line, borderTopWidth: StyleSheet.hairlineWidth, bottom: 0, flexDirection: "row", gap: 10, left: 0, padding: 14, position: "absolute", right: 0 }, bottomSecondary: { flex: 1 }, buyAction: { alignItems: "center", backgroundColor: Design.color.ink, borderRadius: Design.radius.small, flex: 1, justifyContent: "center", minHeight: 52 }, buyActionText: { color: Design.color.surface, fontFamily: Design.font.bodyBold, fontSize: 11, letterSpacing: 1.1 }, pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] }, overlay: { backgroundColor: "rgba(33,26,22,0.45)", flex: 1, justifyContent: "flex-end" }, sheet: { backgroundColor: Design.color.surface, borderTopLeftRadius: Design.radius.sheet, borderTopRightRadius: Design.radius.sheet, padding: 22, paddingBottom: 34 }, sheetHandle: { alignSelf: "center", backgroundColor: Design.color.line, borderRadius: 3, height: 4, marginBottom: 20, width: 38 }, sheetHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", marginBottom: 24 }, sheetTitle: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 31, letterSpacing: -0.8 }, sheetSub: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 11, marginTop: 2 }, close: { alignItems: "center", backgroundColor: Design.color.surfaceMuted, borderRadius: 18, height: 36, justifyContent: "center", width: 36 }, optionLabel: { color: Design.color.ink, fontFamily: Design.font.bodyBold, fontSize: 11, letterSpacing: 0.6, marginBottom: 10, marginTop: 16 }, colorChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, colorChoice: { alignItems: "center", borderColor: Design.color.line, borderRadius: Design.radius.small, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 8, minHeight: 42, paddingHorizontal: 10 }, colorChoiceSelected: { borderColor: Design.color.gold, borderWidth: 1 }, swatch: { borderRadius: 9, height: 18, width: 18 }, whiteSwatch: { borderColor: Design.color.line, borderWidth: StyleSheet.hairlineWidth }, choiceText: { color: Design.color.inkSoft, fontFamily: Design.font.bodyMedium, fontSize: 11 }, materialChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, material: { borderColor: Design.color.line, borderRadius: Design.radius.pill, borderWidth: StyleSheet.hairlineWidth, minHeight: 35, paddingHorizontal: 13, justifyContent: "center" }, materialSelected: { backgroundColor: Design.color.ink, borderColor: Design.color.ink }, materialText: { color: Design.color.inkSoft, fontFamily: Design.font.bodyMedium, fontSize: 11 }, materialTextSelected: { color: Design.color.surface }, quantityRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 24, marginTop: 24 }, quantityHint: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 10, marginTop: 3 }, stepper: { alignItems: "center", backgroundColor: Design.color.surfaceMuted, borderRadius: Design.radius.small, flexDirection: "row", gap: 11, padding: 5 }, step: { alignItems: "center", backgroundColor: Design.color.surface, borderRadius: 15, height: 30, justifyContent: "center", width: 30 }, quantity: { color: Design.color.ink, fontFamily: Design.font.bodyBold, fontSize: 13, minWidth: 16, textAlign: "center" },
  metaLinks: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: 18, marginTop: 20 }, metaLink: { alignItems: "center", flexDirection: "row", gap: 7, minHeight: 30 }, metaLinkText: { color: Design.color.ink, fontFamily: Design.font.bodyBold, fontSize: 10, letterSpacing: 1.1 }, reviewsSection: { marginTop: 30, borderTopColor: Design.color.line, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 24 }, reviewsHeader: { alignItems: "baseline", flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }, reviewsTitle: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 26, letterSpacing: -0.6 }, reviewsCount: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 11 }, noReviews: { color: Design.color.inkSoft, fontFamily: Design.font.body, fontSize: 12, lineHeight: 20 }, reviewItem: { borderBottomColor: Design.color.line, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 14, marginBottom: 14 }, reviewTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, reviewAuthor: { color: Design.color.ink, fontFamily: Design.font.bodySemibold, fontSize: 12 }, reviewComment: { color: Design.color.inkSoft, fontFamily: Design.font.body, fontSize: 12, lineHeight: 20, marginTop: 6 }, reviewDate: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 10, marginTop: 6 }, reviewStars: { flexDirection: "row", gap: 8, marginBottom: 6 }, reviewStar: { alignItems: "center", justifyContent: "center", minHeight: 40 }, reviewHint: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 11, marginBottom: 20 }, reviewInput: { backgroundColor: Design.color.surfaceMuted, borderColor: Design.color.line, borderRadius: Design.radius.small, borderWidth: StyleSheet.hairlineWidth, color: Design.color.ink, fontFamily: Design.font.body, fontSize: 13, marginBottom: 20, minHeight: 110, padding: 14, textAlignVertical: "top" }, measureRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 14 }, measureLabel: { color: Design.color.inkSoft, fontFamily: Design.font.bodyMedium, fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" }, measureValue: { color: Design.color.ink, fontFamily: Design.font.bodySemibold, fontSize: 14 }, measureDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Design.color.line },});
