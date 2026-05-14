import React from 'react';
import type { GsapAnimationConfig } from '@/features/gsap/public';
import type { CssAnimationConfig } from '@/shared/contracts/cms';
import type { SectionInstance } from '@/shared/contracts/cms';
import { EventEffectsWrapper } from '@/features/cms/components/shared/EventEffectsWrapper';
import { CssAnimationWrapper } from '../CssAnimationWrapper';
import { GsapAnimationWrapper } from '../GsapAnimationWrapper';
import { renderSectionRenderer } from '../CmsPageRendererBase';
import { isCmsSectionHidden } from '@/features/cms/utils/page-builder-normalization';
import { isCmsNodeVisible, type CmsRuntimeContextValue } from '../CmsRuntimeShared';

export const SectionSubtree = ({
  sectionId,
  depth,
  hierarchy,
  runtime,
}: {
  sectionId: string;
  depth: number;
  hierarchy: any;
  runtime: CmsRuntimeContextValue | null;
}): React.JSX.Element | null => {
  const section = hierarchy.nodeById.get(sectionId) as SectionInstance | undefined;
  if (!section || isCmsSectionHidden(section.settings['isHidden']) || !isCmsNodeVisible(section.settings, runtime)) return null;

  const childIds = hierarchy.childrenByParent.get(section.id) ?? [];

  return (
    <div key={section.id}>
      <GsapAnimationWrapper config={section.settings['gsapAnimation'] as Partial<GsapAnimationConfig> | undefined}>
        <CssAnimationWrapper config={section.settings['cssAnimation'] as CssAnimationConfig | undefined}>
          <EventEffectsWrapper settings={section.settings}>
            {renderSectionRenderer({
              type: section.type,
              sectionId: section.id,
              settings: section.settings,
              blocks: section.blocks,
              runtime,
            })}
          </EventEffectsWrapper>
        </CssAnimationWrapper>
      </GsapAnimationWrapper>
      {childIds.length > 0 ? (
        <div
          style={{ borderColor: 'var(--cms-appearance-page-border)' }}
          className={depth === 1 ? 'ml-4 border-l pl-3' : 'ml-5 border-l pl-3'}
        >
          {childIds.map((childId: string) => (
            <SectionSubtree key={childId} sectionId={childId} depth={depth + 1} hierarchy={hierarchy} runtime={runtime} />
          ))}
        </div>
      ) : null}
    </div>
  );
};
