import React from 'react';
import { Card } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';
import { getSectionStyles } from '../frontend/theme-styles';
import { getBlockTypographyStyles } from '../frontend/theme-styles';
import { resolveCmsConnectedSettings } from '@/features/cms/components/frontend/CmsRuntimeContext';
import { type SectionInstance } from '@/shared/contracts/cms';
import { type ColorSchemeColors } from '@/shared/contracts/cms-theme';

import { type CmsRuntimeContextValue } from '@/features/cms/components/frontend/CmsRuntimeShared';

type TextSectionProps = {
  section: SectionInstance;
  colorSchemes?: Record<string, ColorSchemeColors>;
  runtime: CmsRuntimeContextValue | null;
  showEditorChrome: boolean;
  renderSelectionButton: (className?: string) => React.ReactNode;
  renderSectionActions: () => React.ReactNode;
  selectableSectionProps: React.HTMLAttributes<HTMLDivElement>;
  selectedRing: string;
  divider: React.ReactNode;
  wrapInspector: (node: React.ReactNode) => React.ReactNode;
};

export const PreviewTextElementSection: React.FC<TextSectionProps> = ({
  section,
  colorSchemes,
  runtime,
  showEditorChrome,
  renderSelectionButton,
  renderSectionActions,
  selectableSectionProps,
  selectedRing,
  divider,
  wrapInspector,
}) => {
  const resolvedSettings = resolveCmsConnectedSettings(section.type, section.settings, runtime);
  const text = (resolvedSettings['textContent'] as string) || '';
  const typoStyles = getBlockTypographyStyles(resolvedSettings);

  if (!text.trim() && !showEditorChrome) return null;

  return wrapInspector(
    <div
      {...selectableSectionProps}
      style={getSectionStyles(resolvedSettings, colorSchemes)}
      className={cn('relative group w-full text-left transition cursor-pointer', selectedRing)}
    >
      {renderSelectionButton()}
      {renderSectionActions()}
      {divider}
      {text ? (
        <p className='m-0 p-0 text-base leading-relaxed text-gray-200' style={typoStyles}>
          {text}
        </p>
      ) : (
        <Card
          variant='subtle-compact'
          padding='sm'
          className='border-dashed border-border/40 bg-gray-800/20 text-gray-500'
        >
          Text element
        </Card>
      )}
    </div>
  );
};
