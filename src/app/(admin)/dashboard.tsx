import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ furniture: 0, users: 0, logs: 0 });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();
      setUsername(profile?.username || "Admin");
    }
    const { count: furnitureCount } = await supabase
      .from("furniture")
      .select("*", { count: "exact", head: true })
      .eq("is_deleted", false);
    const { count: usersCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "user");
    const { count: logsCount } = await supabase
      .from("activity_logs")
      .select("*", { count: "exact", head: true });
    const { data: logs } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    setStats({
      furniture: furnitureCount || 0,
      users: usersCount || 0,
      logs: logsCount || 0,
    });
    setRecentLogs(logs || []);
    setLoading(false);
  };

  const getLogBadge = (action: string) => {
    if (action.includes("Added"))
      return { color: "#3B6D11", bg: "#EAF3DE", icon: "plus-circle" };
    if (action.includes("Edited"))
      return { color: "#854F0B", bg: "#FAEEDA", icon: "edit-2" };
    if (action.includes("Deleted"))
      return { color: "#A32D2D", bg: "#FCEBEB", icon: "trash-2" };
    return { color: "#8B7355", bg: "#EDE5D8", icon: "activity" };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSmall}>ADMIN</Text>
            <Text style={styles.headerLarge}>Dashboard</Text>
            <View style={styles.goldDivider} />
          </View>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => router.push("/(admin)/profile")}
          >
            <Text style={styles.profileInitial}>
              {username?.charAt(0)?.toUpperCase() || "A"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.welcome}>Welcome back, {username}</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.furniture}</Text>
            <Text style={styles.statLabel}>FURNITURE</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.users}</Text>
            <Text style={styles.statLabel}>USERS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.logs}</Text>
            <Text style={styles.statLabel}>ACTIONS</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/(admin)/manage-furniture")}
            >
              <View style={styles.actionIconBox}>
                <Feather name="grid" size={18} color="#8B7355" />
              </View>
              <Text style={styles.actionTitle}>Manage Furniture</Text>
              <Text style={styles.actionSubtext}>Add, edit, delete items</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/(admin)/activity-logs")}
            >
              <View style={styles.actionIconBox}>
                <Feather name="clipboard" size={18} color="#8B7355" />
              </View>
              <Text style={styles.actionTitle}>Activity Logs</Text>
              <Text style={styles.actionSubtext}>View all admin actions</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
            <TouchableOpacity
              onPress={() => router.push("/(admin)/activity-logs")}
            >
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator color="#C9A96E" />
          ) : recentLogs.length === 0 ? (
            <Text style={styles.emptyText}>No activity yet.</Text>
          ) : (
            recentLogs.map((log) => {
              const badge = getLogBadge(log.action);
              return (
                <View key={log.id} style={styles.logItem}>
                  <View
                    style={[styles.logBadge, { backgroundColor: badge.bg }]}
                  >
                    <Feather
                      name={badge.icon as any}
                      size={11}
                      color={badge.color}
                    />
                    <Text style={[styles.logBadgeText, { color: badge.color }]}>
                      {log.action.includes("Added")
                        ? "ADDED"
                        : log.action.includes("Edited")
                          ? "EDITED"
                          : "DELETED"}
                    </Text>
                  </View>
                  <View style={styles.logContent}>
                    <Text style={styles.logTarget}>{log.target_item}</Text>
                    <Text style={styles.logTime}>
                      {new Date(log.created_at).toLocaleString()}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={14} color="#C9A96E" />
                </View>
              );
            })
          )}
        </View>
        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Feather name="home" size={20} color="#1C1C1A" />
          <View style={styles.navDot} />
          <Text style={styles.navLabelActive}>DASHBOARD</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(admin)/manage-furniture")}
        >
          <Feather name="grid" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>FURNITURE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(admin)/activity-logs")}
        >
          <Feather name="clipboard" size={20} color="#C4B8A8" />
          <Text style={styles.navLabel}>LOGS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(admin)/profile")}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EDE5D8",
    borderWidth: 1,
    borderColor: "#C9A96E",
    justifyContent: "center",
    alignItems: "center",
  },
  profileInitial: { fontSize: 18, fontWeight: "500", color: "#8B7355" },
  welcome: { fontSize: 13, color: "#6B5E4E", padding: 24, paddingBottom: 0 },
  statsGrid: { flexDirection: "row", padding: 24, gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#F5F0E8",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "500",
    color: "#C9A96E",
    marginBottom: 4,
  },
  statLabel: { fontSize: 9, letterSpacing: 2, color: "#8B7355" },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#8B7355",
    marginBottom: 12,
  },
  seeAll: { fontSize: 11, color: "#C9A96E" },
  actionsGrid: { flexDirection: "row", gap: 12 },
  actionCard: {
    flex: 1,
    backgroundColor: "#F5F0E8",
    borderRadius: 12,
    padding: 16,
    borderWidth: 0.5,
    borderColor: "#E8E0D0",
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EDE5D8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1C1C1A",
    marginBottom: 4,
  },
  actionSubtext: { fontSize: 11, color: "#9E8E7E" },
  logItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E8E0D0",
  },
  logBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 72,
  },
  logBadgeText: { fontSize: 9, letterSpacing: 1 },
  logContent: { flex: 1 },
  logTarget: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1C1C1A",
    marginBottom: 2,
  },
  logTime: { fontSize: 10, color: "#9E8E7E" },
  emptyText: { fontSize: 13, color: "#9E8E7E" },
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
