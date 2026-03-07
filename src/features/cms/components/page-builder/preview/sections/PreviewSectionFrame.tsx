'use client';

import React from 'react';

import { getSectionStyles } from '@/features/cms/public';
import { useCmsPageContext } from '@/features/cms/components/frontend/CmsPageContext';
import { getSelectableSurfaceProps } from '@/features/cms/components/page-builder/preview/preview-utils';
import { usePreviewSectionContext } from '@/features/cms/components/page-builder/preview/context/PreviewSectionContext';
import { cn } from '@/shared/utils';

interface PreviewSectionFrameProps {
  dividerPosition?: 'before' | 'after';
  topSlot?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function PreviewSectionFrame({
  dividerPosition = 'before',
  topSlot,
  className,
  children,
}: PreviewSectionFrameProps): React.JSX.Element {
  const { colorSchemes } = useCmsPageContext();
  const {
    section,
    selectedRing,
    handleSelect,
    wrapInspector,
    renderSectionActions,
    renderSelectionButton,
    divider,
  } = usePreviewSectionContext();

  const sectionStyles = getSectionStyles(section.settings, colorSchemes);
  const selectableSectionProps = getSelectableSurfaceProps((event) => {
    event.stopPropagation();
    handleSelect();
  });

  const frame = (
    <div
      {...selectableSectionProps}
      style={sectionStyles}
      className={cn(
        'relative group w-full cursor-pointer text-left transition',
        selectedRing,
        section.id ? `cms-node-${section.id}` : null,
        className
      )}
    >
      {renderSelectionButton()}
      {renderSectionActions()}
      {dividerPosition === 'before' ? divider : null}
      {topSlot}
      {dividerPosition === 'after' ? divider : null}
      {children}
    </div>
  );

  return <>{wrapInspector(frame)}</>;
}
