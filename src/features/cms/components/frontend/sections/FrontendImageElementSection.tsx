"use client";

import React, { useMemo } from "react";
import type { BlockInstance } from "../../../types/page-builder";
import { FrontendBlockRenderer } from "./FrontendBlockRenderer";

interface FrontendImageElementSectionProps {
  settings: Record<string, unknown>;
}

export function FrontendImageElementSection({
  settings,
}: FrontendImageElementSectionProps): React.ReactNode {
  const blockSettings = useMemo(() => {
    const { gsapAnimation, ...rest } = settings;
    return rest;
  }, [settings]);

  const block = useMemo<BlockInstance>(
    () => ({
      id: "image-element-section",
      type: "ImageElement",
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
