import { AntDesign, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { ContentFrame } from "../../components/app-ui";
import { Design, layout } from "../../constants/design";
import { supabase } from "../../lib/supabase";

const CATEGORIES = ["All", "Sofa", "Chair", "Table", "Bed"];
const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "price-asc", label: "Price: Low to High" },
  { key: "price-desc", label: "Price: High to Low" },
  { key: "rating", label: "Top Rated" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];
const iconFor = (category: string) => ({ Sofa: "airplay", Chair: "sidebar", Table: "minus-square", Bed: "moon" }[category] || "box") as React.ComponentProps<typeof Feather>["name"];

export default function Search() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const { width } = useWindowDimensions();
  const wide = Platform.OS === "web" && width >= layout.desktopBreakpoint;
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sort, setSort] = useState<SortKey>("newest");
  const [furniture, setFurniture] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);

  const trimmed = query.trim();

  const fetchFavorites = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("favorites").select("furniture_id").eq("user_id", user.id);
    setFavorites((data || []).map((item: any) => item.furniture_id));
  }, []);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    let queryBuilder = supabase.from("furniture").select("*").eq("is_deleted", false);
    if (selectedCategory !== "All") queryBuilder = queryBuilder.eq("category", selectedCategory);
    if (trimmed) queryBuilder = queryBuilder.or(`name.ilike.%${trimmed}%,description.ilike.%${trimmed}%,category.ilike.%${trimmed}%`);
    switch (sort) {
      case "price-asc": queryBuilder = queryBuilder.order("price", { ascending: true }); break;
      case "price-desc": queryBuilder = queryBuilder.order("price", { ascending: false }); break;
      case "rating": queryBuilder = queryBuilder.order("rating", { ascending: false, nullsFirst: false }).order("review_count", { ascending: false }); break;
      default: queryBuilder = queryBuilder.order("created_at", { ascending: false });
    }
    const { data } = await queryBuilder;
    setFurniture(data || []);
    setLoading(false);
  }, [selectedCategory, sort, trimmed]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);
  useEffect(() => { fetchResults(); }, [fetchResults]);
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, []);

  const toggleFavorite = async (furnitureId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
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
    const { data: existing } = await supabase.from("cart").select("*").eq("user_id", user.id).eq("furniture_id", furnitureId).single();
    if (existing) await supabase.from("cart").update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
    else await supabase.from("cart").insert({ user_id: user.id, furniture_id: furnitureId, quantity: 1 });
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <ContentFrame style={styles.frame}>
          <View style={styles.topbar}>
            <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}><Feather name="arrow-left" size={19} color={Design.color.ink} /></Pressable>
            <View style={styles.search}>
              <Feather name="search" size={17} color={Design.color.inkMuted} />
              <TextInput ref={inputRef} value={query} onChangeText={setQuery} placeholder="Search pieces, materials, categories" placeholderTextColor={Design.color.inkMuted} style={styles.searchInput} returnKeyType="search" autoCorrect={false} />
              {trimmed ? <Pressable onPress={() => setQuery("")} hitSlop={8}><Feather name="x" size={16} color={Design.color.inkMuted} /></Pressable> : null}
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {CATEGORIES.map((category) => {
              const selected = category === selectedCategory;
              return <Pressable key={category} onPress={() => setSelectedCategory(category)} style={({ pressed }) => [styles.filter, selected && styles.filterSelected, pressed && styles.pressed]}><Text style={[styles.filterText, selected && styles.filterTextSelected]}>{category}</Text></Pressable>;
            })}
          </ScrollView>

          <View style={styles.sortRow}>
            <Text style={styles.resultCount}>{loading ? "" : `${furniture.length} piece${furniture.length === 1 ? "" : "s"} found`}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScroll}>
              {SORTS.map((option) => {
                const selected = option.key === sort;
                return <Pressable key={option.key} onPress={() => setSort(option.key)} style={({ pressed }) => [styles.sortChip, selected && styles.sortChipSelected, pressed && styles.pressed]}><Text style={[styles.sortText, selected && styles.sortTextSelected]}>{option.label}</Text></Pressable>;
              })}
            </ScrollView>
          </View>

          {loading ? <ActivityIndicator color={Design.color.gold} style={styles.loading} /> : furniture.length === 0 ? (
            <View style={styles.empty}><Feather name="search" size={28} color={Design.color.gold} /><Text style={styles.emptyTitle}>No pieces found</Text><Text style={styles.emptyCopy}>Try a different search term or category.</Text></View>
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
                    <Text style={styles.category}>{item.category}</Text><Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                    {item.rating != null ? <View style={styles.cardRating}><Feather name="star" size={11} color={Design.color.gold} /><Text style={styles.cardRatingText}>{Number(item.rating).toFixed(1)}</Text></View> : null}
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
  screen: { backgroundColor: Design.color.canvas, flex: 1 }, scroll: { paddingBottom: 16 }, frame: { paddingHorizontal: 20, paddingTop: 20 },
  topbar: { alignItems: "center", flexDirection: "row", gap: 10, marginBottom: 18 }, iconAction: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, height: 44, justifyContent: "center", width: 44 },
  search: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, flex: 1, flexDirection: "row", gap: 10, minHeight: 52, paddingHorizontal: 15 }, searchInput: { color: Design.color.ink, flex: 1, fontFamily: Design.font.bodyMedium, fontSize: 13, minHeight: 50 },
  filters: { gap: 8, paddingBottom: 18 }, filter: { borderColor: Design.color.line, borderRadius: Design.radius.pill, borderWidth: StyleSheet.hairlineWidth, minHeight: 36, paddingHorizontal: 15, justifyContent: "center" }, filterSelected: { backgroundColor: Design.color.ink, borderColor: Design.color.ink }, filterText: { color: Design.color.inkSoft, fontFamily: Design.font.bodyMedium, fontSize: 11 }, filterTextSelected: { color: Design.color.surface },
  sortRow: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between", marginBottom: 14 }, resultCount: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 11 }, sortScroll: { flexDirection: "row", gap: 6 },
  sortChip: { borderColor: Design.color.line, borderRadius: Design.radius.pill, borderWidth: StyleSheet.hairlineWidth, minHeight: 30, paddingHorizontal: 12, justifyContent: "center" }, sortChipSelected: { borderColor: Design.color.gold, backgroundColor: Design.color.goldSoft }, sortText: { color: Design.color.inkSoft, fontFamily: Design.font.bodyMedium, fontSize: 10 }, sortTextSelected: { color: Design.color.ink },
  loading: { marginTop: 48 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 }, gridWide: { gap: 20 }, card: { backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", width: "47.8%" }, cardWide: { width: "31.7%" }, cardPressed: { opacity: 0.84, transform: [{ scale: 0.99 }] }, imageWrap: { alignItems: "center", aspectRatio: 0.96, backgroundColor: Design.color.surfaceMuted, justifyContent: "center", position: "relative" }, image: { height: "100%", width: "100%" },
  heart: { alignItems: "center", backgroundColor: "rgba(255,252,248,0.94)", borderRadius: 18, height: 36, justifyContent: "center", position: "absolute", right: 10, top: 10, width: 36 }, cardBody: { padding: 13 }, category: { color: Design.color.inkMuted, fontFamily: Design.font.bodySemibold, fontSize: 9, letterSpacing: 0.7, textTransform: "uppercase" }, productName: { color: Design.color.ink, fontFamily: Design.font.bodySemibold, fontSize: 13, marginTop: 5 },
  cardRating: { alignItems: "center", flexDirection: "row", gap: 3, marginTop: 6 }, cardRatingText: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 10 },
  cardFooter: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 12 }, price: { color: Design.color.gold, fontFamily: Design.font.bodyBold, fontSize: 13 }, add: { alignItems: "center", backgroundColor: Design.color.ink, borderRadius: 16, height: 32, justifyContent: "center", width: 32 },
  empty: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, marginTop: 8, padding: 36 }, emptyTitle: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 26, marginTop: 12 }, emptyCopy: { color: Design.color.inkSoft, fontFamily: Design.font.body, fontSize: 12, marginTop: 4 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.97 }] },
});