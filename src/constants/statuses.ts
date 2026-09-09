import { Design } from "./design";

export type OrderStatus = "pending" | "processing" | "completed" | "cancelled";

const STATUS_BADGE: Record<OrderStatus, { color: string; bg: string; label: string }> = {
  pending: { color: Design.color.accentDeep, bg: "#F2E1CE", label: "PENDING" },
  processing: { color: Design.color.inkSoft, bg: Design.color.surfaceMuted, label: "PROCESSING" },
  completed: { color: "#2F4A30", bg: "#E2EAD9", label: "COMPLETED" },
  cancelled: { color: Design.color.danger, bg: "#F2DBD7", label: "CANCELLED" },
};

const FALLBACK_BADGE = { color: Design.color.inkSoft, bg: Design.color.surfaceMuted, label: "UNKNOWN".toUpperCase() };

export function getStatusBadge(status: string | null | undefined) {
  if (!status) return FALLBACK_BADGE;
  return STATUS_BADGE[status.toLowerCase() as OrderStatus] ?? FALLBACK_BADGE;
}