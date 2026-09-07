import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { AdminNavigation, ContentFrame, PageHeader, PrimaryButton } from "../../components/app-ui";
import { Design, layout } from "../../constants/design";
import { supabase } from "../../lib/supabase";

export default function Dashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = Platform.OS === "web" && width >= layout.desktopBreakpoint;
  const narrow = width < layout.narrowBreakpoint;
  const [stats, setStats] = useState({ furniture: 0, users: 0, logs: 0, orders: 0, revenue: 0, pending: 0 });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("Admin");

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) { const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single(); setUsername(profile?.username || "Admin"); }
    const [{ count: furniture }, { count: users }, { count: logs }, { count: orders }, { count: pending }, { data: totals }, { data: recent }] = await Promise.all([
      supabase.from("furniture").select("*", { count: "exact", head: true }).eq("is_deleted", false),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "user"),
      supabase.from("activity_logs").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }).neq("status", "Cancelled"),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "Pending"),
      supabase.from("orders").select("total").neq("status", "Cancelled"),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(5),
    ]);
    setStats({ furniture: furniture || 0, users: users || 0, logs: logs || 0, orders: orders || 0, revenue: (totals || []).reduce((sum, order) => sum + Number(order.total || 0), 0), pending: pending || 0 });
    setRecentLogs(recent || []); setLoading(false);
  };
  const badge = (action: string) => action.includes("Deleted") ? { label: "Deleted", color: Design.color.danger } : action.includes("Added") ? { label: "Added", color: Design.color.success } : { label: "Updated", color: Design.color.gold };
  const logRoute = (log: any) => (log.action || "").toLowerCase().includes("furniture") ? "/(admin)/manage-furniture" : "/(admin)/manage-orders";
  const isEmpty = stats.furniture === 0;

  return (
    <View style={styles.screen}><StatusBar barStyle="dark-content" /><AdminNavigation active="dashboard" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}><ContentFrame style={styles.frame}>
        <PageHeader title="Operations, at a glance." subtitle={`Welcome back, ${username}. Keep the collection and orders moving.`} right={<Pressable onPress={() => router.push("/(admin)/profile")} style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}><Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text></Pressable>} />
        {loading ? <ActivityIndicator color={Design.color.gold} style={styles.loading} /> : isEmpty ? <View style={styles.welcome}><View style={styles.welcomeIcon}><Feather name="package" size={26} color={Design.color.gold} /></View><Text style={styles.welcomeTitle}>Your dashboard is ready.</Text><Text style={styles.welcomeSubtitle}>Add your first piece of furniture to start tracking orders, revenue, and activity.</Text><PrimaryButton label="Add your first piece" onPress={() => router.push("/(admin)/manage-furniture")} style={styles.welcomeCta} /></View> : <>
          <View style={[styles.metrics, wide && styles.metricsWide, narrow && styles.metricsNarrow]}><Metric narrow={narrow} icon="dollar-sign" label="Revenue" value={`₱${stats.revenue.toLocaleString()}`} feature /><Metric narrow={narrow} icon="shopping-bag" label="Active orders" value={stats.orders.toString()} /><Metric narrow={narrow} icon="box" label="Collection" value={stats.furniture.toString()} /><Metric narrow={narrow} icon="users" label="Customers" value={stats.users.toString()} /></View>
          <View style={[styles.workspace, wide && styles.workspaceWide]}>
            <View style={[styles.activity, wide && styles.activityWide]}><View style={styles.sectionTop}><Text style={styles.sectionTitle}>Recent activity</Text><Pressable onPress={() => router.push("/(admin)/activity-logs")}><Text style={styles.textLink}>View all</Text></Pressable></View>
              {recentLogs.length === 0 ? <Text style={styles.empty}>No activity has been recorded yet.</Text> : recentLogs.map((log) => { const state = badge(log.action); return <Pressable key={log.id} onPress={() => router.push(logRoute(log))} style={({ pressed }) => [styles.log, pressed && styles.pressed]}><View style={[styles.logMarker, { backgroundColor: state.color }]} /><View style={styles.logCopy}><Text style={styles.logTitle}>{log.target_item || state.label}</Text><Text style={styles.logMeta}>{state.label} · {new Date(log.created_at).toLocaleString()}</Text></View><Feather name="chevron-right" size={17} color={Design.color.inkMuted} /></Pressable>; })}
            </View>
            <View style={[styles.actions, wide && styles.actionsWide]}><Text style={styles.sectionTitle}>Keep moving</Text><Action icon="package" title="Manage collection" description="Add, update, and retire furniture." badge={`${stats.furniture} items`} onPress={() => router.push("/(admin)/manage-furniture")} /><Action icon="shopping-bag" title="Review orders" description="Check delivery details and order status." badge={`${stats.pending} pending`} onPress={() => router.push("/(admin)/manage-orders")} /><Action icon="activity" title="Activity history" description={`${stats.logs} recorded actions.`} onPress={() => router.push("/(admin)/activity-logs")} /></View>
          </View>
        </>}
      </ContentFrame></ScrollView>
    </View>
  );
}

function Metric({ icon, label, value, feature = false, narrow = false }: { icon: React.ComponentProps<typeof Feather>["name"]; label: string; value: string; feature?: boolean; narrow?: boolean }) { return <View style={[styles.metric, feature && styles.metricFeature, narrow && styles.metricNarrow]}><Feather name={icon} size={17} color={feature ? Design.color.gold : Design.color.inkMuted} style={styles.metricIcon} /><Text style={[styles.metricValue, feature && styles.metricValueFeature]}>{value}</Text><Text style={[styles.metricLabel, feature && styles.metricLabelFeature]}>{label}</Text></View>; }
function Action({ icon, title, description, badge, onPress }: { icon: React.ComponentProps<typeof Feather>["name"]; title: string; description: string; badge?: string; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]}><View style={styles.actionIcon}><Feather name={icon} size={17} color={Design.color.gold} /></View><View style={styles.actionCopy}><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionDescription}>{description}</Text></View>{badge ? <View style={styles.actionBadge}><Text style={styles.actionBadgeText}>{badge}</Text></View> : null}<Feather name="arrow-up-right" size={16} color={Design.color.inkMuted} /></Pressable>; }

const styles = StyleSheet.create({
  screen: { backgroundColor: Design.color.canvas, flex: 1 }, scroll: { paddingBottom: 112 }, frame: { paddingHorizontal: 20, paddingTop: 30 }, avatar: { alignItems: "center", backgroundColor: Design.color.ink, borderRadius: 22, height: 44, justifyContent: "center", width: 44 }, avatarText: { color: Design.color.surface, fontFamily: Design.font.bodyBold, fontSize: 14 }, loading: { marginTop: 72 }, metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 28 }, metricsWide: { gap: 16 }, metricsNarrow: { gap: 10 }, metric: { backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, flexGrow: 1, minWidth: "45%", padding: 18, paddingRight: 44 }, metricNarrow: { minWidth: "100%" }, metricFeature: { backgroundColor: Design.color.ink, minWidth: "100%", paddingRight: 44 }, metricIcon: { position: "absolute", right: 18, top: 18 }, metricValue: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 38, letterSpacing: -1.2 }, metricValueFeature: { color: Design.color.surface, fontSize: 44 }, metricLabel: { color: Design.color.inkMuted, fontFamily: Design.font.bodySemibold, fontSize: 10, letterSpacing: 0.8, marginTop: 6, textTransform: "uppercase" }, metricLabelFeature: { color: Design.color.goldSoft }, workspace: { gap: 18 }, workspaceWide: { alignItems: "flex-start", flexDirection: "row", gap: 20 }, activity: { backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, flex: 1, padding: 18, width: "100%" }, actions: { backgroundColor: Design.color.surfaceMuted, borderRadius: Design.radius.card, gap: 10, padding: 18, width: "100%" }, activityWide: { minWidth: 280, width: "auto" }, actionsWide: { flex: 1, width: "auto" }, sectionTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }, sectionTitle: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 30, letterSpacing: -0.8 }, textLink: { color: Design.color.gold, fontFamily: Design.font.bodyBold, fontSize: 11 }, log: { alignItems: "center", borderTopColor: Design.color.line, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 10, minHeight: 62 }, logMarker: { borderRadius: 4, height: 8, width: 8 }, logCopy: { flex: 1 }, logTitle: { color: Design.color.ink, fontFamily: Design.font.bodySemibold, fontSize: 13 }, logMeta: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 10, marginTop: 4 }, empty: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 12, paddingVertical: 18 }, action: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.small, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 12, minHeight: 72, padding: 12 }, actionIcon: { alignItems: "center", backgroundColor: Design.color.surfaceMuted, borderRadius: 16, height: 34, justifyContent: "center", width: 34 }, actionCopy: { flex: 1 }, actionTitle: { color: Design.color.ink, fontFamily: Design.font.bodyBold, fontSize: 12 }, actionDescription: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 10, lineHeight: 15, marginTop: 3 }, actionBadge: { backgroundColor: Design.color.goldSoft, borderRadius: Design.radius.pill, paddingHorizontal: 10, paddingVertical: 5 }, actionBadgeText: { color: Design.color.ink, fontFamily: Design.font.bodyBold, fontSize: 10, letterSpacing: 0.3 }, welcome: { alignItems: "center", backgroundColor: Design.color.surface, borderColor: Design.color.line, borderRadius: Design.radius.card, borderWidth: StyleSheet.hairlineWidth, padding: 32 }, welcomeIcon: { alignItems: "center", backgroundColor: Design.color.surfaceMuted, borderRadius: 24, height: 48, justifyContent: "center", marginBottom: 14, width: 48 }, welcomeTitle: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 30, letterSpacing: -0.8 }, welcomeSubtitle: { color: Design.color.inkMuted, fontFamily: Design.font.body, fontSize: 13, lineHeight: 21, marginTop: 6, maxWidth: 400, textAlign: "center" }, welcomeCta: { alignSelf: "center", marginTop: 20, minWidth: 200 }, pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
});