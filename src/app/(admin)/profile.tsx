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
  TouchableOpacity,
  View,
} from "react-native";
import { Design } from "../../constants/design";
import { pickAndUploadImage } from "../../lib/imageUpload";
import { supabase } from "../../lib/supabase";
import { AdminNavigation } from "../../components/app-ui";

export default function AdminProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

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
    if (!user) {
      setUploadingAvatar(false);
      return;
    }
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

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    await supabase.auth.signOut();
    router.replace("/(auth)/onboarding");
  };

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Design.color.gold} />
      </View>
    );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <AdminNavigation active="profile" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={Design.color.ink} />
          </TouchableOpacity>
          <View style={{ marginTop: 20 }}>
            <Text style={styles.headerSmall}>ADMIN</Text>
            <Text style={styles.headerLarge}>Profile</Text>
            <View style={styles.goldDivider} />
          </View>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
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
                  {profile?.username?.charAt(0)?.toUpperCase() || "A"}
                </Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Feather
                name={uploadingAvatar ? "loader" : "camera"}
                size={11}
                color={Design.color.surface}
              />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarName}>{profile?.username || "Admin"}</Text>
          <Text style={styles.avatarEmail}>{profile?.email}</Text>
          <Text style={styles.avatarHint}>Tap photo to change</Text>
        </View>

        {/* Info — read only */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>ACCOUNT INFO</Text>
          <View style={styles.infoCard}>
            {/* Username — read only */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabelRow}>
                <Feather name="user" size={13} color={Design.color.inkSoft} />
                <Text style={styles.infoLabel}>USERNAME</Text>
              </View>
              <View style={styles.readOnlyBadge}>
                <Text style={styles.infoValue}>{profile?.username || "—"}</Text>
                <Feather name="lock" size={10} color={Design.color.inkMuted} />
              </View>
            </View>
            <View style={styles.infoDivider} />
            {/* Email — read only */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabelRow}>
                <Feather name="mail" size={13} color={Design.color.inkSoft} />
                <Text style={styles.infoLabel}>EMAIL</Text>
              </View>
              <Text style={styles.infoValue}>{profile?.email || "—"}</Text>
            </View>
            <View style={styles.infoDivider} />
            {/* Role */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabelRow}>
                <Feather name="shield" size={13} color={Design.color.inkSoft} />
                <Text style={styles.infoLabel}>ROLE</Text>
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>ADMINISTRATOR</Text>
              </View>
            </View>
          </View>

          {/* Note about username */}
          <View style={styles.noteRow}>
            <Feather name="info" size={11} color={Design.color.inkMuted} />
            <Text style={styles.noteText}>
              Admin username cannot be changed.
            </Text>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Feather name="log-out" size={14} color={Design.color.inkMuted} />
            <Text style={styles.logoutText}>SIGN OUT</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal visible={logoutModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconWrap}>
              <Feather name="log-out" size={24} color={Design.color.inkSoft} />
            </View>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <View style={styles.modalDivider} />
            <Text style={styles.modalMessage}>
              Are you sure you want to sign out of your admin account?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={confirmLogout}
              >
                <Feather name="log-out" size={13} color={Design.color.surface} />
                <Text style={styles.modalConfirmText}>SIGN OUT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Design.color.surface },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Design.color.surface,
  },
  header: {
    backgroundColor: Design.color.surfaceMuted,
    padding: 28,
    paddingTop: 56,
    paddingBottom: 28,
  },
  headerSmall: { fontSize: 10, letterSpacing: 4, color: Design.color.inkSoft },
  headerLarge: {
    fontSize: 36,
    fontWeight: "300",
    color: Design.color.ink,
    letterSpacing: 2,
    marginBottom: 16,
  },
  goldDivider: { width: 40, height: 1.5, backgroundColor: Design.color.gold },
  avatarSection: { alignItems: "center", paddingVertical: 28 },
  avatarContainer: { position: "relative", marginBottom: 12 },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: Design.radius.pill,
    borderWidth: 1,
    borderColor: Design.color.gold,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: Design.radius.pill,
    backgroundColor: Design.color.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Design.color.gold,
  },
  avatarText: { fontSize: 32, fontWeight: "500", color: Design.color.inkSoft },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: Design.radius.card,
    backgroundColor: Design.color.ink,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarName: {
    fontSize: 18,
    fontWeight: "500",
    color: Design.color.ink,
    marginBottom: 4,
  },
  avatarEmail: { fontSize: 12, color: Design.color.inkMuted, marginBottom: 4 },
  avatarHint: { fontSize: 10, color: Design.color.gold, letterSpacing: 1 },
  infoSection: { paddingHorizontal: 24, marginBottom: 20 },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: Design.color.inkSoft,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: Design.color.surfaceMuted,
    borderRadius: Design.radius.card,
    padding: 16,
    borderWidth: 0.5,
    borderColor: Design.color.line,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  infoLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoLabel: { fontSize: 10, letterSpacing: 1, color: Design.color.inkSoft },
  infoValue: { fontSize: 13, color: Design.color.ink },
  readOnlyBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoDivider: { height: 0.5, backgroundColor: Design.color.line },
  roleBadge: {
    backgroundColor: Design.color.surfaceMuted,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: Design.color.gold,
  },
  roleBadgeText: { fontSize: 9, letterSpacing: 1.5, color: Design.color.inkSoft },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  noteText: { fontSize: 11, color: Design.color.inkMuted },
  logoutSection: { paddingHorizontal: 24 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Design.color.line,
    borderRadius: Design.radius.small,
    padding: 16,
  },
  logoutText: { fontSize: 11, letterSpacing: 2, color: Design.color.inkMuted },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  modalBox: {
    backgroundColor: Design.color.surface,
    borderRadius: 20,
    padding: 28,
    width: "100%",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: Design.color.line,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: Design.radius.pill,
    backgroundColor: Design.color.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: Design.color.gold,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: Design.color.ink,
    marginBottom: 12,
    letterSpacing: 1,
  },
  modalDivider: {
    width: 32,
    height: 1.5,
    backgroundColor: Design.color.gold,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 13,
    color: Design.color.inkMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: { flexDirection: "row", gap: 12, width: "100%" },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Design.color.line,
    borderRadius: Design.radius.small,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 11, letterSpacing: 2, color: Design.color.inkMuted },
  modalConfirmBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    backgroundColor: Design.color.ink,
    borderRadius: Design.radius.small,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmText: { fontSize: 11, letterSpacing: 2, color: Design.color.surface },
});
