import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

export default function ActivityLogs() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false });
    setLogs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getLogBadge = (action: string) => {
    if (action.includes("Added"))
      return {
        color: "#3B6D11",
        bg: "#EAF3DE",
        icon: "plus-circle",
        label: "ADDED",
      };
    if (action.includes("Edited"))
      return {
        color: "#854F0B",
        bg: "#FAEEDA",
        icon: "edit-2",
        label: "EDITED",
      };
    if (action.includes("Deleted"))
      return {
        color: "#A32D2D",
        bg: "#FCEBEB",
        icon: "trash-2",
        label: "DELETED",
      };
    return {
      color: "#8B7355",
      bg: "#EDE5D8",
      icon: "activity",
      label: "ACTION",
    };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#1C1C1A" />
        </TouchableOpacity>
        <View style={{ marginTop: 20 }}>
          <Text style={styles.headerSmall}>ACTIVITY</Text>
          <Text style={styles.headerLarge}>Logs</Text>
          <View style={styles.goldDivider} />
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
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {logs.map((log) => {
            const badge = getLogBadge(log.action);
            return (
              <View key={log.id} style={styles.logItem}>
                <View style={[styles.logBadge, { backgroundColor: badge.bg }]}>
                  <Feather
                    name={badge.icon as any}
                    size={12}
                    color={badge.color}
                  />
                  <Text style={[styles.logBadgeText, { color: badge.color }]}>
                    {badge.label}
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
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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
  list: { flex: 1, padding: 24 },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 80,
  },
  emptyText: { fontSize: 13, color: "#9E8E7E" },
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
    gap: 5,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    minWidth: 76,
  },
  logBadgeText: { fontSize: 9, letterSpacing: 1 },
  logContent: { flex: 1 },
  logTarget: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1C1C1A",
    marginBottom: 2,
  },
  logTime: { fontSize: 11, color: "#9E8E7E" },
});
