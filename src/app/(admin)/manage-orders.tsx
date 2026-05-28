import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const STATUS_OPTIONS = ["All", "Pending", "Processing", "Completed", "Cancelled"];
const MUTABLE_STATUSES = ["Pending", "Processing", "Completed", "Cancelled"];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Pending":
      return { color: "#C9A96E", bg: "#FDF9F0", label: "PENDING" };
    case "Processing":
      return { color: "#8B7355", bg: "#EDE5D8", label: "PROCESSING" };
    case "Completed":
      return { color: "#3B6D11", bg: "#EAF3DE", label: "COMPLETED" };
    case "Cancelled":
      return { color: "#A32D2D", bg: "#FCEBEB", label: "CANCELLED" };
    default:
      return { color: "#8B7355", bg: "#EDE5D8", label: "ORDER" };
  }
};

const getMethodLabel = (method: string) => {
  switch (method) {
    case "cod": return "Cash on Delivery";
    case "gcash": return "GCash Wallet";
    case "maya": return "Maya Wallet";
    case "card": return "Credit/Debit Card";
    default: return method;
  }
};

export default function ManageOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal Detail States
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [modalStatus, setModalStatus] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchOrders = useCallback(async () => {
    let query = supabase
      .from("orders")
      .select("*, profiles(*)")
      .order("created_at", { ascending: false });

    if (selectedStatus !== "All") {
      query = query.eq("status", selectedStatus);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching orders:", error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
    setRefreshing(false);
  }, [selectedStatus]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const fetchOrderItems = async (orderId: string) => {
    setLoadingItems(true);
    const { data, error } = await supabase
      .from("order_items")
      .select("*, furniture(*)")
      .eq("order_id", orderId);

    if (error) {
      console.error("Error fetching order items:", error);
      setOrderItems([]);
    } else {
      setOrderItems(data || []);
    }
    setLoadingItems(false);
  };

  const openOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setModalStatus(order.status);
    fetchOrderItems(order.id);
  };

  const logAdminAction = async (action: string, target: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("activity_logs")
      .insert({
        admin_id: user.id,
        action,
        target_item: target,
      });
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder) return;
    setUpdating(true);

    const { error } = await supabase
      .from("orders")
      .update({ status: modalStatus })
      .eq("id", selectedOrder.id);

    if (error) {
      console.error("Error updating status:", error);
      Alert.alert("Error", "Failed to update order status. Please try again.");
    } else {
      await logAdminAction(
        `Updated order status to ${modalStatus}`,
        `Order #${selectedOrder.id.substring(0, 8)} (${selectedOrder.profiles?.username || "Guest"})`
      );
      Alert.alert("Success", "Order status updated successfully.");
      setSelectedOrder(null);
      fetchOrders();
    }
    setUpdating(false);
  };

  const parseAddress = (addressStr: string) => {
    if (!addressStr) return { name: "—", mobile: "—", city: "—", address: "—", notes: "—" };
    const parts = addressStr.split(" | ");
    const result: any = {};
    parts.forEach((part) => {
      const match = part.split(": ");
      if (match.length >= 2) {
        const key = match[0].trim().toLowerCase();
        const val = match.slice(1).join(": ").trim();
        if (key === "name") result.name = val;
        else if (key === "mobile") result.mobile = val;
        else if (key === "city") result.city = val;
        else if (key === "address") result.address = val;
        else if (key === "notes") result.notes = val;
      }
    });
    return {
      name: result.name || "—",
      mobile: result.mobile || "—",
      city: result.city || "—",
      address: result.address || "—",
      notes: result.notes || "—",
    };
  };

  const renderOrderItem = ({ item }: { item: any }) => {
    const shippingInfo = parseAddress(item.address);
    const badge = getStatusBadge(item.status);
    return (
      <TouchableOpacity style={styles.orderCard} onPress={() => openOrderDetails(item)}>
        <View style={styles.orderCardHeader}>
          <View>
            <Text style={styles.orderId}>ORDER #{item.id.substring(0, 8).toUpperCase()}</Text>
            <Text style={styles.orderDate}>{new Date(item.created_at).toLocaleString()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.orderCardBody}>
          <View style={styles.infoRow}>
            <Feather name="user" size={13} color="#8B7355" />
            <Text style={styles.infoLabel}>CUSTOMER:</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{shippingInfo.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="credit-card" size={13} color="#8B7355" />
            <Text style={styles.infoLabel}>PAYMENT:</Text>
            <Text style={styles.infoValue}>{getMethodLabel(item.payment_method)}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.orderCardFooter}>
          <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
          <Text style={styles.totalAmount}>₱{Number(item.total).toLocaleString()}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#1C1C1A" />
        </TouchableOpacity>
        <View style={{ marginTop: 20 }}>
          <Text style={styles.headerSmall}>MANAGEMENT</Text>
          <Text style={styles.headerLarge}>Orders</Text>
          <View style={styles.goldDivider} />
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {STATUS_OPTIONS.map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterPill,
                selectedStatus === status && styles.filterPillActive,
              ]}
              onPress={() => {
                setSelectedStatus(status);
                setLoading(true);
              }}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === status && styles.filterTextActive,
                ]}
              >
                {status.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#C9A96E" size="large" />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="shopping-bag" size={44} color="#E8E0D0" />
          <Text style={styles.emptyText}>No orders found under "{selectedStatus}" status.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}

      {/* Order Detail Modal */}
      <Modal visible={selectedOrder !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedOrder && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>ORDER DETAILS</Text>
                    <Text style={styles.modalSub}>#{selectedOrder.id.substring(0, 8).toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedOrder(null)}>
                    <Feather name="x" size={18} color="#8B7355" />
                  </TouchableOpacity>
                </View>
                <View style={styles.goldDivider} />

                {/* Customer Address Details */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>SHIPPING DETAILS</Text>
                  <View style={styles.detailsCard}>
                    {(() => {
                      const details = parseAddress(selectedOrder.address);
                      return (
                        <>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Recipient</Text>
                            <Text style={styles.detailValue}>{details.name}</Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Contact</Text>
                            <Text style={styles.detailValue}>{details.mobile}</Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>City</Text>
                            <Text style={styles.detailValue}>{details.city}</Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Address</Text>
                            <Text style={styles.detailValue}>{details.address}</Text>
                          </View>
                          {details.notes !== "—" && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Notes</Text>
                              <Text style={styles.detailValue}>{details.notes}</Text>
                            </View>
                          )}
                        </>
                      );
                    })()}
                  </View>
                </View>

                {/* Order Items */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>ITEMS ORDERED</Text>
                  <View style={styles.detailsCard}>
                    {loadingItems ? (
                      <ActivityIndicator color="#C9A96E" style={{ paddingVertical: 12 }} />
                    ) : orderItems.length === 0 ? (
                      <Text style={styles.noItemsText}>No items found for this order.</Text>
                    ) : (
                      orderItems.map((item, index) => (
                        <View key={item.id}>
                          {index > 0 && <View style={styles.itemDivider} />}
                          <View style={styles.itemRow}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={styles.itemName} numberOfLines={1}>{item.furniture?.name}</Text>
                              <Text style={styles.itemCategory}>{item.furniture?.category} · Qty {item.quantity}</Text>
                            </View>
                            <Text style={styles.itemPrice}>₱{(Number(item.price) * item.quantity).toLocaleString()}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </View>

                {/* Status modifier */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>UPDATE STATUS</Text>
                  <View style={styles.statusSelectRow}>
                    {MUTABLE_STATUSES.map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusSelectPill,
                          modalStatus === status && styles.statusSelectPillActive,
                        ]}
                        onPress={() => setModalStatus(status)}
                      >
                        <Text
                          style={[
                            styles.statusSelectText,
                            modalStatus === status && styles.statusSelectTextActive,
                          ]}
                        >
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Modal Buttons */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedOrder(null)}>
                    <Text style={styles.cancelBtnText}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, selectedOrder.status === modalStatus && styles.saveBtnDisabled]}
                    onPress={handleUpdateStatus}
                    disabled={updating || selectedOrder.status === modalStatus}
                  >
                    <Text style={styles.saveBtnText}>
                      {updating ? "UPDATING..." : "UPDATE ORDER"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/(admin)/dashboard")}>
          <Feather name="home" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>DASHBOARD</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/(admin)/manage-furniture")}>
          <Feather name="grid" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>FURNITURE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Feather name="clipboard" size={20} color="#1C1C1A" />
          <View style={styles.navDot} />
          <Text style={styles.navLabelActive}>ORDERS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/(admin)/profile")}>
          <Feather name="user" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>PROFILE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF8" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: "#F5F0E8", padding: 28, paddingTop: 56, paddingBottom: 28 },
  headerSmall: { fontSize: 10, letterSpacing: 4, color: "#8B7355" },
  headerLarge: { fontSize: 36, fontWeight: "300", color: "#1C1C1A", letterSpacing: 2, marginBottom: 16 },
  goldDivider: { width: 40, height: 1.5, backgroundColor: "#C9A96E", marginBottom: 16 },
  filterSection: { paddingVertical: 16, backgroundColor: "#FAFAF8", borderBottomWidth: 0.5, borderBottomColor: "#E8E0D0" },
  filterScroll: { paddingHorizontal: 24, gap: 8 },
  filterPill: { backgroundColor: "#F5F0E8", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 0.5, borderColor: "#E8E0D0" },
  filterPillActive: { backgroundColor: "#1C1C1A", borderColor: "#1C1C1A" },
  filterText: { fontSize: 10, color: "#8B7355", letterSpacing: 1, fontWeight: "500" },
  filterTextActive: { color: "#FAFAF8" },
  listContainer: { padding: 24, paddingBottom: 100 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingVertical: 100 },
  emptyText: { fontSize: 13, color: "#9E8E7E", textAlign: "center" },
  orderCard: { backgroundColor: "#F5F0E8", borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 0.5, borderColor: "#E8E0D0" },
  orderCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderId: { fontSize: 12, fontWeight: "600", color: "#1C1C1A", letterSpacing: 1 },
  orderDate: { fontSize: 10, color: "#9E8E7E", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 9, fontWeight: "600", letterSpacing: 1 },
  cardDivider: { height: 0.5, backgroundColor: "#E8E0D0", marginVertical: 12 },
  orderCardBody: { gap: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontSize: 9, color: "#8B7355", letterSpacing: 1, width: 72 },
  infoValue: { flex: 1, fontSize: 12, color: "#1C1C1A" },
  orderCardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 9, color: "#8B7355", letterSpacing: 1 },
  totalAmount: { fontSize: 15, fontWeight: "600", color: "#1C1C1A" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FAFAF8", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  modalTitle: { fontSize: 11, letterSpacing: 3, color: "#8B7355" },
  modalSub: { fontSize: 18, fontWeight: "500", color: "#1C1C1A", marginTop: 2 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#EDE5D8", justifyContent: "center", alignItems: "center" },
  section: { marginTop: 20 },
  sectionLabel: { fontSize: 9, letterSpacing: 2, color: "#8B7355", marginBottom: 10 },
  detailsCard: { backgroundColor: "#F5F0E8", borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: "#E8E0D0", gap: 10 },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { fontSize: 11, color: "#8B7355" },
  detailValue: { fontSize: 12, color: "#1C1C1A", fontWeight: "500", flex: 1, textAlign: "right", marginLeft: 16 },
  noItemsText: { fontSize: 12, color: "#9E8E7E", textAlign: "center" },
  itemDivider: { height: 0.5, backgroundColor: "#E8E0D0", marginVertical: 10 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemName: { fontSize: 12, fontWeight: "500", color: "#1C1C1A" },
  itemCategory: { fontSize: 10, color: "#9E8E7E", marginTop: 2 },
  itemPrice: { fontSize: 12, fontWeight: "500", color: "#C9A96E" },
  statusSelectRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statusSelectPill: { backgroundColor: "#F5F0E8", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 0.5, borderColor: "#E8E0D0" },
  statusSelectPillActive: { backgroundColor: "#1C1C1A", borderColor: "#1C1C1A" },
  statusSelectText: { fontSize: 11, color: "#8B7355" },
  statusSelectTextActive: { color: "#FAFAF8", fontWeight: "500" },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: "#E8E0D0", borderRadius: 10, padding: 16, alignItems: "center" },
  cancelBtnText: { fontSize: 11, letterSpacing: 2, color: "#9E8E7E" },
  saveBtn: { flex: 1, backgroundColor: "#1C1C1A", borderRadius: 10, padding: 16, alignItems: "center" },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 11, letterSpacing: 2, color: "#FAFAF8" },
  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FAFAF8", borderTopWidth: 0.5, borderTopColor: "#E8E0D0", flexDirection: "row", justifyContent: "space-around", paddingVertical: 12, paddingBottom: 24 },
  navItem: { alignItems: "center", gap: 3 },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#C9A96E" },
  navLabel: { fontSize: 8, color: "#C4B8A8", letterSpacing: 1 },
  navLabelActive: { fontSize: 8, color: "#1C1C1A", letterSpacing: 1 },
});
