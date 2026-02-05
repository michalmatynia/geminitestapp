"use client";

import React from "react";
import { Button } from "./button";
import { RefreshCcw } from "lucide-react";
import { cn } from "@/shared/utils";

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
  label?: string;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

/**
 * A standardized refresh button with an animated icon when refreshing.
 */
export function RefreshButton({
  onRefresh,
  isRefreshing = false,
  label = "Refresh",
  className,
  size = "sm",
  variant = "outline",
}: RefreshButtonProps): React.JSX.Element {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onRefresh}
      disabled={isRefreshing}
      className={cn("gap-2", className)}
    >
      <RefreshCcw className={cn("size-4", isRefreshing && "animate-spin")} />
      {label && <span>{label}</span>}
    </Button>
  );
}
