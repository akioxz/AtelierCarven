import { AntDesign, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const CATEGORIES = ["All", "Sofa", "Chair", "Table", "Bed"];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Sofa": return "airplay";
    case "Chair": return "sidebar";
    case "Table": return "minus-square";
    case "Bed": return "moon";
    default: return "box";
  }
};

export default function Home() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web" || width > 768;

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [furniture, setFurniture] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("username").eq("id", user.id).single();
      setUsername(data?.username || "Guest");
    }
  }, []);

  const fetchFurniture = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("furniture").select("*").eq("is_deleted", false);
    if (selectedCategory !== "All") query = query.eq("category", selectedCategory);
    if (search) query = query.ilike("name", `%${search}%`);
    const { data } = await query;
    setFurniture(data || []);
    setLoading(false);
  }, [selectedCategory, search]);

  const fetchCartCount = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { count } = await supabase.from("cart").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      setCartCount(count || 0);
    }
  }, []);

  const fetchFavorites = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("favorites").select("furniture_id").eq("user_id", user.id);
      setFavorites((data || []).map((f: any) => f.furniture_id));
    }
  }, []);

  useEffect(() => { fetchProfile(); fetchCartCount(); fetchFavorites(); }, [fetchProfile, fetchCartCount, fetchFavorites]);
  useEffect(() => { fetchFurniture(); }, [fetchFurniture]);

  const toggleFavorite = async (furnitureId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (favorites.includes(furnitureId)) {
      setFavorites((prev) => prev.filter((id) => id !== furnitureId));
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("furniture_id", furnitureId);
    } else {
      setFavorites((prev) => [...prev, furnitureId]);
      await supabase.from("favorites").insert({ user_id: user.id, furniture_id: furnitureId });
    }
  };

  const handleAddToCart = async (furnitureId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: existing } = await supabase.from("cart").select("*").eq("user_id", user.id).eq("furniture_id", furnitureId).single();
    if (existing) {
      await supabase.from("cart").update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
    } else {
      await supabase.from("cart").insert({ user_id: user.id, furniture_id: furnitureId, quantity: 1 });
    }
    fetchCartCount();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning,";
    if (hour < 18) return "Good afternoon,";
    return "Good evening,";
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.inner, isWeb && styles.innerWeb]}>
          <View style={[styles.header, isWeb && styles.headerWeb]}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.username}>{username}</Text>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/(user)/favorites")}>
                <AntDesign name="heart" size={18} color="#C4B8A8" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/(user)/cart")}>
                <Feather name="shopping-cart" size={18} color="#1C1C1A" />
                {cartCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{cartCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <Feather name="search" size={15} color="#C4B8A8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search furniture..."
              placeholderTextColor="#C4B8A8"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CATEGORIES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categories}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    {cat !== "All" && (
                      <Feather name={getCategoryIcon(cat) as any} size={11} color={selectedCategory === cat ? "#FAFAF8" : "#8B7355"} />
                    )}
                    <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>FEATURED</Text>
            {loading ? (
              <ActivityIndicator color="#C9A96E" style={{ marginTop: 20 }} />
            ) : furniture.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="inbox" size={36} color="#E8E0D0" />
                <Text style={styles.emptyText}>No furniture found.</Text>
              </View>
            ) : (
              <View style={[styles.grid, isWeb && styles.gridWeb]}>
                {furniture.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.card, isWeb && styles.cardWeb]}
                    onPress={() => router.push({ pathname: "/(user)/product", params: { id: item.id } })}
                  >
                    <View style={styles.cardImage}>
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.cardImg} />
                      ) : (
                        <Feather name={getCategoryIcon(item.category) as any} size={36} color="#8B7355" />
                      )}
                      <TouchableOpacity style={styles.heartBtn} onPress={() => toggleFavorite(item.id)}>
                        {favorites.includes(item.id)
                          ? <AntDesign name="heart" size={12} color="#C9A96E" />
                          : <Feather name="heart" size={12} color="#C4B8A8" />
                        }
                      </TouchableOpacity>
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardCat}>{item.category?.toUpperCase()}</Text>
                      <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                      {item.rating != null && (
                        <View style={styles.starsRow}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Feather
                              key={i}
                              name="star"
                              size={9}
                              color={i <= Math.round(item.rating) ? "#C9A96E" : "#E8E0D0"}
                            />
                          ))}
                          <Text style={styles.ratingText}>{Number(item.rating).toFixed(1)}</Text>
                        </View>
                      )}
                      <Text style={styles.cardPrice}>₱{Number(item.price).toLocaleString()}</Text>
                      <View style={styles.cardBtns}>
                        <TouchableOpacity style={styles.btnAdd} onPress={() => handleAddToCart(item.id)}>
                          <Feather name="shopping-cart" size={11} color="#8B7355" />
                          <Text style={styles.btnAddText}>Add</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnBuy} onPress={() => router.push({ pathname: "/(user)/product", params: { id: item.id } })}>
                          <Feather name="zap" size={11} color="#C9A96E" />
                          <Text style={styles.btnBuyText}>Buy</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Feather name="home" size={20} color="#1C1C1A" />
          <View style={styles.navDot} />
          <Text style={styles.navLabelActive}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/(user)/favorites")}>
          <AntDesign name="heart" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>SAVED</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/(user)/image-placement")}>
          <Feather name="image" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>PLACE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/(user)/cart")}>
          <Feather name="shopping-cart" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>CART</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/(user)/profile")}>
          <Feather name="user" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>PROFILE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF8" },
  inner: { flex: 1 },
  innerWeb: { maxWidth: 1200, width: "100%", alignSelf: "center" as any },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 24, paddingTop: 56 },
  headerWeb: { paddingTop: 32 },
  greeting: { fontSize: 11, color: "#9E8E7E", letterSpacing: 1 },
  username: { fontSize: 20, fontWeight: "500", color: "#1C1C1A" },
  headerIcons: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F5F0E8", borderWidth: 0.5, borderColor: "#E8E0D0", justifyContent: "center", alignItems: "center", position: "relative" },
  badge: { position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: "#C9A96E", justifyContent: "center", alignItems: "center" },
  badgeText: { fontSize: 9, color: "#FAFAF8", fontWeight: "500" },
  searchContainer: { flexDirection: "row", alignItems: "center", marginHorizontal: 24, marginBottom: 16, backgroundColor: "#F5F0E8", borderRadius: 10, paddingHorizontal: 12, borderWidth: 0.5, borderColor: "#E8E0D0" },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 13, color: "#1C1C1A" },
  divider: { height: 1, backgroundColor: "#E8E0D0", marginHorizontal: 24, marginBottom: 20 },
  section: { paddingHorizontal: 24, marginBottom: 20 },
  sectionLabel: { fontSize: 10, letterSpacing: 2, color: "#8B7355", marginBottom: 12 },
  categories: { flexDirection: "row", gap: 8 },
  categoryPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#F5F0E8", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 0.5, borderColor: "#E8E0D0" },
  categoryPillActive: { backgroundColor: "#1C1C1A", borderColor: "#1C1C1A" },
  categoryText: { fontSize: 12, color: "#8B7355" },
  categoryTextActive: { color: "#FAFAF8" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridWeb: { display: "grid" as any, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 },
  card: { width: "48%", backgroundColor: "#F5F0E8", borderRadius: 12, overflow: "hidden", borderWidth: 0.5, borderColor: "#E8E0D0" },
  cardWeb: { width: "100%" as any },
  cardImage: { height: 160, backgroundColor: "#EDE5D8", justifyContent: "center", alignItems: "center", position: "relative" },
  cardImg: { width: "100%", height: 160 },
  heartBtn: { position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: "#FAFAF8", justifyContent: "center", alignItems: "center", borderWidth: 0.5, borderColor: "#E8E0D0" },
  cardContent: { padding: 10 },
  cardCat: { fontSize: 8, letterSpacing: 1, color: "#8B7355", marginBottom: 2 },
  cardName: { fontSize: 12, fontWeight: "500", color: "#1C1C1A", marginBottom: 4 },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 2, marginBottom: 4 },
  ratingText: { fontSize: 9, color: "#9E8E7E", marginLeft: 2 },
  cardPrice: { fontSize: 13, color: "#C9A96E", marginBottom: 8 },
  cardBtns: { flexDirection: "row", gap: 6 },
  btnAdd: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#FAFAF8", borderRadius: 6, paddingVertical: 6, borderWidth: 0.5, borderColor: "#E8E0D0" },
  btnAddText: { fontSize: 10, color: "#8B7355" },
  btnBuy: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#1C1C1A", borderRadius: 6, paddingVertical: 6 },
  btnBuyText: { fontSize: 10, color: "#FAFAF8" },
  empty: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 13, color: "#9E8E7E" },
  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FAFAF8", borderTopWidth: 0.5, borderTopColor: "#E8E0D0", flexDirection: "row", justifyContent: "space-around", paddingVertical: 12, paddingBottom: 24 },
  navItem: { alignItems: "center", gap: 3 },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#C9A96E" },
  navLabel: { fontSize: 8, color: "#C4B8A8", letterSpacing: 1 },
  navLabelActive: { fontSize: 8, color: "#1C1C1A", letterSpacing: 1 },
});