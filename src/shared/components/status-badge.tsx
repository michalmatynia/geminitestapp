import React, { ReactNode } from "react";
import { cn } from "@/shared/utils";

export type StatusVariant = "pending" | "active" | "failed" | "removed" | "neutral" | "info" | "success" | "warning" | "error" | "processing";

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  icon?: ReactNode;
  className?: string;
  title?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  failed: "bg-red-500/20 text-red-300 border-red-500/40",
  removed: "bg-gray-500/20 text-gray-300 border-gray-500/40",
  neutral: "bg-gray-500/20 text-gray-300 border-gray-500/40",
  info: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  success: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  warning: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  error: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  processing: "bg-blue-500/20 text-blue-300 border-blue-500/40",
};

// Map common statuses to variants
const statusToVariant = (status: string): StatusVariant => {
  const s = status.toLowerCase();
  if (s === "pending" || s === "queued") return "pending";
  if (s === "active" || s === "success" || s === "completed" || s === "listed") return "active";
  if (s === "failed" || s === "error") return "failed";
  if (s === "removed" || s === "archived" || s === "deleted") return "removed";
  if (s === "processing" || s === "in_progress") return "processing";
  return "neutral";
};

export function StatusBadge({
  status,
  variant,
  icon,
  className,
  title,
}: StatusBadgeProps): React.JSX.Element {
  const resolvedVariant = variant || statusToVariant(status);
  
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        variantStyles[resolvedVariant],
        className
      )}
      title={title}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {status}
    </span>
  );
}
