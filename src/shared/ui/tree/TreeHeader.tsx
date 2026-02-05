import type { ReactNode } from "react";
import { cn } from "@/shared/utils";

export type TreeHeaderProps = {
  title: ReactNode;
  actions?: ReactNode;
  className?: string;
  titleClassName?: string;
  actionsClassName?: string;
};

export function TreeHeader({
  title,
  actions,
  className,
  titleClassName,
  actionsClassName,
}: TreeHeaderProps): React.JSX.Element {
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <div className={cn("text-xs font-semibold uppercase tracking-wide text-gray-400", titleClassName)}>
        {title}
      </div>
      {actions ? (
        <div className={cn("flex items-center gap-2", actionsClassName)}>{actions}</div>
      ) : null}
    </div>
  );
}
