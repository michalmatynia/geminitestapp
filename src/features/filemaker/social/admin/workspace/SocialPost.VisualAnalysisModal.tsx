'use client';

import React from 'react';

import { Button, FormModal } from '@/shared/ui';
import { useSocialPostContext } from './SocialPostContext';
import { SocialVisualAnalysisModalHeader } from './SocialPost.VisualAnalysisModalHeader';
import { SocialVisualAnalysisModalResult } from './SocialPost.VisualAnalysisModalResult';
import {
  SocialVisualAnalysisSelectedVisuals,
  useVisualAnalysisPersonaNames,
} from './SocialPost.VisualAnalysisModalSelectedVisuals';
import {
  buildVisualAnalysisModalMetadata,
  buildVisualAnalysisModalRuntimeState,
  buildVisualAnalysisModalSelectionState,
  resolveVisionModelLabel,
  type SocialVisualAnalysisModalContext,
  type VisualAnalysisModalRuntimeState,
} from './SocialPost.VisualAnalysisModalState';

const MODAL_SUBTITLE =
  'Analyze the selected visuals to produce a visual description first. Then use Generate post with analysis to combine that description with the current context in a separate AI pass.';

function AnalyzeVisualsButton({
  context,
  runtime,
}: {
  context: SocialVisualAnalysisModalContext;
  runtime: VisualAnalysisModalRuntimeState;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      onClick={() => {
        void context.handleAnalyzeSelectedVisuals();
      }}
      disabled={runtime.isAnalyzeDisabled}
      title={runtime.analyzeButtonTitle}
    >
      {runtime.analyzeText}
    </Button>
  );
}

export function SocialPostVisualAnalysisModal(): React.JSX.Element | null {
  const context = useSocialPostContext();
  const selection = buildVisualAnalysisModalSelectionState(context);
  const metadata = buildVisualAnalysisModalMetadata(context);
  const runtime = buildVisualAnalysisModalRuntimeState({ context, metadata, selection });
  const personaNameById = useVisualAnalysisPersonaNames(selection);

  return (
    <FormModal
      open={context.isVisualAnalysisModalOpen}
      onClose={context.handleCloseVisualAnalysisModal}
      title='Image analysis pipeline'
      subtitle={MODAL_SUBTITLE}
      onSave={() => {
        void context.handleGeneratePostWithVisualAnalysis();
      }}
      saveText={runtime.saveText}
      saveTitle={runtime.saveButtonTitle}
      isSaveDisabled={runtime.isSaveDisabled}
      showSaveButton={true}
      cancelText='Close'
      size='xl'
      actions={<AnalyzeVisualsButton context={context} runtime={runtime} />}
    >
      <div className='space-y-4'>
        <SocialVisualAnalysisModalHeader
          context={context}
          metadata={metadata}
          modelLabel={resolveVisionModelLabel(context)}
          selection={selection}
        />
        <SocialVisualAnalysisSelectedVisuals
          context={context}
          personaNameById={personaNameById}
          selection={selection}
        />
        <SocialVisualAnalysisModalResult context={context} metadata={metadata} />
      </div>
    </FormModal>
  );
}
