import React from 'react';
import { EventEffectsWrapper } from '@/features/cms/components/shared/EventEffectsWrapper';
import { isCmsSectionHidden } from '@/features/cms/utils/page-builder-normalization';
import { buildHierarchyIndexes } from '@/features/cms/hooks/page-builder/section-hierarchy';
import type { GsapAnimationConfig } from '@/features/gsap';
import type { CssAnimationConfig } from '@/shared/contracts/cms';
import type {
  PageComponentInput,
  BlockInstance,
  PageZone,
  SectionInstance,
} from '@/shared/contracts/cms';
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

const ZONE_ORDER: PageZone[] = ['header', 'template', 'footer'];

const normalizeZone = (zone: unknown): PageZone => {
  if (zone === 'header' || zone === 'template' || zone === 'footer') {
    return zone;
  }
  return 'template';
};

interface CmsPageRendererProps {
  components: PageComponentInput[];
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
  const resolvedMediaStyles = React.useMemo(() => mediaStyles ?? null, [mediaStyles]);
  const resolvedColorSchemes = React.useMemo(() => colorSchemes ?? {}, [colorSchemes]);
  const resolvedLayout = React.useMemo(() => layout ?? {}, [layout]);

  const sections: SectionInstance[] = components.flatMap((comp: PageComponentInput) => {
    const sectionId = comp.content.sectionId;
    if (typeof sectionId !== 'string' || sectionId.trim().length === 0) return [];
    return [
      {
        id: sectionId,
        type: comp.type,
        zone: normalizeZone(comp.content.zone),
        parentSectionId: comp.content.parentSectionId,
        settings: comp.content.settings ?? {},
        blocks: comp.content.blocks ?? [],
      },
    ];
  });

  const hierarchy = buildHierarchyIndexes(sections);
  const rootSectionIdsByZone: Record<PageZone, string[]> = {
    header: [],
    template: [],
    footer: [],
  };
  (hierarchy.childrenByParent.get(null) ?? []).forEach((rootId: string) => {
    const root = hierarchy.nodeById.get(rootId);
    if (!root) return;
    rootSectionIdsByZone[root.zone].push(rootId);
  });

  return (
    <MediaStylesProvider value={resolvedMediaStyles}>
      <CmsPageProvider colorSchemes={resolvedColorSchemes} layout={resolvedLayout}>
        <div className='cms-page cms-hover-scope' style={{ ...hoverVars, ...(mediaVars ?? {}) }}>
          {ZONE_ORDER.map((zone: PageZone) =>
            rootSectionIdsByZone[zone].map((rootId: string) => {
              const renderSectionSubtree = (sectionId: string, depth: number): React.ReactNode => {
                const section = hierarchy.nodeById.get(sectionId);
                if (!section) return null;
                if (isCmsSectionHidden(section.settings['isHidden'])) return null;
                const childIds = hierarchy.childrenByParent.get(section.id) ?? [];

                return (
                  <div key={section.id}>
                    <GsapAnimationWrapper
                      config={
                        section.settings['gsapAnimation'] as
                          | Partial<GsapAnimationConfig>
                          | undefined
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
                    {childIds.length > 0 ? (
                      <div
                        className={
                          depth === 1
                            ? 'ml-4 border-l border-white/10 pl-3'
                            : 'ml-5 border-l border-white/10 pl-3'
                        }
                      >
                        {childIds.map((childId: string) =>
                          renderSectionSubtree(childId, depth + 1)
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              };

              return renderSectionSubtree(rootId, 1);
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
