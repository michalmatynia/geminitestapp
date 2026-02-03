import React, { ReactNode } from "react";
import { cn } from "@/shared/utils";
import { Badge } from "./badge";

export type StatusVariant = "pending" | "active" | "failed" | "removed" | "neutral" | "info" | "success" | "warning" | "error" | "processing";

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  icon?: ReactNode;
  hideLabel?: boolean;
  className?: string;
  title?: string;
}

// Map common statuses to variants
const statusToVariant = (status: string): StatusVariant => {
  const s = status.toLowerCase();
  if (s === "pending" || s === "queued") return "pending";
  if (s === "active" || s === "success" || s === "completed" || s === "listed") return "active";
  if (s === "failed" || s === "error") return "failed";
  if (s === "removed" || s === "archived" || s === "deleted") return "removed";
  if (s === "processing" || s === "in_progress") return "processing";
  if (s === "not_started" || s === "not started") return "neutral";
  return "neutral";
};

export function StatusBadge({
  status,
  variant,
  icon,
  hideLabel,
  className,
  title,
}: StatusBadgeProps): React.JSX.Element {
  const resolvedVariant = variant || statusToVariant(status);
  const label = status.trim();
  
  return (
    <Badge
      variant={resolvedVariant}
      className={cn(
        "gap-1 text-[10px] uppercase tracking-wider",
        className
      )}
      title={title}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {!hideLabel && label ? <span>{label}</span> : null}
    </Badge>
  );
}
