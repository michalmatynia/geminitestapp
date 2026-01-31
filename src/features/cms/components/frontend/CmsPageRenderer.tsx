import React from "react";
import type { PageComponent } from "../../types";
import type { ColorSchemeColors } from "@/features/cms/types/theme-settings";
import type { BlockInstance, PageZone } from "../../types/page-builder";
import type { GsapAnimationConfig } from "@/features/gsap";
import { FrontendAnnouncementBarSection } from "./sections/FrontendAnnouncementBarSection";
import { FrontendBlockSection } from "./sections/FrontendBlockSection";
import { FrontendHeroSection } from "./sections/FrontendHeroSection";
import { FrontendImageWithTextSection } from "./sections/FrontendImageWithTextSection";
import { FrontendRichTextSection } from "./sections/FrontendRichTextSection";
import { FrontendGridSection } from "./sections/FrontendGridSection";
import { FrontendAccordionSection } from "./sections/FrontendAccordionSection";
import { FrontendTestimonialsSection } from "./sections/FrontendTestimonialsSection";
import { FrontendVideoSection } from "./sections/FrontendVideoSection";
import { FrontendSlideshowSection } from "./sections/FrontendSlideshowSection";
import { FrontendNewsletterSection } from "./sections/FrontendNewsletterSection";
import { FrontendContactFormSection } from "./sections/FrontendContactFormSection";
import { GsapAnimationWrapper } from "./GsapAnimationWrapper";
import { getHoverEffectVars } from "./theme-styles";
import { MediaStylesProvider } from "./media-styles-context";
import { FrontendTextElementSection } from "./sections/FrontendTextElementSection";

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
  colorSchemes?: Record<string, ColorSchemeColors> | undefined;
  layout?: { fullWidth?: boolean } | undefined;
  hoverEffect?: string | undefined;
  hoverScale?: number | undefined;
  mediaVars?: React.CSSProperties | undefined;
  mediaStyles?: React.CSSProperties | undefined;
}

export function CmsPageRenderer({
  components,
  colorSchemes,
  layout,
  hoverEffect,
  hoverScale,
  mediaVars,
  mediaStyles,
}: CmsPageRendererProps): React.ReactNode {
  const hoverVars = getHoverEffectVars(hoverEffect, hoverScale);
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
  }).filter((section: { key: string; type: string; zone: PageZone; settings: Record<string, unknown>; blocks: BlockInstance[] }) => !section.settings["isHidden"]);

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
    <MediaStylesProvider value={mediaStyles}>
      <div className="cms-page cms-hover-scope" style={{ ...hoverVars, ...(mediaVars ?? {}) }}>
        {ZONE_ORDER.map((zone: PageZone) =>
          sectionsByZone[zone].map((section: typeof sections[number]) => {
            const animConfig = section.settings["gsapAnimation"] as GsapAnimationConfig | undefined;

            return (
              <GsapAnimationWrapper key={section.key} config={animConfig}>
                <SectionRenderer
                  type={section.type}
                  settings={section.settings}
                  blocks={section.blocks}
                  colorSchemes={colorSchemes}
                  layout={layout}
                />
              </GsapAnimationWrapper>
            );
          })
        )}
      </div>
    </MediaStylesProvider>
  );
}

// ---------------------------------------------------------------------------
// Section type router
// ---------------------------------------------------------------------------

interface SectionRendererProps {
  type: string;
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
  colorSchemes?: Record<string, ColorSchemeColors> | undefined;
  layout?: { fullWidth?: boolean } | undefined;
}

function SectionRenderer({ type, settings, blocks, colorSchemes, layout }: SectionRendererProps): React.ReactNode {
  switch (type) {
    case "AnnouncementBar":
      return <FrontendAnnouncementBarSection settings={settings} blocks={blocks} colorSchemes={colorSchemes} layout={layout} />;
    case "Block":
      return <FrontendBlockSection settings={settings} blocks={blocks} colorSchemes={colorSchemes} layout={layout} />;
    case "TextElement":
      return <FrontendTextElementSection settings={settings} />;
    case "Hero":
      return <FrontendHeroSection settings={settings} blocks={blocks} colorSchemes={colorSchemes} layout={layout} />;
    case "ImageWithText":
      return <FrontendImageWithTextSection settings={settings} blocks={blocks} colorSchemes={colorSchemes} layout={layout} />;
    case "RichText":
      return <FrontendRichTextSection settings={settings} blocks={blocks} colorSchemes={colorSchemes} layout={layout} />;
    case "Grid":
      return <FrontendGridSection settings={settings} blocks={blocks} colorSchemes={colorSchemes} layout={layout} />;
    case "Accordion":
      return <FrontendAccordionSection settings={settings} blocks={blocks} colorSchemes={colorSchemes} layout={layout} />;
    case "Testimonials":
      return <FrontendTestimonialsSection settings={settings} blocks={blocks} colorSchemes={colorSchemes} layout={layout} />;
    case "Video":
      return <FrontendVideoSection settings={settings} colorSchemes={colorSchemes} layout={layout} />;
    case "Slideshow":
      return <FrontendSlideshowSection settings={settings} blocks={blocks} colorSchemes={colorSchemes} layout={layout} />;
    case "Newsletter":
      return <FrontendNewsletterSection settings={settings} blocks={blocks} colorSchemes={colorSchemes} layout={layout} />;
    case "ContactForm":
      return <FrontendContactFormSection settings={settings} colorSchemes={colorSchemes} layout={layout} />;
    default:
      return null;
  }
}
