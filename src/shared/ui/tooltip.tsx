"use client";
import * as React from "react";
import { JSX } from "react";

import { cn } from "@/shared/utils";

type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  side?: "top" | "bottom" | "left" | "right";
  maxWidth?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disableHover?: boolean;
};

export function Tooltip({
  content,
  children,
  className,
  contentClassName,
  side = "top",
  maxWidth = "400px",
  open,
  onOpenChange,
  disableHover = false,
}: TooltipProps): JSX.Element {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = typeof open === "boolean";
  const isVisible = isControlled ? open : internalOpen;

  const setVisible = (next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next);
    }
    if (onOpenChange) {
      onOpenChange(next);
    }
  };

  const sideStyles = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className={cn("relative inline-block", className)}
      onMouseEnter={() => {
        if (!disableHover) setVisible(true);
      }}
      onMouseLeave={() => {
        if (!disableHover) setVisible(false);
      }}
    >
      {children}
      {isVisible && content && (
        <div
          className={cn(
            "absolute z-50 px-3 py-2 text-xs rounded-md shadow-lg",
            "bg-gray-900 border border-gray-700 text-gray-200",
            "whitespace-pre-wrap break-words",
            "animate-in fade-in-0 zoom-in-95 duration-150",
            sideStyles[side],
            contentClassName
          )}
          style={{ maxWidth }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
