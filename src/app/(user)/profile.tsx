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

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Pending": return { color: "#C9A96E", bg: "#FDF9F0", label: "PENDING" };
    case "Processing": return { color: "#8B7355", bg: "#EDE5D8", label: "PROCESSING" };
    case "Completed": return { color: "#3B6D11", bg: "#EAF3DE", label: "COMPLETED" };
    case "Cancelled": return { color: "#A32D2D", bg: "#FCEBEB", label: "CANCELLED" };
    default: return { color: "#8B7355", bg: "#EDE5D8", label: "ORDER" };
  }
};

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
    fetchProfile();
    fetchOrders();
  }, [fetchProfile, fetchOrders]);

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
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("profiles")
      .update({ username, address, mobile_number: mobile })
      .eq("id", user!.id);
    setSaving(false);
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
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
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

        {/* MY ORDERS */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MY ORDERS</Text>
          {loadingOrders ? (
            <ActivityIndicator color="#C9A96E" style={{ marginTop: 12 }} />
          ) : orders.length === 0 ? (
            <View style={styles.emptyOrders}>
              <Feather name="shopping-bag" size={32} color="#E8E0D0" />
              <Text style={styles.emptyOrdersText}>No orders yet</Text>
            </View>
          ) : (
            orders.map((order) => {
              const badge = getStatusBadge(order.status);
              return (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() => openOrder(order)}
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
                    <Feather name="chevron-right" size={14} color="#C9A96E" style={{ marginTop: 8 }} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Personal Info */}
        <View style={styles.section}>
          <View style={styles.infoHeader}>
            <Text style={styles.sectionLabel}>PERSONAL INFO</Text>
            <TouchableOpacity style={styles.editToggle} onPress={() => setEditing(!editing)}>
              <Feather name={editing ? "x" : "edit-2"} size={13} color="#C9A96E" />
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
                <TextInput style={styles.infoInput} value={username} onChangeText={setUsername} placeholder="Your name" placeholderTextColor="#C4B8A8" />
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
                <TextInput style={styles.infoInput} value={mobile} onChangeText={setMobile} placeholder="+63 XXX XXX XXXX" placeholderTextColor="#C4B8A8" keyboardType="phone-pad" />
              ) : (
                <Text style={styles.infoValue}>{profile?.mobile_number || "—"}</Text>
              )}
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoLabelRow}>
                <Feather name="map-pin" size={13} color="#8B7355" />
                <Text style={styles.infoLabel}>ADDRESS</Text>
              </View>
              {editing ? (
                <TextInput style={styles.infoInput} value={address} onChangeText={setAddress} placeholder="Your address" placeholderTextColor="#C4B8A8" />
              ) : (
                <Text style={styles.infoValue}>{profile?.address || "—"}</Text>
              )}
            </View>
          </View>

          {editing && (
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <Feather name="check" size={15} color="#FAFAF8" />
              <Text style={styles.saveBtnText}>{saving ? "SAVING..." : "SAVE CHANGES"}</Text>
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

      {/* Order Detail Modal */}
      <Modal visible={selectedOrder !== null} animationType="slide" transparent>
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
                    <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedOrder(null)}>
                      <Feather name="x" size={18} color="#8B7355" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.goldDivider} />

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
                      <ActivityIndicator color="#C9A96E" style={{ paddingVertical: 12 }} />
                    ) : orderItems.length === 0 ? (
                      <Text style={styles.noItemsText}>No items found.</Text>
                    ) : (
                      orderItems.map((item, index) => (
                        <View key={item.id}>
                          {index > 0 && <View style={styles.itemDivider} />}
                          <View style={styles.itemRow}>
                            <View style={styles.itemImageWrap}>
                              {item.furniture?.image_url ? (
                                <Image source={{ uri: item.furniture.image_url }} style={styles.itemImage} resizeMode="cover" />
                              ) : (
                                <Feather name="box" size={20} color="#8B7355" />
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

      {/* Logout Confirmation Modal */}
      <Modal visible={logoutModalVisible} transparent animationType="fade">
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalBox}>
            <View style={styles.logoutModalIcon}>
              <Feather name="log-out" size={24} color="#8B7355" />
            </View>
            <Text style={styles.logoutModalTitle}>Sign Out</Text>
            <View style={styles.logoutModalDivider} />
            <Text style={styles.logoutModalMessage}>
              Are you sure you want to sign out of your account?
            </Text>
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity
                style={styles.logoutModalCancelBtn}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.logoutModalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutModalConfirmBtn}
                onPress={confirmLogout}
              >
                <Feather name="log-out" size={13} color="#FAFAF8" />
                <Text style={styles.logoutModalConfirmText}>SIGN OUT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/(user)/image-placement")}>
          <Feather name="image" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>PLACE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/(user)/cart")}>
          <Feather name="shopping-cart" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>CART</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Feather name="user" size={20} color="#1C1C1A" />
          <View style={styles.navDot} />
          <Text style={styles.navLabelActive}>PROFILE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF8" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FAFAF8" },
  header: { backgroundColor: "#F5F0E8", padding: 28, paddingTop: 56, paddingBottom: 28 },
  headerSmall: { fontSize: 10, letterSpacing: 4, color: "#8B7355" },
  headerLarge: { fontSize: 36, fontWeight: "300", color: "#1C1C1A", letterSpacing: 2, marginBottom: 16 },
  goldDivider: { width: 40, height: 1.5, backgroundColor: "#C9A96E", marginBottom: 8 },
  avatarSection: { alignItems: "center", paddingVertical: 28 },
  avatarWrapper: { position: "relative", marginBottom: 8 },
  avatarImage: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: "#C9A96E" },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#EDE5D8", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#C9A96E" },
  avatarText: { fontSize: 32, fontWeight: "500", color: "#8B7355" },
  avatarEditBadge: { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: "#1C1C1A", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#FAFAF8" },
  avatarHint: { fontSize: 10, color: "#C4B8A8", letterSpacing: 1, marginBottom: 10 },
  avatarName: { fontSize: 18, fontWeight: "500", color: "#1C1C1A", marginBottom: 4 },
  avatarEmail: { fontSize: 12, color: "#9E8E7E" },

  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionLabel: { fontSize: 10, letterSpacing: 2, color: "#8B7355", marginBottom: 12 },

  emptyOrders: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyOrdersText: { fontSize: 13, color: "#9E8E7E" },

  orderCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F5F0E8", borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 0.5, borderColor: "#E8E0D0" },
  orderCardLeft: { flex: 1 },
  orderCardRight: { alignItems: "flex-end" },
  orderId: { fontSize: 11, fontWeight: "600", color: "#1C1C1A", letterSpacing: 1, marginBottom: 4 },
  orderDate: { fontSize: 11, color: "#9E8E7E", marginBottom: 6 },
  orderTotal: { fontSize: 15, color: "#C9A96E", fontWeight: "500" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: "600", letterSpacing: 1 },

  infoHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  editToggle: { flexDirection: "row", alignItems: "center", gap: 5 },
  editBtn: { fontSize: 10, letterSpacing: 2, color: "#C9A96E" },
  infoCard: { backgroundColor: "#F5F0E8", borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: "#E8E0D0" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  infoLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoLabel: { fontSize: 10, letterSpacing: 1, color: "#8B7355" },
  infoValue: { fontSize: 13, color: "#1C1C1A" },
  infoInput: { fontSize: 13, color: "#1C1C1A", borderBottomWidth: 1, borderBottomColor: "#C9A96E", paddingVertical: 4, minWidth: 160, textAlign: "right" },
  infoDivider: { height: 0.5, backgroundColor: "#E8E0D0" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1C1C1A", borderRadius: 10, padding: 16, marginTop: 16 },
  saveBtnText: { color: "#FAFAF8", fontSize: 11, letterSpacing: 2 },

  logoutSection: { paddingHorizontal: 24 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#E8E0D0", borderRadius: 10, padding: 16 },
  logoutText: { fontSize: 11, letterSpacing: 2, color: "#9E8E7E" },

  // Order detail modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FAFAF8", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  modalTitle: { fontSize: 11, letterSpacing: 3, color: "#8B7355" },
  modalSub: { fontSize: 18, fontWeight: "500", color: "#1C1C1A", marginTop: 2 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#EDE5D8", justifyContent: "center", alignItems: "center" },
  modalInfoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 16 },
  modalDate: { fontSize: 12, color: "#9E8E7E" },
  modalSectionLabel: { fontSize: 9, letterSpacing: 2, color: "#8B7355", marginBottom: 10 },
  modalCard: { backgroundColor: "#F5F0E8", borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: "#E8E0D0", marginBottom: 16 },
  itemDivider: { height: 0.5, backgroundColor: "#E8E0D0", marginVertical: 10 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  itemImageWrap: { width: 48, height: 48, borderRadius: 8, backgroundColor: "#EDE5D8", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  itemImage: { width: 48, height: 48 },
  itemName: { fontSize: 13, fontWeight: "500", color: "#1C1C1A", marginBottom: 2 },
  itemMeta: { fontSize: 11, color: "#9E8E7E" },
  itemPrice: { fontSize: 13, color: "#C9A96E", fontWeight: "500" },
  noItemsText: { fontSize: 12, color: "#9E8E7E", textAlign: "center" },
  modalTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 },
  modalTotalLabel: { fontSize: 10, letterSpacing: 2, color: "#8B7355" },
  modalTotalAmt: { fontSize: 20, fontWeight: "500", color: "#1C1C1A" },

  // Logout modal
  logoutModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 32 },
  logoutModalBox: { backgroundColor: "#FAFAF8", borderRadius: 20, padding: 28, width: "100%", alignItems: "center", borderWidth: 0.5, borderColor: "#E8E0D0" },
  logoutModalIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#EDE5D8", justifyContent: "center", alignItems: "center", marginBottom: 16, borderWidth: 0.5, borderColor: "#C9A96E" },
  logoutModalTitle: { fontSize: 16, fontWeight: "500", color: "#1C1C1A", marginBottom: 12, letterSpacing: 1 },
  logoutModalDivider: { width: 32, height: 1.5, backgroundColor: "#C9A96E", marginBottom: 12 },
  logoutModalMessage: { fontSize: 13, color: "#6B5E4E", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  logoutModalButtons: { flexDirection: "row", gap: 12, width: "100%" },
  logoutModalCancelBtn: { flex: 1, borderWidth: 1, borderColor: "#E8E0D0", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  logoutModalCancelText: { fontSize: 11, letterSpacing: 2, color: "#9E8E7E" },
  logoutModalConfirmBtn: { flex: 1, flexDirection: "row", gap: 6, backgroundColor: "#1C1C1A", borderRadius: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  logoutModalConfirmText: { fontSize: 11, letterSpacing: 2, color: "#FAFAF8" },

  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FAFAF8", borderTopWidth: 0.5, borderTopColor: "#E8E0D0", flexDirection: "row", justifyContent: "space-around", paddingVertical: 12, paddingBottom: 24 },
  navItem: { alignItems: "center", gap: 3 },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#C9A96E" },
  navLabel: { fontSize: 8, color: "#C4B8A8", letterSpacing: 1 },
  navLabelActive: { fontSize: 8, color: "#1C1C1A", letterSpacing: 1 },
});
