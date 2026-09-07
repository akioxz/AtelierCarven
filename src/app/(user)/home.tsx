import { AntDesign, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { CategoryTiles } from "../../components/category-tiles";
import { ContentFrame, CustomerNavigation, Overline } from "../../components/app-ui";
import { Design, layout } from "../../constants/design";
import { supabase } from "../../lib/supabase";

const CATEGORIES = ["All", "Sofa", "Chair", "Table", "Bed"];
const iconFor = (category: string) => ({ Sofa: "airplay", Chair: "sidebar", Table: "minus-square", Bed: "moon" }[category] || "box") as React.ComponentProps<typeof Feather>["name"];

export default function Home() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = Platform.OS === "web" && width >= layout.desktopBreakpoint;
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [furniture, setFurniture] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("username").eq("id", user.id).single();
    setUsername(data?.username || "Guest");
  }, []);
  const fetchFurniture = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("furniture").select("*").eq("is_deleted", false);
    if (selectedCategory !== "All") query = query.eq("category", selectedCategory);
    const { data } = await query;
    setFurniture(data || []);
    setLoading(false);
  }, [selectedCategory]);
  const fetchCartCount = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase.from("cart").select("*", { count: "exact", head: true }).eq("user_id", user.id);
    setCartCount(count || 0);
  }, []);
  const fetchFavorites = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("favorites").select("furniture_id").eq("user_id", user.id);
    setFavorites((data || []).map((item: any) => item.furniture_id));
  }, []);
  useEffect(() => { fetchProfile(); fetchCartCount(); fetchFavorites(); }, [fetchCartCount, fetchFavorites, fetchProfile]);
  useEffect(() => { fetchFurniture(); }, [fetchFurniture]);

  const toggleFavorite = async (furnitureId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    Haptics.selectionAsync();
    if (favorites.includes(furnitureId)) {
      setFavorites((previous) => previous.filter((id) => id !== furnitureId));
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("furniture_id", furnitureId);
    } else {
      setFavorites((previous) => [...previous, furnitureId]);
      await supabase.from("favorites").insert({ user_id: user.id, furniture_id: furnitureId });
    }
  };
  const addToCart = async (furnitureId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    Haptics.selectionAsync();
    const { data: existing } = await supabase.from("cart").select("*").eq("user_id", user.id).eq("furniture_id", furnitureId).single();
    if (existing) await supabase.from("cart").update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
    else await supabase.from("cart").insert({ user_id: user.id, furniture_id: furnitureId, quantity: 1 });
    fetchCartCount();
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <CustomerNavigation active="home" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ContentFrame style={styles.frame}>
          <View style={[styles.hero, wide && styles.heroWide]}>
            <View style={styles.heroCopy}>
              <Text style={styles.greeting}>Welcome back{username ? `, ${username}` : ""}.</Text>
              <Overline label="Atelier Carvén" />
              <Text style={styles.title}>Pieces with presence, chosen for everyday living.</Text>
              <Text style={styles.subtitle}>Discover the latest furniture in the Atelier Carvén collection.</Text>
              <View style={styles.heroActions}>
                <Pressable accessibilityLabel="View saved furniture" onPress={() => router.push("/(user)/favorites")} style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}><Feather name="heart" size={18} color={Design.color.ink} /></Pressable>
                <Pressable accessibilityLabel="View cart" onPress={() => router.push("/(user)/cart")} style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}>
                  <Feather name="shopping-bag" size={18} color={Design.color.ink} />{cartCount > 0 ? <View style={styles.count}><Text style={styles.countText}>{cartCount > 9 ? "9+" : cartCount}</Text></View> : null}
                </Pressable>
              </View>
            </View>
            <View style={[styles.heroVisual, wide && styles.heroVisualWide]}>
              <View style={styles.heroImage}>
                <Feather name="image" size={56} color={Design.color.inkMuted} />
              </View>
              <View style={[styles.callout, styles.calloutTop]}>
                <View style={styles.calloutDot} />
                <View style={styles.calloutCopy}>
                  <Text style={styles.calloutText}>Hand-finished pieces from local makers.</Text>
                </View>
              </View>
              <View style={[styles.callout, styles.calloutBottom]}>
                <View style={styles.calloutCopy}>
                  <Text style={styles.calloutNumber}>50+</Text>
                  <Text style={styles.calloutSub}>signature furniture pieces</Text>
                </View>
              </View>
            </View>
          </View>

          <Pressable accessibilityLabel="Search the collection" onPress={() => router.push("/(user)/search" as never)} style={({ pressed }) => [styles.search, wide && styles.searchWide, pressed && styles.pressed]}>
            <Feather name="search" size={17} color={Design.color.inkMuted} />
            <Text style={styles.searchPlaceholder}>Search the collection</Text>
            <Feather name="arrow-up-right" size={16} color={Design.color.inkMuted} />
          </Pressable>

          <CategoryTiles categories={CATEGORIES} selected={selectedCategory} onSelect={setSelectedCategory} />

          <View style={styles.collectionHeading}><View><Overline label={selectedCategory === "All" ? "The Collection" : selectedCategory} /><Text style={styles.collectionTitle}>{selectedCategory === "All" ? "Handpicked for you" : `${selectedCategory} pieces`}</Text></View><Text style={styles.collectionCount}>{loading ? "" : `${furniture.length} piece${furniture.length === 1 ? "" : "s"}`}</Text></View>
          {loading ? <ActivityIndicator color={Design.color.gold} style={styles.loading} /> : furniture.length === 0 ? (
            <View style={styles.empty}><Feather name="search" size={28} color={Design.color.gold} /><Text style={styles.emptyTitle}>No pieces found</Text><Text style={styles.emptyCopy}>Try a different category or search term.</Text></View>
          ) : (
            <View style={[styles.grid, wide && styles.gridWide]}>
              {furniture.map((item) => (
                <Pressable key={item.id} onPress={() => router.push({ pathname: "/(user)/product", params: { id: item.id } })} style={({ pressed }) => [styles.card, wide && styles.cardWide, pressed && styles.cardPressed]}>
                  <View style={styles.imageWrap}>
                    {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.image} /> : <Feather name={iconFor(item.category)} size={42} color={Design.color.inkMuted} />}
                    <Pressable accessibilityLabel={favorites.includes(item.id) ? "Remove from saved" : "Save furniture"} onPress={(event) => { event.stopPropagation(); toggleFavorite(item.id); }} style={({ pressed }) => [styles.heart, pressed && styles.pressed]}>
                      {favorites.includes(item.id) ? <AntDesign name="heart" size={14} color={Design.color.gold} /> : <Feather name="heart" size={15} color={Design.color.ink} />}
                    </Pressable>
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.tagRow}><View style={styles.tag}><Text style={styles.tagText}>{item.category}</Text></View>{item.rating != null ? <View style={styles.rating}><Feather name="star" size={11} color={Design.color.gold} /><Text style={styles.ratingText}>{Number(item.rating).toFixed(1)}</Text></View> : null}</View>
                    <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.cardFooter}><Text style={styles.price}>₱{Number(item.price).toLocaleString()}</Text><Pressable onPress={(event) => { event.stopPropagation(); addToCart(item.id); }} style={({ pressed }) => [styles.add, pressed && styles.pressed]}><Feather name="plus" size={15} color={Design.color.surface} /></Pressable></View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ContentFrame>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Design.color.canvas, flex: 1 }, scroll: { paddingBottom: 112 }, frame: { paddingHorizontal: 20, paddingTop: 28 },
  hero: { flexDirection: "column", gap: 22, marginBottom: 30 }, heroWide: { alignItems: "center", flexDirection: "row", gap: 56, marginTop: 26 }, heroCopy: { flex: 1, maxWidth: 680 },
  greeting: { color: Design.color.inkSoft, fontFamily: Design.font.bodyMedium, fontSize: 13, marginBottom: 10 }, title: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 42, letterSpacing: -1.3, lineHeight: 42, maxWidth: 630, marginTop: 10 }, subtitle: { color: Design.color.inkSoft, fontFamily: Design.font.body, fontSize: 13, lineHeight: 21, marginTop: 11 },
  heroVisual: { marginTop: 6, position: "relative", width: "100%" }, heroVisualWide: { maxWidth: 540, width: "46%" }, heroImage: { alignItems: "center", aspectRatio: 1.5, backgroundColor: Design.color.surfaceMuted, borderRadius: Design.radius.sheet, justifyContent: "center", overflow: "hidden" },
  callout: { alignItems: "center", backgroundColor: "rgba(255,252,248,0.97)", borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 10, paddingHorizontal: 15, paddingVertical: 12, position: "absolute", ...Design.shadow.card },
  calloutTop: { right: 16, top: -18 }, calloutBottom: { bottom: -18, left: 16 }, calloutDot: { backgroundColor: Design.color.gold, borderRadius: 4, height: 8, width: 8 }, calloutCopy: { flex: 1 }, calloutText: { color: Design.color.ink, fontFamily: Design.font.bodySemibold, fontSize: 12, lineHeight: 17 }, calloutNumber: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 22, letterSpacing: -0.4, lineHeight: 22 }, calloutSub: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 11, marginTop: 2 },
  heroActions: { flexDirection: "row", gap: 8, marginTop: 24 }, iconAction: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, height: 44, justifyContent: "center", position: "relative", width: 44 }, count: { alignItems: "center", backgroundColor: Design.color.gold, borderColor: Design.color.surface, borderRadius: 9, borderWidth: 1.5, height: 18, justifyContent: "center", position: "absolute", right: -5, top: -5, minWidth: 18 }, countText: { color: Design.color.surface, fontFamily: Design.font.bodyBold, fontSize: 8 },
  search: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 10, minHeight: 52, paddingHorizontal: 15 }, searchWide: { maxWidth: 560 }, searchPlaceholder: { color: Design.color.inkMuted, flex: 1, fontFamily: Design.font.bodyMedium, fontSize: 13 },
  collectionHeading: { alignItems: "baseline", flexDirection: "row", gap: 16, justifyContent: "space-between", marginTop: 32, marginBottom: 14 }, collectionTitle: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 30, letterSpacing: -0.7, marginTop: 8 }, collectionCount: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 11 }, loading: { marginTop: 48 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 }, gridWide: { gap: 20 }, card: { backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", width: "47.8%" }, cardWide: { width: "31.7%" }, cardPressed: { opacity: 0.84, transform: [{ scale: 0.99 }] }, imageWrap: { alignItems: "center", aspectRatio: 0.96, backgroundColor: Design.color.surfaceMuted, justifyContent: "center", position: "relative" }, image: { height: "100%", width: "100%" }, heart: { alignItems: "center", backgroundColor: "rgba(255,252,248,0.94)", borderRadius: 18, height: 36, justifyContent: "center", position: "absolute", right: 10, top: 10, width: 36 },   cardBody: { padding: 13 }, tagRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, tag: { alignSelf: "flex-start", backgroundColor: Design.color.goldSoft, borderRadius: Design.radius.small, paddingHorizontal: 8, paddingVertical: 3 }, tagText: { color: Design.color.inkMuted, fontFamily: Design.font.bodySemibold, fontSize: 9, letterSpacing: 0.7, textTransform: "uppercase" }, rating: { alignItems: "center", flexDirection: "row", gap: 3 }, ratingText: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 10 }, productName: { color: Design.color.ink, fontFamily: Design.font.bodySemibold, fontSize: 13, marginTop: 8 }, cardFooter: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 12 }, price: { color: Design.color.gold, fontFamily: Design.font.bodyBold, fontSize: 13 }, add: { alignItems: "center", backgroundColor: Design.color.ink, borderRadius: 16, height: 32, justifyContent: "center", width: 32 },
  empty: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, marginTop: 8, padding: 36 }, emptyTitle: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 26, marginTop: 12 }, emptyCopy: { color: Design.color.inkSoft, fontFamily: Design.font.body, fontSize: 12, marginTop: 4 }, pressed: { opacity: 0.76, transform: [{ scale: 0.97 }] },
});
