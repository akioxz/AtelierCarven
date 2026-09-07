import { AntDesign, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Design } from "../../constants/design";
import { supabase } from "../../lib/supabase";
import { CustomerNavigation } from "../../components/app-ui";

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
    fetchFavorites();
  }, [fetchFavorites]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const removeFavorite = async (furnitureId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Sofa": return "airplay";
      case "Chair": return "sidebar";
      case "Table": return "minus-square";
      case "Bed": return "moon";
      default: return "box";
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const product = item.furniture;
    if (!product) return null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: "/(user)/product",
            params: { id: product.id },
          })
        }
      >
        <View style={styles.imageWrapper}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderImage}>
              <Feather name={getCategoryIcon(product.category) as any} size={36} color={Design.color.inkSoft} />
            </View>
          )}
          <TouchableOpacity
            style={styles.favBadge}
            onPress={() => removeFavorite(product.id)}
          >
            <AntDesign name="heart" size={14} color={Design.color.gold} />
          </TouchableOpacity>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardName} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={styles.cardCategory}>{product.category}</Text>
          <Text style={styles.cardPrice}>
            ₱{Number(product.price).toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <CustomerNavigation active="favorites" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Design.color.ink} />
        </TouchableOpacity>
        <View style={{ marginTop: 20 }}>
          <Text style={styles.headerSmall}>YOUR</Text>
          <Text style={styles.headerLarge}>Favorites</Text>
          <View style={styles.goldDivider} />
        </View>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Design.color.gold} size="large" />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="heart" size={48} color={Design.color.line} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptySubtext}>
            Tap the heart icon on any piece of furniture to save it to your wishlist.
          </Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push("/(user)/home")}>
            <Text style={styles.browseBtnText}>EXPLORE PIECES</Text>
          </TouchableOpacity>
        </View>
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
              tintColor={Design.color.gold}
              colors={[Design.color.gold]}
            />
          }
        />
      )}


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Design.color.surface },
  header: {
    backgroundColor: Design.color.surfaceMuted,
    padding: 28,
    paddingTop: 56,
    paddingBottom: 28,
  },
  headerSmall: { fontSize: 10, letterSpacing: 4, color: Design.color.inkSoft },
  headerLarge: {
    fontFamily: Design.font.display,
    fontSize: 34,
    letterSpacing: -0.8,
    lineHeight: 34,
    color: Design.color.ink,
    marginBottom: 16,
  },
  goldDivider: { width: 40, height: 1.5, backgroundColor: Design.color.gold },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingBottom: 100 },
  row: { justifyContent: "space-between", marginBottom: 16 },
  card: {
    width: "48%",
    backgroundColor: Design.color.surfaceMuted,
    borderRadius: Design.radius.card,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: Design.color.line,
  },
  imageWrapper: {
    height: 120,
    backgroundColor: Design.color.surfaceMuted,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  cardImage: { width: "100%", height: "100%" },
  placeholderImage: { justifyContent: "center", alignItems: "center" },
  favBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Design.color.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: Design.color.line,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  cardContent: { padding: 12 },
  cardName: {
    fontSize: 13,
    fontWeight: "500",
    color: Design.color.ink,
    marginBottom: 2,
  },
  cardCategory: { fontSize: 10, color: Design.color.inkMuted, marginBottom: 6 },
  cardPrice: { fontSize: 13, color: Design.color.gold, fontWeight: "500" },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "500",
    color: Design.color.ink,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: Design.color.inkMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  browseBtn: {
    backgroundColor: Design.color.ink,
    borderRadius: Design.radius.small,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  browseBtnText: { color: Design.color.surface, fontSize: 11, letterSpacing: 2, fontWeight: "500" },

});
