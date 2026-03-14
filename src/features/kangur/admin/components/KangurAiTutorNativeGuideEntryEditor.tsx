'use client';

import * as React from 'react';
import { Card } from '@/shared/ui';
import type { KangurAiTutorNativeGuideEntry } from '@/shared/contracts/kangur-ai-tutor-native-guide';
import type { KangurAiTutorOnboardingValidationIssue } from '@/features/kangur/ai-tutor-onboarding-validation';

import {
  KangurAiTutorNativeGuideEntryEditorProvider,
  useKangurAiTutorNativeGuideEntryEditor,
} from './observability/KangurAiTutorNativeGuideEntryEditorContext';
import {
  DescriptionSection,
  EntryHeader,
  FollowUpActionsSection,
  IdentitySection,
  KnowledgeSourceSection,
  MatchingSection,
  RelatedContentSection,
  RenderValidationIssues,
  SurfaceFocusSection,
} from './observability/GuideEditorSections';

type Props = {
  selectedEntry: KangurAiTutorNativeGuideEntry | null;
  totalEntries: number;
  isSaving: boolean;
  selectedEntryValidationIssues: KangurAiTutorOnboardingValidationIssue[];
  followUpActionsEditorValue: string;
  onFollowUpActionsEditorValueChange: (value: string) => void;
  updateSelectedEntry: (
    updater: (entry: KangurAiTutorNativeGuideEntry) => KangurAiTutorNativeGuideEntry
  ) => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
  onApplyFollowUpActions: () => void;
  className: string;
};

export function KangurAiTutorNativeGuideEntryEditor(props: Props): React.JSX.Element {
  return (
    <KangurAiTutorNativeGuideEntryEditorProvider value={props}>
      <KangurAiTutorNativeGuideEntryEditorContent className={props.className} />
    </KangurAiTutorNativeGuideEntryEditorProvider>
  );
}

function KangurAiTutorNativeGuideEntryEditorContent({
  className,
}: {
  className: string;
}): React.JSX.Element {
  const { selectedEntry, selectedEntryValidationIssues } = useKangurAiTutorNativeGuideEntryEditor();

  return (
    <Card variant='subtle' padding='md' className={className}>
      {selectedEntry ? (
        <div className='space-y-4'>
          <EntryHeader />

          <RenderValidationIssues
            issues={selectedEntryValidationIssues.filter((issue) => issue.field === 'sequence')}
          />

          <IdentitySection />
          <SurfaceFocusSection />
          <DescriptionSection />
          <KnowledgeSourceSection />
          <MatchingSection />
          <RelatedContentSection />
          <FollowUpActionsSection />
        </div>
      ) : (
        <div className='rounded-2xl border border-dashed border-border/70 bg-background/40 px-4 py-10 text-sm text-muted-foreground'>
          Select a guide entry to edit it.
        </div>
      )}
    </Card>
  );
}
