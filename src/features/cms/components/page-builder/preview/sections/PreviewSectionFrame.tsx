'use client';

import React from 'react';

import { getSectionStyles } from '@/features/cms/components/frontend/theme-styles';
import { useCmsPageContext } from '@/features/cms/components/frontend/CmsPageContext';
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
    divider,
  } = usePreviewSectionContext();

  const sectionStyles = getSectionStyles(section.settings, colorSchemes);

  const frame = (
    <div
      role='button'
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(event: React.KeyboardEvent): void => {
        if (event.key === 'Enter' || event.key === ' ') handleSelect();
      }}
      style={sectionStyles}
      className={cn(
        'relative group w-full cursor-pointer text-left transition',
        selectedRing,
        section.id ? `cms-node-${section.id}` : null,
        className
      )}
    >
      {renderSectionActions()}
      {dividerPosition === 'before' ? divider : null}
      {topSlot}
      {dividerPosition === 'after' ? divider : null}
      {children}
    </div>
  );

  return <>{wrapInspector(frame)}</>;
}
