import React from "react";
import type { PageComponent } from "../../types";
import type { BlockInstance, PageZone } from "../../types/page-builder";
import type { GsapAnimationConfig } from "../../types/animation";
import { FrontendHeroSection } from "./sections/FrontendHeroSection";
import { FrontendImageWithTextSection } from "./sections/FrontendImageWithTextSection";
import { FrontendRichTextSection } from "./sections/FrontendRichTextSection";
import { FrontendGridSection } from "./sections/FrontendGridSection";
import { GsapAnimationWrapper } from "./GsapAnimationWrapper";

// ---------------------------------------------------------------------------
// Types for the section content stored in PageComponent.content
// ---------------------------------------------------------------------------

interface SectionContent {
  zone?: PageZone;
  settings?: Record<string, unknown>;
  blocks?: BlockInstance[];
}

// ---------------------------------------------------------------------------
// Zone ordering
// ---------------------------------------------------------------------------

const ZONE_ORDER: PageZone[] = ["header", "template", "footer"];

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

interface CmsPageRendererProps {
  components: PageComponent[];
}

export function CmsPageRenderer({ components }: CmsPageRendererProps): React.ReactNode {
  // Parse components into sections with zone info
  const sections = components.map((comp: PageComponent, idx: number) => {
    const content = comp.content as SectionContent;
    return {
      key: `section-${idx}`,
      type: comp.type,
      zone: (content.zone as PageZone) ?? "template",
      settings: content.settings ?? {},
      blocks: content.blocks ?? [],
    };
  });

  // Group by zone and render in order
  const sectionsByZone: Record<PageZone, typeof sections> = {
    header: [],
    template: [],
    footer: [],
  };

  for (const s of sections) {
    sectionsByZone[s.zone].push(s);
  }

  return (
    <div className="cms-page">
      {ZONE_ORDER.map((zone: PageZone) =>
        sectionsByZone[zone].map((section: typeof sections[number]) => {
          const animConfig = section.settings["gsapAnimation"] as GsapAnimationConfig | undefined;

          return (
            <GsapAnimationWrapper key={section.key} config={animConfig}>
              <SectionRenderer
                type={section.type}
                settings={section.settings}
                blocks={section.blocks}
              />
            </GsapAnimationWrapper>
          );
        })
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section type router
// ---------------------------------------------------------------------------

interface SectionRendererProps {
  type: string;
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
}

function SectionRenderer({ type, settings, blocks }: SectionRendererProps): React.ReactNode {
  switch (type) {
    case "Hero":
      return <FrontendHeroSection settings={settings} blocks={blocks} />;
    case "ImageWithText":
      return <FrontendImageWithTextSection settings={settings} blocks={blocks} />;
    case "RichText":
      return <FrontendRichTextSection settings={settings} blocks={blocks} />;
    case "Grid":
      return <FrontendGridSection settings={settings} blocks={blocks} />;
    default:
      return null;
  }
}
