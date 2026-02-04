"use client";

import { AppModal } from "./app-modal";
import * as React from "react";

type SharedModalProps = React.ComponentProps<typeof AppModal>;

/**
 * @deprecated Use AppModal directly. SharedModal is a thin wrapper with size="xl" by default.
 */
export function SharedModal({
  size = "xl",
  ...props
}: SharedModalProps): React.JSX.Element {
  return <AppModal size={size} {...props} />;
}
