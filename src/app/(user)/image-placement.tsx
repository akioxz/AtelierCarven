import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  PanResponder,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function ImagePlacement() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [furnitureList, setFurnitureList] = useState<any[]>([]);
  const [fetchingFurniture, setFetchingFurniture] = useState(false);
  const [selectedFurniture, setSelectedFurniture] = useState<any | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [scaleValue, setScaleValue] = useState(1.0);
  const [rotationValue, setRotationValue] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const pan = useRef(new Animated.ValueXY()).current;
  const scrollRef = useRef<ScrollView>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
        pan.extractOffset();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        setIsDragging(false);
        pan.flattenOffset();
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
        pan.flattenOffset();
      },
    })
  ).current;

  useEffect(() => {
    const fetchFurniture = async () => {
      setFetchingFurniture(true);
      const { data, error } = await supabase
        .from("furniture")
        .select("*")
        .eq("is_deleted", false);
      if (!error && data) setFurnitureList(data);
      setFetchingFurniture(false);
    };
    fetchFurniture();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access photos is required!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to use camera is required!");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const handleSelectFurniture = (item: any) => {
    setSelectedFurniture(item);
    pan.setValue({ x: 0, y: 0 });
    setScaleValue(1.0);
    setRotationValue(0);
    setIsFlipped(false);
  };

  const increaseScale = () => setScaleValue((prev) => Math.min(prev + 0.1, 2.5));
  const decreaseScale = () => setScaleValue((prev) => Math.max(prev - 0.1, 0.3));
  const resetScale = () => setScaleValue(1.0);
  const rotateRight = () => setRotationValue((prev) => (prev + 15) % 360);
  const rotateLeft = () => setRotationValue((prev) => (prev - 15 + 360) % 360);
  const rotate90Right = () => setRotationValue((prev) => (prev + 90) % 360);
  const rotate90Left = () => setRotationValue((prev) => (prev - 90 + 360) % 360);
  const resetRotation = () => setRotationValue(0);
  const toggleFlip = () => setIsFlipped((prev) => !prev);
  const handleRemoveFurniture = () => setSelectedFurniture(null);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Sofa": return "airplay";
      case "Chair": return "sidebar";
      case "Table": return "minus-square";
      case "Bed": return "moon";
      default: return "box";
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ScrollView disabled while dragging to prevent conflict */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        scrollEnabled={!isDragging}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#1C1C1A" />
          </TouchableOpacity>
          <View style={{ marginTop: 20 }}>
            <Text style={styles.headerSmall}>PLACE</Text>
            <Text style={styles.headerLarge}>Your Image</Text>
            <View style={styles.goldDivider} />
            <Text style={styles.headerSubtext}>Visualize furniture in your space</Text>
          </View>
        </View>

        {/* Canvas */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PREVIEW CANVAS</Text>
          <View style={styles.previewContainer}>
            {selectedImage ? (
              <View style={styles.canvasContainer}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                {selectedFurniture && (
                  <Animated.View
                    style={[
                      styles.furnitureOverlay,
                      {
                        transform: [
                          ...pan.getTranslateTransform(),
                          { scale: scaleValue },
                          { rotate: `${rotationValue}deg` },
                          { scaleX: isFlipped ? -1 : 1 },
                        ],
                      },
                    ]}
                    {...panResponder.panHandlers}
                  >
                    <View style={styles.dragHandle}>
                      <Feather name="move" size={10} color="#FAFAF8" />
                    </View>
                    {selectedFurniture.image_url ? (
                      <Image
                        source={{ uri: selectedFurniture.image_url }}
                        style={styles.furnitureImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.furniturePlaceholder}>
                        <Feather
                          name={getCategoryIcon(selectedFurniture.category) as any}
                          size={48}
                          color="#8B7355"
                        />
                        <Text style={styles.placeholderLabel}>{selectedFurniture.name}</Text>
                      </View>
                    )}
                  </Animated.View>
                )}
                {!selectedFurniture && (
                  <View style={styles.canvasOverlayHint}>
                    <Feather name="arrow-down" size={12} color="#FAFAF8" />
                    <Text style={styles.canvasOverlayHintText}>
                      Select a furniture piece below
                    </Text>
                  </View>
                )}
                {isDragging && (
                  <View style={styles.draggingBadge}>
                    <Text style={styles.draggingBadgeText}>MOVING</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.previewPlaceholder}>
                <Feather name="image" size={48} color="#E8E0D0" />
                <Text style={styles.previewTitle}>No image selected</Text>
                <Text style={styles.previewSubtext}>
                  Upload a photo of your room to visualize furniture placement
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Furniture Catalog */}
        {selectedImage && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SELECT FURNITURE</Text>
            {fetchingFurniture ? (
              <ActivityIndicator color="#C9A96E" style={{ marginVertical: 20 }} />
            ) : furnitureList.length === 0 ? (
              <Text style={styles.emptyCatalogText}>No furniture pieces available.</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.catalogScroll}
              >
                {furnitureList.map((item) => {
                  const isSelected = selectedFurniture?.id === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.catalogCard, isSelected && styles.catalogCardActive]}
                      onPress={() => handleSelectFurniture(item)}
                    >
                      <View style={styles.catalogCardImage}>
                        {item.image_url ? (
                          <Image
                            source={{ uri: item.image_url }}
                            style={styles.catalogCardImg}
                            resizeMode="cover"
                          />
                        ) : (
                          <Feather
                            name={getCategoryIcon(item.category) as any}
                            size={22}
                            color="#8B7355"
                          />
                        )}
                      </View>
                      {isSelected && (
                        <View style={styles.selectedCheck}>
                          <Feather name="check" size={10} color="#FAFAF8" />
                        </View>
                      )}
                      <View style={styles.catalogCardInfo}>
                        <Text style={styles.catalogCardName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.catalogCardPrice}>
                          ₱{Number(item.price).toLocaleString()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {/* Controls */}
        {selectedImage && selectedFurniture && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CONTROLS — {selectedFurniture.name}</Text>
            <View style={styles.controlsCard}>
              {/* Scale */}
              <View style={styles.controlRow}>
                <View style={styles.controlInfo}>
                  <Feather name="maximize-2" size={14} color="#8B7355" />
                  <Text style={styles.controlTitle}>Scale</Text>
                  <Text style={styles.controlValue}>{Math.round(scaleValue * 100)}%</Text>
                </View>
                <View style={styles.controlButtons}>
                  <TouchableOpacity style={styles.adjustButton} onPress={decreaseScale}>
                    <Feather name="minus" size={14} color="#8B7355" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.adjustButtonReset} onPress={resetScale}>
                    <Text style={styles.resetButtonText}>Reset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.adjustButton} onPress={increaseScale}>
                    <Feather name="plus" size={14} color="#8B7355" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.controlDivider} />

              {/* Rotation */}
              <View style={styles.controlRow}>
                <View style={styles.controlInfo}>
                  <Feather name="rotate-cw" size={14} color="#8B7355" />
                  <Text style={styles.controlTitle}>Rotate</Text>
                  <Text style={styles.controlValue}>{rotationValue}°</Text>
                </View>
                <View style={styles.controlButtons}>
                  <TouchableOpacity style={styles.adjustButton} onPress={rotateLeft}>
                    <Feather name="chevron-left" size={14} color="#8B7355" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.adjustButton} onPress={rotate90Left}>
                    <Text style={styles.quickRotationText}>-90°</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.adjustButtonReset} onPress={resetRotation}>
                    <Text style={styles.resetButtonText}>Reset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.adjustButton} onPress={rotate90Right}>
                    <Text style={styles.quickRotationText}>+90°</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.adjustButton} onPress={rotateRight}>
                    <Feather name="chevron-right" size={14} color="#8B7355" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.controlDivider} />

              {/* Flip & Remove */}
              <View style={styles.extrasRow}>
                <TouchableOpacity
                  style={[styles.flipButton, isFlipped && styles.flipButtonActive]}
                  onPress={toggleFlip}
                >
                  <Feather name="repeat" size={14} color={isFlipped ? "#FAFAF8" : "#8B7355"} />
                  <Text style={[styles.flipButtonText, { color: isFlipped ? "#FAFAF8" : "#8B7355" }]}>
                    FLIP
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={handleRemoveFurniture}>
                  <Feather name="trash-2" size={14} color="#FAFAF8" />
                  <Text style={styles.deleteButtonText}>REMOVE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* How it works */}
        {!selectedImage && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
            <View style={styles.stepCard}>
              {[
                { num: "1", title: "Upload your room photo", sub: "Take a photo or choose from gallery" },
                { num: "2", title: "Visualize placement", sub: "Drag, scale & rotate furniture items" },
                { num: "3", title: "Shop with confidence", sub: "Add your favorites to cart" },
              ].map((step, i) => (
                <View key={i}>
                  <View style={styles.step}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{step.num}</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      <Text style={styles.stepSubtext}>{step.sub}</Text>
                    </View>
                  </View>
                  {i < 2 && <View style={styles.stepDivider} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Image Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {selectedImage ? "CHANGE ROOM IMAGE" : "SELECT ROOM IMAGE"}
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={pickImage}>
            <Feather name="image" size={16} color="#FAFAF8" />
            <Text style={styles.primaryButtonText}>CHOOSE FROM GALLERY</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={takePhoto}>
            <Feather name="camera" size={16} color="#8B7355" />
            <Text style={styles.secondaryButtonText}>TAKE A PHOTO</Text>
          </TouchableOpacity>
          {selectedImage && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSelectedImage(null);
                setSelectedFurniture(null);
              }}
            >
              <Text style={styles.clearButtonText}>CLEAR CANVAS</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.browseSection}>
          <View style={styles.browseDivider} />
          <Text style={styles.browseText}>Ready to find the perfect piece?</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push("/(user)/home")}
          >
            <Text style={styles.browseButtonText}>BROWSE COLLECTION</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/(user)/home")}>
          <Feather name="home" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/(user)/favorites")}>
          <Feather name="heart" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>SAVED</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Feather name="image" size={20} color="#1C1C1A" />
          <View style={styles.navDot} />
          <Text style={styles.navLabelActive}>PLACE</Text>
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
  header: { backgroundColor: "#F5F0E8", padding: 28, paddingTop: 56, paddingBottom: 28 },
  headerSmall: { fontSize: 10, letterSpacing: 4, color: "#8B7355" },
  headerLarge: { fontSize: 36, fontWeight: "300", color: "#1C1C1A", letterSpacing: 2, marginBottom: 16 },
  goldDivider: { width: 40, height: 1.5, backgroundColor: "#C9A96E", marginBottom: 12 },
  headerSubtext: { fontSize: 13, color: "#6B5E4E" },
  section: { padding: 24, paddingBottom: 0 },
  sectionLabel: { fontSize: 10, letterSpacing: 2, color: "#8B7355", marginBottom: 12 },

  previewContainer: { width: "100%", height: 320, backgroundColor: "#F5F0E8", borderRadius: 16, overflow: "hidden", borderWidth: 0.5, borderColor: "#E8E0D0" },
  previewImage: { width: "100%", height: "100%" },
  previewPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12 },
  previewTitle: { fontSize: 15, fontWeight: "500", color: "#1C1C1A" },
  previewSubtext: { fontSize: 12, color: "#9E8E7E", textAlign: "center", lineHeight: 20 },

  canvasContainer: { flex: 1, position: "relative" },
  furnitureOverlay: { position: "absolute", width: 140, height: 140, justifyContent: "center", alignItems: "center", top: 90, left: 100, zIndex: 10 },
  dragHandle: { position: "absolute", top: -10, right: -10, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(28,28,26,0.7)", justifyContent: "center", alignItems: "center", zIndex: 11 },
  furnitureImage: { width: 130, height: 130 },
  furniturePlaceholder: { width: 130, height: 130, backgroundColor: "#EDE5D8", borderRadius: 12, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#C9A96E" },
  placeholderLabel: { fontSize: 9, color: "#8B7355", marginTop: 4, textAlign: "center", paddingHorizontal: 6 },
  canvasOverlayHint: { position: "absolute", bottom: 12, left: 12, right: 12, backgroundColor: "rgba(28,28,26,0.75)", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  canvasOverlayHintText: { color: "#FAFAF8", fontSize: 10, letterSpacing: 1 },
  draggingBadge: { position: "absolute", top: 10, right: 10, backgroundColor: "#C9A96E", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  draggingBadgeText: { fontSize: 9, letterSpacing: 1.5, color: "#1C1C1A", fontWeight: "600" },

  catalogScroll: { gap: 12, paddingBottom: 8 },
  catalogCard: { width: 110, backgroundColor: "#F5F0E8", borderRadius: 12, padding: 8, borderWidth: 0.5, borderColor: "#E8E0D0", alignItems: "center", position: "relative" },
  catalogCardActive: { borderColor: "#C9A96E", borderWidth: 1.5, backgroundColor: "#EDE5D8" },
  catalogCardImage: { width: 94, height: 74, backgroundColor: "#EDE5D8", borderRadius: 8, justifyContent: "center", alignItems: "center", overflow: "hidden", marginBottom: 6 },
  catalogCardImg: { width: "100%", height: "100%" },
  selectedCheck: { position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: "#C9A96E", justifyContent: "center", alignItems: "center" },
  catalogCardInfo: { width: "100%", alignItems: "center" },
  catalogCardName: { fontSize: 11, fontWeight: "500", color: "#1C1C1A", marginBottom: 2, textAlign: "center" },
  catalogCardPrice: { fontSize: 10, color: "#C9A96E", fontWeight: "500" },
  emptyCatalogText: { fontSize: 12, color: "#9E8E7E", paddingVertical: 12 },

  controlsCard: { backgroundColor: "#F5F0E8", borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: "#E8E0D0" },
  controlRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  controlInfo: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  controlTitle: { fontSize: 12, fontWeight: "500", color: "#1C1C1A" },
  controlValue: { fontSize: 11, color: "#8B7355", backgroundColor: "#EDE5D8", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  controlButtons: { flexDirection: "row", alignItems: "center", gap: 6 },
  adjustButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#EDE5D8", justifyContent: "center", alignItems: "center" },
  adjustButtonReset: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: "#EDE5D8", justifyContent: "center", alignItems: "center" },
  resetButtonText: { fontSize: 10, color: "#8B7355", fontWeight: "500", letterSpacing: 0.5 },
  quickRotationText: { fontSize: 10, color: "#8B7355", fontWeight: "500" },
  controlDivider: { height: 0.5, backgroundColor: "#E8E0D0", marginVertical: 4 },
  extrasRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  flipButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: "#C9A96E", borderRadius: 10, paddingVertical: 12 },
  flipButtonActive: { backgroundColor: "#8B7355", borderColor: "#8B7355" },
  flipButtonText: { fontSize: 10, letterSpacing: 1, fontWeight: "600" },
  deleteButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#A32D2D", borderRadius: 10, paddingVertical: 12 },
  deleteButtonText: { color: "#FAFAF8", fontSize: 10, letterSpacing: 1, fontWeight: "600" },

  stepCard: { backgroundColor: "#F5F0E8", borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: "#E8E0D0" },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#C9A96E", justifyContent: "center", alignItems: "center" },
  stepNumberText: { fontSize: 12, fontWeight: "500", color: "#FAFAF8" },
  stepContent: { flex: 1, paddingTop: 4 },
  stepTitle: { fontSize: 13, fontWeight: "500", color: "#1C1C1A", marginBottom: 2 },
  stepSubtext: { fontSize: 12, color: "#9E8E7E" },
  stepDivider: { height: 0.5, backgroundColor: "#E8E0D0", marginVertical: 12 },

  primaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1C1C1A", borderRadius: 10, padding: 16, marginBottom: 12 },
  primaryButtonText: { color: "#FAFAF8", fontSize: 11, letterSpacing: 2 },
  secondaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#C9A96E", borderRadius: 10, padding: 16, marginBottom: 12 },
  secondaryButtonText: { color: "#8B7355", fontSize: 11, letterSpacing: 2 },
  clearButton: { borderWidth: 1, borderColor: "#E8E0D0", borderRadius: 10, padding: 16, alignItems: "center" },
  clearButtonText: { color: "#9E8E7E", fontSize: 11, letterSpacing: 2 },

  browseSection: { padding: 24, alignItems: "center" },
  browseDivider: { width: 40, height: 1.5, backgroundColor: "#C9A96E", marginBottom: 16 },
  browseText: { fontSize: 13, color: "#6B5E4E", marginBottom: 16 },
  browseButton: { backgroundColor: "#F5F0E8", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14, borderWidth: 0.5, borderColor: "#E8E0D0" },
  browseButtonText: { fontSize: 11, letterSpacing: 2, color: "#8B7355" },

  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FAFAF8", borderTopWidth: 0.5, borderTopColor: "#E8E0D0", flexDirection: "row", justifyContent: "space-around", paddingVertical: 12, paddingBottom: 24 },
  navItem: { alignItems: "center", gap: 3 },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#C9A96E" },
  navLabel: { fontSize: 8, color: "#C4B8A8", letterSpacing: 1 },
  navLabelActive: { fontSize: 8, color: "#1C1C1A", letterSpacing: 1 },
});