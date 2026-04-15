'use client';

import dynamic from 'next/dynamic';

import { PlaywrightStepSequencerProvider } from '@/features/playwright/context/PlaywrightStepSequencerContext';
import { usePlaywrightStepSequencerState } from '@/features/playwright/hooks/usePlaywrightStepSequencerState';

const PlaywrightStepSequencerPanel = dynamic(
  () =>
    import(
      '@/features/playwright/components/step-sequencer/PlaywrightStepSequencerPanel'
    ).then((mod) => mod.PlaywrightStepSequencerPanel),
  { ssr: false }
);

const ConfirmModal = dynamic(
  () =>
    import('@/shared/ui/templates/modals/ConfirmModal').then(
      (mod: typeof import('@/shared/ui/templates/modals/ConfirmModal')) => mod.ConfirmModal
    ),
  { ssr: false }
);

export function AdminPlaywrightStepSequencerPageRuntime(): React.JSX.Element {
  const state = usePlaywrightStepSequencerState();

  return (
    <PlaywrightStepSequencerProvider value={state}>
      {/* Save-action confirmation / name dialog */}
      {state.isSaveActionOpen ? (
        <ConfirmModal
          isOpen={state.isSaveActionOpen}
          onClose={() => state.setIsSaveActionOpen(false)}
          onConfirm={() => void state.handleSaveAction()}
          title='Save Action'
          message={`Save action "${state.actionDraftName}" with ${state.actionStepSets.length} step set(s)?`}
          confirmText='Save'
          loading={state.isSaving}
        />
      ) : null}

      <PlaywrightStepSequencerPanel />
    </PlaywrightStepSequencerProvider>
  );
}
