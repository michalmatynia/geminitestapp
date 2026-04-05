import Link from 'next/link';

import { Badge, FormField, SelectSimple } from '@/features/kangur/shared/ui';
import { KangurAdminCard } from '@/features/kangur/admin/components/KangurAdminCard';
import { BRAIN_MODEL_DEFAULT_VALUE } from '../AdminKangurSocialPage.Constants';
import { useSocialPostContext } from '../SocialPostContext';
import { useSocialSettingsModalContext } from './SocialSettingsModalContext';

const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

export function SocialSettingsModelsTab() {
  const context = useSocialPostContext();
  const state = useSocialSettingsModalContext();

  const {
    brainModelId,
    visionModelId,
    handleBrainModelChange,
    handleVisionModelChange,
    brainModelOptions,
    visionModelOptions,
    currentGenerationJob,
    currentPipelineJob,
    currentVisualAnalysisJob,
  } = context;

  const {
    brainModelBadgeLabel,
    brainModelSelectOptions,
    visionModelBadgeLabel,
    visionModelSelectOptions,
  } = state;

  const isRuntimeLocked =
    isSocialRuntimeJobInFlight(currentVisualAnalysisJob?.status) ||
    isSocialRuntimeJobInFlight(currentGenerationJob?.status) ||
    isSocialRuntimeJobInFlight(currentPipelineJob?.status);

  const brainModelOptionsLoading = brainModelOptions.isLoading;
  const visionModelOptionsLoading = visionModelOptions.isLoading;

  const brainModelTitle = isRuntimeLocked
    ? 'Wait for the current Social runtime job to finish.'
    : brainModelOptionsLoading
      ? 'Loading AI Brain model options...'
      : 'Selected brain model';
  const visionModelTitle = isRuntimeLocked
    ? 'Wait for the current Social runtime job to finish.'
    : visionModelOptionsLoading
      ? 'Loading AI Brain vision model options...'
      : 'Selected vision model';
  const brainModelSelectProps = {
    value: brainModelId ?? BRAIN_MODEL_DEFAULT_VALUE,
    onValueChange: handleBrainModelChange,
    options: brainModelSelectOptions,
    ariaLabel: 'Selected brain model',
    disabled: brainModelOptionsLoading || isRuntimeLocked,
    title: brainModelTitle,
    variant: 'subtle' as const,
  };
  const visionModelSelectProps = {
    value: visionModelId ?? BRAIN_MODEL_DEFAULT_VALUE,
    onValueChange: handleVisionModelChange,
    options: visionModelSelectOptions,
    ariaLabel: 'Selected vision model',
    title: visionModelTitle,
    disabled: visionModelOptionsLoading || isRuntimeLocked,
    variant: 'subtle' as const,
  };
  return (
    <div className='grid gap-4 xl:grid-cols-2'>
      <KangurAdminCard>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <div className='text-sm font-semibold text-foreground'>Brain model</div>
            <div className='text-sm text-muted-foreground'>Capability: StudiQ Social Post Generation</div>
          </div>
          <Badge variant='outline'>{brainModelBadgeLabel}</Badge>
        </div>
        <div className='mt-3 space-y-3 text-sm text-muted-foreground'>
          <p>Available models are provided by AI Brain. Choose a specific model or keep the routing default.</p>
          <FormField label='Selected brain model' description='Use Brain routing follows the current AI Brain default for this capability.'>
            <SelectSimple {...brainModelSelectProps} />
          </FormField>
          {brainModelBadgeLabel === 'Not configured' ? (
            <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-200'>
              No model is currently active. Choose one from the list or assign AI Brain routing for this capability.
            </div>
          ) : (
            <p>Current effective model: {brainModelBadgeLabel}</p>
          )}
          <Link
            href='/admin/brain?tab=routing'
            className='inline-flex items-center text-sm font-medium text-foreground underline underline-offset-4'
          >
            Open AI Brain routing
          </Link>
        </div>
      </KangurAdminCard>

      <KangurAdminCard>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <div className='text-sm font-semibold text-foreground'>Vision model</div>
            <div className='text-sm text-muted-foreground'>Capability: StudiQ Social Visual Analysis</div>
          </div>
          <Badge variant='outline'>{visionModelBadgeLabel}</Badge>
        </div>
        <div className='mt-3 space-y-3 text-sm text-muted-foreground'>
          <p>Available vision models are provided by AI Brain. Choose a specific model or keep the routing default.</p>
          <FormField label='Selected vision model' description='Use Brain routing follows the current AI Brain default for visual analysis.'>
            <SelectSimple {...visionModelSelectProps} />
          </FormField>
          {visionModelBadgeLabel === 'Not configured' ? (
            <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-200'>
              No vision model is currently active. Choose one from the list or assign AI Brain routing for this capability.
            </div>
          ) : (
            <p>Current effective model: {visionModelBadgeLabel}</p>
          )}
          <Link
            href='/admin/brain?tab=routing'
            className='inline-flex items-center text-sm font-medium text-foreground underline underline-offset-4'
          >
            Open AI Brain routing
          </Link>
        </div>
      </KangurAdminCard>
    </div>
  );
}
