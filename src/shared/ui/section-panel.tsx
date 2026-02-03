import type { ReactNode } from "react";
import { cn } from "@/shared/utils";

type SectionPanelVariant = "default" | "compact" | "subtle" | "subtle-compact";

const variantStyles: Record<SectionPanelVariant, string> = {
  default: "rounded-lg border bg-card p-4",
  compact: "rounded-lg border bg-card p-3",
  subtle: "rounded-lg border bg-card/60 p-4 backdrop-blur",
  "subtle-compact": "rounded-lg border bg-card/60 p-3 backdrop-blur",
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
