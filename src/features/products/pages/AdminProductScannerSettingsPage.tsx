'use client';

import { useMemo, type JSX } from 'react';

import { AdminSettingsPageLayout } from '@/shared/ui/admin.public';
import { FormActions, Hint } from '@/shared/ui/forms-and-actions.public';

import { resolveAmazonEvaluatorModelLabel } from './scanner-settings/adminProductScannerSettings.copy';
import { AdminAmazonEvaluatorSection } from './scanner-settings/AdminAmazonEvaluatorSection';
import { AdminScannerRuntimeSection } from './scanner-settings/AdminScannerRuntimeSection';
import { AdminSupplier1688EvaluatorSection } from './scanner-settings/AdminSupplier1688EvaluatorSection';
import { AdminSupplier1688ScannerSection } from './scanner-settings/AdminSupplier1688ScannerSection';
import { useAdminProductScannerSettings } from './scanner-settings/useAdminProductScannerSettings';
import type { SelectOption } from './scanner-settings/adminProductScannerSettings.types';

type ScannerSettingsState = ReturnType<typeof useAdminProductScannerSettings>;

const buildModelOptions = (models: string[]): SelectOption[] =>
  models.map((modelId) => ({ value: modelId, label: modelId }));

const resolve1688ModelLabel = (
  mode: string,
  modelId: string | null,
  brainDefaultModelLabel: string
): string => {
  if (mode === 'disabled') return 'Disabled';
  if (mode === 'brain_default') {
    const trimmed = brainDefaultModelLabel.trim();
    return trimmed.length > 0 ? trimmed : 'Not configured in AI Brain';
  }
  const trimmedModelId = modelId?.trim() ?? '';
  return trimmedModelId.length > 0 ? trimmedModelId : 'Select a model';
};

const resolveScannerModelLabels = (state: ScannerSettingsState): {
  extractionModel: string;
  probeModel: string;
  supplier1688Model: string;
  triageModel: string;
} => ({
  probeModel: resolveAmazonEvaluatorModelLabel(
    state.draft.amazonCandidateEvaluatorProbe,
    state.amazonBrain.effectiveModelId
  ),
  triageModel: resolveAmazonEvaluatorModelLabel(
    state.draft.amazonCandidateEvaluatorTriage,
    state.amazonBrain.effectiveModelId
  ),
  extractionModel: resolveAmazonEvaluatorModelLabel(
    state.draft.amazonCandidateEvaluatorExtraction,
    state.amazonBrain.effectiveModelId
  ),
  supplier1688Model: resolve1688ModelLabel(
    state.draft.scanner1688CandidateEvaluator.mode,
    state.draft.scanner1688CandidateEvaluator.modelId,
    state.supplier1688Brain.effectiveModelId
  ),
});

export function AdminProductScannerSettingsPage(): JSX.Element {
  const state = useAdminProductScannerSettings();
  const amazonModelOptions = useMemo(
    () => buildModelOptions(state.amazonBrain.models),
    [state.amazonBrain.models]
  );
  const supplier1688ModelOptions = useMemo(
    () => buildModelOptions(state.supplier1688Brain.models),
    [state.supplier1688Brain.models]
  );
  const models = resolveScannerModelLabels(state);

  return (
    <AdminSettingsPageLayout
      title='Scanner Settings'
      current='Scanner Settings'
      description='Configure the global Playwright runtime used by product image scans.'
    >
      <div className='space-y-6'>
        <AdminScannerRuntimeSection
          draft={state.draft}
          setDraft={state.setDraft}
          personaOptions={state.personaOptions}
          personas={state.personas}
          selectedPersona={state.selectedPersona}
        />
        <AdminAmazonEvaluatorSection draftKey='amazonCandidateEvaluatorTriage' draft={state.draft} setDraft={state.setDraft} modelOptions={amazonModelOptions} effectiveModelLabel={models.triageModel} brain={state.amazonBrain} />
        <AdminAmazonEvaluatorSection draftKey='amazonCandidateEvaluatorProbe' draft={state.draft} setDraft={state.setDraft} modelOptions={amazonModelOptions} effectiveModelLabel={models.probeModel} brain={state.amazonBrain} />
        <AdminAmazonEvaluatorSection draftKey='amazonCandidateEvaluatorExtraction' draft={state.draft} setDraft={state.setDraft} modelOptions={amazonModelOptions} effectiveModelLabel={models.extractionModel} brain={state.amazonBrain} />
        <AdminSupplier1688ScannerSection draft={state.draft} setDraft={state.setDraft} />
        <AdminSupplier1688EvaluatorSection draft={state.draft} setDraft={state.setDraft} modelOptions={supplier1688ModelOptions} effectiveModelLabel={models.supplier1688Model} brain={state.supplier1688Brain} />
        <Hint variant='info' className='rounded-md border border-blue-500/20 bg-blue-500/5 p-4'>
          Product scan settings are global. By default, Amazon scans start in a visible browser on the auto browser profile. The shortcut in the product Scans tab links here for convenience.
        </Hint>
        <FormActions
          onSave={() => {
            void state.handleSave();
          }}
          saveText={state.dirty ? 'Save Settings' : 'Saved'}
          isDisabled={!state.dirty || state.isSaving}
          isSaving={state.isSaving}
          className='justify-start border-t border-border pt-6'
        />
      </div>
    </AdminSettingsPageLayout>
  );
}

export default AdminProductScannerSettingsPage;
