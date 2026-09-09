import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { pickAndUploadImage } from "../../lib/imageUpload";
import { supabase } from "../../lib/supabase";
import { goBackOr } from "../../lib/navigation";
import { Design } from "../../constants/design";
import { getStatusBadge } from "../../constants/statuses";
import { ContentFrame, CustomerNavigation, PageHeader } from "../../components/app-ui";
import { PressScale, Reveal, staggerDelay } from "../../components/motion";
import { ShimmerBlock } from "../../components/skeleton";
import ConfirmModal from "../../components/confirm-modal";

export default function UserProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Orders
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
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

  const fetchOrders = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoadingOrders(false);
  }, []);

  const fetchOrderItems = async (orderId: string) => {
    setLoadingItems(true);
    const { data } = await supabase
      .from("order_items")
      .select("*, furniture(*)")
      .eq("order_id", orderId);
    setOrderItems(data || []);
    setLoadingItems(false);
  };

  useEffect(() => {
    void (async () => { await fetchProfile(); await fetchOrders(); })();
  }, [fetchOrders, fetchProfile]);

  const handleAvatarUpload = async () => {
    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const url = await pickAndUploadImage("avatars", `user-${user.id}`);
      if (url) {
        await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
        fetchProfile();
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({ username, address, mobile_number: mobile })
      .eq("id", user!.id);
    setSaving(false);
    if (error) {
      console.error("Error saving profile:", error);
      setSaveError("Couldn't save your changes. Please try again.");
      return;
    }
    setEditing(false);
    fetchProfile();
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    await supabase.auth.signOut();
    router.replace("/(auth)/onboarding");
  };

  const openOrder = (order: any) => {
    setSelectedOrder(order);
    fetchOrderItems(order.id);
  };

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ShimmerBlock width={88} height={88} radius={44} />
        <ShimmerBlock width="50%" height={14} />
        <ShimmerBlock width="70%" height={120} radius={Design.radius.card} />
      </View>
    );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <CustomerNavigation active="profile" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <ContentFrame>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <PageHeader title="Profile" subtitle="Your details, orders, and gallery wall." />
          </View>
          <PressScale onPress={() => goBackOr(router, "/(user)/home")} accessibilityLabel="Go back" style={styles.backButton}>
            <Feather name="arrow-left" size={19} color={Design.color.ink} />
          </PressScale>
        </View>

        {/* Avatar */}
        <Reveal>
        <View style={styles.avatarSection}>
          <PressScale
            style={styles.avatarWrapper}
            onPress={handleAvatarUpload}
            disabled={uploadingAvatar}
            accessibilityLabel="Change profile photo"
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} contentFit="cover" transition={200} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile?.username?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Feather name="camera" size={12} color={Design.color.surface} />
            </View>
          </PressScale>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
          <Text style={styles.avatarName}>{profile?.username || "User"}</Text>
          <Text style={styles.avatarEmail}>{profile?.email}</Text>
        </View>
        </Reveal>

        {/* MY ORDERS */}
        <Reveal delay={staggerDelay(1)}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MY ORDERS</Text>
          {loadingOrders ? (
            <View style={styles.orderSkeleton}><ShimmerBlock width="100%" height={76} radius={Design.radius.card} /><ShimmerBlock width="100%" height={76} radius={Design.radius.card} /></View>
          ) : orders.length === 0 ? (
            <View style={styles.emptyOrders}>
              <Feather name="shopping-bag" size={32} color={Design.color.line} />
              <Text style={styles.emptyOrdersText}>No orders yet</Text>
            </View>
          ) : (
            orders.map((order, orderIndex) => {
              const badge = getStatusBadge(order.status);
              return (
                <Reveal key={order.id} delay={staggerDelay(orderIndex, 60, 4)}>
                <PressScale
                  style={styles.orderCard}
                  onPress={() => openOrder(order)}
                  accessibilityLabel={`View order ${order.id.substring(0, 8).toUpperCase()}`}
                >
                  <View style={styles.orderCardLeft}>
                    <Text style={styles.orderId}>
                      ORDER #{order.id.substring(0, 8).toUpperCase()}
                    </Text>
                    <Text style={styles.orderDate}>
                      {new Date(order.created_at).toLocaleDateString("en-PH", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </Text>
                    <Text style={styles.orderTotal}>
                      ₱{Number(order.total).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.orderCardRight}>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusText, { color: badge.color }]}>
                        {badge.label}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={14} color={Design.color.accent} style={{ marginTop: 8 }} />
                  </View>
                </PressScale>
                </Reveal>
              );
            })
          )}
        </View>
        </Reveal>

        {/* Personal Info */}
        <Reveal delay={staggerDelay(2)}>
        <View style={styles.section}>
          <View style={styles.infoHeader}>
            <Text style={styles.sectionLabel}>PERSONAL INFO</Text>
            <PressScale style={styles.editToggle} onPress={() => setEditing(!editing)} accessibilityLabel={editing ? "Cancel editing" : "Edit profile"}>
              <Feather name={editing ? "x" : "edit-2"} size={13} color={Design.color.accent} />
              <Text style={styles.editBtn}>{editing ? "CANCEL" : "EDIT"}</Text>
            </PressScale>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoLabelRow}>
                <Feather name="user" size={13} color={Design.color.inkSoft} />
                <Text style={styles.infoLabel}>USERNAME</Text>
              </View>
              {editing ? (
                <TextInput style={styles.infoInput} value={username} onChangeText={setUsername} placeholder="Your name" placeholderTextColor={Design.color.inkMuted} />
              ) : (
                <Text style={styles.infoValue}>{profile?.username || "—"}</Text>
              )}
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoLabelRow}>
                <Feather name="mail" size={13} color={Design.color.inkSoft} />
                <Text style={styles.infoLabel}>EMAIL</Text>
              </View>
              <Text style={styles.infoValue}>{profile?.email || "—"}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoLabelRow}>
                <Feather name="phone" size={13} color={Design.color.inkSoft} />
                <Text style={styles.infoLabel}>MOBILE</Text>
              </View>
              {editing ? (
                <TextInput style={styles.infoInput} value={mobile} onChangeText={setMobile} placeholder="+63 XXX XXX XXXX" placeholderTextColor={Design.color.inkMuted} keyboardType="phone-pad" />
              ) : (
                <Text style={styles.infoValue}>{profile?.mobile_number || "—"}</Text>
              )}
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoLabelRow}>
                <Feather name="map-pin" size={13} color={Design.color.inkSoft} />
                <Text style={styles.infoLabel}>ADDRESS</Text>
              </View>
              {editing ? (
                <TextInput style={styles.infoInput} value={address} onChangeText={setAddress} placeholder="Your address" placeholderTextColor={Design.color.inkMuted} />
              ) : (
                <Text style={styles.infoValue}>{profile?.address || "—"}</Text>
              )}
            </View>
          </View>

          {editing && (
            <>
              {saveError ? (
                <Text style={styles.saveError}>{saveError}</Text>
              ) : null}
              <PressScale style={styles.saveBtn} onPress={handleSave} disabled={saving} accessibilityLabel="Save changes">
                <Feather name="check" size={15} color={Design.color.surface} />
                <Text style={styles.saveBtnText}>{saving ? "SAVING..." : "SAVE CHANGES"}</Text>
              </PressScale>
            </>
          )}
        </View>
        </Reveal>

        <Reveal delay={staggerDelay(3)}>
        <View style={styles.logoutSection}>
          <PressScale style={styles.logoutBtn} onPress={handleLogout} accessibilityLabel="Sign out">
            <Feather name="log-out" size={14} color={Design.color.inkMuted} />
            <Text style={styles.logoutText}>SIGN OUT</Text>
          </PressScale>
        </View>
        </Reveal>
        <View style={{ height: 120 }} />
        </ContentFrame>
      </ScrollView>

      {/* Order Detail Modal */}
      <Modal visible={selectedOrder !== null} animationType="slide" transparent onRequestClose={() => setSelectedOrder(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedOrder && (() => {
              const badge = getStatusBadge(selectedOrder.status);
              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.modalHeader}>
                    <View>
                      <Text style={styles.modalTitle}>ORDER DETAILS</Text>
                      <Text style={styles.modalSub}>
                        #{selectedOrder.id.substring(0, 8).toUpperCase()}
                      </Text>
                    </View>
                    <PressScale style={styles.closeBtn} onPress={() => setSelectedOrder(null)} accessibilityLabel="Close order details">
                      <Feather name="x" size={18} color={Design.color.inkSoft} />
                    </PressScale>
                  </View>
                  <View style={styles.accentDivider} />

                  <View style={styles.modalInfoRow}>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                    <Text style={styles.modalDate}>
                      {new Date(selectedOrder.created_at).toLocaleDateString("en-PH", {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </Text>
                  </View>

                  <Text style={styles.modalSectionLabel}>ITEMS ORDERED</Text>
                  <View style={styles.modalCard}>
                    {loadingItems ? (
                      <View style={styles.orderSkeleton}><ShimmerBlock width="100%" height={64} radius={Design.radius.card} /></View>
                    ) : orderItems.length === 0 ? (
                      <Text style={styles.noItemsText}>No items found.</Text>
                    ) : (
                      orderItems.map((item, index) => (
                        <View key={item.id}>
                          {index > 0 && <View style={styles.itemDivider} />}
                          <View style={styles.itemRow}>
                            <View style={styles.itemImageWrap}>
                              {item.furniture?.image_url ? (
                                <Image source={{ uri: item.furniture.image_url }} style={styles.itemImage} contentFit="cover" transition={200} />
                              ) : (
                                <Feather name="box" size={20} color={Design.color.inkSoft} />
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemName} numberOfLines={1}>{item.furniture?.name}</Text>
                              <Text style={styles.itemMeta}>{item.furniture?.category} · Qty {item.quantity}</Text>
                            </View>
                            <Text style={styles.itemPrice}>
                              ₱{(Number(item.price) * item.quantity).toLocaleString()}
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>

                  <View style={styles.modalTotalRow}>
                    <Text style={styles.modalTotalLabel}>TOTAL PAID</Text>
                    <Text style={styles.modalTotalAmt}>₱{Number(selectedOrder.total).toLocaleString()}</Text>
                  </View>
                  <View style={{ height: 20 }} />
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

<ConfirmModal
        visible={logoutModalVisible}
        title="Sign out?"
        message="Are you sure you want to sign out of your account?"
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
  container: { flex: 1, backgroundColor: Design.color.canvas },
  loadingContainer: { alignItems: "center", backgroundColor: Design.color.canvas, flex: 1, gap: 14, justifyContent: "center", padding: 32 },
  headerRow: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 20 },
  headerCopy: { flex: 1 },
  backButton: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.small, borderWidth: StyleSheet.hairlineWidth, height: 44, justifyContent: "center", width: 44 },
  orderSkeleton: { gap: 10 },
  header: { backgroundColor: Design.color.surfaceMuted, padding: 28, paddingTop: 56, paddingBottom: 28 },
  headerSmall: { fontSize: 10, letterSpacing: 4, color: Design.color.inkSoft },
  headerLarge: { fontFamily: Design.font.display, fontSize: 34, letterSpacing: -0.8, lineHeight: 34, color: Design.color.ink, marginBottom: 16 },
  accentDivider: { width: 42, height: 1, backgroundColor: Design.color.accent, marginBottom: 8 },
  avatarSection: { alignItems: "center", paddingVertical: 28 },
  avatarWrapper: { position: "relative", marginBottom: 8 },
  avatarImage: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: Design.color.accent },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: Design.color.surfaceMuted, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: Design.color.accent },
  avatarText: { fontFamily: Design.font.display, fontSize: 34, letterSpacing: -0.8, color: Design.color.ink },
  avatarEditBadge: { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: Design.color.ink, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: Design.color.surface },
  avatarHint: { fontSize: 10, color: Design.color.inkMuted, letterSpacing: 1, marginBottom: 10 },
  avatarName: { fontFamily: Design.font.bodySemibold, fontSize: 16, color: Design.color.ink, marginBottom: 4 },
  avatarEmail: { fontFamily: Design.font.body, fontSize: 12, color: Design.color.inkMuted },

  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionLabel: { fontFamily: Design.font.bodySemibold, fontSize: 10, letterSpacing: 2, color: Design.color.inkSoft, marginBottom: 12 },

  emptyOrders: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyOrdersText: { fontFamily: Design.font.body, fontSize: 13, color: Design.color.inkMuted },

  orderCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: Design.color.surfaceMuted, borderRadius: Design.radius.card, padding: 16, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: Design.color.line },
  orderCardLeft: { flex: 1 },
  orderCardRight: { alignItems: "flex-end" },
  orderId: { fontFamily: Design.font.bodySemibold, fontSize: 11, color: Design.color.ink, letterSpacing: 1, marginBottom: 4 },
  orderDate: { fontFamily: Design.font.body, fontSize: 11, color: Design.color.inkMuted, marginBottom: 6 },
  orderTotal: { fontFamily: Design.font.display, fontSize: 17, color: Design.color.accent },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontFamily: Design.font.bodySemibold, fontSize: 9, letterSpacing: 1 },

  infoHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  editToggle: { flexDirection: "row", alignItems: "center", gap: 5 },
  editBtn: { fontFamily: Design.font.bodyBold, fontSize: 10, letterSpacing: 1.5, color: Design.color.accent },
  infoCard: { backgroundColor: Design.color.surfaceMuted, borderRadius: Design.radius.card, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: Design.color.line },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  infoLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoLabel: { fontFamily: Design.font.bodySemibold, fontSize: 10, letterSpacing: 1.5, color: Design.color.inkSoft },
  infoValue: { fontFamily: Design.font.body, fontSize: 13, color: Design.color.ink },
  infoInput: { fontFamily: Design.font.body, fontSize: 13, color: Design.color.ink, borderBottomWidth: 1, borderBottomColor: Design.color.accent, paddingVertical: 4, minWidth: 160, textAlign: "right" },
  infoDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Design.color.line },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Design.color.ink, borderRadius: Design.radius.small, padding: 16, marginTop: 16 },
  saveError: { color: Design.color.danger, fontSize: 12, lineHeight: 18, marginTop: 16 },
  saveBtnText: { color: Design.color.surface, fontFamily: Design.font.bodyBold, fontSize: 11, letterSpacing: 1.5 },

  logoutSection: { paddingHorizontal: 24 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: Design.color.line, borderRadius: Design.radius.small, padding: 16 },
  logoutText: { fontFamily: Design.font.bodySemibold, fontSize: 11, letterSpacing: 1.5, color: Design.color.inkMuted },

  // Order detail modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(29,27,23,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: Design.color.surface, borderTopLeftRadius: Design.radius.sheet, borderTopRightRadius: Design.radius.sheet, padding: 24, paddingBottom: 40, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  modalTitle: { fontFamily: Design.font.bodySemibold, fontSize: 10, letterSpacing: 2, color: Design.color.inkSoft },
  modalSub: { fontFamily: Design.font.display, fontSize: 20, letterSpacing: -0.4, color: Design.color.ink, marginTop: 2 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: Design.color.surfaceMuted, justifyContent: "center", alignItems: "center" },
  modalInfoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 16 },
  modalDate: { fontFamily: Design.font.body, fontSize: 12, color: Design.color.inkMuted },
  modalSectionLabel: { fontFamily: Design.font.bodySemibold, fontSize: 9, letterSpacing: 2, color: Design.color.inkSoft, marginBottom: 10 },
  modalCard: { backgroundColor: Design.color.surfaceMuted, borderRadius: Design.radius.card, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: Design.color.line, marginBottom: 16 },
  itemDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Design.color.line, marginVertical: 10 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  itemImageWrap: { width: 48, height: 48, borderRadius: 8, backgroundColor: Design.color.surfaceMuted, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  itemImage: { width: 48, height: 48 },
  itemName: { fontFamily: Design.font.bodySemibold, fontSize: 13, color: Design.color.ink, marginBottom: 2 },
  itemMeta: { fontFamily: Design.font.body, fontSize: 11, color: Design.color.inkMuted },
  itemPrice: { fontFamily: Design.font.bodySemibold, fontSize: 13, color: Design.color.accent },
  noItemsText: { fontFamily: Design.font.body, fontSize: 12, color: Design.color.inkMuted, textAlign: "center" },
  modalTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 },
  modalTotalLabel: { fontFamily: Design.font.bodySemibold, fontSize: 10, letterSpacing: 2, color: Design.color.inkSoft },
  modalTotalAmt: { fontFamily: Design.font.display, fontSize: 22, color: Design.color.accent },

  // Logout modal
  logoutModalOverlay: { flex: 1, backgroundColor: "rgba(29,27,23,0.5)", justifyContent: "center", alignItems: "center", padding: 32 },
  logoutModalBox: { backgroundColor: Design.color.surface, borderRadius: 20, padding: 28, width: "100%", alignItems: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: Design.color.line },
  logoutModalIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: Design.color.surfaceMuted, justifyContent: "center", alignItems: "center", marginBottom: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: Design.color.accent },
  logoutModalTitle: { fontFamily: Design.font.bodySemibold, fontSize: 15, color: Design.color.ink, marginBottom: 12, letterSpacing: 1 },
  logoutModalDivider: { width: 32, height: 1.5, backgroundColor: Design.color.accent, marginBottom: 12 },
  logoutModalMessage: { fontFamily: Design.font.body, fontSize: 13, color: Design.color.inkSoft, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  logoutModalButtons: { flexDirection: "row", gap: 12, width: "100%" },
  logoutModalCancelBtn: { flex: 1, borderWidth: 1, borderColor: Design.color.line, borderRadius: Design.radius.small, paddingVertical: 14, alignItems: "center" },
  logoutModalCancelText: { fontFamily: Design.font.bodyBold, fontSize: 11, letterSpacing: 1.5, color: Design.color.inkMuted },
  logoutModalConfirmBtn: { flex: 1, flexDirection: "row", gap: 6, backgroundColor: Design.color.ink, borderRadius: Design.radius.small, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  logoutModalConfirmText: { fontFamily: Design.font.bodyBold, fontSize: 11, letterSpacing: 1.5, color: Design.color.surface },
});
