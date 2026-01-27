"use client";

import * as React from "react";

import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { cn } from "@/shared/utils";

type AppModalProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  titleHidden?: boolean;
  titleClassName?: string;
  contentClassName?: string;
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
  children,
}: AppModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(DEFAULT_CONTENT_CLASS, contentClassName)}>
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
