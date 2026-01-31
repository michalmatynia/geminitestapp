"use client";

import { Dialog, DialogContent, DialogTitle } from "@/shared/ui";
import * as React from "react";


import { cn } from "@/shared/utils";

type AppModalProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  titleHidden?: boolean;
  titleClassName?: string;
  contentClassName?: string;
  closeOnOutside?: boolean;
  closeOnEscape?: boolean;
  children: React.ReactNode;
};

const DEFAULT_CONTENT_CLASS =
  "max-w-none w-auto p-0 border-none bg-transparent shadow-none";

export function AppModal({
  open,
  onOpenChange,
  title,
  titleHidden = true,
  titleClassName,
  contentClassName,
  closeOnOutside = true,
  closeOnEscape = true,
  children,
}: AppModalProps) {
  const handleInteractOutside = (): void => {
    if (!closeOnOutside) return;
    onOpenChange?.(false);
  };

  const handleEscapeKeyDown = (): void => {
    if (!closeOnEscape) return;
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} {...(onOpenChange ? { onOpenChange } : {})}>
      <DialogContent
        className={cn(DEFAULT_CONTENT_CLASS, contentClassName)}
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        <DialogTitle
          className={cn(titleHidden && "sr-only", titleClassName)}
        >
          {title}
        </DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
