import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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

export default function UserProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fetchProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(data);
    setUsername(data?.username || "");
    setAddress(data?.address || "");
    setMobile(data?.mobile_number || "");
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleAvatarUpload = async () => {
    setUploadingAvatar(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const url = await pickAndUploadImage("avatars", `user-${user.id}`);
    if (url) {
      await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);
      fetchProfile();
    }
    setUploadingAvatar(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("profiles")
      .update({ username, address, mobile_number: mobile })
      .eq("id", user!.id);
    setSaving(false);
    setEditing(false);
    fetchProfile();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/onboarding");
  };

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#C9A96E" />
      </View>
    );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#1C1C1A" />
          </TouchableOpacity>
          <View style={{ marginTop: 20 }}>
            <Text style={styles.headerSmall}>YOUR</Text>
            <Text style={styles.headerLarge}>Profile</Text>
            <View style={styles.goldDivider} />
          </View>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handleAvatarUpload}
            disabled={uploadingAvatar}
          >
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile?.username?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#FAFAF8" />
              ) : (
                <Feather name="camera" size={12} color="#FAFAF8" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
          <Text style={styles.avatarName}>{profile?.username || "User"}</Text>
          <Text style={styles.avatarEmail}>{profile?.email}</Text>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <Text style={styles.sectionLabel}>PERSONAL INFO</Text>
            <TouchableOpacity
              style={styles.editToggle}
              onPress={() => setEditing(!editing)}
            >
              <Feather
                name={editing ? "x" : "edit-2"}
                size={13}
                color="#C9A96E"
              />
              <Text style={styles.editBtn}>{editing ? "CANCEL" : "EDIT"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoLabelRow}>
                <Feather name="user" size={13} color="#8B7355" />
                <Text style={styles.infoLabel}>USERNAME</Text>
              </View>
              {editing ? (
                <TextInput
                  style={styles.infoInput}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Your name"
                  placeholderTextColor="#C4B8A8"
                />
              ) : (
                <Text style={styles.infoValue}>{profile?.username || "—"}</Text>
              )}
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoLabelRow}>
                <Feather name="mail" size={13} color="#8B7355" />
                <Text style={styles.infoLabel}>EMAIL</Text>
              </View>
              <Text style={styles.infoValue}>{profile?.email || "—"}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoLabelRow}>
                <Feather name="phone" size={13} color="#8B7355" />
                <Text style={styles.infoLabel}>MOBILE</Text>
              </View>
              {editing ? (
                <TextInput
                  style={styles.infoInput}
                  value={mobile}
                  onChangeText={setMobile}
                  placeholder="+63 XXX XXX XXXX"
                  placeholderTextColor="#C4B8A8"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.infoValue}>
                  {profile?.mobile_number || "—"}
                </Text>
              )}
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoLabelRow}>
                <Feather name="map-pin" size={13} color="#8B7355" />
                <Text style={styles.infoLabel}>ADDRESS</Text>
              </View>
              {editing ? (
                <TextInput
                  style={styles.infoInput}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Your address"
                  placeholderTextColor="#C4B8A8"
                />
              ) : (
                <Text style={styles.infoValue}>{profile?.address || "—"}</Text>
              )}
            </View>
          </View>

          {editing && (
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
            >
              <Feather name="check" size={15} color="#FAFAF8" />
              <Text style={styles.saveBtnText}>
                {saving ? "SAVING..." : "SAVE CHANGES"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Feather name="log-out" size={14} color="#9E8E7E" />
            <Text style={styles.logoutText}>SIGN OUT</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* 5-item bottom nav */}
            <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(user)/home")}
        >
          <Feather name="home" size={20} color={"#C4B8A8"} />
          <Text style={styles.navLabel}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(user)/favorites")}
        >
          <Feather name="heart" size={20} color={"#C4B8A8"} />
          <Text style={styles.navLabel}>SAVED</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(user)/image-placement")}
        >
          <Feather name="image" size={20} color={"#C4B8A8"} />
          <Text style={styles.navLabel}>PLACE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(user)/cart")}
        >
          <Feather name="shopping-cart" size={20} color={"#C4B8A8"} />
          <Text style={styles.navLabel}>CART</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
        >
          <Feather name="user" size={20} color={"#1C1C1A"} />
          <View style={styles.navDot} />
          <Text style={styles.navLabelActive}>PROFILE</Text>
        </TouchableOpacity>
      </View>
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
  avatarSection: { alignItems: "center", paddingVertical: 28 },
  avatarWrapper: { position: "relative", marginBottom: 8 },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: "#C9A96E",
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#EDE5D8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#C9A96E",
  },
  avatarText: { fontSize: 32, fontWeight: "500", color: "#8B7355" },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1C1C1A",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FAFAF8",
  },
  avatarHint: {
    fontSize: 10,
    color: "#C4B8A8",
    letterSpacing: 1,
    marginBottom: 10,
  },
  avatarName: {
    fontSize: 18,
    fontWeight: "500",
    color: "#1C1C1A",
    marginBottom: 4,
  },
  avatarEmail: { fontSize: 12, color: "#9E8E7E" },
  infoSection: { paddingHorizontal: 24, marginBottom: 20 },
  infoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionLabel: { fontSize: 10, letterSpacing: 2, color: "#8B7355" },
  editToggle: { flexDirection: "row", alignItems: "center", gap: 5 },
  editBtn: { fontSize: 10, letterSpacing: 2, color: "#C9A96E" },
  infoCard: {
    backgroundColor: "#F5F0E8",
    borderRadius: 12,
    padding: 16,
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  infoLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoLabel: { fontSize: 10, letterSpacing: 1, color: "#8B7355" },
  infoValue: { fontSize: 13, color: "#1C1C1A" },
  infoInput: {
    fontSize: 13,
    color: "#1C1C1A",
    borderBottomWidth: 1,
    borderBottomColor: "#C9A96E",
    paddingVertical: 4,
    minWidth: 160,
    textAlign: "right",
  },
  infoDivider: { height: 0.5, backgroundColor: "#E8E0D0" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1C1C1A",
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
  },
  saveBtnText: { color: "#FAFAF8", fontSize: 11, letterSpacing: 2 },
  logoutSection: { paddingHorizontal: 24 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E8E0D0",
    borderRadius: 10,
    padding: 16,
  },
  logoutText: { fontSize: 11, letterSpacing: 2, color: "#9E8E7E" },
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
