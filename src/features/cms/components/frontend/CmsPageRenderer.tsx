import type { PageComponent } from "../../types";
import type { ColorSchemeColors } from "@/features/cms/types/theme-settings";
import type { BlockInstance, PageZone } from "../../types/page-builder";
import type { GsapAnimationConfig } from "@/features/gsap";
import type { CssAnimationConfig } from "@/features/cms/types/css-animations";
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
import { CssAnimationWrapper } from "./CssAnimationWrapper";
import { getHoverEffectVars } from "./theme-styles";
import { MediaStylesProvider } from "./media-styles-context";
import { FrontendTextElementSection } from "./sections/FrontendTextElementSection";
import { FrontendImageElementSection } from "./sections/FrontendImageElementSection";
import { FrontendTextAtomSection } from "./sections/FrontendTextAtomSection";
import { FrontendButtonElementSection } from "./sections/FrontendButtonElementSection";
import { FrontendModel3DElementSection } from "./sections/FrontendModel3DElementSection";
import { EventEffectsWrapper } from "@/features/cms/components/shared/EventEffectsWrapper";

interface SectionContent {
  zone?: PageZone;
  settings?: Record<string, unknown>;
  blocks?: BlockInstance[];
}

const ZONE_ORDER: PageZone[] = ["header", "template", "footer"];

interface CmsPageRendererProps {
  components: PageComponent[];
  colorSchemes?: Record<string, ColorSchemeColors> | undefined;
  layout?: { fullWidth?: boolean } | undefined;
  hoverEffect?: string | undefined;
  hoverScale?: number | undefined;
  mediaVars?: React.CSSProperties | undefined;
  mediaStyles?: React.CSSProperties | null | undefined;
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
  
  const sections = components.map((comp: PageComponent, idx: number) => {
    const content = comp.content as SectionContent;
    return {
      key: `section-${idx}`,
      id: `section-${idx}`,
      type: comp.type,
      zone: (content.zone as PageZone) ?? "template",
      settings: content.settings ?? {},
      blocks: content.blocks ?? [],
    };
  }).filter((section: { key: string; id: string; type: string; zone: PageZone; settings: Record<string, unknown>; blocks: BlockInstance[] }) => !section.settings["isHidden"]);

  const sectionsByZone: Record<PageZone, typeof sections> = {
    header: [],
    template: [],
    footer: [],
  };

  for (const s of sections) {
    sectionsByZone[s.zone].push(s);
  }

  return (
    <MediaStylesProvider value={mediaStyles ?? null}>
      <div className="cms-page cms-hover-scope" style={{ ...hoverVars, ...(mediaVars ?? {}) }}>
        {ZONE_ORDER.map((zone: PageZone) =>
          sectionsByZone[zone].map((section: typeof sections[number]) => {
            return (
              <GsapAnimationWrapper
                key={section.key}
                config={section.settings["gsapAnimation"] as Partial<GsapAnimationConfig> | undefined}
              >
                <CssAnimationWrapper
                  config={section.settings["cssAnimation"] as CssAnimationConfig | undefined}
                >
                  <EventEffectsWrapper settings={section.settings}>
                    <SectionRenderer
                      type={section.type}
                      sectionId={section.id}
                      settings={section.settings}
                      blocks={section.blocks}
                      colorSchemes={colorSchemes ?? {}}
                      layout={layout ?? {}}
                    />
                  </EventEffectsWrapper>
                </CssAnimationWrapper>
              </GsapAnimationWrapper>
            );
          })
        )}
      </div>
    </MediaStylesProvider>
  );
}

interface SectionRendererProps {
  type: string;
  sectionId: string;
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
  colorSchemes: Record<string, ColorSchemeColors>;
  layout: { fullWidth?: boolean };
}

function SectionRenderer({ type, sectionId, settings, blocks, colorSchemes, layout }: SectionRendererProps): React.ReactNode {
  switch (type) {
    case "AnnouncementBar":
      return <FrontendAnnouncementBarSection settings={settings} blocks={blocks} colorSchemes={colorSchemes} layout={layout} />;
    case "Block":
      return <FrontendBlockSection sectionId={sectionId} settings={settings} blocks={blocks} colorSchemes={colorSchemes} layout={layout} />;
    case "TextElement":
      return <FrontendTextElementSection settings={settings} />;
    case "TextAtom":
      return <FrontendTextAtomSection settings={settings} blocks={blocks} />;
    case "ImageElement":
      return <FrontendImageElementSection settings={settings} />;
    case "Model3DElement":
      return <FrontendModel3DElementSection settings={settings} />;
    case "ButtonElement":
      return <FrontendButtonElementSection settings={settings} />;
    case "Hero":
      return <FrontendHeroSection settings={settings} blocks={blocks} colorSchemes={colorSchemes} layout={layout} />;
    case "ImageWithText":
      return <FrontendImageWithTextSection settings={settings} blocks={blocks} colorSchemes={colorSchemes} layout={layout} />;
    case "RichText":
      return <FrontendRichTextSection settings={settings} blocks={blocks} colorSchemes={colorSchemes} layout={layout} />;
    case "Grid":
      return <FrontendGridSection sectionId={sectionId} settings={settings} blocks={blocks} colorSchemes={colorSchemes} layout={layout} />;
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
