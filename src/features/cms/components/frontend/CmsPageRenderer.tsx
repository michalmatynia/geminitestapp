import { EventEffectsWrapper } from '@/features/cms/components/shared/EventEffectsWrapper';
import {
  isCmsSectionHidden,
  normalizePageZone,
} from '@/features/cms/utils/page-builder-normalization';
import type { GsapAnimationConfig } from '@/shared/lib/gsap';
import type { CssAnimationConfig } from '@/shared/contracts/cms';
import type { PageComponent, BlockInstance, PageZone } from '@/shared/contracts/cms';
import type { ColorSchemeColors } from '@/shared/contracts/cms-theme';

import { CmsPageProvider } from './CmsPageContext';
import { CssAnimationWrapper } from './CssAnimationWrapper';
import { GsapAnimationWrapper } from './GsapAnimationWrapper';
import { MediaStylesProvider } from './media-styles-context';
import { FrontendAccordionSection } from './sections/FrontendAccordionSection';
import { FrontendAnnouncementBarSection } from './sections/FrontendAnnouncementBarSection';
import { FrontendBlockSection } from './sections/FrontendBlockSection';
import { FrontendButtonElementSection } from './sections/FrontendButtonElementSection';
import { FrontendContactFormSection } from './sections/FrontendContactFormSection';
import { FrontendGridSection } from './sections/FrontendGridSection';
import { FrontendHeroSection } from './sections/FrontendHeroSection';
import { FrontendImageElementSection } from './sections/FrontendImageElementSection';
import { FrontendImageWithTextSection } from './sections/FrontendImageWithTextSection';
import { FrontendModel3DElementSection } from './sections/FrontendModel3DElementSection';
import { FrontendNewsletterSection } from './sections/FrontendNewsletterSection';
import { FrontendRichTextSection } from './sections/FrontendRichTextSection';
import { FrontendSlideshowSection } from './sections/FrontendSlideshowSection';
import { FrontendTestimonialsSection } from './sections/FrontendTestimonialsSection';
import { FrontendTextAtomSection } from './sections/FrontendTextAtomSection';
import { FrontendTextElementSection } from './sections/FrontendTextElementSection';
import { FrontendVideoSection } from './sections/FrontendVideoSection';
import { SectionBlockProvider } from './sections/SectionBlockContext';
import { getHoverEffectVars } from './theme-styles';

interface SectionContent {
  zone?: PageZone;
  settings?: Record<string, unknown>;
  blocks?: BlockInstance[];
}

const ZONE_ORDER: PageZone[] = ['header', 'template', 'footer'];

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

  const sections = components
    .map((comp: PageComponent, idx: number) => {
      const content = (comp.content ?? {}) as SectionContent;
      return {
        key: `section-${idx}`,
        id: `section-${idx}`,
        type: comp.type,
        zone: normalizePageZone(content.zone),
        settings: content.settings ?? {},
        blocks: content.blocks ?? [],
      };
    })
    .filter(
      (section: {
        key: string;
        id: string;
        type: string;
        zone: PageZone;
        settings: Record<string, unknown>;
        blocks: BlockInstance[];
      }) => !isCmsSectionHidden(section.settings['isHidden'])
    );

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
      <CmsPageProvider colorSchemes={colorSchemes ?? {}} layout={layout ?? {}}>
        <div className='cms-page cms-hover-scope' style={{ ...hoverVars, ...(mediaVars ?? {}) }}>
          {ZONE_ORDER.map((zone: PageZone) =>
            sectionsByZone[zone].map((section: (typeof sections)[number]) => {
              return (
                <GsapAnimationWrapper
                  key={section.key}
                  config={
                    section.settings['gsapAnimation'] as Partial<GsapAnimationConfig> | undefined
                  }
                >
                  <CssAnimationWrapper
                    config={section.settings['cssAnimation'] as CssAnimationConfig | undefined}
                  >
                    <EventEffectsWrapper settings={section.settings}>
                      <SectionRenderer
                        type={section.type}
                        sectionId={section.id}
                        settings={section.settings}
                        blocks={section.blocks}
                      />
                    </EventEffectsWrapper>
                  </CssAnimationWrapper>
                </GsapAnimationWrapper>
              );
            })
          )}
        </div>
      </CmsPageProvider>
    </MediaStylesProvider>
  );
}

interface SectionRendererProps {
  type: string;
  sectionId: string;
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
}

export function SectionRenderer({
  type,
  sectionId,
  settings,
  blocks,
}: SectionRendererProps): React.ReactNode {
  return (
    <SectionBlockProvider sectionId={sectionId} settings={settings} blocks={blocks}>
      <SectionRendererInner type={type} />
    </SectionBlockProvider>
  );
}

interface SectionRendererInnerProps {
  type: string;
}

function SectionRendererInner({ type }: SectionRendererInnerProps): React.ReactNode {
  switch (type) {
    case 'AnnouncementBar':
      return <FrontendAnnouncementBarSection />;
    case 'Block':
      return <FrontendBlockSection />;
    case 'TextElement':
      return <FrontendTextElementSection />;
    case 'TextAtom':
      return <FrontendTextAtomSection />;
    case 'ImageElement':
      return <FrontendImageElementSection />;
    case 'Model3DElement':
      return <FrontendModel3DElementSection />;
    case 'ButtonElement':
      return <FrontendButtonElementSection />;
    case 'Hero':
      return <FrontendHeroSection />;
    case 'ImageWithText':
      return <FrontendImageWithTextSection />;
    case 'RichText':
      return <FrontendRichTextSection />;
    case 'Grid':
      return <FrontendGridSection />;
    case 'Accordion':
      return <FrontendAccordionSection />;
    case 'Testimonials':
      return <FrontendTestimonialsSection />;
    case 'Video':
      return <FrontendVideoSection />;
    case 'Slideshow':
      return <FrontendSlideshowSection />;
    case 'Newsletter':
      return <FrontendNewsletterSection />;
    case 'ContactForm':
      return <FrontendContactFormSection />;
    default:
      return null;
  }
}
