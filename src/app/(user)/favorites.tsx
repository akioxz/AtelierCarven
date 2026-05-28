import { Feather } from "@expo/vector-icons";
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
import { supabase } from "../../lib/supabase";

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
              <Feather name={getCategoryIcon(product.category) as any} size={36} color="#8B7355" />
            </View>
          )}
          <TouchableOpacity
            style={styles.favBadge}
            onPress={() => removeFavorite(product.id)}
          >
            <Feather name="heart" size={14} color="#C9A96E" fill="#C9A96E" />
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#1C1C1A" />
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
          <ActivityIndicator color="#C9A96E" size="large" />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="heart" size={48} color="#C4B8A8" style={{ marginBottom: 16 }} />
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
              tintColor="#C9A96E"
              colors={["#C9A96E"]}
            />
          }
        />
      )}

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(user)/home")}
        >
          <Feather name="home" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Feather name="heart" size={20} color="#1C1C1A" />
          <View style={styles.navDot} />
          <Text style={styles.navLabelActive}>FAVORITES</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(user)/cart")}
        >
          <Feather name="shopping-bag" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>CART</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(user)/profile")}
        >
          <Feather name="user" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>PROFILE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF8" },
  header: {
    backgroundColor: "#F5F0E8",
    padding: 28,
    paddingTop: 56,
    paddingBottom: 28,
  },
  headerSmall: { fontSize: 10, letterSpacing: 4, color: "#8B7355" },
  headerLarge: {
    fontSize: 36,
    fontWeight: "300",
    color: "#1C1C1A",
    letterSpacing: 2,
    marginBottom: 16,
  },
  goldDivider: { width: 40, height: 1.5, backgroundColor: "#C9A96E" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingBottom: 100 },
  row: { justifyContent: "space-between", marginBottom: 16 },
  card: {
    width: "48%",
    backgroundColor: "#F5F0E8",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
  },
  imageWrapper: {
    height: 120,
    backgroundColor: "#EDE5D8",
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
    backgroundColor: "#FAFAF8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
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
    color: "#1C1C1A",
    marginBottom: 2,
  },
  cardCategory: { fontSize: 10, color: "#9E8E7E", marginBottom: 6 },
  cardPrice: { fontSize: 13, color: "#C9A96E", fontWeight: "500" },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "500",
    color: "#1C1C1A",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#9E8E7E",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  browseBtn: {
    backgroundColor: "#1C1C1A",
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  browseBtnText: { color: "#FAFAF8", fontSize: 11, letterSpacing: 2, fontWeight: "500" },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FAFAF8",
    borderTopWidth: 0.5,
    borderTopColor: "#E8E0D0",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingBottom: 24,
  },
  navItem: { alignItems: "center", gap: 3 },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#C9A96E" },
  navLabel: { fontSize: 8, color: "#C4B8A8", letterSpacing: 1 },
  navLabelActive: { fontSize: 8, color: "#1C1C1A", letterSpacing: 1 },
});
