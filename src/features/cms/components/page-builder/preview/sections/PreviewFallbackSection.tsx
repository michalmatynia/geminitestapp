import React from 'react';
import { cn } from '@/shared/utils/ui-utils';
import { getSectionStyles } from '../../../frontend/theme-styles';
import { type SectionInstance } from '@/shared/contracts/cms';
import { type ColorSchemeColors } from '@/shared/contracts/cms-theme';

type FallbackSectionProps = {
  section: SectionInstance;
  colorSchemes?: Record<string, ColorSchemeColors>;
  showEditorChrome: boolean;
  renderSelectionButton: (className?: string) => React.ReactNode;
  renderSectionActions: () => React.ReactNode;
  selectableSectionProps: React.HTMLAttributes<HTMLDivElement>;
  selectedRing: string;
  divider: React.ReactNode;
  wrapInspector: (node: React.ReactNode) => React.ReactNode;
};

export const PreviewFallbackSection: React.FC<FallbackSectionProps> = ({
  section,
  colorSchemes,
  showEditorChrome,
  renderSelectionButton,
  renderSectionActions,
  selectableSectionProps,
  selectedRing,
  divider,
  wrapInspector,
}) => {
  if (!showEditorChrome) return null;

  return wrapInspector(
    <div
      {...selectableSectionProps}
      style={getSectionStyles(section.settings, colorSchemes)}
      className={cn('relative group w-full px-4 text-left transition cursor-pointer', selectedRing)}
    >
      {renderSelectionButton()}
      {renderSectionActions()}
      {divider}
      <p className='text-sm text-gray-500'>Unsupported section type: {section.type}</p>
    </div>
  );
};
