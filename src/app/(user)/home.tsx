import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Platform, ScrollView, StatusBar, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { CategoryTiles } from "../../components/category-tiles";
import { ContentFrame, CustomerNavigation, Overline, SectionHeading } from "../../components/app-ui";
import { PressScale, Reveal, staggerDelay } from "../../components/motion";
import { ProductCard } from "../../components/product-card";
import { CardSkeleton } from "../../components/skeleton";
import { Design, layout } from "../../constants/design";
import { supabase } from "../../lib/supabase";

const CATEGORIES = ["All", "Sofa", "Chair", "Table", "Bed"];

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
  useEffect(() => { void (async () => { await fetchProfile(); await fetchCartCount(); await fetchFavorites(); })(); }, [fetchCartCount, fetchFavorites, fetchProfile]);
  useEffect(() => { void (async () => { await fetchFurniture(); })(); }, [fetchFurniture]);

  const toggleFavorite = async (furnitureId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/(auth)/onboarding"); return; }
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
    if (!user) { router.replace("/(auth)/onboarding"); return; }
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
              <Reveal>
                <Text style={styles.greeting}>Welcome back{username ? `, ${username}` : ""}.</Text>
              </Reveal>
              <Reveal delay={staggerDelay(1)}>
                <Overline label="N°01 — The Gallery" />
              </Reveal>
              <Reveal delay={staggerDelay(2)}>
                <Text style={styles.title}>Pieces with presence, chosen for everyday living.</Text>
              </Reveal>
              <Reveal delay={staggerDelay(3)}>
                <Text style={styles.subtitle}>Discover the latest furniture in the Atelier Carvén collection.</Text>
              </Reveal>
              <Reveal delay={staggerDelay(4)}>
                <View style={styles.heroActions}>
                  <PressScale accessibilityLabel="View saved furniture" onPress={() => router.push("/(user)/favorites")} style={styles.iconAction}>
                    <Feather name="heart" size={18} color={Design.color.ink} />
                  </PressScale>
                  <PressScale accessibilityLabel="View cart" onPress={() => router.push("/(user)/cart")} style={styles.iconAction}>
                    <Feather name="shopping-bag" size={18} color={Design.color.ink} />
                    {cartCount > 0 ? <View style={styles.count}><Text style={styles.countText}>{cartCount > 9 ? "9+" : cartCount}</Text></View> : null}
                  </PressScale>
                </View>
              </Reveal>
            </View>
            <View style={[styles.heroVisual, wide && styles.heroVisualWide]}>
              <Reveal delay={staggerDelay(2)}>
                <View style={styles.heroImage}>
                  <Feather name="image" size={56} color={Design.color.inkMuted} />
                </View>
              </Reveal>
              <Animated.View entering={ZoomIn.springify().damping(Design.motion.spring.damping).delay(staggerDelay(4))} style={[styles.callout, styles.calloutTop]}>
                <View style={styles.calloutDot} />
                <View style={styles.calloutCopy}>
                  <Text style={styles.calloutText}>Every piece, numbered and catalogued.</Text>
                </View>
              </Animated.View>
              <Animated.View entering={ZoomIn.springify().damping(Design.motion.spring.damping).delay(staggerDelay(5))} style={[styles.callout, styles.calloutBottom]}>
                <View style={styles.calloutCopy}>
                  <Text style={styles.calloutNumber}>{loading ? "—" : furniture.length}</Text>
                  <Text style={styles.calloutSub}>pieces in the ledger</Text>
                </View>
              </Animated.View>
            </View>
          </View>

          <Reveal delay={staggerDelay(3)}>
            <PressScale accessibilityLabel="Search the collection" onPress={() => router.push("/(user)/search")} style={[styles.search, wide && styles.searchWide]}>
              <Feather name="search" size={17} color={Design.color.inkMuted} />
              <Text style={styles.searchPlaceholder}>Search the collection</Text>
              <Feather name="arrow-up-right" size={16} color={Design.color.inkMuted} />
            </PressScale>
          </Reveal>

          <Reveal delay={staggerDelay(1)}>
            <CategoryTiles categories={CATEGORIES} selected={selectedCategory} onSelect={setSelectedCategory} />
          </Reveal>

          <View style={styles.collectionWrap}>
            <SectionHeading
              index="02"
              overline={selectedCategory === "All" ? "The Collection" : selectedCategory}
              title={selectedCategory === "All" ? "Handpicked for you" : `${selectedCategory} pieces`}
            />
            {!loading ? <Text style={styles.collectionCount}>{`${furniture.length} piece${furniture.length === 1 ? "" : "s"}`}</Text> : null}
          </View>
          {loading ? (
            <View style={[styles.grid, wide && styles.gridWide]}>
              {[0, 1, 2, 3].map((skeleton) => (
                <View key={skeleton} style={wide ? styles.skeletonWide : styles.skeleton}>
                  <CardSkeleton />
                </View>
              ))}
            </View>
          ) : furniture.length === 0 ? (
            <Reveal>
              <View style={styles.empty}>
                <Feather name="search" size={28} color={Design.color.accent} />
                <Text style={styles.emptyTitle}>No pieces found</Text>
                <Text style={styles.emptyCopy}>Try a different category or search term.</Text>
              </View>
            </Reveal>
          ) : (
            <View style={[styles.grid, wide && styles.gridWide]}>
              {furniture.map((item, itemIndex) => (
                <View key={item.id} style={wide ? styles.cellWide : styles.cell}>
                  <ProductCard
                    item={item}
                    index={itemIndex}
                    onPress={() => router.push({ pathname: "/(user)/product", params: { id: item.id } })}
                    isFavorite={favorites.includes(item.id)}
                    onToggleFavorite={() => toggleFavorite(item.id)}
                    tag={item.category}
                    footerAction={
                      <PressScale
                        accessibilityLabel={`Add ${item.name} to cart`}
                        onPress={() => addToCart(item.id)}
                        style={styles.add}
                      >
                        <Feather name="plus" size={15} color={Design.color.surface} />
                      </PressScale>
                    }
                  />
                </View>
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
  greeting: { color: Design.color.inkSoft, fontFamily: Design.font.bodyMedium, fontSize: 13, marginBottom: 10 }, title: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 46, letterSpacing: -1.5, lineHeight: 46, maxWidth: 630, marginTop: 10 }, subtitle: { color: Design.color.inkSoft, fontFamily: Design.font.body, fontSize: 13, lineHeight: 21, marginTop: 11 },
  heroVisual: { marginTop: 6, position: "relative", width: "100%" }, heroVisualWide: { maxWidth: 540, width: "46%" }, heroImage: { alignItems: "center", aspectRatio: 1.5, backgroundColor: Design.color.surfaceMuted, borderRadius: Design.radius.sheet, justifyContent: "center", overflow: "hidden" },
  callout: { alignItems: "center", backgroundColor: "rgba(245,240,228,0.97)", borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 10, paddingHorizontal: 15, paddingVertical: 12, position: "absolute", ...Design.shadow.card },
  calloutTop: { right: 16, top: -18 }, calloutBottom: { bottom: -18, left: 16 }, calloutDot: { backgroundColor: Design.color.accent, borderRadius: 4, height: 8, width: 8 }, calloutCopy: { flex: 1 }, calloutText: { color: Design.color.ink, fontFamily: Design.font.bodySemibold, fontSize: 12, lineHeight: 17 }, calloutNumber: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 22, letterSpacing: -0.4, lineHeight: 22 }, calloutSub: { color: Design.color.inkMuted, fontFamily: Design.font.mono, fontSize: 10, marginTop: 2 },
  heroActions: { flexDirection: "row", gap: 8, marginTop: 24 }, iconAction: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.small, borderWidth: StyleSheet.hairlineWidth, height: 44, justifyContent: "center", position: "relative", width: 44 }, count: { alignItems: "center", backgroundColor: Design.color.accent, borderColor: Design.color.surface, borderRadius: Design.radius.small, borderWidth: 1.5, height: 18, justifyContent: "center", position: "absolute", right: -5, top: -5, minWidth: 18 }, countText: { color: Design.color.surface, fontFamily: Design.font.bodyBold, fontSize: 8 },
  search: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 10, minHeight: 52, paddingHorizontal: 15 }, searchWide: { maxWidth: 560 }, searchPlaceholder: { color: Design.color.inkMuted, flex: 1, fontFamily: Design.font.bodyMedium, fontSize: 13 },
  collectionWrap: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginTop: 32 }, collectionCount: { color: Design.color.inkMuted, fontFamily: Design.font.mono, fontSize: 10, marginBottom: Design.space.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 }, gridWide: { gap: 20 }, cell: { width: "47.8%" }, cellWide: { width: "31.7%" }, skeleton: { width: "47.8%" }, skeletonWide: { width: "31.7%" },
  add: { alignItems: "center", backgroundColor: Design.color.ink, borderRadius: Design.radius.small, height: 32, justifyContent: "center", width: 32 },
  empty: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, marginTop: 8, padding: 36 }, emptyTitle: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 26, marginTop: 12 }, emptyCopy: { color: Design.color.inkSoft, fontFamily: Design.font.body, fontSize: 12, marginTop: 4 },
});
