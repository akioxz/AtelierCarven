import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const CATEGORIES = ["All", "Sofa", "Chair", "Table", "Bed"];

export default function Home() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [furniture, setFurniture] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [cartCount, setCartCount] = useState(0);

  const fetchProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/(auth)/onboarding");
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();
    setUsername(data?.username || "Guest");
  }, [router]);

  const fetchCartCount = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { count } = await supabase
        .from("cart")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setCartCount(count || 0);
    }
  }, []);

  const fetchFurniture = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("furniture").select("*").eq("is_deleted", false);
    if (selectedCategory !== "All")
      query = query.eq("category", selectedCategory);
    if (search) query = query.ilike("name", `%${search}%`);
    const { data } = await query;
    setFurniture(data || []);
    setLoading(false);
  }, [selectedCategory, search]);

  useEffect(() => {
    fetchProfile();
    fetchCartCount();
  }, [fetchProfile, fetchCartCount]);

  useEffect(() => {
    fetchFurniture();
  }, [fetchFurniture]);

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
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.username}>{username}</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push("/(user)/cart")}
            >
              <Text style={styles.iconText}>🛍️</Text>
              {cartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
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
                  style={[
                    styles.categoryPill,
                    selectedCategory === cat && styles.categoryPillActive,
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === cat && styles.categoryTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
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
              <Text style={styles.emptyText}>No furniture found.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {furniture.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  onPress={() =>
                    router.push({
                      pathname: "/(user)/product",
                      params: { id: item.id },
                    })
                  }
                >
                  <View style={styles.cardImage}>
                    <Text style={styles.cardImagePlaceholder}>🪑</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.cardCategory}>{item.category}</Text>
                    <Text style={styles.cardPrice}>
                      ₱{Number(item.price).toLocaleString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIconActive}>⌂</Text>
          <Text style={styles.navLabelActive}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(user)/cart")}
        >
          <Text style={styles.navIcon}>🛍</Text>
          <Text style={styles.navLabel}>CART</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(user)/profile")}
        >
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>PROFILE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF8" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 24,
    paddingTop: 56,
  },
  greeting: { fontSize: 11, color: "#9E8E7E", letterSpacing: 1 },
  username: { fontSize: 20, fontWeight: "500", color: "#1C1C1A" },
  headerIcons: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F5F0E8",
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  iconText: { fontSize: 16 },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#C9A96E",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { fontSize: 9, color: "#FAFAF8", fontWeight: "500" },
  searchContainer: { paddingHorizontal: 24, marginBottom: 16 },
  searchInput: {
    backgroundColor: "#F5F0E8",
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: "#1C1C1A",
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
  },
  divider: {
    height: 1,
    backgroundColor: "#E8E0D0",
    marginHorizontal: 24,
    marginBottom: 20,
  },
  section: { paddingHorizontal: 24, marginBottom: 20 },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#8B7355",
    marginBottom: 12,
  },
  categories: { flexDirection: "row", gap: 8 },
  categoryPill: {
    backgroundColor: "#F5F0E8",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
  },
  categoryPillActive: { backgroundColor: "#1C1C1A", borderColor: "#1C1C1A" },
  categoryText: { fontSize: 12, color: "#8B7355" },
  categoryTextActive: { color: "#FAFAF8" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "47%",
    backgroundColor: "#F5F0E8",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
  },
  cardImage: {
    height: 110,
    backgroundColor: "#EDE5D8",
    justifyContent: "center",
    alignItems: "center",
  },
  cardImagePlaceholder: { fontSize: 40 },
  cardContent: { padding: 10 },
  cardName: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1C1C1A",
    marginBottom: 2,
  },
  cardCategory: { fontSize: 10, color: "#9E8E7E", marginBottom: 6 },
  cardPrice: { fontSize: 13, color: "#C9A96E" },
  empty: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 13, color: "#9E8E7E" },
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
  navIcon: { fontSize: 18, opacity: 0.4 },
  navIconActive: { fontSize: 18, color: "#1C1C1A" },
  navLabel: { fontSize: 9, color: "#C4B8A8", letterSpacing: 1 },
  navLabelActive: { fontSize: 9, color: "#1C1C1A", letterSpacing: 1 },
});
