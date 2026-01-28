"use client";

import * as React from "react";
import { cn } from "@/shared/utils";

type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  side?: "top" | "bottom" | "left" | "right";
  maxWidth?: string;
};

export function Tooltip({
  content,
  children,
  className,
  contentClassName,
  side = "top",
  maxWidth = "400px",
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  const sideStyles = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className={cn("relative inline-block", className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
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
