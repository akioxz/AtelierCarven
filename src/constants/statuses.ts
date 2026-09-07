import { Design } from "./design";

export type OrderStatus = "pending" | "processing" | "completed" | "cancelled";

const STATUS_BADGE: Record<OrderStatus, { color: string; bg: string; label: string }> = {
  pending: { color: Design.color.gold, bg: "#FDF9F0", label: "PENDING" },
  processing: { color: Design.color.inkSoft, bg: Design.color.surfaceMuted, label: "PROCESSING" },
  completed: { color: "#3B6D11", bg: "#EAF3DE", label: "COMPLETED" },
  cancelled: { color: Design.color.danger, bg: "#FCEBEB", label: "CANCELLED" },
};

const FALLBACK_BADGE = { color: Design.color.inkSoft, bg: Design.color.surfaceMuted, label: "UNKNOWN".toUpperCase() };

export function getStatusBadge(status: string | null | undefined) {
  if (!status) return FALLBACK_BADGE;
  return STATUS_BADGE[status.toLowerCase() as OrderStatus] ?? FALLBACK_BADGE;
}