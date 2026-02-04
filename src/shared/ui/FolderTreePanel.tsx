"use client";

import React from "react";
import { cn } from "@/shared/utils";

export interface FolderTreePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  bodyClassName?: string;
}

export function FolderTreePanel({
  header,
  bodyClassName,
  className,
  children,
  ...props
}: FolderTreePanelProps): React.JSX.Element {
  return (
    <div className={cn("flex h-full flex-col", className)} {...props}>
      {header}
      <div className={cn("flex-1 min-h-0", bodyClassName)}>
        {children}
      </div>
    </div>
  );
}
