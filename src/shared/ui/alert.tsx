import * as React from "react";
import { cn } from "@/shared/utils";

type AlertVariant = "default" | "error" | "warning" | "success" | "info";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

const variantStyles: Record<AlertVariant, string> = {
  default: "bg-background text-foreground border-border",
  error: "border-red-500/40 bg-red-500/10 text-red-200",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
  info: "border-blue-500/40 bg-blue-500/10 text-blue-100",
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "rounded-md border px-4 py-3 text-sm",
          variantStyles[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Alert.displayName = "Alert";
