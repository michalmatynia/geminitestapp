"use client";

import React from "react";
import { TreeHeader } from "./tree/TreeHeader";

export type PanelHeaderProps = React.ComponentProps<typeof TreeHeader>;

export function PanelHeader(props: PanelHeaderProps): React.JSX.Element {
  return <TreeHeader {...props} />;
}
