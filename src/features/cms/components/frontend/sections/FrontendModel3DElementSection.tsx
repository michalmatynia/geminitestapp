"use client";

import React, { useMemo } from "react";
import type { BlockInstance } from "../../../types/page-builder";
import { FrontendBlockRenderer } from "./FrontendBlockRenderer";

interface FrontendModel3DElementSectionProps {
  settings: Record<string, unknown>;
}

export function FrontendModel3DElementSection({
  settings,
}: FrontendModel3DElementSectionProps): React.ReactNode {
  const blockSettings = useMemo(() => {
    const { gsapAnimation, ...rest } = settings;
    return rest;
  }, [settings]);

  const block = useMemo<BlockInstance>(
    () => ({
      id: "model3d-element-section",
      type: "Model3D",
      settings: blockSettings,
    }),
    [blockSettings]
  );

  return (
    <section className="m-0 w-full p-0">
      <FrontendBlockRenderer block={block} />
    </section>
  );
}
