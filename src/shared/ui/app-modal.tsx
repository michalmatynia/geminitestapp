"use client";

import { Dialog, DialogContent, DialogTitle } from "@/shared/ui";
import * as React from "react";


import { cn } from "@/shared/utils";

type AppModalProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  titleHidden?: boolean | undefined;
  titleClassName?: string | undefined;
  contentClassName?: string | undefined;
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
  // Let Radix Dialog handle closing behavior and only block it when configured.
  const handleInteractOutside = (event: Event): void => {
    if (closeOnOutside) return;
    event.preventDefault();
  };

  const handleEscapeKeyDown = (event: KeyboardEvent): void => {
    if (closeOnEscape) return;
    event.preventDefault();
  };

  return (
    <Dialog open={open} {...(onOpenChange ? { onOpenChange } : {})}>
      <DialogContent
        className={cn(DEFAULT_CONTENT_CLASS, contentClassName, "pointer-events-none")}
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        <DialogTitle
          className={cn(titleHidden && "sr-only", titleClassName)}
        >
          {title}
        </DialogTitle>
        <div className="pointer-events-auto">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
