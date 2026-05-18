'use client';

import React from 'react';

import { FormModal } from '@/shared/ui';
import { usePlaywrightPersonas } from '@/shared/hooks/usePlaywrightPersonas';

import { useSocialPostContext } from './SocialPostContext';
import { SocialPostPlaywrightCaptureModalActions } from './SocialPost.PlaywrightCaptureModalActions';
import { SocialPostPlaywrightCaptureModalContent } from './SocialPost.PlaywrightCaptureModalContent';
import { useSocialPostPlaywrightCaptureModalState } from './SocialPost.PlaywrightCaptureModal.runtime';

const useProgrammablePlaywrightPersonas = (modalOpen: boolean): ReturnType<typeof usePlaywrightPersonas> =>
  usePlaywrightPersonas({ enabled: modalOpen });

export function SocialPostPlaywrightCaptureModal(): React.JSX.Element {
  const context = useSocialPostContext();
  const personasQuery = useProgrammablePlaywrightPersonas(
    context.isProgrammablePlaywrightModalOpen
  );
  const state = useSocialPostPlaywrightCaptureModalState({
    context,
    personas: personasQuery.data,
  });

  return (
    <FormModal
      open={context.isProgrammablePlaywrightModalOpen}
      onClose={context.handleCloseProgrammablePlaywrightModal}
      title='Programmable Playwright capture'
      subtitle='Choose a persona, edit the script, and define custom capture routes for fresh Social visuals.'
      onSave={() => {
        void context.handleRunProgrammablePlaywrightCapture();
      }}
      saveText={
        state.isConfigEditingLocked ? 'Capture in progress...' : 'Capture programmable images'
      }
      saveTitle={state.captureSaveTitle}
      isSaveDisabled={!state.canSave}
      showSaveButton={true}
      cancelText='Close'
      size='xl'
      actions={<SocialPostPlaywrightCaptureModalActions context={context} state={state} />}
    >
      <SocialPostPlaywrightCaptureModalContent
        context={context}
        personasError={personasQuery.error}
        personasLoading={personasQuery.isLoading}
        state={state}
      />
    </FormModal>
  );
}
