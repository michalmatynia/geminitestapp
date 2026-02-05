"use client";

import type { ReactNode } from "react";
import { AppModal } from "./app-modal";

export type SharedModalProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  header?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
};

export function SharedModal({
  open,
  onClose,
  title,
  header,
  size = "md",
  children,
}: SharedModalProps): React.JSX.Element | null {
  if (!open) return null;

  return (
    <AppModal open={open} onClose={onClose} title={title} size={size} header={header}>
      {children}
    </AppModal>
  );
}
