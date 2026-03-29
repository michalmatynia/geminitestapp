'use client';

import { Badge, FormField, SelectSimple } from '@/features/kangur/shared/ui';
import { KangurAdminCard } from '../../components/KangurAdminCard';
import { BRAIN_MODEL_DEFAULT_VALUE } from '../AdminKangurSocialPage.Constants';

export function SocialSettingsModelsTab({
  brainModelBadgeLabel,
  brainModelSelectOptions,
  brainModelId,
  handleBrainModelChange,
  brainModelOptionsLoading,
  visionModelBadgeLabel,
  visionModelSelectOptions,
  visionModelId,
  handleVisionModelChange,
  visionModelOptionsLoading,
}: {
  brainModelBadgeLabel: string;
  brainModelSelectOptions: Array<{ value: string; label: string; description?: string }>;
  brainModelId: string | null;
  handleBrainModelChange: (val: string) => void;
  brainModelOptionsLoading: boolean;
  visionModelBadgeLabel: string;
  visionModelSelectOptions: Array<{ value: string; label: string; description?: string }>;
  visionModelId: string | null;
  handleVisionModelChange: (val: string) => void;
  visionModelOptionsLoading: boolean;
}) {
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
            <SelectSimple
              value={brainModelId ?? BRAIN_MODEL_DEFAULT_VALUE}
              onValueChange={handleBrainModelChange}
              options={brainModelSelectOptions}
              ariaLabel='Selected brain model'
              title='Selected brain model'
              disabled={brainModelOptionsLoading}
              variant='subtle'
            />
          </FormField>
          {brainModelBadgeLabel === 'Not configured' ? (
            <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-200'>
              No model is currently active. Choose one from the list or assign AI Brain routing for this capability.
            </div>
          ) : (
            <p>Current effective model: {brainModelBadgeLabel}</p>
          )}
          <a href='/admin/brain?tab=routing' className='inline-flex items-center text-sm font-medium text-foreground underline underline-offset-4'>
            Open AI Brain routing
          </a>
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
            <SelectSimple
              value={visionModelId ?? BRAIN_MODEL_DEFAULT_VALUE}
              onValueChange={handleVisionModelChange}
              options={visionModelSelectOptions}
              ariaLabel='Selected vision model'
              title='Selected vision model'
              disabled={visionModelOptionsLoading}
              variant='subtle'
            />
          </FormField>
          {visionModelBadgeLabel === 'Not configured' ? (
            <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-200'>
              No vision model is currently active. Choose one from the list or assign AI Brain routing for this capability.
            </div>
          ) : (
            <p>Current effective model: {visionModelBadgeLabel}</p>
          )}
          <a href='/admin/brain?tab=routing' className='inline-flex items-center text-sm font-medium text-foreground underline underline-offset-4'>
            Open AI Brain routing
          </a>
        </div>
      </KangurAdminCard>
    </div>
  );
}
