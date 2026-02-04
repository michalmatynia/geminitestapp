"use client";

import React from "react";
import { VectorCanvas, type VectorCanvasProps } from "@/shared/ui";

export type { VectorCanvasProps } from "@/shared/ui";

export function VectorDrawingCanvas(props: VectorCanvasProps): React.JSX.Element {
  return <VectorCanvas {...props} />;
}
