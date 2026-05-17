import dynamic from 'next/dynamic';
import React from 'react';

import { type CmsStorefrontAppearanceMode } from '@/shared/ui/cms-appearance/CmsStorefrontAppearance.contracts';
import { resolveStorefrontAppearanceColorSchemes } from '@/shared/ui/cms-appearance/CmsStorefrontAppearance.logic';
import { buildHierarchyIndexes } from '@/features/cms/hooks/page-builder/section-hierarchy';
import type {
  PageComponentInput,
  BlockInstance,
  PageZone,
  SectionInstance,
} from '@/shared/contracts/cms';
import type { ColorSchemeColors } from '@/shared/contracts/cms-theme';

import { CmsPageProvider } from './CmsPageContext';
import {
  resolveCmsConnectedSettings,
  type CmsRuntimeContextValue,
} from './CmsRuntimeShared';
import { SectionSubtree } from './page-renderer/SectionSubtree';
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
import { FrontendNewsletterSection } from './sections/FrontendNewsletterSection';
import { FrontendSlideshowSection } from './sections/FrontendSlideshowSection';
import { FrontendTestimonialsSection } from './sections/FrontendTestimonialsSection';
import { FrontendTextAtomSection } from './sections/FrontendTextAtomSection';
import { FrontendTextElementSection } from './sections/FrontendTextElementSection';
import { SectionBlockProvider } from './sections/SectionBlockContext';
import { getHoverEffectVars } from './theme-styles';

const FrontendModel3DElementSection = dynamic(() => import('./sections/FrontendModel3DElementSection').then(mod => mod.FrontendModel3DElementSection));
const FrontendVideoSection = dynamic(() => import('./sections/FrontendVideoSection').then(mod => mod.FrontendVideoSection));
const FrontendRichTextSection = dynamic(() => import('./sections/FrontendRichTextSection').then(mod => mod.FrontendRichTextSection));

const ZONE_ORDER: PageZone[] = ['header', 'template', 'footer'];

const normalizeZone = (zone: unknown): PageZone => {
  if (zone === 'header' || zone === 'template' || zone === 'footer') {
    return zone;
  }
  return 'template';
};

export interface CmsPageRendererProps {
  components: PageComponentInput[];
  colorSchemes?: Record<string, ColorSchemeColors> | undefined;
  layout?: { fullWidth?: boolean } | undefined;
  hoverEffect?: string | undefined;
  hoverScale?: number | undefined;
  mediaVars?: React.CSSProperties | undefined;
  mediaStyles?: React.CSSProperties | null | undefined;
  appearanceMode?: CmsStorefrontAppearanceMode | undefined;
}

type CmsPageRendererBaseProps = CmsPageRendererProps & {
  runtime: CmsRuntimeContextValue | null;
};

export function renderCmsPageRenderer(props: CmsPageRendererBaseProps): React.ReactNode {
  const { components, colorSchemes, layout, hoverEffect, hoverScale, mediaVars, mediaStyles, runtime } =
    props;

  const hoverVars = getHoverEffectVars(hoverEffect, hoverScale);
  const resolvedMediaStyles = mediaStyles ?? null;
  const resolvedColorSchemes = resolveStorefrontAppearanceColorSchemes(
    colorSchemes ?? {},
    props.appearanceMode ?? 'default'
  );
  const resolvedLayout = layout ?? {};

  const sections: SectionInstance[] = components.flatMap((comp: PageComponentInput) => {
    const sectionId = comp.content.sectionId;
    if (typeof sectionId !== 'string' || sectionId.trim().length === 0) return [];
    return [
      {
        id: sectionId,
        type: comp.type,
        zone: normalizeZone(comp.content.zone),
        parentSectionId: comp.content.parentSectionId,
        settings: comp.content.settings,
        blocks: comp.content.blocks,
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
        <div
          className='cms-page cms-hover-scope'
          data-appearance-mode={props.appearanceMode ?? 'default'}
          style={{ ...hoverVars, ...(mediaVars ?? {}) }}
        >
          {ZONE_ORDER.map((zone: PageZone) =>
            rootSectionIdsByZone[zone].map((rootId: string) => (
              <SectionSubtree key={rootId} sectionId={rootId} depth={1} hierarchy={hierarchy} runtime={runtime} />
            ))
          )}
        </div>
      </CmsPageProvider>
    </MediaStylesProvider>
  );
}

export interface SectionRendererProps {
  type: string;
  sectionId: string;
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
}

type SectionRendererBaseProps = SectionRendererProps & {
  runtime: CmsRuntimeContextValue | null;
};

export function renderSectionRenderer(props: SectionRendererBaseProps): React.ReactNode {
  const { type, sectionId, settings, blocks, runtime } = props;
  const resolvedSettings = resolveCmsConnectedSettings(type, settings, runtime);

  return (
    <SectionBlockProvider sectionId={sectionId} settings={resolvedSettings} blocks={blocks}>
      <SectionRendererInner type={type} />
    </SectionBlockProvider>
  );
}

interface SectionRendererInnerProps {
  type: string;
}

const SECTION_RENDERERS: Record<string, () => React.ReactNode> = {
  AnnouncementBar: () => <FrontendAnnouncementBarSection />,
  Block: () => <FrontendBlockSection />,
  TextElement: () => <FrontendTextElementSection />,
  TextAtom: () => <FrontendTextAtomSection />,
  ImageElement: () => <FrontendImageElementSection />,
  Model3DElement: () => <FrontendModel3DElementSection />,
  ButtonElement: () => <FrontendButtonElementSection />,
  Hero: () => <FrontendHeroSection />,
  ImageWithText: () => <FrontendImageWithTextSection />,
  RichText: () => <FrontendRichTextSection />,
  Grid: () => <FrontendGridSection />,
  Accordion: () => <FrontendAccordionSection />,
  Testimonials: () => <FrontendTestimonialsSection />,
  Video: () => <FrontendVideoSection />,
  Slideshow: () => <FrontendSlideshowSection />,
  Newsletter: () => <FrontendNewsletterSection />,
  ContactForm: () => <FrontendContactFormSection />,
};

function SectionRendererInner(props: SectionRendererInnerProps): React.ReactNode {
  const renderSection = SECTION_RENDERERS[props.type];
  return renderSection ? renderSection() : null;
}
