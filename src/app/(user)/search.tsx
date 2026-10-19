import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { CategoryTiles } from "../../components/category-tiles";
import { ContentFrame, SectionHeading, RetryNotice } from "../../components/app-ui";
import { PressScale, Reveal, staggerDelay } from "../../components/motion";
import { ProductCard } from "../../components/product-card";
import { CardSkeleton } from "../../components/skeleton";
import { Design, layout } from "../../constants/design";
import { goBackOr } from "../../lib/navigation";
import { effectivePrice } from "../../lib/pricing";
import { supabase } from "../../lib/supabase";
import { fetchAllRows } from "../../lib/pagination";

const CATEGORIES = ["All", "Sofa", "Chair", "Table", "Bed"];
const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "price-asc", label: "Price: Low to High" },
  { key: "price-desc", label: "Price: High to Low" },
  { key: "rating", label: "Top Rated" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

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
  const [actionError, setActionError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const pendingFavorites = useRef(new Set<string>());
  const trimmed = query.trim();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const data = await fetchAllRows((from, to) => supabase.from("favorites").select("furniture_id", { count: "exact" }).eq("user_id", user.id).order("id").range(from, to));
      setFavorites((data || []).map((item: any) => item.furniture_id));
    })().catch(() => setActionError("Could not load saved pieces. Please refresh."));
  }, []);

  // debounce + stale-response guard
  const latestRequest = useRef(0);

  useEffect(() => {
    const queryTrigger = setTimeout(() => {
      const requestId = ++latestRequest.current;
      const run = async () => {
        setLoading(true);
        setLoadError("");
        try {
          const data = await fetchAllRows((from, to) => {
            let queryBuilder = supabase.from("furniture").select("*", { count: "exact" }).eq("is_deleted", false);
            if (selectedCategory !== "All") queryBuilder = queryBuilder.eq("category", selectedCategory);
            const term = query.trim().replace(/[,()]/g, " ");
            if (term) queryBuilder = queryBuilder.or(`name.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`);
            switch (sort) {
              case "price-asc": queryBuilder = queryBuilder.order("effective_price", { ascending: true }); break;
              case "price-desc": queryBuilder = queryBuilder.order("effective_price", { ascending: false }); break;
              case "rating": queryBuilder = queryBuilder.order("rating", { ascending: false, nullsFirst: false }).order("review_count", { ascending: false }); break;
              default: queryBuilder = queryBuilder.order("created_at", { ascending: false });
            }
            return queryBuilder.order("id").range(from, to);
          });
          if (latestRequest.current !== requestId) return;
          data.forEach(effectivePrice);
          setFurniture(data.map(row => ({ ...row, salePrice: row.sale_price ?? null, reviewCount: row.review_count ?? null })));
        } catch { if (latestRequest.current === requestId) setLoadError("Could not load search results. Please retry."); }
        finally { if (latestRequest.current === requestId) setLoading(false); }
      };
      run();
    }, query.trim() ? 300 : 0);
    const tracker = latestRequest;
    return () => { clearTimeout(queryTrigger); tracker.current++; };
  }, [selectedCategory, sort, query, reload]);
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, []);

  const toggleFavorite = async (furnitureId: string) => {
    if (pendingFavorites.current.has(furnitureId)) return;
    pendingFavorites.current.add(furnitureId);
    setActionError("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) { router.replace("/(auth)/onboarding"); return; }
      const removing = favorites.includes(furnitureId);
      const { error } = removing
        ? await supabase.from("favorites").delete().eq("user_id", user.id).eq("furniture_id", furnitureId)
        : await supabase.from("favorites").insert({ user_id: user.id, furniture_id: furnitureId });
      if (error) throw error;
      setFavorites(previous => removing ? previous.filter(id => id !== furnitureId) : [...previous, furnitureId]);
    } catch {
      setActionError("Could not update your saved pieces. Please try again.");
    } finally { pendingFavorites.current.delete(furnitureId); }
  };
  const addToCart = async (furnitureId: string) => {
    setActionError("");
    try {
      const { data, error } = await supabase.rpc("add_cart_item", { p_furniture_id: furnitureId, p_quantity: 1 });
      if (error || typeof data !== "string") throw new Error("Cart write failed");
    } catch { setActionError("Could not add this piece to your cart. Please try again."); }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <ContentFrame style={styles.frame}>
          {actionError ? <Text accessibilityRole="alert" style={{ color: Design.color.danger, padding: 12 }}>{actionError}</Text> : null}
          <Reveal>
            <View style={styles.topbar}>
              <PressScale accessibilityLabel="Go back" onPress={() => goBackOr(router, "/(user)/home")} style={styles.iconAction}>
                <Feather name="arrow-left" size={19} color={Design.color.ink} />
              </PressScale>
              <View style={styles.search}>
                <Feather name="search" size={17} color={Design.color.inkMuted} />
                <TextInput ref={inputRef} value={query} onChangeText={setQuery} placeholder="Search pieces, materials, categories" placeholderTextColor={Design.color.inkMuted} style={styles.searchInput} returnKeyType="search" autoCorrect={false} />
                {trimmed ? <PressScale accessibilityLabel="Clear search" onPress={() => setQuery("")} hitSlop={8}><Feather name="x" size={16} color={Design.color.inkMuted} /></PressScale> : null}
              </View>
            </View>
          </Reveal>

          <Reveal delay={staggerDelay(1)}>
            <CategoryTiles categories={CATEGORIES} selected={selectedCategory} onSelect={setSelectedCategory} />
          </Reveal>

          {selectedCategory !== "All" ? (
            <Reveal>
              <View style={styles.activeRow}>
                <PressScale onPress={() => setSelectedCategory("All")} accessibilityLabel={`Clear ${selectedCategory} filter`} style={styles.activeChip}>
                  <Text style={styles.activeChipText}>{selectedCategory}</Text>
                  <Feather name="x" size={12} color={Design.color.surface} />
                </PressScale>
                <PressScale accessibilityLabel="Clear all filters" onPress={() => setSelectedCategory("All")} hitSlop={8}><Text style={styles.clearAll}>Clear all</Text></PressScale>
              </View>
            </Reveal>
          ) : null}

          <View style={styles.sortBlock}>
            <SectionHeading overline="Search the collection" title={trimmed ? `Results for “${trimmed}”` : "Browse everything"} />
            <View style={styles.sortRow}>
              <Text style={styles.resultCount}>{loading ? "" : `${furniture.length} piece${furniture.length === 1 ? "" : "s"} found`}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScroll}>
                {SORTS.map((option) => {
                  const selected = option.key === sort;
                  return (
                    <PressScale key={option.key} onPress={() => setSort(option.key)} accessibilityLabel={`Sort by ${option.label}`} accessibilityState={{ selected }} style={[styles.sortChip, selected && styles.sortChipSelected]}>
                      <Text style={[styles.sortText, selected && styles.sortTextSelected]}>{option.label}</Text>
                    </PressScale>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {loading ? (
            <View style={[styles.grid, wide && styles.gridWide]}>
              {[0, 1, 2, 3].map((skeleton) => (
                <View key={skeleton} style={wide ? styles.cellWide : styles.cell}>
                  <CardSkeleton />
                </View>
              ))}
            </View>
          ) : loadError ? <RetryNotice message={loadError} onRetry={() => setReload(value => value + 1)} /> : furniture.length === 0 ? (
            <Reveal>
              <View style={styles.empty}>
                <Feather name="search" size={28} color={Design.color.accent} />
                <Text style={styles.emptyTitle}>No pieces found</Text>
                <Text style={styles.emptyCopy}>Try a different search term or category.</Text>
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
  screen: { backgroundColor: Design.color.canvas, flex: 1 }, scroll: { paddingBottom: 16 }, frame: { paddingHorizontal: 20, paddingTop: 20 },
  topbar: { alignItems: "center", flexDirection: "row", gap: 10, marginBottom: 18 }, iconAction: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.small, borderWidth: StyleSheet.hairlineWidth, height: 44, justifyContent: "center", width: 44 },
  search: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, flex: 1, flexDirection: "row", gap: 10, minHeight: 52, paddingHorizontal: 15 }, searchInput: { color: Design.color.ink, flex: 1, fontFamily: Design.font.bodyMedium, fontSize: 13, minHeight: 50 },
  activeRow: { alignItems: "center", flexDirection: "row", gap: 10, marginBottom: 14 }, activeChip: { alignItems: "center", backgroundColor: Design.color.ink, borderRadius: Design.radius.small, flexDirection: "row", gap: 5, minHeight: 30, paddingHorizontal: 12 }, activeChipText: { color: Design.color.surface, fontFamily: Design.font.bodyMedium, fontSize: 11 }, clearAll: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 11 },
  sortBlock: { marginTop: 8 }, sortRow: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between", marginBottom: 14 }, resultCount: { color: Design.color.inkMuted, fontFamily: Design.font.mono, fontSize: 10 }, sortScroll: { flexDirection: "row", gap: 6 },
  sortChip: { borderColor: Design.color.line, borderRadius: Design.radius.small, borderWidth: StyleSheet.hairlineWidth, minHeight: 30, paddingHorizontal: 12, justifyContent: "center" }, sortChipSelected: { borderColor: Design.color.accent, backgroundColor: Design.color.accentSoft }, sortText: { color: Design.color.inkSoft, fontFamily: Design.font.bodyMedium, fontSize: 10 }, sortTextSelected: { color: Design.color.ink },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 }, gridWide: { gap: 20 }, cell: { width: "47.8%" }, cellWide: { width: "31.7%" },
  add: { alignItems: "center", backgroundColor: Design.color.ink, borderRadius: Design.radius.small, height: 32, justifyContent: "center", width: 32 },
  empty: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, marginTop: 8, padding: 36 }, emptyTitle: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 26, marginTop: 12 }, emptyCopy: { color: Design.color.inkSoft, fontFamily: Design.font.body, fontSize: 12, marginTop: 4 },
});
