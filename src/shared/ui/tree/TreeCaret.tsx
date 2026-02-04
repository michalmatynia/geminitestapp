"use client";

import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/shared/utils";

export interface TreeCaretProps {
  isOpen?: boolean | undefined;
  hasChildren?: boolean | undefined;
  showDot?: boolean | undefined;
  onToggle?: ((event: React.MouseEvent | React.KeyboardEvent) => void) | undefined;
  ariaLabel?: string | undefined;
  className?: string | undefined;
  buttonClassName?: string | undefined;
  iconClassName?: string | undefined;
  placeholderClassName?: string | undefined;
  dotClassName?: string | undefined;
}

export function TreeCaret({
  isOpen = false,
  hasChildren = false,
  showDot = false,
  onToggle,
  ariaLabel,
  className,
  buttonClassName,
  iconClassName,
  placeholderClassName,
  dotClassName,
}: TreeCaretProps): React.JSX.Element {
  const Icon = isOpen ? ChevronDown : ChevronRight;
  const iconClasses = cn("size-3.5", iconClassName);
  const sharedClasses = cn("inline-flex w-4 justify-center", className);

  if (!hasChildren) {
    if (showDot) {
      return (
        <span className={cn(sharedClasses, "text-gray-500", dotClassName)} aria-hidden="true">
          &bull;
        </span>
      );
    }
    return <span className={cn(sharedClasses, placeholderClassName)} aria-hidden="true" />;
  }

  if (!onToggle) {
    return (
      <span className={sharedClasses} aria-hidden="true">
        <Icon className={iconClasses} />
      </span>
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className={cn("rounded p-0.5 hover:bg-muted/50", sharedClasses, buttonClassName)}
      onClick={(event: React.MouseEvent): void => {
        event.stopPropagation();
        onToggle(event);
      }}
      onMouseDown={(event: React.MouseEvent): void => event.stopPropagation()}
      onKeyDown={(event: React.KeyboardEvent): void => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          onToggle(event);
        }
      }}
    >
      <Icon className={iconClasses} />
    </span>
  );
}
