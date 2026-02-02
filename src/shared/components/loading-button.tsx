"use client";

import React from "react";
import { Button, type ButtonProps } from "@/shared/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/utils";

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

export function LoadingButton({
  children,
  loading = false,
  loadingText,
  className,
  disabled,
  ...props
}: LoadingButtonProps): React.JSX.Element {
  return (
    <Button
      disabled={loading || disabled}
      className={cn("gap-2", className)}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {loading && loadingText ? loadingText : children}
    </Button>
  );
}
