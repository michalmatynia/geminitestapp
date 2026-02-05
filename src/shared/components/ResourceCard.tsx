import { CardWithActions } from "./CardWithActions";
import { cn } from "@/shared/utils";
import type { ReactNode } from "react";

interface ResourceCardProps {
  title: string;
  description?: string;
  media?: ReactNode; // Top area (Image, Icon, etc.)
  mediaClassName?: string;
  badges?: ReactNode; // Badges to overlay on media
  actions?: ReactNode; // Header actions
  footer?: ReactNode; // Bottom metadata or price
  children?: ReactNode; // Main body content
  onClick?: () => void;
  className?: string;
}

/**
 * A unified card component for resources like Products, Assets, and Notes.
 * It provides a standardized layout with a top media area, header actions, and a footer.
 */
export function ResourceCard({
  title,
  description,
  media,
  mediaClassName,
  badges,
  actions,
  footer,
  children,
  onClick,
  className,
}: ResourceCardProps): React.JSX.Element {
  return (
    <CardWithActions
      title={title}
      description={description}
      actions={actions}
      onClick={onClick}
      className={cn("flex h-full flex-col", className)}
    >
      <div className="flex h-full flex-col">
        {/* Media Top Area */}
        {media && (
          <div className={cn("relative overflow-hidden rounded-md", mediaClassName)}>
            {media}
            {/* Overlay Badges */}
            {badges && (
              <div className="absolute inset-0 pointer-events-none p-2">
                {badges}
              </div>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 mt-3">
          {children}
        </div>

        {/* Footer Area */}
        {footer && (
          <div className="mt-3 border-t border-white/5 pt-3">
            {footer}
          </div>
        )}
      </div>
    </CardWithActions>
  );
}
