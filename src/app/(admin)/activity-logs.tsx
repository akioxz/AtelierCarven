import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { AdminNavigation } from "../../components/app-ui";

export default function ActivityLogs() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = width > 768;
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    const { data } = await supabase.from("activity_logs").select("*").order("created_at", { ascending: false });
    setLogs(data || []);
    setLoading(false);
  };

  const getLogBadge = (action: string) => {
    if (action.includes("Added")) return { color: "#3B6D11", bg: "#EAF3DE", icon: "plus-circle", label: "ADDED" };
    if (action.includes("Edited")) return { color: "#854F0B", bg: "#FAEEDA", icon: "edit-2", label: "EDITED" };
    if (action.includes("Deleted")) return { color: "#A32D2D", bg: "#FCEBEB", icon: "trash-2", label: "DELETED" };
    return { color: "#8B7355", bg: "#EDE5D8", icon: "activity", label: "ACTION" };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <AdminNavigation active="logs" />

      <View style={styles.main}>
        <View style={[styles.header, isWeb && styles.headerWeb]}>
          {!isWeb && (
            <TouchableOpacity onPress={() => router.back()}>
              <Feather name="arrow-left" size={22} color="#1C1C1A" />
            </TouchableOpacity>
          )}
          <View style={isWeb ? {} : { marginTop: 20 }}>
            {!isWeb && <Text style={styles.headerSmall}>ACTIVITY</Text>}
            <Text style={[styles.headerLarge, isWeb && styles.headerLargeWeb]}>Activity Logs</Text>
            {!isWeb && <View style={styles.goldDivider} />}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#C9A96E" style={{ marginTop: 40 }} />
        ) : logs.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="clipboard" size={40} color="#E8E0D0" />
            <Text style={styles.emptyText}>No activity logs yet.</Text>
          </View>
        ) : (
          <ScrollView style={[styles.list, isWeb && styles.listWeb]} showsVerticalScrollIndicator={false}>
            {/* Web table header */}
            {isWeb && (
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderCell}>ACTION</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>ITEM</Text>
                <Text style={styles.tableHeaderCell}>DATE & TIME</Text>
              </View>
            )}

            {logs.map((log) => {
              const badge = getLogBadge(log.action);
              return isWeb ? (
                <View key={log.id} style={styles.tableRow}>
                  <View style={styles.tableCell}>
                    <View style={[styles.logBadge, { backgroundColor: badge.bg }]}>
                      <Feather name={badge.icon as any} size={12} color={badge.color} />
                      <Text style={[styles.logBadgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  </View>
                  <View style={[styles.tableCell, { flex: 2 }]}>
                    <Text style={styles.logTarget}>{log.target_item}</Text>
                  </View>
                  <View style={styles.tableCell}>
                    <Text style={styles.logTime}>{new Date(log.created_at).toLocaleString()}</Text>
                  </View>
                </View>
              ) : (
                <View key={log.id} style={styles.logItem}>
                  <View style={[styles.logBadge, { backgroundColor: badge.bg }]}>
                    <Feather name={badge.icon as any} size={12} color={badge.color} />
                    <Text style={[styles.logBadgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                  <View style={styles.logContent}>
                    <Text style={styles.logTarget}>{log.target_item}</Text>
                    <Text style={styles.logTime}>{new Date(log.created_at).toLocaleString()}</Text>
                  </View>
                  <Feather name="chevron-right" size={14} color="#C9A96E" />
                </View>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}


      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF8" },
  goldDivider: { width: 40, height: 1.5, backgroundColor: "#C9A96E" },
  main: { flex: 1 },
  header: { backgroundColor: "#F5F0E8", padding: 28, paddingTop: 56, paddingBottom: 28 },
  headerWeb: { backgroundColor: "#FAFAF8", paddingTop: 32, paddingBottom: 20, borderBottomWidth: 0.5, borderBottomColor: "#E8E0D0", flexDirection: "row", alignItems: "center" },
  headerSmall: { fontSize: 10, letterSpacing: 4, color: "#8B7355" },
  headerLarge: { fontSize: 36, fontWeight: "300", color: "#1C1C1A", letterSpacing: 2, marginBottom: 16 },
  headerLargeWeb: { fontSize: 28, marginBottom: 0 },
  list: { flex: 1, padding: 24 },
  listWeb: { padding: 32 },
  tableHeader: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 16, backgroundColor: "#F5F0E8", borderRadius: 10, marginBottom: 8 },
  tableHeaderCell: { flex: 1, fontSize: 10, letterSpacing: 2, color: "#8B7355" },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, backgroundColor: "#FAFAF8", borderRadius: 10, marginBottom: 6, borderWidth: 0.5, borderColor: "#E8E0D0" },
  tableCell: { flex: 1 },
  logBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, alignSelf: "flex-start" },
  logBadgeText: { fontSize: 9, letterSpacing: 1 },
  logItem: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: "#E8E0D0" },
  logContent: { flex: 1 },
  logTarget: { fontSize: 13, fontWeight: "500", color: "#1C1C1A", marginBottom: 2 },
  logTime: { fontSize: 11, color: "#9E8E7E" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, marginTop: 80 },
  emptyText: { fontSize: 13, color: "#9E8E7E" },

});
