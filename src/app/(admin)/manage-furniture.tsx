import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  FlatList,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Design } from "../../constants/design";
import { pickAndUploadImage } from "../../lib/imageUpload";
import { supabase } from "../../lib/supabase";
import { fetchAllRows } from "../../lib/pagination";
import { goBackOr } from "../../lib/navigation";
import { AdminNavigation, ContentFrame, PageHeader, RetryNotice } from "../../components/app-ui";
import { PressScale, Reveal, staggerDelay } from "../../components/motion";
import { ShimmerBlock } from "../../components/skeleton";
import ConfirmModal from "../../components/confirm-modal";

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
  const { width: screenWidth } = useWindowDimensions();
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
  const mutationPending = useRef(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [depth, setDepth] = useState("");
  const [weight, setWeight] = useState("");
  const [guidesReady, setGuidesReady] = useState(false);
  const galleryRequest = useRef(0);
  const [sizeGuides, setSizeGuides] = useState<Record<string, any>>({});
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [collectionError, setCollectionError] = useState("");
  const [guidesError, setGuidesError] = useState("");
  const [discardOpen, setDiscardOpen] = useState(false);
  const [listWidth, setListWidth] = useState(screenWidth);
  const originalForm = useRef("");
  const imagePending = useRef(false);
  const galleryPending = useRef(false);
  const formSignature = JSON.stringify([name, price, category, description, imageUrl, width, height, depth, weight]);
  const columns = isWeb ? Math.max(1, Math.floor((listWidth - 18) / 314)) : listWidth < 360 ? 1 : 2;
  const cardWidth = Math.max(1, (listWidth - 32 - 14 * (columns - 1)) / columns);
  const closeForm = () => { galleryRequest.current++; setModalVisible(false); setDiscardOpen(false); };
  const requestCloseForm = () => {
    if (mutationPending.current || imagePending.current || galleryPending.current) return;
    if (formSignature !== originalForm.current) setDiscardOpen(true);
    else closeForm();
  };

  const fetchFurniture = useCallback(async () => {
    setLoading(true);
    setCollectionError("");
    try {
      const data = await fetchAllRows((from, to) => supabase.from("furniture").select("*", { count: "exact" }).eq("is_deleted", false).order("created_at", { ascending: false }).order("id").range(from, to));
      setFurniture(data);
    } catch { setCollectionError("Could not load the complete collection. Please retry."); }
    finally { setLoading(false); }
  }, []);
  const fetchSizeGuides = useCallback(async () => {
    setGuidesError("");
    try {
      const data = await fetchAllRows((from, to) => supabase.from("size_guides").select("*", { count: "exact" }).order("furniture_id").range(from, to));
      const map: Record<string, any> = {};
      data.forEach(guide => { map[guide.furniture_id] = guide; });
      setSizeGuides(map);
      setGuidesReady(true);
      return map;
    } catch { setGuidesReady(false); setGuidesError("Could not load dimensions. Retry before saving an existing item."); }
  }, []);

  const retryDimensions = async () => {
    const request = galleryRequest.current;
    const map = await fetchSizeGuides();
    if (!map || !editing || request !== galleryRequest.current) return;
    const guide = map[editing.id];
    const dimensions = [guide?.width_cm, guide?.height_cm, guide?.depth_cm, guide?.weight_kg].map(value => value != null ? String(value) : "");
    setWidth(dimensions[0]); setHeight(dimensions[1]); setDepth(dimensions[2]); setWeight(dimensions[3]);
    const baseline = JSON.parse(originalForm.current) as string[];
    originalForm.current = JSON.stringify([...baseline.slice(0, 5), ...dimensions]);
  };

  useEffect(() => {
    void (async () => { await fetchFurniture(); await fetchSizeGuides(); })();
  }, [fetchFurniture, fetchSizeGuides]);

  const filteredFurniture = activeFilter === "All"
    ? furniture
    : furniture.filter((item) => item.category === activeFilter);

  const logAction = async (action: string, target: string) => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Activity log authentication unavailable");
    const { error } = await supabase.from("activity_logs").insert({ admin_id: user.id, action, target_item: target });
    if (error) throw error;
  };

  const openAdd = () => {
    originalForm.current = JSON.stringify(["", "", "Sofa", "", "", "", "", "", ""]);
    galleryRequest.current++;
    setEditing(null);
    setName(""); setPrice(""); setCategory("Sofa");
    setDescription(""); setImageUrl(""); setErrorMsg("");
    setWidth(""); setHeight(""); setDepth(""); setWeight("");
    setGalleryImages([]);
    setModalVisible(true);
  };

  const openEdit = async (item: any) => {
    const request = ++galleryRequest.current;
    setEditing(item);
    setName(item.name);
    setPrice(String(item.price));
    setCategory(item.category);
    setDescription(item.description || "");
    setImageUrl(item.image_url || "");
    const guide = sizeGuides[item.id];
    originalForm.current = JSON.stringify([item.name, String(item.price), item.category, item.description || "", item.image_url || "", ...[guide?.width_cm, guide?.height_cm, guide?.depth_cm, guide?.weight_kg].map(value => value != null ? String(value) : "")]);
    setWidth(guide?.width_cm != null ? String(guide.width_cm) : "");
    setHeight(guide?.height_cm != null ? String(guide.height_cm) : "");
    setDepth(guide?.depth_cm != null ? String(guide.depth_cm) : "");
    setWeight(guide?.weight_kg != null ? String(guide.weight_kg) : "");
    setErrorMsg("");
    setModalVisible(true);
    // Fetch gallery images for this item
    setGalleryImages([]);
    try {
      const gi = await fetchAllRows((from, to) => supabase.from("furniture_images").select("*", { count: "exact" }).eq("furniture_id", item.id).order("display_order").order("id").range(from, to));
      if (request === galleryRequest.current) setGalleryImages(gi);
    } catch { setErrorMsg("Could not load this gallery. Reopen the item to retry."); }
  };

  const handlePickImage = async () => {
    if (imagePending.current || mutationPending.current) return;
    imagePending.current = true;
    setUploading(true);
    try {
      const url = await pickAndUploadImage("furniture-images", "items", { throwOnError: true });
      if (url) setImageUrl(url);
    } catch { setErrorMsg("Could not upload the furniture image. Tap the image to retry.");
    } finally {
      imagePending.current = false;
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (mutationPending.current || imagePending.current || galleryPending.current) return;
    setErrorMsg("");
    if (editing && !guidesReady) { setErrorMsg("Dimensions were not loaded. Use Retry dimensions before saving."); return; }
    const parsedPrice = Math.round(Number(price.replace(/[₱,\s]/g, "")) * 100) / 100;
    const dimensions = {
      width_cm: width.trim() ? Number(width) : null,
      height_cm: height.trim() ? Number(height) : null,
      depth_cm: depth.trim() ? Number(depth) : null,
      weight_kg: weight.trim() ? Number(weight) : null,
    };
    if (!name.trim() || !CATEGORIES.includes(category) || !Number.isFinite(parsedPrice) || parsedPrice <= 0
        || Object.values(dimensions).some(value => value !== null && (!Number.isFinite(value) || value <= 0))) {
      setErrorMsg("Enter a name, valid price/category, and positive dimensions or leave dimensions blank.");
      return;
    }
    mutationPending.current = true;
    setSaving(true);
    let furnitureSaved = false;
    let dimensionsSaved = false;
    try {
      const payload = { name: name.trim(), price: parsedPrice, category, description, image_url: imageUrl, updated_at: new Date().toISOString() };
      const result = editing
        ? await supabase.from("furniture").update(payload).eq("id", editing.id).select("id").single()
        : await supabase.from("furniture").insert({ ...payload, is_deleted: false }).select("id").single();
      if (result.error || !result.data?.id) throw new Error("Furniture write failed");
      const furnitureId = result.data.id;
      furnitureSaved = true;
      // A partial save must retry this row, rather than creating another item.
      setEditing({ ...editing, ...payload, id: furnitureId });
      const guide = Object.values(dimensions).some(value => value !== null)
        ? await supabase.from("size_guides").upsert({ furniture_id: furnitureId, ...dimensions, updated_at: new Date().toISOString() }).select("furniture_id").single()
        : await supabase.from("size_guides").delete().eq("furniture_id", furnitureId);
      if (guide.error) throw new Error("Dimension write failed");
      dimensionsSaved = true;
      await logAction(editing ? "Edited furniture" : "Added furniture", name.trim());
      setModalVisible(false);
      await Promise.all([fetchFurniture(), fetchSizeGuides()]);
    } catch {
      setErrorMsg(!furnitureSaved ? "Furniture was not saved. Your form is kept; please retry."
        : !dimensionsSaved ? "Furniture saved, but dimensions were not saved. Your form is kept; retry to finish."
          : "Furniture and dimensions saved, but the activity log failed. Retry to record the change.");
    } finally { mutationPending.current = false; setSaving(false); }
  };
  const handleDelete = (item: any) => {
    setErrorMsg("");
    setItemToDelete(item);
    setDeleteModalVisible(true);
  };
  const confirmDelete = async () => {
    if (!itemToDelete || mutationPending.current) return;
    mutationPending.current = true;
    setSaving(true);
    setErrorMsg("");
    let deleted = false;
    try {
      const { error, data } = await supabase.from("furniture").update({ is_deleted: true }).eq("id", itemToDelete.id).select("id").single();
      if (error || !data?.id) throw new Error("Furniture deletion failed");
      deleted = true;
      await logAction("Deleted furniture", itemToDelete.name);
      setDeleteModalVisible(false);
      setItemToDelete(null);
      await fetchFurniture();
    } catch {
      setErrorMsg(deleted ? "Furniture was removed, but the activity log failed. Retry to record the change." : "Could not remove furniture. Please try again.");
    } finally { mutationPending.current = false; setSaving(false); }
  };
  const removeGalleryImage = async (imageId: string) => {
    if (galleryPending.current || mutationPending.current) return;
    galleryPending.current = true;
    setUploadingGallery(true);
    try {
      const { error, data } = await supabase.from("furniture_images").delete().eq("id", imageId).select("id").single();
      if (error || !data?.id) throw new Error("Gallery deletion failed");
      setGalleryImages(previous => previous.filter(image => image.id !== imageId));
    } catch { setErrorMsg("Could not remove this gallery image. Please try again."); }
    finally { galleryPending.current = false; setUploadingGallery(false); }
  };

  const renderCard = (item: any) => (
    <View key={item.id} style={[styles.card, isWeb && styles.cardWeb]}>
      <View style={styles.imageWrap}>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.cardImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name={getCategoryIcon(item.category) as any} size={36} color={Design.color.accent} />
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
          <PressScale style={styles.editBtn} onPress={() => openEdit(item)} accessibilityLabel={`Edit ${item.name}`}>
            <Feather name="edit-2" size={12} color={Design.color.inkSoft} />
            <Text style={styles.editBtnText}>EDIT</Text>
          </PressScale>
          <PressScale style={styles.deleteBtn} onPress={() => handleDelete(item)} accessibilityLabel={`Delete ${item.name}`}>
            <Feather name="trash-2" size={12} color={Design.color.danger} />
            <Text style={styles.deleteBtnText}>DEL</Text>
          </PressScale>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <AdminNavigation active="furniture" />

      <ContentFrame>
      {guidesError ? <RetryNotice message={guidesError} onRetry={() => void fetchSizeGuides()} /> : null}
      <View style={styles.header}>
        <PressScale onPress={() => goBackOr(router, "/(admin)/dashboard")} style={styles.backButton} accessibilityLabel="Go back">
          <Feather name="arrow-left" size={19} color={Design.color.ink} />
        </PressScale>
        {errorMsg && !modalVisible ? <Text accessibilityRole="alert" style={styles.errorText}>{errorMsg}</Text> : null}
        <PageHeader title="Furniture" subtitle={`${filteredFurniture.length} ${activeFilter === "All" ? "items" : activeFilter.toLowerCase() + "s"} in the collection.`} style={styles.headerPage} />
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
            <PressScale
              key={f}
              style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
              onPress={() => setActiveFilter(f)}
              accessibilityLabel={`Filter by ${f}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeFilter === f }}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                {f}
              </Text>
              <View style={[styles.filterCount, activeFilter === f && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, activeFilter === f && styles.filterCountTextActive]}>
                  {count}
                </Text>
              </View>
            </PressScale>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingGrid}><ShimmerBlock height={240} radius={Design.radius.card} width="47.5%" /><ShimmerBlock height={240} radius={Design.radius.card} width="47.5%" /></View>
      ) : collectionError ? <RetryNotice message={collectionError} onRetry={() => void fetchFurniture()} /> : (
        <FlatList
          key={columns}
          data={filteredFurniture}
          numColumns={columns}
          onLayout={event => setListWidth(event.nativeEvent.layout.width)}
          keyExtractor={item => item.id}
          initialNumToRender={12}
          windowSize={5}
          columnWrapperStyle={columns > 1 ? { gap: 14 } : undefined}
          style={styles.scroll}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="inbox" size={40} color={Design.color.line} />
              <Text style={styles.emptyText}>No {activeFilter === "All" ? "furniture" : activeFilter} yet.</Text>
            </View>
          }
          renderItem={({ item, index }) => <Reveal style={{ width: cardWidth, marginBottom: 14 }} delay={staggerDelay(index, 50, 6)}>{renderCard(item)}</Reveal>}
        />
      )}

      <PressScale style={styles.addBtn} onPress={openAdd} accessibilityLabel="Add furniture">
        <Feather name="plus" size={16} color={Design.color.surface} />
        <Text style={styles.addBtnText}>ADD FURNITURE</Text>
      </PressScale>
      </ContentFrame>
      <AdminNavigation active="furniture" placement="footer" />

      <ConfirmModal
        visible={deleteModalVisible}
        title="Delete furniture?"
        message={<>Are you sure you want to delete <Text style={{ fontFamily: Design.font.bodyBold }}>&quot;{itemToDelete?.name}&quot;</Text>? This action cannot be undone.{errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}</>}
        confirmLabel="DELETE"
        cancelLabel="CANCEL"
        danger
        pending={saving || uploadingGallery}
        icon="trash-2"
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteModalVisible(false); setItemToDelete(null); }}
      />

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={requestCloseForm}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editing ? "EDIT FURNITURE" : "ADD FURNITURE"}
                </Text>
                <PressScale onPress={requestCloseForm} disabled={saving || uploading || uploadingGallery} hitSlop={12} accessibilityLabel="Close">
                  <Feather name="x" size={20} color={Design.color.inkSoft} />
                </PressScale>
              </View>
              <View style={styles.accentDivider} />

              <Text style={styles.inputLabel}>FURNITURE IMAGE</Text>
              <PressScale
                style={styles.imageUploadBtn}
                onPress={handlePickImage}
                disabled={uploading}
                accessibilityLabel="Upload furniture image"
              >
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.uploadedImage} contentFit="cover" transition={200} />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Feather name="camera" size={28} color={Design.color.inkSoft} />
                    <Text style={styles.uploadText}>
                      {uploading ? "UPLOADING..." : "TAP TO UPLOAD IMAGE"}
                    </Text>
                  </View>
                )}
              </PressScale>

              <Text style={styles.inputLabel}>OR PASTE IMAGE URL</Text>
              <TextInput editable={!saving && !uploading && !uploadingGallery}
                style={styles.input}
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://images.unsplash.com/..."
                placeholderTextColor={Design.color.inkMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.inputLabel}>NAME</Text>
              <TextInput editable={!saving && !uploading && !uploadingGallery}
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Furniture name"
                placeholderTextColor={Design.color.inkMuted}
              />

              <Text style={styles.inputLabel}>PRICE (numbers only, e.g. 55000)</Text>
              <TextInput editable={!saving && !uploading && !uploadingGallery}
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
                  <PressScale
                    key={cat}
                    style={[styles.categoryPill, category === cat && styles.categoryPillActive]}
                    onPress={() => setCategory(cat)}
                    disabled={saving || uploading || uploadingGallery}
                    accessibilityLabel={`Set category to ${cat}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: category === cat }}
                  >
                    <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                      {cat}
                    </Text>
                  </PressScale>
                ))}
              </View>

              <Text style={styles.inputLabel}>DESCRIPTION</Text>
              <TextInput editable={!saving && !uploading && !uploadingGallery}
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Short description..."
                placeholderTextColor={Design.color.inkMuted}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>SIZE GUIDE (OPTIONAL)</Text>
              {editing && !guidesReady ? <RetryNotice message={guidesError || "Dimensions have not loaded. Retry before editing dimensions."} onRetry={() => void retryDimensions()} /> : null}
              <Text style={styles.dimHint}>Shown on the product page. Leave all blank to hide it.</Text>
              <View style={styles.dimColumns}>
                <View style={styles.dimField}>
                  <Text style={styles.dimCaption}>WIDTH (cm)</Text>
                  <TextInput style={styles.input} accessibilityLabel="Width in centimetres" editable={!saving && !uploading && !uploadingGallery && (!editing || guidesReady)} value={width} onChangeText={setWidth} placeholder="120" placeholderTextColor={Design.color.inkMuted} keyboardType="decimal-pad" />
                </View>
                <View style={styles.dimField}>
                  <Text style={styles.dimCaption}>HEIGHT (cm)</Text>
                  <TextInput style={styles.input} accessibilityLabel="Height in centimetres" editable={!saving && !uploading && !uploadingGallery && (!editing || guidesReady)} value={height} onChangeText={setHeight} placeholder="75" placeholderTextColor={Design.color.inkMuted} keyboardType="decimal-pad" />
                </View>
                <View style={styles.dimField}>
                  <Text style={styles.dimCaption}>DEPTH (cm)</Text>
                  <TextInput style={styles.input} accessibilityLabel="Depth in centimetres" editable={!saving && !uploading && !uploadingGallery && (!editing || guidesReady)} value={depth} onChangeText={setDepth} placeholder="60" placeholderTextColor={Design.color.inkMuted} keyboardType="decimal-pad" />
                </View>
                <View style={styles.dimField}>
                  <Text style={styles.dimCaption}>WEIGHT (kg)</Text>
                  <TextInput style={styles.input} accessibilityLabel="Weight in kilograms" editable={!saving && !uploading && !uploadingGallery && (!editing || guidesReady)} value={weight} onChangeText={setWeight} placeholder="8" placeholderTextColor={Design.color.inkMuted} keyboardType="decimal-pad" />
                </View>
              </View>

              {editing ? (
                <>
                  <Text style={styles.inputLabel}>GALLERY IMAGES</Text>
                  <Text style={styles.dimHint}>Gallery changes save immediately and remain if you cancel this form. Other fields save only when you tap Save.</Text>
                  <View style={styles.galleryGrid}>
                    {galleryImages.map((gi: any) => (
                      <View key={gi.id} style={styles.galleryThumb}>
                        <Image source={{ uri: gi.image_url }} style={styles.galleryThumbImage} contentFit="cover" transition={200} />
                        <PressScale style={styles.galleryDelete} disabled={saving || uploadingGallery} hitSlop={6} onPress={() => void removeGalleryImage(gi.id)} accessibilityLabel="Remove gallery image">
                          <Feather name="x" size={12} color={Design.color.surface} />
                        </PressScale>
                      </View>
                    ))}
                    <PressScale style={styles.galleryAddBtn} disabled={saving || uploadingGallery} onPress={async () => {
                      if (galleryPending.current || mutationPending.current) return;
                      galleryPending.current = true;
                      setUploadingGallery(true);
                      try {
                        const url = await pickAndUploadImage("furniture-images", "gallery", { throwOnError: true });
                        if (url && editing?.id) {
                          const nextOrder = galleryImages.length;
                          const { data, error } = await supabase.from("furniture_images").insert({ furniture_id: editing.id, image_url: url, display_order: nextOrder }).select("*").single();
                          if (error || !data) throw new Error("Gallery write failed");
                          setGalleryImages((prev) => [...prev, data]);
                        }
                      } catch { setErrorMsg("Could not save the gallery image. Please try again."); }
                      finally {
                        galleryPending.current = false;
                        setUploadingGallery(false);
                      }
                    }} accessibilityLabel="Add gallery image">
                      <Feather name={uploadingGallery ? "loader" : "plus"} size={22} color={Design.color.inkSoft} />
                      <Text style={styles.uploadText}>{uploadingGallery ? "UPLOADING..." : "ADD"}</Text>
                    </PressScale>
                  </View>
                </>
              ) : null}

              {errorMsg ? (
                <Text accessibilityRole="alert" style={styles.errorText}>{errorMsg}</Text>
              ) : null}

              <View style={styles.modalButtons}>
                <PressScale style={styles.cancelBtn} disabled={saving || uploading || uploadingGallery} onPress={requestCloseForm} accessibilityLabel="Cancel">
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </PressScale>
                <PressScale style={styles.saveBtn} onPress={handleSave} disabled={saving || uploading || uploadingGallery} accessibilityLabel="Save furniture">
                  <Text style={styles.saveBtnText}>{saving ? "SAVING..." : "SAVE"}</Text>
                </PressScale>
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
      <ConfirmModal visible={discardOpen} title="Discard unsaved changes?" message="Your unsaved fields will be discarded. Gallery changes already saved will remain." confirmLabel="DISCARD" danger onConfirm={closeForm} onCancel={() => setDiscardOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Design.color.canvas },

  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerPage: { flex: 1 },
  backButton: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.small, borderWidth: StyleSheet.hairlineWidth, height: 44, justifyContent: "center", width: 44 },
  accentDivider: {
    width: 40,
    height: 1.5,
    backgroundColor: Design.color.accent,
    marginBottom: 8,
  },
  loadingGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14, padding: 16 },

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
    borderRadius: Design.radius.small,
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
    fontFamily: Design.font.monoMedium,
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
    fontFamily: Design.font.monoMedium,
    color: Design.color.inkSoft,
    fontWeight: "500",
  },
  filterCountTextActive: {
    color: Design.color.surface,
  },

  scroll: { flex: 1 },
  grid: {
    padding: 16,
    paddingBottom: 100,
  },
  gridWeb: {
    display: "grid" as any,
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 16,
  },

  gridItem: { width: "47.5%" },
  gridItemNarrow: { width: "100%" },
  gridItemWeb: { width: "100%", minWidth: 0 },
  card: {
    width: "100%",
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
    borderRadius: Design.radius.small,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: Design.font.monoMedium,
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
    fontFamily: Design.font.monoBold,
    color: Design.color.accent,
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
    borderRadius: Design.radius.small,
    paddingVertical: 8,
  },
  editBtnText: { fontSize: 10, fontFamily: Design.font.monoMedium, letterSpacing: 1, color: Design.color.inkSoft, fontWeight: "500" },
  deleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#F2DBD7",
    borderRadius: Design.radius.small,
    paddingVertical: 8,
  },
  deleteBtnText: { fontSize: 10, fontFamily: Design.font.monoMedium, letterSpacing: 1, color: Design.color.danger, fontWeight: "500" },

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
  addBtnText: { color: Design.color.surface, fontSize: 11, fontFamily: Design.font.monoMedium, letterSpacing: 2 },

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
  modalTitle: { fontSize: 11, fontFamily: Design.font.monoMedium, letterSpacing: 3, color: Design.color.inkSoft },
  inputLabel: {
    fontSize: 10,
    fontFamily: Design.font.monoMedium,
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
    borderRadius: Design.radius.small,
    padding: 10,
    marginTop: 4,
    height: 80,
    textAlignVertical: "top",
  },
  categoryRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  categoryPill: {
    backgroundColor: Design.color.surfaceMuted,
    borderRadius: Design.radius.small,
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
  cancelBtnText: { fontSize: 11, fontFamily: Design.font.monoMedium, letterSpacing: 2, color: Design.color.inkMuted },
  saveBtn: {
    flex: 1,
    backgroundColor: Design.color.ink,
    borderRadius: Design.radius.small,
    padding: 16,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 11, fontFamily: Design.font.monoMedium, letterSpacing: 2, color: Design.color.surface },
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
  uploadText: { fontSize: 10, fontFamily: Design.font.monoMedium, letterSpacing: 2, color: Design.color.inkSoft },
  uploadedImage: { width: "100%", height: 160 },
  dimColumns: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 },
  dimField: { flex: 1, minWidth: 140 },
  dimCaption: { fontSize: 9, fontFamily: Design.font.monoMedium, letterSpacing: 1.2, color: Design.color.inkSoft, marginBottom: 6 },
  dimHint: { fontSize: 10, color: Design.color.inkMuted, marginBottom: 12 },
  galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  galleryThumb: { width: 72, height: 72, borderRadius: Design.radius.small, overflow: "hidden", position: "relative" },
  galleryThumbImage: { width: "100%", height: "100%" },
  galleryDelete: { position: "absolute", top: 6, right: 6, width: 32, height: 32, borderRadius: Design.radius.small, backgroundColor: "rgba(33,26,22,0.7)", alignItems: "center", justifyContent: "center" },
  galleryAddBtn: { width: 72, height: 72, borderRadius: Design.radius.small, borderWidth: 1, borderColor: Design.color.line, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4 },
});
