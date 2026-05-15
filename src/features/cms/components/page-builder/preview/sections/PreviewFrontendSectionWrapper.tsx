import React from 'react';
import { cn } from '@/shared/utils/ui-utils';
import { type SectionInstance } from '@/shared/contracts/cms';
import { PreviewFrontendSection } from '../PreviewFrontendSection';

type FrontendSectionProps = {
  section: SectionInstance;
  renderSelectionButton: (className?: string) => React.ReactNode;
  renderSectionActions: () => React.ReactNode;
  selectableSectionProps: React.HTMLAttributes<HTMLDivElement>;
  selectedRing: string;
  divider: React.ReactNode;
  wrapInspector: (node: React.ReactNode) => React.ReactNode;
};

export const PreviewFrontendSectionWrapper: React.FC<FrontendSectionProps> = ({
  section,
  renderSelectionButton,
  renderSectionActions,
  selectableSectionProps,
  selectedRing,
  divider,
  wrapInspector,
}) => {
  return wrapInspector(
    <div
      {...selectableSectionProps}
      className={cn(
        'relative group w-full text-left transition cursor-pointer',
        selectedRing
      )}
    >
      {renderSelectionButton()}
      {renderSectionActions()}
      {divider}
      <PreviewFrontendSection
        type={section.type}
        sectionId={section.id}
        settings={section.settings}
        blocks={section.blocks}
      />
    </div>
  );
};
