import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function ImagePlacement() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access photos is required!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#1C1C1A" />
          </TouchableOpacity>
          <View style={{ marginTop: 20 }}>
            <Text style={styles.headerSmall}>PLACE</Text>
            <Text style={styles.headerLarge}>Your Image</Text>
            <View style={styles.goldDivider} />
            <Text style={styles.headerSubtext}>
              Visualize furniture in your space
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PREVIEW</Text>
          <View style={styles.previewContainer}>
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
                resizeMode="cover"
              />
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

        {!selectedImage && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
            <View style={styles.stepCard}>
              {[
                {
                  num: "1",
                  title: "Upload your room photo",
                  sub: "Take a photo or choose from gallery",
                },
                {
                  num: "2",
                  title: "Visualize placement",
                  sub: "See how furniture fits in your space",
                },
                {
                  num: "3",
                  title: "Shop with confidence",
                  sub: "Add your favorites to cart",
                },
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

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {selectedImage ? "CHANGE IMAGE" : "SELECT IMAGE"}
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
              onPress={() => setSelectedImage(null)}
            >
              <Text style={styles.clearButtonText}>CLEAR IMAGE</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.browseSection}>
          <View style={styles.browseDivider} />
          <Text style={styles.browseText}>
            Ready to find the perfect piece?
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push("/(user)/home")}
          >
            <Text style={styles.browseButtonText}>BROWSE COLLECTION</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(user)/home")}
        >
          <Feather name="home" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(user)/favorites")}
        >
          <Feather name="heart" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>SAVED</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Feather name="image" size={20} color="#1C1C1A" />
          <View style={styles.navDot} />
          <Text style={styles.navLabelActive}>PLACE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(user)/cart")}
        >
          <Feather name="shopping-cart" size={20} color="#C4B8A8" />
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
  goldDivider: {
    width: 40,
    height: 1.5,
    backgroundColor: "#C9A96E",
    marginBottom: 12,
  },
  headerSubtext: { fontSize: 13, color: "#6B5E4E" },
  section: { padding: 24, paddingBottom: 0 },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#8B7355",
    marginBottom: 12,
  },
  previewContainer: {
    width: "100%",
    height: 240,
    backgroundColor: "#F5F0E8",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
  },
  previewImage: { width: "100%", height: 240 },
  previewPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  previewTitle: { fontSize: 15, fontWeight: "500", color: "#1C1C1A" },
  previewSubtext: {
    fontSize: 12,
    color: "#9E8E7E",
    textAlign: "center",
    lineHeight: 20,
  },
  stepCard: {
    backgroundColor: "#F5F0E8",
    borderRadius: 12,
    padding: 16,
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
  },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#C9A96E",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: { fontSize: 12, fontWeight: "500", color: "#FAFAF8" },
  stepContent: { flex: 1, paddingTop: 4 },
  stepTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1C1C1A",
    marginBottom: 2,
  },
  stepSubtext: { fontSize: 12, color: "#9E8E7E" },
  stepDivider: { height: 0.5, backgroundColor: "#E8E0D0", marginVertical: 12 },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1C1C1A",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  primaryButtonText: { color: "#FAFAF8", fontSize: 11, letterSpacing: 2 },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#C9A96E",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  secondaryButtonText: { color: "#8B7355", fontSize: 11, letterSpacing: 2 },
  clearButton: {
    borderWidth: 1,
    borderColor: "#E8E0D0",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
  clearButtonText: { color: "#9E8E7E", fontSize: 11, letterSpacing: 2 },
  browseSection: { padding: 24, alignItems: "center" },
  browseDivider: {
    width: 40,
    height: 1.5,
    backgroundColor: "#C9A96E",
    marginBottom: 16,
  },
  browseText: { fontSize: 13, color: "#6B5E4E", marginBottom: 16 },
  browseButton: {
    backgroundColor: "#F5F0E8",
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
  },
  browseButtonText: { fontSize: 11, letterSpacing: 2, color: "#8B7355" },
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
