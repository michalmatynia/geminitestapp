import { SectionPanel } from "./section-panel";
import { cn } from "@/shared/utils";
import type { ReactNode } from "react";

interface CardWithActionsProps {
  title: string;
  description?: string;
  actions?: ReactNode; // Typically buttons or icons
  children: ReactNode; // The main content of the card
  className?: string;
  onClick?: () => void;
}

export function CardWithActions({
  title,
  description,
  actions,
  children,
  className,
  onClick,
}: CardWithActionsProps): React.JSX.Element {
  return (
    <SectionPanel
      className={cn(
        "overflow-hidden p-0",
        onClick && "cursor-pointer transition-colors hover:border-blue-500/60",
        className,
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-3 pb-0">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium truncate" title={title}>
            {title}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5" title={description}>
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex-shrink-0 flex items-center gap-1">{actions}</div>}
      </div>

      {/* Main Content */}
      <div className="p-3">
        {children}
      </div>
    </SectionPanel>
  );
}
