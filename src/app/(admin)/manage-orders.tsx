import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { fetchAllRows } from "../../lib/pagination";
import { goBackOr } from "../../lib/navigation";
import { AdminNavigation, ContentFrame, PageHeader, RetryNotice } from "../../components/app-ui";
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
  const updatePending = useRef(false);
  const [itemsError, setItemsError] = useState("");

  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const fetchOrders = useCallback(async () => {
    const request = ++listRequest.current;
    setLoading(true);
    setUpdateError("");
    try {
      const data = await fetchAllRows((from, to) => {
        let query = supabase.from("orders").select("*, profiles(*)", { count: "exact" });
        if (selectedStatus !== "All") query = query.eq("status", selectedStatus);
        return query.order("created_at", { ascending: false }).order("id").range(from, to);
      });
      if (request === listRequest.current) setOrders(data);
    } catch { if (request === listRequest.current) setUpdateError("Could not load orders. Please refresh."); }
    finally { if (request === listRequest.current) { setLoading(false); setRefreshing(false); } }
  }, [selectedStatus]);

  useEffect(() => {
    let cancelled = false;
    const tracker = listRequest;
    void Promise.resolve().then(() => { if (!cancelled) return fetchOrders(); });
    return () => { cancelled = true; tracker.current++; };
  }, [fetchOrders]);
  useEffect(() => { const tracker = detailRequest; return () => { tracker.current++; }; }, []);
  const handleRefresh = () => { setRefreshing(true); void fetchOrders(); };
  const fetchOrderItems = async (orderId: string) => {
    const request = ++detailRequest.current;
    setLoadingItems(true);
    setItemsError("");
    setOrderItems([]);
    try {
      const data = await fetchAllRows((from, to) => supabase.from("order_items").select("*, furniture(*)", { count: "exact" }).eq("order_id", orderId).order("id").range(from, to));
      if (request === detailRequest.current) setOrderItems(data);
    } catch { if (request === detailRequest.current) setItemsError("Could not load these order items. Please retry."); }
    finally { if (request === detailRequest.current) setLoadingItems(false); }
  };
  const closeOrderDetails = () => { detailRequest.current++; setSelectedOrder(null); setOrderItems([]); };
  const requestCloseOrderDetails = () => { if (!updatePending.current) closeOrderDetails(); };
  const openOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setModalStatus(order.status);
    setUpdateError("");
    void fetchOrderItems(order.id);
  };

  const logAdminAction = async (action: string, target: string) => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Activity authentication unavailable");
    const { error } = await supabase
      .from("activity_logs")
      .insert({
        admin_id: user.id,
        action,
        target_item: target,
      });
    if (error) throw error;
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || updatePending.current) return;
    updatePending.current = true;
    setUpdating(true);
    setUpdateError("");
    let statusSaved = false;
    try {
    const { data: savedOrder, error } = await supabase
      .from("orders")
      .update({ status: modalStatus })
      .eq("id", selectedOrder.id).select("id").single();

    if (error || !savedOrder?.id) throw new Error("Order update not confirmed");
    statusSaved = true;
    await logAdminAction(
      `Updated order status to ${modalStatus}`,
      `Order #${selectedOrder.id.substring(0, 8)} (${selectedOrder.profiles?.username || "Guest"})`
    );
    closeOrderDetails();
    setConfirmUpdateOpen(false);
    await fetchOrders();
    } catch {
      if (statusSaved) {
        setSelectedOrder({ ...selectedOrder, status: modalStatus });
        setConfirmUpdateOpen(false);
        setUpdateError("Order status was saved, but the activity log failed. Reopen the list to see the saved status.");
      } else setUpdateError("Couldn't confirm the status update. Please check the order and retry.");
    } finally { updatePending.current = false; setUpdating(false); }
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
        <PageHeader title="Orders" subtitle="Review deliveries and update statuses." style={{ flex: 1, minWidth: 0 }} />
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
                if (status === selectedStatus) return;
                setSelectedStatus(status);
                setLoading(true);
              }}
              accessibilityLabel={`Filter by ${status}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: selectedStatus === status }}
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
      ) : updateError && !selectedOrder ? <RetryNotice message={updateError} onRetry={handleRefresh} /> : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="shopping-bag" size={44} color={Design.color.line} />
          <Text style={styles.emptyText}>No orders found under &quot;{selectedStatus}&quot; status.</Text>
        </View>
      ) : (
        <Reveal key={`orders-${selectedStatus}`} style={{ flex: 1 }}>
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
      <AdminNavigation active="orders" placement="footer" />

      {/* Order Detail Modal */}
      <Modal visible={selectedOrder !== null} animationType="slide" transparent onRequestClose={requestCloseOrderDetails}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedOrder && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                    <View>
                      <Text style={styles.modalTitle}>ORDER DETAILS</Text>
                      <Text style={styles.modalSub}>#{selectedOrder.id.substring(0, 8).toUpperCase()}</Text>
                    </View>
                    <PressScale style={styles.closeBtn} disabled={updating} hitSlop={8} onPress={requestCloseOrderDetails} accessibilityLabel="Close order details">
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
                    ) : itemsError ? <RetryNotice message={itemsError} onRetry={() => void fetchOrderItems(selectedOrder.id)} /> : orderItems.length === 0 ? (
                      <Text style={styles.noItemsText}>No items found for this order.</Text>
                    ) : (
                      orderItems.map((item, index) => (
                        <View key={item.id}>
                          {index > 0 && <View style={styles.itemDivider} />}
                          <View style={styles.itemRow}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={styles.itemName} numberOfLines={1}>{item.furniture?.name}</Text>
                              <Text style={styles.itemCategory}>{item.furniture?.category} · Qty {item.quantity}</Text>
                              <Text style={styles.itemCategory}>Color: {item.color || "Not recorded"} · Material: {item.material || "Not recorded"}</Text>
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
                        disabled={updating}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: modalStatus === status, disabled: updating }}
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
                  <PressScale style={styles.cancelBtn} disabled={updating} onPress={requestCloseOrderDetails} accessibilityLabel="Cancel">
                    <Text style={styles.cancelBtnText}>CANCEL</Text>
                  </PressScale>
                  <PressScale
                    style={[styles.saveBtn, selectedOrder.status === modalStatus && styles.saveBtnDisabled]}
                    onPress={() => { setUpdateError(""); setConfirmUpdateOpen(true); }}
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
        pending={updating}
        error={updateError}
        onConfirm={handleUpdateStatus}
        onCancel={() => setConfirmUpdateOpen(false)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Design.color.canvas },
  loadingContainer: { alignItems: "center", flex: 1, gap: 14, padding: 24 },
  header: { alignItems: "center", flexDirection: "row", gap: 16, paddingHorizontal: 16, paddingTop: 16 },
  backButton: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.small, borderWidth: StyleSheet.hairlineWidth, height: 44, justifyContent: "center", width: 44 },
  accentDivider: { height: 1.5, marginBottom: 8, marginTop: 8, width: 40, backgroundColor: Design.color.accent },
  itemSkeleton: { paddingVertical: 8 },
  filterSection: { paddingVertical: 16, backgroundColor: Design.color.surface, borderBottomWidth: 0.5, borderBottomColor: Design.color.line },
  filterScroll: { paddingHorizontal: 24, gap: 8 },
  filterPill: { backgroundColor: Design.color.surfaceMuted, borderRadius: Design.radius.small, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 0.5, borderColor: Design.color.line },
  filterPillActive: { backgroundColor: Design.color.ink, borderColor: Design.color.ink },
  filterText: { fontSize: 10, color: Design.color.inkSoft, fontFamily: Design.font.monoMedium, letterSpacing: 1 },
  filterTextActive: { color: Design.color.surface },
  listContainer: { padding: 24 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingVertical: 100 },
  emptyText: { fontSize: 13, color: Design.color.inkMuted, textAlign: "center" },
  orderCard: { backgroundColor: Design.color.surface, borderRadius: Design.radius.card, padding: 16, marginBottom: 14, borderWidth: 0.5, borderColor: Design.color.line, ...Design.shadow.card },
  orderCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderId: { fontSize: 12, fontFamily: Design.font.monoBold, color: Design.color.ink, letterSpacing: 0.6 },
  orderDate: { fontSize: 10, fontFamily: Design.font.mono, color: Design.color.inkMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Design.radius.small },
  statusBadgeText: { fontSize: 9, fontFamily: Design.font.monoMedium, letterSpacing: 1 },
  cardDivider: { height: 0.5, backgroundColor: Design.color.line, marginVertical: 12 },
  orderCardBody: { gap: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontSize: 9, fontFamily: Design.font.monoMedium, color: Design.color.inkSoft, letterSpacing: 1, width: 72 },
  infoValue: { flex: 1, fontSize: 12, fontFamily: Design.font.monoMedium, color: Design.color.ink },
  orderCardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 9, fontFamily: Design.font.monoMedium, color: Design.color.inkSoft, letterSpacing: 1 },
  totalAmount: { fontSize: 15, fontWeight: "600", fontFamily: Design.font.monoBold, color: Design.color.ink },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: Design.color.surface, borderTopLeftRadius: Design.radius.sheet, borderTopRightRadius: Design.radius.sheet, padding: 24, paddingBottom: 40, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  modalTitle: { fontSize: 11, fontFamily: Design.font.monoMedium, letterSpacing: 3, color: Design.color.inkSoft },
  modalSub: { fontSize: 18, fontFamily: Design.font.monoBold, color: Design.color.ink, marginTop: 2 },
  closeBtn: { width: 44, height: 44, borderRadius: Design.radius.small, backgroundColor: Design.color.surfaceMuted, justifyContent: "center", alignItems: "center" },
  section: { marginTop: 20 },
  sectionLabel: { fontSize: 9, fontFamily: Design.font.monoMedium, letterSpacing: 2, color: Design.color.inkSoft, marginBottom: 10 },
  detailsCard: { backgroundColor: Design.color.surfaceMuted, borderRadius: Design.radius.card, padding: 16, borderWidth: 0.5, borderColor: Design.color.line, gap: 10 },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { fontSize: 11, fontFamily: Design.font.monoMedium, color: Design.color.inkSoft },
  detailValue: { fontSize: 12, color: Design.color.ink, fontWeight: "500", flex: 1, textAlign: "right", marginLeft: 16 },
  noItemsText: { fontSize: 12, color: Design.color.inkMuted, textAlign: "center" },
  itemDivider: { height: 0.5, backgroundColor: Design.color.line, marginVertical: 10 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemName: { fontSize: 12, fontWeight: "500", color: Design.color.ink },
  itemCategory: { fontSize: 10, fontFamily: Design.font.monoMedium, color: Design.color.inkMuted, marginTop: 2 },
  itemPrice: { fontSize: 12, fontWeight: "500", fontFamily: Design.font.monoBold, color: Design.color.accent },
  statusSelectRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statusSelectPill: { backgroundColor: Design.color.surfaceMuted, borderRadius: Design.radius.small, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 0.5, borderColor: Design.color.line },
  statusSelectPillActive: { backgroundColor: Design.color.ink, borderColor: Design.color.ink },
  statusSelectText: { fontSize: 11, fontFamily: Design.font.monoMedium, color: Design.color.inkSoft },
  statusSelectTextActive: { color: Design.color.surface },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: Design.color.line, borderRadius: Design.radius.small, padding: 16, alignItems: "center" },
  cancelBtnText: { fontSize: 11, fontFamily: Design.font.monoMedium, letterSpacing: 2, color: Design.color.inkMuted },
  saveBtn: { flex: 1, backgroundColor: Design.color.ink, borderRadius: Design.radius.small, padding: 16, alignItems: "center" },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 11, fontFamily: Design.font.monoMedium, letterSpacing: 2, color: Design.color.surface },

});
