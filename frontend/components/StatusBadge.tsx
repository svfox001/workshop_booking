import { STATUS_LABELS } from "@/lib/status";
import type { BookingStatus } from "@/lib/types";

const STYLES: Record<BookingStatus, { badge: string; dot: string }> = {
  pending: { badge: "bg-amber-50 text-amber-900 ring-amber-600/30", dot: "bg-amber-500" },
  confirmed: { badge: "bg-emerald-50 text-emerald-900 ring-emerald-600/30", dot: "bg-emerald-600" },
  cancelled: { badge: "bg-slate-100 text-slate-700 ring-slate-500/30 line-through decoration-slate-400", dot: "bg-slate-400" },
};

/** Status is conveyed by the text label; colour is supplementary. */
export function StatusBadge({ status }: { status: BookingStatus }) {
  const style = STYLES[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.badge}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}
