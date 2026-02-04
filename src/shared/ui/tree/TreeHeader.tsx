"use client";

import React from "react";
import { cn } from "@/shared/utils";

export interface TreeHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function TreeHeader({
  title,
  subtitle,
  actions,
  className,
  children,
  ...props
}: TreeHeaderProps): React.JSX.Element {
  return (
    <div
      className={cn("border-b border-border px-4 py-3", className)}
      {...props}
    >
      {(title || subtitle || actions) && (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <div className="text-sm font-semibold text-white">{title}</div> : null}
            {subtitle ? <div className="text-[11px] text-gray-400">{subtitle}</div> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      )}
      {children ? <div className={cn(title || subtitle || actions ? "mt-3" : "")}>{children}</div> : null}
    </div>
  );
}
