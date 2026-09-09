import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Design } from "../../constants/design";
import { supabase } from "../../lib/supabase";
import { goBackOr } from "../../lib/navigation";
import { AdminNavigation, ContentFrame, PageHeader } from "../../components/app-ui";
import { PressScale, Reveal } from "../../components/motion";
import { ShimmerBlock } from "../../components/skeleton";
import { getStatusBadge } from "../../constants/statuses";
import ConfirmModal from "../../components/confirm-modal";

const STATUS_OPTIONS = ["All", "Pending", "Processing", "Completed", "Cancelled"];
const MUTABLE_STATUSES = ["Pending", "Processing", "Completed", "Cancelled"];

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
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
  const [updateError, setUpdateError] = useState("");

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
    void (async () => { await fetchOrders(); })();
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
    setUpdateError("");
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
      setUpdateError("Couldn't update the status. Please try again.");
      setUpdating(false);
      return;
    }
    await logAdminAction(
      `Updated order status to ${modalStatus}`,
      `Order #${selectedOrder.id.substring(0, 8)} (${selectedOrder.profiles?.username || "Guest"})`
    );
    setSelectedOrder(null);
    setConfirmUpdateOpen(false);
    fetchOrders();
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
      <PressScale style={styles.orderCard} onPress={() => openOrderDetails(item)} accessibilityLabel={`View order ${item.id.substring(0, 8).toUpperCase()}`}>
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
            <Feather name="user" size={13} color={Design.color.inkSoft} />
            <Text style={styles.infoLabel}>CUSTOMER:</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{shippingInfo.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="credit-card" size={13} color={Design.color.inkSoft} />
            <Text style={styles.infoLabel}>PAYMENT:</Text>
            <Text style={styles.infoValue}>{getMethodLabel(item.payment_method)}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.orderCardFooter}>
          <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
          <Text style={styles.totalAmount}>₱{Number(item.total).toLocaleString()}</Text>
        </View>
      </PressScale>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <AdminNavigation active="orders" />

      {/* Header */}
      <ContentFrame>
      <View style={styles.header}>
        <PressScale onPress={() => goBackOr(router, "/(admin)/dashboard")} style={styles.backButton} accessibilityLabel="Go back">
          <Feather name="arrow-left" size={19} color={Design.color.ink} />
        </PressScale>
        <PageHeader index="03" title="Orders" subtitle="Review deliveries and update statuses." />
      </View>

      {/* Filters */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {STATUS_OPTIONS.map((status) => (
            <PressScale
              key={status}
              style={[
                styles.filterPill,
                selectedStatus === status && styles.filterPillActive,
              ]}
              onPress={() => {
                setSelectedStatus(status);
                setLoading(true);
              }}
              accessibilityLabel={`Filter by ${status}`}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === status && styles.filterTextActive,
                ]}
              >
                {status.toUpperCase()}
              </Text>
            </PressScale>
          ))}
        </ScrollView>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ShimmerBlock height={150} radius={Design.radius.card} width="100%" />
          <ShimmerBlock height={150} radius={Design.radius.card} width="100%" />
          <ShimmerBlock height={150} radius={Design.radius.card} width="100%" />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="shopping-bag" size={44} color={Design.color.line} />
          <Text style={styles.emptyText}>No orders found under &quot;{selectedStatus}&quot; status.</Text>
        </View>
      ) : (
        <Reveal key={`orders-${selectedStatus}`}>
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
        </Reveal>
      )}
      </ContentFrame>

      {/* Order Detail Modal */}
      <Modal visible={selectedOrder !== null} animationType="slide" transparent onRequestClose={() => setSelectedOrder(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedOrder && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                    <View>
                      <Text style={styles.modalTitle}>ORDER DETAILS</Text>
                      <Text style={styles.modalSub}>#{selectedOrder.id.substring(0, 8).toUpperCase()}</Text>
                    </View>
                    <PressScale style={styles.closeBtn} onPress={() => setSelectedOrder(null)} accessibilityLabel="Close order details">
                      <Feather name="x" size={18} color={Design.color.inkSoft} />
                    </PressScale>
                  </View>
                <View style={styles.accentDivider} />

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
                      <View style={styles.itemSkeleton}><ShimmerBlock width="100%" height={56} radius={Design.radius.card} /></View>
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
                      <PressScale
                        key={status}
                        style={[
                          styles.statusSelectPill,
                          modalStatus === status && styles.statusSelectPillActive,
                        ]}
                        onPress={() => setModalStatus(status)}
                        accessibilityLabel={`Set status to ${status}`}
                      >
                        <Text
                          style={[
                            styles.statusSelectText,
                            modalStatus === status && styles.statusSelectTextActive,
                          ]}
                        >
                          {status}
                        </Text>
                      </PressScale>
                    ))}
                  </View>
                  {updateError ? (
                    <Text style={{ color: Design.color.danger, fontSize: 12, marginTop: 10, lineHeight: 18 }}>{updateError}</Text>
                  ) : null}
                </View>

                {/* Modal Buttons */}
                <View style={styles.modalButtons}>
                  <PressScale style={styles.cancelBtn} onPress={() => setSelectedOrder(null)} accessibilityLabel="Cancel">
                    <Text style={styles.cancelBtnText}>CANCEL</Text>
                  </PressScale>
                  <PressScale
                    style={[styles.saveBtn, selectedOrder.status === modalStatus && styles.saveBtnDisabled]}
                    onPress={() => setConfirmUpdateOpen(true)}
                    disabled={updating || selectedOrder.status === modalStatus}
                    accessibilityLabel="Update order status"
                  >
                    <Text style={styles.saveBtnText}>
                      {updating ? "UPDATING..." : "UPDATE ORDER"}
                    </Text>
                  </PressScale>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmUpdateOpen}
        title={modalStatus === "Cancelled" ? "Cancel this order?" : "Update order status?"}
        message={`Update order ${selectedOrder ? `#${selectedOrder.id.substring(0, 8).toUpperCase()}` : ""} to "${modalStatus}"?`}
        confirmLabel={modalStatus === "Cancelled" ? "CANCEL ORDER" : "UPDATE"}
        danger={modalStatus === "Cancelled"}
        onConfirm={handleUpdateStatus}
        onCancel={() => setConfirmUpdateOpen(false)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Design.color.surface },
  loadingContainer: { alignItems: "center", flex: 1, gap: 14, padding: 24 },
  header: { alignItems: "center", flexDirection: "row", gap: 16, paddingHorizontal: 2 },
  backButton: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.small, borderWidth: StyleSheet.hairlineWidth, height: 44, justifyContent: "center", width: 44 },
  accentDivider: { height: 1.5, marginBottom: 8, marginTop: 8, width: 40, backgroundColor: Design.color.accent },
  itemSkeleton: { paddingVertical: 8 },
  filterSection: { paddingVertical: 16, backgroundColor: Design.color.surface, borderBottomWidth: 0.5, borderBottomColor: Design.color.line },
  filterScroll: { paddingHorizontal: 24, gap: 8 },
  filterPill: { backgroundColor: Design.color.surfaceMuted, borderRadius: Design.radius.small, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 0.5, borderColor: Design.color.line },
  filterPillActive: { backgroundColor: Design.color.ink, borderColor: Design.color.ink },
  filterText: { fontSize: 10, color: Design.color.inkSoft, letterSpacing: 1, fontWeight: "500" },
  filterTextActive: { color: Design.color.surface },
  listContainer: { padding: 24, paddingBottom: 100 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingVertical: 100 },
  emptyText: { fontSize: 13, color: Design.color.inkMuted, textAlign: "center" },
  orderCard: { backgroundColor: Design.color.surfaceMuted, borderRadius: Design.radius.card, padding: 16, marginBottom: 14, borderWidth: 0.5, borderColor: Design.color.line },
  orderCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderId: { fontSize: 12, fontWeight: "600", color: Design.color.ink, letterSpacing: 1 },
  orderDate: { fontSize: 10, color: Design.color.inkMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Design.radius.small },
  statusBadgeText: { fontSize: 9, fontWeight: "600", letterSpacing: 1 },
  cardDivider: { height: 0.5, backgroundColor: Design.color.line, marginVertical: 12 },
  orderCardBody: { gap: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontSize: 9, color: Design.color.inkSoft, letterSpacing: 1, width: 72 },
  infoValue: { flex: 1, fontSize: 12, color: Design.color.ink },
  orderCardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 9, color: Design.color.inkSoft, letterSpacing: 1 },
  totalAmount: { fontSize: 15, fontWeight: "600", color: Design.color.ink },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: Design.color.surface, borderTopLeftRadius: Design.radius.sheet, borderTopRightRadius: Design.radius.sheet, padding: 24, paddingBottom: 40, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  modalTitle: { fontSize: 11, letterSpacing: 3, color: Design.color.inkSoft },
  modalSub: { fontSize: 18, fontWeight: "500", color: Design.color.ink, marginTop: 2 },
  closeBtn: { width: 30, height: 30, borderRadius: Design.radius.small, backgroundColor: Design.color.surfaceMuted, justifyContent: "center", alignItems: "center" },
  section: { marginTop: 20 },
  sectionLabel: { fontSize: 9, letterSpacing: 2, color: Design.color.inkSoft, marginBottom: 10 },
  detailsCard: { backgroundColor: Design.color.surfaceMuted, borderRadius: Design.radius.card, padding: 16, borderWidth: 0.5, borderColor: Design.color.line, gap: 10 },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { fontSize: 11, color: Design.color.inkSoft },
  detailValue: { fontSize: 12, color: Design.color.ink, fontWeight: "500", flex: 1, textAlign: "right", marginLeft: 16 },
  noItemsText: { fontSize: 12, color: Design.color.inkMuted, textAlign: "center" },
  itemDivider: { height: 0.5, backgroundColor: Design.color.line, marginVertical: 10 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemName: { fontSize: 12, fontWeight: "500", color: Design.color.ink },
  itemCategory: { fontSize: 10, color: Design.color.inkMuted, marginTop: 2 },
  itemPrice: { fontSize: 12, fontWeight: "500", color: Design.color.accent },
  statusSelectRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statusSelectPill: { backgroundColor: Design.color.surfaceMuted, borderRadius: Design.radius.small, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 0.5, borderColor: Design.color.line },
  statusSelectPillActive: { backgroundColor: Design.color.ink, borderColor: Design.color.ink },
  statusSelectText: { fontSize: 11, color: Design.color.inkSoft },
  statusSelectTextActive: { color: Design.color.surface, fontWeight: "500" },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: Design.color.line, borderRadius: Design.radius.small, padding: 16, alignItems: "center" },
  cancelBtnText: { fontSize: 11, letterSpacing: 2, color: Design.color.inkMuted },
  saveBtn: { flex: 1, backgroundColor: Design.color.ink, borderRadius: Design.radius.small, padding: 16, alignItems: "center" },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 11, letterSpacing: 2, color: Design.color.surface },

});
