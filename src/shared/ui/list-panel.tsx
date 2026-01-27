import type { ReactNode } from "react";
import { cn } from "@/shared/utils";

type ListPanelVariant = "default" | "flat";

type ListPanelProps = {
  header?: ReactNode;
  alerts?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  alertsClassName?: string;
  filtersClassName?: string;
  actionsClassName?: string;
  footerClassName?: string;
  variant?: ListPanelVariant;
};

const variantStyles: Record<ListPanelVariant, string> = {
  default: "rounded-lg bg-gray-950 p-6 shadow-lg",
  flat: "bg-transparent p-0 shadow-none",
};

export function ListPanel({
  header,
  alerts,
  filters,
  actions,
  footer,
  children,
  className,
  contentClassName,
  headerClassName,
  alertsClassName,
  filtersClassName,
  actionsClassName,
  footerClassName,
  variant = "default",
}: ListPanelProps) {
  return (
    <section className={cn(variantStyles[variant], className)}>
      {header ? (
        <div className={cn("mb-6", headerClassName)}>{header}</div>
      ) : null}
      {alerts ? (
        <div className={cn("mb-4 space-y-3", alertsClassName)}>
          {alerts}
        </div>
      ) : null}
      {filters ? (
        <div className={cn("mb-4", filtersClassName)}>{filters}</div>
      ) : null}
      {actions ? (
        <div className={cn("mb-4", actionsClassName)}>{actions}</div>
      ) : null}
      <div className={cn("min-h-0", contentClassName)}>{children}</div>
      {footer ? (
        <div className={cn("mt-4", footerClassName)}>{footer}</div>
      ) : null}
    </section>
  );
}
