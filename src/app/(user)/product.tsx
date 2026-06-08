import { AntDesign, Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Sofa":
      return "airplay";
    case "Chair":
      return "sidebar";
    case "Table":
      return "minus-square";
    case "Bed":
      return "moon";
    default:
      return "box";
  }
};

const COLORS = [
  { name: "Black", hex: "#1C1C1A" },
  { name: "White", hex: "#FAFAF8" },
  { name: "Gray", hex: "#9E9E9E" },
  { name: "Beige", hex: "#C9A96E" },
];

const MATERIALS = ["Wood", "Metal", "Leather", "Fabric", "Marble"];

export default function Product() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLORS[0].name);
  const [selectedMaterial, setSelectedMaterial] = useState(MATERIALS[0]);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);

  const fetchItem = useCallback(async () => {
    const { data } = await supabase
      .from("furniture")
      .select("*")
      .eq("id", id)
      .single();
    setItem(data);
    setLoading(false);
  }, [id]);

  const fetchFavorite = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("furniture_id", id)
      .single();
    setIsFavorite(!!data);
  }, [id]);

  useEffect(() => {
    fetchItem();
    fetchFavorite();
  }, [fetchItem, fetchFavorite]);

  const toggleFavorite = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    if (isFavorite) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("furniture_id", id);
      setIsFavorite(false);
    } else {
      await supabase
        .from("favorites")
        .insert({ user_id: user.id, furniture_id: id });
      setIsFavorite(true);
    }
  };

  const handleConfirmAdd = async () => {
    setAdding(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: existing } = await supabase
      .from("cart")
      .select("*")
      .eq("user_id", user.id)
      .eq("furniture_id", id)
      .single();
    if (existing) {
      await supabase
        .from("cart")
        .update({ quantity: existing.quantity + quantity })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("cart")
        .insert({ user_id: user.id, furniture_id: id, quantity });
    }
    setAdding(false);
    setAdded(true);
    setModalVisible(false);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = async () => {
    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: existing } = await supabase
      .from("cart")
      .select("*")
      .eq("user_id", user.id)
      .eq("furniture_id", id)
      .single();
    if (existing) {
      await supabase
        .from("cart")
        .update({ quantity: existing.quantity + quantity })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("cart")
        .insert({ user_id: user.id, furniture_id: id, quantity });
    }
    setAdding(false);
    setModalVisible(false);
    router.push("/(user)/checkout");
  };

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#C9A96E" />
      </View>
    );
  if (!item)
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Item not found.</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Feather name="arrow-left" size={20} color="#1C1C1A" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.heartBtn} onPress={toggleFavorite}>
        <AntDesign
          name={(isFavorite ? "heart" : "hearto") as any}
          size={18}
          color={isFavorite ? "#C9A96E" : "#C4B8A8"}
        />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <Feather
              name={getCategoryIcon(item.category) as any}
              size={90}
              color="#8B7355"
            />
          )}
        </View>
        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>
                {item.category?.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.goldDivider} />
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Feather key={i} name="star" size={12} color="#C9A96E" />
            ))}
            <Text style={styles.ratingText}>4.8 (124 reviews)</Text>
          </View>
          <Text style={styles.price}>
            ₱{Number(item.price).toLocaleString()}
          </Text>
          <Text style={styles.descLabel}>DESCRIPTION</Text>
          <Text style={styles.description}>
            {item.description ||
              "A beautifully crafted piece designed to elevate your living space. Built with premium materials and finished with attention to detail, this furniture embodies the Atelier Carvén philosophy of warm luxury."}
          </Text>
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.addToCartBtn}
          onPress={() => {
            setQuantity(1);
            setModalVisible(true);
          }}
        >
          <Feather
            name={added ? "check" : "shopping-cart"}
            size={15}
            color="#8B7355"
          />
          <Text style={styles.addToCartText}>
            {added ? "ADDED" : "ADD TO CART"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buyNowBtn} onPress={() => { setQuantity(1); setBuyingNow(true); setModalVisible(true); }}>
          <Feather name="zap" size={15} color="#C9A96E" />
          <Text style={styles.buyNowText}>BUY NOW</Text>
        </TouchableOpacity>
      </View>

      {/* Variation Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SELECT VARIATION</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => { setModalVisible(false); setBuyingNow(false); }}
              >
                <Feather name="x" size={18} color="#8B7355" />
              </TouchableOpacity>
            </View>
            <View style={styles.goldDivider} />

            <View style={styles.modalItem}>
              <View style={styles.modalItemImg}>
                {item.image_url ? (
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.modalItemImage}
                  />
                ) : (
                  <Feather
                    name={getCategoryIcon(item.category) as any}
                    size={24}
                    color="#8B7355"
                  />
                )}
              </View>
              <View>
                <Text style={styles.modalItemName}>{item.name}</Text>
                <Text style={styles.modalItemCat}>{item.category}</Text>
                <Text style={styles.modalItemPrice}>
                  ₱{Number(item.price).toLocaleString()}
                </Text>
              </View>
            </View>

            <Text style={styles.varLabel}>COLOR VARIATION</Text>
            <View style={styles.colorRow}>
              {COLORS.map((color) => (
                <TouchableOpacity
                  key={color.name}
                  style={[
                    styles.colorCircle,
                    selectedColor === color.name && styles.colorCircleSelected,
                  ]}
                  onPress={() => setSelectedColor(color.name)}
                >
                  <View
                    style={[
                      styles.colorInner,
                      {
                        backgroundColor: color.hex,
                        borderWidth: color.hex === "#FAFAF8" ? 0.5 : 0,
                        borderColor: "#E8E0D0",
                      },
                    ]}
                  >
                    {selectedColor === color.name && (
                      <Feather
                        name="check"
                        size={10}
                        color={color.hex === "#FAFAF8" ? "#1C1C1A" : "#C9A96E"}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.varLabel}>MATERIAL</Text>
            <View style={styles.materialRow}>
              {MATERIALS.map((mat) => (
                <TouchableOpacity
                  key={mat}
                  style={[
                    styles.matPill,
                    selectedMaterial === mat && styles.matPillActive,
                  ]}
                  onPress={() => setSelectedMaterial(mat)}
                >
                  <Text
                    style={[
                      styles.matText,
                      selectedMaterial === mat && styles.matTextActive,
                    ]}
                  >
                    {mat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.qtyRow}>
              <Text style={styles.qtyLabel}>QUANTITY</Text>
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Feather name="minus" size={14} color="#1C1C1A" />
                </TouchableOpacity>
                <Text style={styles.qtyNum}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity((q) => q + 1)}
                >
                  <Feather name="plus" size={14} color="#1C1C1A" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={buyingNow ? handleBuyNow : handleConfirmAdd}
              disabled={adding}
            >
              <Feather name={buyingNow ? "zap" : "shopping-cart"} size={15} color="#C9A96E" />
              <Text style={styles.confirmBtnText}>
                {adding
                  ? (buyingNow ? "PROCESSING..." : "ADDING...")
                  : buyingNow
                    ? `BUY NOW · ₱${(Number(item.price) * quantity).toLocaleString()}`
                    : `CONFIRM ADD · ₱${(Number(item.price) * quantity).toLocaleString()}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF8" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAF8",
  },
  errorText: { fontSize: 13, color: "#9E8E7E" },
  backBtn: {
    position: "absolute",
    top: 52,
    left: 24,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F0E8",
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
    justifyContent: "center",
    alignItems: "center",
  },
  heartBtn: {
    position: "absolute",
    top: 52,
    right: 24,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F0E8",
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    height: 320,
    backgroundColor: "#F5F0E8",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  image: { width: "100%", height: 320 },
  content: { padding: 28 },
  topRow: { flexDirection: "row", marginBottom: 12 },
  categoryTag: {
    backgroundColor: "#EDE5D8",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  categoryTagText: { fontSize: 10, letterSpacing: 2, color: "#8B7355" },
  name: { fontSize: 26, fontWeight: "500", color: "#1C1C1A", marginBottom: 16 },
  goldDivider: {
    width: 40,
    height: 1.5,
    backgroundColor: "#C9A96E",
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 12,
  },
  ratingText: { fontSize: 11, color: "#9E8E7E", marginLeft: 4 },
  price: { fontSize: 22, color: "#C9A96E", marginBottom: 28 },
  descLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#8B7355",
    marginBottom: 10,
  },
  description: { fontSize: 14, color: "#6B5E4E", lineHeight: 24 },
  bottomButtons: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 20,
    paddingBottom: 36,
    backgroundColor: "#FAFAF8",
    borderTopWidth: 0.5,
    borderTopColor: "#E8E0D0",
    gap: 12,
  },
  addToCartBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#C9A96E",
    borderRadius: 10,
    padding: 16,
  },
  addToCartText: { fontSize: 11, letterSpacing: 2, color: "#8B7355" },
  buyNowBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1C1C1A",
    borderRadius: 10,
    padding: 16,
  },
  buyNowText: { fontSize: 11, letterSpacing: 2, color: "#FAFAF8" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FAFAF8",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 3,
    backgroundColor: "#E8E0D0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 11, letterSpacing: 3, color: "#8B7355" },
  modalClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EDE5D8",
    justifyContent: "center",
    alignItems: "center",
  },
  modalItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: "#F5F0E8",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
  },
  modalItemImg: {
    width: 54,
    height: 54,
    backgroundColor: "#EDE5D8",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  modalItemImage: { width: 54, height: 54 },
  modalItemName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1C1C1A",
    marginBottom: 2,
  },
  modalItemCat: { fontSize: 11, color: "#9E8E7E", marginBottom: 3 },
  modalItemPrice: { fontSize: 13, color: "#C9A96E" },
  varLabel: {
    fontSize: 9,
    letterSpacing: 2,
    color: "#8B7355",
    marginBottom: 10,
  },
  colorRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  colorCircleSelected: { borderColor: "#C9A96E" },
  colorInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  materialRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  matPill: {
    backgroundColor: "#F5F0E8",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
  },
  matPillActive: { backgroundColor: "#1C1C1A", borderColor: "#1C1C1A" },
  matText: { fontSize: 12, color: "#8B7355" },
  matTextActive: { color: "#FAFAF8" },
  qtyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F5F0E8",
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
  },
  qtyLabel: { fontSize: 10, letterSpacing: 2, color: "#8B7355" },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: 16 },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EDE5D8",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyNum: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1C1C1A",
    minWidth: 20,
    textAlign: "center",
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1C1C1A",
    borderRadius: 12,
    padding: 18,
  },
  confirmBtnText: { fontSize: 11, letterSpacing: 2, color: "#FAFAF8" },
});