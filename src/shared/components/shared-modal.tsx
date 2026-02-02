"use client";

import { AppModal } from "@/shared/ui";
import ModalShell from "./modal-shell";
import * as React from "react";

type SharedModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  header?: React.ReactNode;
  size?: "md" | "lg" | "xl";
  showClose?: boolean;
  contentClassName?: string;
  bodyClassName?: string;
};

export function SharedModal({
  open,
  onClose,
  title,
  children,
  footer,
  header,
  size = "xl",
  showClose = true,
  contentClassName,
  bodyClassName,
}: SharedModalProps): React.JSX.Element {
  return (
    <AppModal
      open={open}
      onOpenChange={(isOpen: boolean) => !isOpen && onClose()}
      title={title}
      contentClassName={contentClassName}
    >
      <ModalShell
        title={title}
        onClose={onClose}
        footer={footer}
        header={header}
        size={size}
        showClose={showClose}
        bodyClassName={bodyClassName}
      >
        {children}
      </ModalShell>
    </AppModal>
  );
}
