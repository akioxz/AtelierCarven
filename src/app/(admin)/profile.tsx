import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Design } from "../../constants/design";
import { pickAndUploadImage } from "../../lib/imageUpload";
import { supabase } from "../../lib/supabase";
import { goBackOr } from "../../lib/navigation";
import { AdminNavigation, ContentFrame, PageHeader } from "../../components/app-ui";
import { PressScale, Reveal, staggerDelay } from "../../components/motion";
import { ShimmerBlock } from "../../components/skeleton";
import ConfirmModal from "../../components/confirm-modal";

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
    try {
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
    } finally {
      setUploadingAvatar(false);
    }
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
        <View style={styles.loadingHeader}>
          <ShimmerBlock height={44} radius={22} width={44} />
          <ShimmerBlock height={80} radius={Design.radius.card} width="100%" />
        </View>
      </View>
    );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <AdminNavigation active="profile" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <ContentFrame>
        {/* Header */}
        <View style={styles.header}>
          <PressScale onPress={() => goBackOr(router, "/(admin)/dashboard")} style={styles.backButton} accessibilityLabel="Go back">
            <Feather name="arrow-left" size={19} color={Design.color.ink} />
          </PressScale>
          <PageHeader index="07" title="Profile" subtitle={`Signed in as ${profile?.username || "Administrator"}.`} style={styles.headerPage} />
        </View>

        {/* Avatar */}
        <Reveal>
        <View style={styles.avatarSection}>
          <PressScale
            onPress={handleAvatarUpload}
            disabled={uploadingAvatar}
            accessibilityLabel="Change profile photo"
          >
            <View style={styles.avatarContainer}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={200}
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
            </View>
          </PressScale>
          <Text style={styles.avatarName}>{profile?.username || "Admin"}</Text>
          <Text style={styles.avatarEmail}>{profile?.email}</Text>
          <Text style={styles.avatarHint}>Tap photo to change</Text>
        </View>
        </Reveal>

        {/* Info — read only */}
        <Reveal delay={staggerDelay(1)}>
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
        </Reveal>

        {/* Logout */}
        <Reveal delay={staggerDelay(2)}>
        <View style={styles.logoutSection}>
          <PressScale style={styles.logoutBtn} onPress={handleLogout} accessibilityLabel="Sign out">
            <Feather name="log-out" size={14} color={Design.color.inkMuted} />
            <Text style={styles.logoutText}>SIGN OUT</Text>
          </PressScale>
        </View>
        </Reveal>

        <View style={{ height: 100 }} />
        </ContentFrame>
      </ScrollView>

<ConfirmModal
        visible={logoutModalVisible}
        title="Sign out?"
        message="Are you sure you want to sign out of your admin account?"
        confirmLabel="SIGN OUT"
        cancelLabel="CANCEL"
        icon="log-out"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Design.color.surface },
  loadingContainer: {
    flex: 1,
    backgroundColor: Design.color.surface,
    padding: 16,
  },
  loadingHeader: { gap: 20, alignItems: "flex-start" },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 2,
  },
  headerPage: { flex: 1 },
  backButton: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.small, borderWidth: StyleSheet.hairlineWidth, height: 44, justifyContent: "center", width: 44 },
  avatarSection: { alignItems: "center", paddingVertical: 28 },
  avatarContainer: { position: "relative", marginBottom: 12 },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: Design.radius.pill,
    borderWidth: 1,
    borderColor: Design.color.accent,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: Design.radius.pill,
    backgroundColor: Design.color.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Design.color.accent,
  },
  avatarText: { fontSize: 32, fontWeight: "500", color: Design.color.inkSoft },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: Design.radius.small,
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
  avatarHint: { fontSize: 10, color: Design.color.accent, letterSpacing: 1 },
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
    borderRadius: Design.radius.small,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: Design.color.accent,
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
});
