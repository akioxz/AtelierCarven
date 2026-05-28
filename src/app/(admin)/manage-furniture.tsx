import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { pickAndUploadImage } from "../../lib/imageUpload";
import { supabase } from "../../lib/supabase";

const CATEGORIES = ["Sofa", "Chair", "Table", "Bed"];

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

export default function ManageFurniture() {
  const router = useRouter();
  const [furniture, setFurniture] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Sofa");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchFurniture = useCallback(async () => {
    const { data } = await supabase
      .from("furniture")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    setFurniture(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFurniture();
  }, [fetchFurniture]);

  const logAction = async (action: string, target: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("activity_logs")
      .insert({ admin_id: user?.id, action, target_item: target });
  };

  const openAdd = () => {
    setEditing(null);
    setName("");
    setPrice("");
    setCategory("Sofa");
    setDescription("");
    setImageUrl("");
    setModalVisible(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setName(item.name);
    setPrice(String(item.price));
    setCategory(item.category);
    setDescription(item.description || "");
    setImageUrl(item.image_url || "");
    setModalVisible(true);
  };

  const handlePickImage = async () => {
    setUploading(true);
    const url = await pickAndUploadImage("furniture-images", "items");
    if (url) setImageUrl(url);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!name || !price || !category) return;
    setSaving(true);
    if (editing) {
      await supabase
        .from("furniture")
        .update({
          name,
          price: Number(price),
          category,
          description,
          image_url: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editing.id);
      await logAction("Edited furniture", name);
    } else {
      await supabase.from("furniture").insert({
        name,
        price: Number(price),
        category,
        description,
        image_url: imageUrl,
      });
      await logAction("Added furniture", name);
    }
    setSaving(false);
    setModalVisible(false);
    fetchFurniture();
  };

  const handleDelete = async (item: any) => {
    await supabase
      .from("furniture")
      .update({ is_deleted: true })
      .eq("id", item.id);
    await logAction("Deleted furniture", item.name);
    fetchFurniture();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#1C1C1A" />
        </TouchableOpacity>
        <View style={{ marginTop: 20 }}>
          <Text style={styles.headerSmall}>MANAGE</Text>
          <Text style={styles.headerLarge}>Furniture</Text>
          <View style={styles.goldDivider} />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#C9A96E" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {furniture.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="inbox" size={40} color="#E8E0D0" />
              <Text style={styles.emptyText}>No furniture yet. Add one!</Text>
            </View>
          ) : (
            furniture.map((item) => (
              <View key={item.id} style={styles.furnitureItem}>
                <View style={styles.furnitureImage}>
                  {item.image_url ? (
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.furnitureImg}
                    />
                  ) : (
                    <Feather
                      name={getCategoryIcon(item.category) as any}
                      size={22}
                      color="#8B7355"
                    />
                  )}
                </View>
                <View style={styles.furnitureInfo}>
                  <Text style={styles.furnitureName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.furnitureCategory}>{item.category}</Text>
                  <Text style={styles.furniturePrice}>
                    ₱{Number(item.price).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.furnitureActions}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => openEdit(item)}
                  >
                    <Feather name="edit-2" size={11} color="#8B7355" />
                    <Text style={styles.editBtnText}>EDIT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item)}
                  >
                    <Feather name="trash-2" size={11} color="#A32D2D" />
                    <Text style={styles.deleteBtnText}>DEL</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
        <Feather name="plus" size={16} color="#FAFAF8" />
        <Text style={styles.addBtnText}>ADD FURNITURE</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editing ? "EDIT FURNITURE" : "ADD FURNITURE"}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Feather name="x" size={20} color="#8B7355" />
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
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.uploadedImage}
                  />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Feather name="camera" size={28} color="#8B7355" />
                    <Text style={styles.uploadText}>
                      {uploading ? "UPLOADING..." : "TAP TO UPLOAD IMAGE"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.inputLabel}>NAME</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Furniture name"
                placeholderTextColor="#C4B8A8"
              />

              <Text style={styles.inputLabel}>PRICE (₱)</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor="#C4B8A8"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>CATEGORY</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryPill,
                      category === cat && styles.categoryPillActive,
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        category === cat && styles.categoryTextActive,
                      ]}
                    >
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
                placeholderTextColor="#C4B8A8"
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.saveBtnText}>
                    {saving ? "SAVING..." : "SAVE"}
                  </Text>
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
  goldDivider: {
    width: 40,
    height: 1.5,
    backgroundColor: "#C9A96E",
    marginBottom: 16,
  },
  list: { flex: 1, padding: 24 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 13, color: "#9E8E7E" },
  furnitureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F0E8",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
    gap: 12,
  },
  furnitureImage: {
    width: 52,
    height: 52,
    backgroundColor: "#EDE5D8",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  furnitureImg: { width: 52, height: 52 },
  furnitureInfo: { flex: 1 },
  furnitureName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1C1C1A",
    marginBottom: 2,
  },
  furnitureCategory: { fontSize: 11, color: "#9E8E7E", marginBottom: 4 },
  furniturePrice: { fontSize: 13, color: "#C9A96E" },
  furnitureActions: { gap: 6 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EDE5D8",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  editBtnText: { fontSize: 9, letterSpacing: 1, color: "#8B7355" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FCEBEB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  deleteBtnText: { fontSize: 9, letterSpacing: 1, color: "#A32D2D" },
  addBtn: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: "#1C1C1A",
    borderRadius: 10,
    padding: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  addBtnText: { color: "#FAFAF8", fontSize: 11, letterSpacing: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FAFAF8",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  modalTitle: { fontSize: 11, letterSpacing: 3, color: "#8B7355" },
  inputLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#8B7355",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#E8E0D0",
    paddingVertical: 10,
    fontSize: 14,
    color: "#1C1C1A",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#E8E0D0",
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    height: 80,
    textAlignVertical: "top",
  },
  categoryRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  categoryPill: {
    backgroundColor: "#F5F0E8",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
  },
  categoryPillActive: { backgroundColor: "#1C1C1A", borderColor: "#1C1C1A" },
  categoryText: { fontSize: 12, color: "#8B7355" },
  categoryTextActive: { color: "#FAFAF8" },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E8E0D0",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 11, letterSpacing: 2, color: "#9E8E7E" },
  saveBtn: {
    flex: 1,
    backgroundColor: "#1C1C1A",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 11, letterSpacing: 2, color: "#FAFAF8" },
  imageUploadBtn: {
    width: "100%",
    height: 160,
    backgroundColor: "#F5F0E8",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
    overflow: "hidden",
    marginBottom: 8,
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  uploadText: { fontSize: 10, letterSpacing: 2, color: "#8B7355" },
  uploadedImage: { width: "100%", height: 160 },
});
