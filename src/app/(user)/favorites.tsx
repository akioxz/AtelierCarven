import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Design } from "../../constants/design";
import { goBackOr } from "../../lib/navigation";
import { supabase } from "../../lib/supabase";
import { ContentFrame, CustomerNavigation, PageHeader, PrimaryButton } from "../../components/app-ui";
import { PressScale, Reveal } from "../../components/motion";
import { ProductCard } from "../../components/product-card";
import { CardSkeleton } from "../../components/skeleton";

export default function Favorites() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      router.replace("/(auth)/onboarding");
      return;
    }

    const { data, error } = await supabase
      .from("favorites")
      .select("*, furniture(*)")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching favorites:", error);
    } else {
      // Filter out favorites that might have been deleted from the database
      setFavorites(data?.filter((fav) => fav.furniture && !fav.furniture.is_deleted) || []);
    }
    setLoading(false);
    setRefreshing(false);
  }, [router]);

  useEffect(() => {
    void (async () => { await fetchFavorites(); })();
  }, [fetchFavorites]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const removeFavorite = async (furnitureId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/(auth)/onboarding");
      return;
    }

    // Optimistically update the UI
    setFavorites((prev) => prev.filter((item) => item.furniture_id !== furnitureId));

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("furniture_id", furnitureId);

    if (error) {
      console.error("Error removing favorite:", error);
      fetchFavorites(); // Revert on error
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const product = item.furniture;
    if (!product) return null;

    return (
      <View style={styles.cell}>
        <ProductCard
          item={product}
          index={index}
          onPress={() =>
            router.push({
              pathname: "/(user)/product",
              params: { id: product.id },
            })
          }
          isFavorite
          onToggleFavorite={() => removeFavorite(product.id)}
          tag={product.category}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <CustomerNavigation active="favorites" />
      <ContentFrame style={styles.frame}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <PageHeader
              index="04"
              title="Saved pieces"
              subtitle={loading || favorites.length === 0 ? "Your personal gallery wall." : `${favorites.length} piece${favorites.length === 1 ? "" : "s"} in your collection.`}
            />
          </View>
          <PressScale accessibilityLabel="Go back" onPress={() => goBackOr(router, "/(user)/home")} style={styles.backButton}>
            <Feather name="arrow-left" size={19} color={Design.color.ink} />
          </PressScale>
        </View>

        {loading ? (
          <View style={styles.grid}>
            {[0, 1, 2, 3].map((skeleton) => (
              <View key={skeleton} style={styles.cell}>
                <CardSkeleton />
              </View>
            ))}
          </View>
        ) : favorites.length === 0 ? (
          <Reveal>
            <View style={styles.emptyContainer}>
              <Feather name="heart" size={40} color={Design.color.accent} />
              <Text style={styles.emptyTitle}>No saved pieces yet</Text>
              <Text style={styles.emptySubtext}>
                Tap the heart on any piece to start your gallery wall.
              </Text>
              <PrimaryButton label="BROWSE THE COLLECTION" onPress={() => router.push("/(user)/home")} />
            </View>
          </Reveal>
        ) : (
          <FlatList
            data={favorites}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.list}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Design.color.accent}
                colors={[Design.color.accent]}
              />
            }
          />
        )}
      </ContentFrame>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Design.color.canvas },
  frame: { paddingHorizontal: 20, paddingTop: 20 },
  headerRow: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", gap: 12 },
  headerCopy: { flex: 1 },
  backButton: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.small, borderWidth: StyleSheet.hairlineWidth, height: 44, justifyContent: "center", width: 44 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 8 },
  list: { paddingBottom: 100 },
  row: { justifyContent: "space-between", marginBottom: 14 },
  cell: { width: "47.8%" },
  emptyContainer: { alignItems: "center", backgroundColor: Design.color.surface, borderRadius: Design.radius.card, gap: 10, justifyContent: "center", marginTop: 8, padding: 40, ...Design.shadow.card },
  emptyTitle: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 28, letterSpacing: -0.6, marginTop: 8, textAlign: "center" },
  emptySubtext: { color: Design.color.inkSoft, fontFamily: Design.font.body, fontSize: 13, lineHeight: 20, marginBottom: 12, textAlign: "center" },
});
