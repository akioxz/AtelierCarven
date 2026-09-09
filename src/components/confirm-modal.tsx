import { Feather } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { Design } from "../constants/design";
import { PressScale } from "./motion";

type Props = {
  visible: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  cancelLabel?: string;
  danger?: boolean;
  icon?: keyof typeof Feather.glyphMap;
};

export default function ConfirmModal({ visible, title, message, confirmLabel, onConfirm, onCancel, cancelLabel = "CANCEL", danger = false, icon = "alert-triangle" }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={[styles.iconWrap, danger && styles.iconWrapDanger]}>
            <Feather name={icon} size={20} color={danger ? Design.color.danger : Design.color.accent} />
          </View>
          <Text style={[styles.title, danger && styles.titleDanger]}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <PressScale onPress={onCancel} accessibilityLabel={cancelLabel} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </PressScale>
            <PressScale onPress={onConfirm} accessibilityLabel={confirmLabel} style={[styles.confirmBtn, danger && styles.confirmBtnDanger]}>
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </PressScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(29,27,23,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { backgroundColor: Design.color.surface, borderRadius: Design.radius.card, borderColor: Design.color.line, borderWidth: StyleSheet.hairlineWidth, padding: 22, maxWidth: 380, width: "100%", alignItems: "center" },
  iconWrap: { alignItems: "center", backgroundColor: Design.color.accentSoft, borderRadius: Design.radius.small, height: 52, justifyContent: "center", width: 52 },
  iconWrapDanger: { backgroundColor: "#F2DBD7" },
  title: { color: Design.color.ink, fontFamily: Design.font.display, fontSize: 22, letterSpacing: -0.4, marginTop: 14 },
  titleDanger: { color: Design.color.danger },
  message: { color: Design.color.inkSoft, fontFamily: Design.font.body, fontSize: 13, lineHeight: 20, marginTop: 8, textAlign: "center" },
  actions: { flexDirection: "row", gap: 10, marginTop: 20, width: "100%" },
  cancelBtn: { alignItems: "center", backgroundColor: Design.color.surfaceMuted, borderRadius: Design.radius.small, flex: 1, justifyContent: "center", paddingVertical: 13 },
  cancelText: { color: Design.color.ink, fontFamily: Design.font.bodyBold, fontSize: 11, letterSpacing: 1.8 },
  confirmBtn: { alignItems: "center", backgroundColor: Design.color.accent, borderRadius: Design.radius.small, flex: 1, justifyContent: "center", paddingVertical: 13 },
  confirmBtnDanger: { backgroundColor: Design.color.danger },
  confirmText: { color: Design.color.surface, fontFamily: Design.font.bodyBold, fontSize: 11, letterSpacing: 1.8 },
});