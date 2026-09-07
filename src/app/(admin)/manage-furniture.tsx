import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Design } from "../../constants/design";
import { pickAndUploadImage } from "../../lib/imageUpload";
import { supabase } from "../../lib/supabase";
import { AdminNavigation } from "../../components/app-ui";

const isWeb = Platform.OS === "web";
const CATEGORIES = ["Sofa", "Chair", "Table", "Bed"];
const FILTERS = ["All", "Sofa", "Chair", "Table", "Bed"];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Sofa": return "airplay";
    case "Chair": return "sidebar";
    case "Table": return "minus-square";
    case "Bed": return "moon";
    default: return "box";
  }
};

export default function ManageFurniture() {
  const router = useRouter();
  const [furniture, setFurniture] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Sofa");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [depth, setDepth] = useState("");
  const [weight, setWeight] = useState("");
  const [sizeGuides, setSizeGuides] = useState<Record<string, any>>({});

  const fetchFurniture = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("furniture")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    setFurniture(data || []);
    setLoading(false);
  }, []);

  const fetchSizeGuides = useCallback(async () => {
    const { data } = await supabase.from("size_guides").select("*");
    const map: Record<string, any> = {};
    (data || []).forEach((guide: any) => { map[guide.furniture_id] = guide; });
    setSizeGuides(map);
  }, []);

  useEffect(() => {
    fetchFurniture();
    fetchSizeGuides();
  }, [fetchFurniture, fetchSizeGuides]);

  const filteredFurniture = activeFilter === "All"
    ? furniture
    : furniture.filter((item) => item.category === activeFilter);

  const logAction = async (action: string, target: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("activity_logs").insert({
      admin_id: user?.id,
      action,
      target_item: target,
    });
  };

  const openAdd = () => {
    setEditing(null);
    setName(""); setPrice(""); setCategory("Sofa");
    setDescription(""); setImageUrl(""); setErrorMsg("");
    setWidth(""); setHeight(""); setDepth(""); setWeight("");
    setModalVisible(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setName(item.name);
    setPrice(String(item.price));
    setCategory(item.category);
    setDescription(item.description || "");
    setImageUrl(item.image_url || "");
    const guide = sizeGuides[item.id];
    setWidth(guide?.width_cm != null ? String(guide.width_cm) : "");
    setHeight(guide?.height_cm != null ? String(guide.height_cm) : "");
    setDepth(guide?.depth_cm != null ? String(guide.depth_cm) : "");
    setWeight(guide?.weight_kg != null ? String(guide.weight_kg) : "");
    setErrorMsg("");
    setModalVisible(true);
  };

  const handlePickImage = async () => {
    setUploading(true);
    const url = await pickAndUploadImage("furniture-images", "items");
    if (url) setImageUrl(url);
    setUploading(false);
  };

  const handleSave = async () => {
    setErrorMsg("");
    const parsedPrice = parseFloat(price.replace(/[₱,\s]/g, ""));
    if (!name || !category || isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMsg("Please enter a valid name, price (numbers only), and category.");
      return;
    }
    setSaving(true);
    let furnitureId: string | null = editing?.id ?? null;
    if (editing) {
      const { error } = await supabase.from("furniture").update({
        name, price: parsedPrice, category, description,
        image_url: imageUrl, updated_at: new Date().toISOString(),
      }).eq("id", editing.id);
      if (error) { setErrorMsg("Failed to update: " + error.message); setSaving(false); return; }
      await logAction("Edited furniture", name);
    } else {
      const { data, error } = await supabase.from("furniture").insert({
        name, price: parsedPrice, category, description,
        image_url: imageUrl, is_deleted: false,
      }).select("id").single();
      if (error) { setErrorMsg("Failed to add: " + error.message); setSaving(false); return; }
      furnitureId = data?.id ?? null;
      await logAction("Added furniture", name);
    }

    const dimensions = {
      width_cm: width.trim() ? parseFloat(width) : null,
      height_cm: height.trim() ? parseFloat(height) : null,
      depth_cm: depth.trim() ? parseFloat(depth) : null,
      weight_kg: weight.trim() ? parseFloat(weight) : null,
    };
    const hasAnyDimension = Object.values(dimensions).some((value) => value != null);
    if (furnitureId) {
      if (hasAnyDimension) {
        await supabase.from("size_guides").upsert({ furniture_id: furnitureId, ...dimensions, updated_at: new Date().toISOString() });
      } else {
        await supabase.from("size_guides").delete().eq("furniture_id", furnitureId);
      }
    }

    setSaving(false);
    setModalVisible(false);
    fetchFurniture();
    fetchSizeGuides();
  };

  const handleDelete = (item: any) => {
    setItemToDelete(item);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    await supabase.from("furniture").update({ is_deleted: true }).eq("id", itemToDelete.id);
    await logAction("Deleted furniture", itemToDelete.name);
    setDeleteModalVisible(false);
    setItemToDelete(null);
    fetchFurniture();
  };

  const renderCard = (item: any) => (
    <View key={item.id} style={[styles.card, isWeb && styles.cardWeb]}>
      <View style={styles.imageWrap}>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name={getCategoryIcon(item.category) as any} size={36} color={Design.color.gold} />
          </View>
        )}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.category.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.cardPrice}>₱{Number(item.price).toLocaleString()}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
            <Feather name="edit-2" size={12} color={Design.color.inkSoft} />
            <Text style={styles.editBtnText}>EDIT</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Feather name="trash-2" size={12} color={Design.color.danger} />
            <Text style={styles.deleteBtnText}>DEL</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <AdminNavigation active="furniture" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Design.color.ink} />
        </TouchableOpacity>
        <View style={{ marginTop: 20 }}>
          <Text style={styles.headerSmall}>MANAGE</Text>
          <Text style={styles.headerLarge}>Furniture</Text>
          <View style={styles.goldDivider} />
          <Text style={styles.itemCount}>
            {filteredFurniture.length} {activeFilter === "All" ? "items" : activeFilter.toLowerCase() + "s"}
          </Text>
        </View>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => {
          const count = f === "All"
            ? furniture.length
            : furniture.filter((i) => i.category === f).length;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                {f}
              </Text>
              <View style={[styles.filterCount, activeFilter === f && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, activeFilter === f && styles.filterCountTextActive]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={Design.color.gold} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.grid, isWeb && styles.gridWeb]}
          showsVerticalScrollIndicator={false}
        >
          {filteredFurniture.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="inbox" size={40} color={Design.color.line} />
              <Text style={styles.emptyText}>No {activeFilter === "All" ? "furniture" : activeFilter} yet.</Text>
            </View>
          ) : (
            filteredFurniture.map(renderCard)
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
        <Feather name="plus" size={16} color={Design.color.surface} />
        <Text style={styles.addBtnText}>ADD FURNITURE</Text>
      </TouchableOpacity>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconWrap}>
              <Feather name="trash-2" size={28} color={Design.color.danger} />
            </View>
            <Text style={styles.deleteModalTitle}>DELETE FURNITURE</Text>
            <View style={styles.goldDivider} />
            <Text style={styles.deleteModalMsg}>
              Are you sure you want to delete{"\n"}
              <Text style={styles.deleteModalName}>&quot;{itemToDelete?.name}&quot;</Text>?
            </Text>
            <Text style={styles.deleteModalSub}>This action cannot be undone.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setDeleteModalVisible(false); setItemToDelete(null); }}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={confirmDelete}>
                <Text style={styles.deleteConfirmText}>DELETE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editing ? "EDIT FURNITURE" : "ADD FURNITURE"}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Feather name="x" size={20} color={Design.color.inkSoft} />
                </TouchableOpacity>
              </View>
              <View style={styles.goldDivider} />

              <Text style={styles.inputLabel}>FURNITURE IMAGE</Text>
              <TouchableOpacity
                style={styles.imageUploadBtn}
                onPress={handlePickImage}
                disabled={uploading}
              >
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.uploadedImage} resizeMode="cover" />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Feather name="camera" size={28} color={Design.color.inkSoft} />
                    <Text style={styles.uploadText}>
                      {uploading ? "UPLOADING..." : "TAP TO UPLOAD IMAGE"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.inputLabel}>OR PASTE IMAGE URL</Text>
              <TextInput
                style={styles.input}
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://images.unsplash.com/..."
                placeholderTextColor={Design.color.inkMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.inputLabel}>NAME</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Furniture name"
                placeholderTextColor={Design.color.inkMuted}
              />

              <Text style={styles.inputLabel}>PRICE (numbers only, e.g. 55000)</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="55000"
                placeholderTextColor={Design.color.inkMuted}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>CATEGORY</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryPill, category === cat && styles.categoryPillActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>DESCRIPTION</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Short description..."
                placeholderTextColor={Design.color.inkMuted}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>SIZE GUIDE (OPTIONAL)</Text>
              <Text style={styles.dimHint}>Shown on the product page. Leave all blank to hide it.</Text>
              <View style={styles.dimColumns}>
                <View style={styles.dimField}>
                  <Text style={styles.dimCaption}>WIDTH (cm)</Text>
                  <TextInput style={styles.input} value={width} onChangeText={setWidth} placeholder="120" placeholderTextColor={Design.color.inkMuted} keyboardType="decimal-pad" />
                </View>
                <View style={styles.dimField}>
                  <Text style={styles.dimCaption}>HEIGHT (cm)</Text>
                  <TextInput style={styles.input} value={height} onChangeText={setHeight} placeholder="75" placeholderTextColor={Design.color.inkMuted} keyboardType="decimal-pad" />
                </View>
                <View style={styles.dimField}>
                  <Text style={styles.dimCaption}>DEPTH (cm)</Text>
                  <TextInput style={styles.input} value={depth} onChangeText={setDepth} placeholder="60" placeholderTextColor={Design.color.inkMuted} keyboardType="decimal-pad" />
                </View>
                <View style={styles.dimField}>
                  <Text style={styles.dimCaption}>WEIGHT (kg)</Text>
                  <TextInput style={styles.input} value={weight} onChangeText={setWeight} placeholder="8" placeholderTextColor={Design.color.inkMuted} keyboardType="decimal-pad" />
                </View>
              </View>

              {errorMsg ? (
                <Text style={styles.errorText}>{errorMsg}</Text>
              ) : null}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                  <Text style={styles.saveBtnText}>{saving ? "SAVING..." : "SAVE"}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Design.color.surface },

  header: {
    backgroundColor: Design.color.surfaceMuted,
    padding: 28,
    paddingTop: 56,
    paddingBottom: 20,
  },
  headerSmall: { fontSize: 10, letterSpacing: 4, color: Design.color.inkSoft },
  headerLarge: {
    fontFamily: Design.font.display,
    fontSize: 34,
    letterSpacing: -0.8,
    lineHeight: 34,
    color: Design.color.ink,
    marginBottom: 12,
  },
  goldDivider: {
    width: 40,
    height: 1.5,
    backgroundColor: Design.color.gold,
    marginBottom: 8,
  },
  itemCount: {
    fontSize: 11,
    color: Design.color.inkMuted,
    letterSpacing: 1,
  },

  filterScroll: {
    backgroundColor: Design.color.surfaceMuted,
    borderBottomWidth: 0.5,
    borderBottomColor: Design.color.line,
    maxHeight: 52,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: Design.color.line,
    backgroundColor: Design.color.surface,
  },
  filterPillActive: {
    backgroundColor: Design.color.ink,
    borderColor: Design.color.ink,
  },
  filterText: {
    fontSize: 12,
    color: Design.color.inkSoft,
  },
  filterTextActive: {
    color: Design.color.surface,
  },
  filterCount: {
    backgroundColor: Design.color.surfaceMuted,
    borderRadius: Design.radius.small,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: "center",
  },
  filterCountActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  filterCountText: {
    fontSize: 10,
    color: Design.color.inkSoft,
    fontWeight: "500",
  },
  filterCountTextActive: {
    color: Design.color.surface,
  },

  scroll: { flex: 1 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 14,
  },
  gridWeb: {
    display: "grid" as any,
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 16,
  },

  card: {
    width: "47.5%",
    backgroundColor: Design.color.surface,
    borderRadius: Design.radius.card,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: Design.color.line,
  },
  cardWeb: {
    width: "100%" as any,
  },

  imageWrap: {
    width: "100%",
    height: 160,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: 160,
  },
  imagePlaceholder: {
    width: "100%",
    height: 160,
    backgroundColor: Design.color.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(28,28,26,0.68)",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: Design.color.surface,
  },

  cardBody: { padding: 12 },
  cardName: {
    fontSize: 14,
    fontWeight: "500",
    color: Design.color.ink,
    marginBottom: 4,
    lineHeight: 20,
  },
  cardPrice: {
    fontSize: 15,
    color: Design.color.gold,
    marginBottom: 12,
  },
  cardActions: { flexDirection: "row", gap: 8 },
  editBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: Design.color.surfaceMuted,
    borderRadius: 8,
    paddingVertical: 8,
  },
  editBtnText: { fontSize: 10, letterSpacing: 1, color: Design.color.inkSoft, fontWeight: "500" },
  deleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#FCEBEB",
    borderRadius: 8,
    paddingVertical: 8,
  },
  deleteBtnText: { fontSize: 10, letterSpacing: 1, color: Design.color.danger, fontWeight: "500" },

  empty: { alignItems: "center", paddingVertical: 60, gap: 12, width: "100%" },
  emptyText: { fontSize: 13, color: Design.color.inkMuted },

  addBtn: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: Design.color.ink,
    borderRadius: Design.radius.small,
    padding: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  addBtnText: { color: Design.color.surface, fontSize: 11, letterSpacing: 2 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Design.color.surface,
    borderTopLeftRadius: Design.radius.sheet,
    borderTopRightRadius: Design.radius.sheet,
    padding: 28,
    paddingBottom: 0,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 11, letterSpacing: 3, color: Design.color.inkSoft },
  inputLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: Design.color.inkSoft,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: Design.color.line,
    paddingVertical: 10,
    fontSize: 14,
    color: Design.color.ink,
  },
  textArea: {
    borderWidth: 1,
    borderColor: Design.color.line,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    height: 80,
    textAlignVertical: "top",
  },
  categoryRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  categoryPill: {
    backgroundColor: Design.color.surfaceMuted,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: Design.color.line,
  },
  categoryPillActive: { backgroundColor: Design.color.ink, borderColor: Design.color.ink },
  categoryText: { fontSize: 12, color: Design.color.inkSoft },
  categoryTextActive: { color: Design.color.surface },
  errorText: {
    color: Design.color.danger,
    fontSize: 12,
    marginTop: 12,
    textAlign: "center",
  },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Design.color.line,
    borderRadius: Design.radius.small,
    padding: 16,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 11, letterSpacing: 2, color: Design.color.inkMuted },
  saveBtn: {
    flex: 1,
    backgroundColor: Design.color.ink,
    borderRadius: Design.radius.small,
    padding: 16,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 11, letterSpacing: 2, color: Design.color.surface },
  imageUploadBtn: {
    width: "100%",
    height: 160,
    backgroundColor: Design.color.surfaceMuted,
    borderRadius: Design.radius.card,
    borderWidth: 0.5,
    borderColor: Design.color.line,
    overflow: "hidden",
    marginBottom: 8,
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  uploadText: { fontSize: 10, letterSpacing: 2, color: Design.color.inkSoft },
  uploadedImage: { width: "100%", height: 160 },
  deleteModalContent: {
    backgroundColor: Design.color.surface,
    borderRadius: 20,
    padding: 28,
    marginHorizontal: 32,
    alignItems: "center",
  },
  deleteIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FCEBEB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  deleteModalTitle: { fontSize: 12, letterSpacing: 3, color: Design.color.danger, marginBottom: 12 },
  deleteModalMsg: { fontSize: 14, color: Design.color.ink, textAlign: "center", marginTop: 12, lineHeight: 22 },
  deleteModalName: { fontWeight: "600", color: Design.color.ink },
  deleteModalSub: { fontSize: 11, color: Design.color.inkMuted, marginTop: 6, marginBottom: 20 },
  deleteConfirmBtn: {
    flex: 1,
    backgroundColor: Design.color.danger,
    borderRadius: Design.radius.small,
    padding: 16,
    alignItems: "center",
  },
  deleteConfirmText: { fontSize: 11, letterSpacing: 2, color: Design.color.surface },
  dimColumns: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 },
  dimField: { flex: 1, minWidth: 140 },
  dimCaption: { fontSize: 9, letterSpacing: 1.2, color: Design.color.inkSoft, marginBottom: 6 },
  dimHint: { fontSize: 10, color: Design.color.inkMuted, marginBottom: 12 },
});
