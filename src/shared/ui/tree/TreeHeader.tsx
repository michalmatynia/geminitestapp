import type { ReactNode } from "react";
import { cn } from "@/shared/utils";

export type TreeHeaderProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
  titleClassName?: string;
  actionsClassName?: string;
  children?: ReactNode;
};

export function TreeHeader({
  title,
  subtitle,
  actions,
  className,
  titleClassName,
  actionsClassName,
  children,
}: TreeHeaderProps): React.JSX.Element {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            {title && (
              <div className={cn("text-xs font-semibold uppercase tracking-wide text-gray-400", titleClassName)}>
                {title}
              </div>
            )}
            {subtitle && (
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                {subtitle}
              </div>
            )}
          </div>
          {actions ? (
            <div className={cn("flex items-center gap-2", actionsClassName)}>{actions}</div>
          ) : null}
        </div>
      )}
      {children}
    </div>
  );
}
