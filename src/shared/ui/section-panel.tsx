import type { ReactNode } from "react";
import { cn } from "@/shared/utils";

type SectionPanelVariant = "default" | "compact";

const variantStyles: Record<SectionPanelVariant, string> = {
  default: "rounded-lg border bg-card p-4",
  compact: "rounded-lg border bg-card p-3",
};

type SectionPanelProps = {
  children: ReactNode;
  className?: string;
  variant?: SectionPanelVariant;
};

export function SectionPanel({
  children,
  className,
  variant = "default",
}: SectionPanelProps) {
  return <div className={cn(variantStyles[variant], className)}>{children}</div>;
}
