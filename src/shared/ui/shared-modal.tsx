"use client";

import { AppModal } from "./app-modal";
import * as React from "react";

type SharedModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  header?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
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
      onClose={onClose}
      title={title}
      footer={footer}
      header={header}
      size={size}
      showClose={showClose}
      contentClassName={contentClassName}
      bodyClassName={bodyClassName}
    >
      {children}
    </AppModal>
  );
}
