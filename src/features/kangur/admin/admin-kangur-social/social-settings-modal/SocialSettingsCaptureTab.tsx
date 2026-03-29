'use client';

import React from 'react';
import { Button, FormField, Input, SelectSimple } from '@/features/kangur/shared/ui';
import { KangurAdminCard } from '../../components/KangurAdminCard';
import { KANGUR_SOCIAL_CAPTURE_PRESETS } from '@/features/kangur/shared/social-capture-presets';
import {
  buildKangurSocialProgrammableCaptureRuntimeRequestPreview,
  KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT,
  resolveKangurSocialProgrammableCaptureRoutePreview,
} from '@/features/kangur/shared/social-playwright-capture';
import { cn } from '@/shared/utils';
import type {
  KangurSocialCaptureAppearanceMode,
  KangurSocialImageAddonsBatchResult,
  KangurSocialProgrammableCaptureRoute,
} from '@/shared/contracts/kangur-social-image-addons';
import type { AddonFormState } from '../AdminKangurSocialPage.Constants';
import { usePlaywrightPersonas } from '@/shared/hooks/usePlaywrightPersonas';
import { SocialJobStatusPill } from '../SocialJobStatusPill';

const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

export function SocialSettingsCaptureTab({
  addonForm,
  setAddonForm,
  handleCreateAddon,
  createAddonMutationPending,
  batchCaptureBaseUrl,
  setBatchCaptureBaseUrl,
  batchCapturePresetLimit,
  setBatchCapturePresetLimit,
  batchCapturePresetIds,
  handleToggleCapturePreset,
  selectAllCapturePresets,
  clearCapturePresets,
  handleBatchCapture,
  batchCaptureMutationPending,
  batchCaptureResult,
  batchCaptureLimitSummary,
  currentVisualAnalysisJob,
  currentGenerationJob,
  currentPipelineJob,
  hasSavedProgrammableCaptureDefaults,
  programmableCaptureDefaultsBaseUrl,
  programmableCaptureDefaultsPersonaId,
  programmableCaptureDefaultsScript,
  programmableCaptureDefaultsRoutes,
  captureAppearanceMode,
  handleOpenProgrammableCaptureModal,
  handleResetProgrammableCaptureDefaults,
}: {
  addonForm: AddonFormState;
  setAddonForm: React.Dispatch<React.SetStateAction<AddonFormState>>;
  handleCreateAddon: () => void;
  createAddonMutationPending: boolean;
  batchCaptureBaseUrl: string;
  setBatchCaptureBaseUrl: (val: string) => void;
  batchCapturePresetLimit: number | null;
  setBatchCapturePresetLimit: (val: string) => void;
  batchCapturePresetIds: string[];
  handleToggleCapturePreset: (id: string) => void;
  selectAllCapturePresets: () => void;
  clearCapturePresets: () => void;
  handleBatchCapture: () => void;
  batchCaptureMutationPending: boolean;
  batchCaptureResult: KangurSocialImageAddonsBatchResult | null;
  batchCaptureLimitSummary: string;
  currentVisualAnalysisJob: {
    id: string;
    status: string;
    progress: {
      message: string | null;
    } | null;
    failedReason: string | null;
  } | null;
  currentGenerationJob: {
    id: string;
    status: string;
    progress: {
      message: string | null;
    } | null;
    failedReason: string | null;
  } | null;
  currentPipelineJob: {
    id: string;
    status: string;
    progress: {
      message: string | null;
    } | null;
    failedReason: string | null;
  } | null;
  hasSavedProgrammableCaptureDefaults: boolean;
  programmableCaptureDefaultsBaseUrl: string | null;
  programmableCaptureDefaultsPersonaId: string | null;
  programmableCaptureDefaultsScript: string;
  programmableCaptureDefaultsRoutes: KangurSocialProgrammableCaptureRoute[];
  captureAppearanceMode: KangurSocialCaptureAppearanceMode;
  handleOpenProgrammableCaptureModal: () => void;
  handleResetProgrammableCaptureDefaults: () => void;
}) {
  const personasQuery = usePlaywrightPersonas({
    enabled: Boolean(programmableCaptureDefaultsPersonaId?.trim()),
  });
  const hasCustomProgrammableScript =
    programmableCaptureDefaultsScript !== KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT;
  const programmablePersonaSummary = React.useMemo(() => {
    const personaId = programmableCaptureDefaultsPersonaId?.trim();
    if (!personaId) {
      return 'Default runtime persona';
    }
    const resolvedName =
      personasQuery.data?.find((persona) => persona.id === personaId)?.name?.trim() ?? '';
    return resolvedName ? `${resolvedName} (${personaId})` : personaId;
  }, [personasQuery.data, programmableCaptureDefaultsPersonaId]);
  const programmableRouteSummaries = React.useMemo(
    () =>
      programmableCaptureDefaultsRoutes.map((route) => ({
        route,
        preview: resolveKangurSocialProgrammableCaptureRoutePreview(
          route.path,
          programmableCaptureDefaultsBaseUrl ?? ''
        ),
      })),
    [programmableCaptureDefaultsBaseUrl, programmableCaptureDefaultsRoutes]
  );
  const programmableRuntimeRequestPreview = React.useMemo(
    () =>
      buildKangurSocialProgrammableCaptureRuntimeRequestPreview({
        appearanceMode: captureAppearanceMode,
        personaId: programmableCaptureDefaultsPersonaId,
        routes: programmableCaptureDefaultsRoutes,
        baseUrl: programmableCaptureDefaultsBaseUrl ?? '',
      }),
    [
      captureAppearanceMode,
      programmableCaptureDefaultsBaseUrl,
      programmableCaptureDefaultsPersonaId,
      programmableCaptureDefaultsRoutes,
    ]
  );
  const currentVisualAnalysisJobTitle = [
    currentVisualAnalysisJob?.progress?.message ?? null,
    currentVisualAnalysisJob?.failedReason ?? null,
    currentVisualAnalysisJob?.id ? `Queue job: ${currentVisualAnalysisJob.id}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' · ');
  const currentGenerationJobTitle = [
    currentGenerationJob?.progress?.message ?? null,
    currentGenerationJob?.failedReason ?? null,
    currentGenerationJob?.id ? `Queue job: ${currentGenerationJob.id}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' · ');
  const currentPipelineJobTitle = [
    currentPipelineJob?.progress?.message ?? null,
    currentPipelineJob?.failedReason ?? null,
    currentPipelineJob?.id ? `Queue job: ${currentPipelineJob.id}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' · ');
  const hasBlockingRuntimeJob =
    isSocialRuntimeJobInFlight(currentVisualAnalysisJob?.status) ||
    isSocialRuntimeJobInFlight(currentGenerationJob?.status) ||
    isSocialRuntimeJobInFlight(currentPipelineJob?.status);
  const captureActionTitle = hasBlockingRuntimeJob
    ? 'Wait for the current Social runtime job to finish.'
    : undefined;

  return (
    <div className='space-y-4'>
      {(currentVisualAnalysisJob?.status ||
        currentGenerationJob?.status ||
        currentPipelineJob?.status) ? (
        <KangurAdminCard>
          <div className='space-y-2'>
            <div>
              <div className='text-sm font-semibold text-foreground'>Runtime jobs</div>
              <div className='text-sm text-muted-foreground'>
                Live queue status for the active StudiQ Social draft.
              </div>
            </div>
            <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
              {currentVisualAnalysisJob?.status ? (
                <SocialJobStatusPill
                  status={currentVisualAnalysisJob.status}
                  label='Image analysis'
                  title={currentVisualAnalysisJobTitle || undefined}
                  className='text-[10px]'
                />
              ) : null}
              {currentGenerationJob?.status ? (
                <SocialJobStatusPill
                  status={currentGenerationJob.status}
                  label='Generate post'
                  title={currentGenerationJobTitle || undefined}
                  className='text-[10px]'
                />
              ) : null}
              {currentPipelineJob?.status ? (
                <SocialJobStatusPill
                  status={currentPipelineJob.status}
                  label='Full pipeline'
                  title={currentPipelineJobTitle || undefined}
                  className='text-[10px]'
                />
              ) : null}
            </div>
          </div>
        </KangurAdminCard>
      ) : null}

      <KangurAdminCard>
        <div className='space-y-3'>
          <div>
            <div className='text-sm font-semibold text-foreground'>Capture single add-on</div>
            <div className='text-sm text-muted-foreground'>Create reusable visuals for any StudiQ Social post.</div>
          </div>
          <div className='grid gap-3 lg:grid-cols-2'>
            <Input
              placeholder='Add-on title'
              value={addonForm.title}
              onChange={(e) => setAddonForm((prev) => ({ ...prev, title: e.target.value }))}
              aria-label='Add-on title'
            />
            <Input
              type='url'
              placeholder='Source URL'
              value={addonForm.sourceUrl}
              onChange={(e) => setAddonForm((prev) => ({ ...prev, sourceUrl: e.target.value }))}
              aria-label='Source URL'
            />
            <Input
              placeholder='Optional selector'
              value={addonForm.selector}
              onChange={(e) => setAddonForm((prev) => ({ ...prev, selector: e.target.value }))}
              aria-label='Optional selector'
            />
            <Input
              type='number'
              min='0'
              step='100'
              placeholder='Wait before capture (ms)'
              value={addonForm.waitForMs}
              onChange={(e) => setAddonForm((prev) => ({ ...prev, waitForMs: e.target.value }))}
              aria-label='Wait before capture (ms)'
            />
            <Input
              placeholder='Optional description'
              value={addonForm.description}
              onChange={(e) => setAddonForm((prev) => ({ ...prev, description: e.target.value }))}
              aria-label='Optional description'
            />
          </div>
          <Button
            type='button'
            size='sm'
            onClick={handleCreateAddon}
            disabled={
              !addonForm.title.trim() ||
              !addonForm.sourceUrl.trim() ||
              createAddonMutationPending ||
              hasBlockingRuntimeJob
            }
            title={captureActionTitle}
          >
            {createAddonMutationPending ? 'Creating...' : 'Create single add-on'}
          </Button>
        </div>
      </KangurAdminCard>

      <KangurAdminCard>
        <div className='space-y-3'>
          <div>
            <div className='text-sm font-semibold text-foreground'>
              Programmable Playwright defaults
            </div>
            <div className='text-sm text-muted-foreground'>
              Saved from the advanced Playwright capture modal and reused the next time it opens.
            </div>
          </div>
          <div className='flex flex-wrap justify-start gap-2'>
            <Button type='button' variant='outline' size='sm' onClick={handleOpenProgrammableCaptureModal}>
              Open programmable editor
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={handleResetProgrammableCaptureDefaults}
              disabled={!hasSavedProgrammableCaptureDefaults}
            >
              Reset saved defaults
            </Button>
          </div>
          <div className='rounded-xl border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground'>
            {!hasSavedProgrammableCaptureDefaults ? (
              <div>No programmable capture defaults have been saved yet.</div>
            ) : (
              <div className='space-y-1.5'>
                <div>
                  Base URL:{' '}
                  <span className='font-medium text-foreground/90'>
                    {programmableCaptureDefaultsBaseUrl || 'Use modal input'}
                  </span>
                </div>
                <div>
                  Persona:{' '}
                  <span className='font-medium text-foreground/90'>
                    {programmablePersonaSummary}
                  </span>
                </div>
                <div>
                  Routes:{' '}
                  <span className='font-medium text-foreground/90'>
                    {programmableCaptureDefaultsRoutes.length}
                  </span>
                </div>
                <div>
                  Script:{' '}
                  <span className='font-medium text-foreground/90'>
                    {hasCustomProgrammableScript
                      ? 'Custom script saved'
                      : 'Default script template'}
                  </span>
                </div>
                {programmableCaptureDefaultsRoutes.length > 0 ? (
                  <div className='pt-1'>
                    <div className='pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                      Saved routes
                    </div>
                    <div className='space-y-2'>
                      {programmableRouteSummaries.map(({ route, preview }) => (
                        <div
                          key={route.id}
                          className='rounded-lg border border-border/50 bg-background/60 px-2 py-2'
                        >
                          <div className='font-medium text-foreground/90'>
                            {route.title.trim() || route.id}
                          </div>
                          <div className='mt-1 break-all text-[11px] text-muted-foreground'>
                            {preview.resolvedUrl ? (
                              <>
                                <span className='font-medium text-foreground/80'>Target:</span>{' '}
                                {preview.resolvedUrl}
                              </>
                            ) : (
                              <>
                                <span className='font-medium text-foreground/80'>Target:</span>{' '}
                                {preview.issue}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className='pt-1'>
                  <div className='pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                    Runtime request preview
                  </div>
                  <pre className='overflow-x-auto rounded-lg border border-border/50 bg-background px-3 py-2 text-[11px] text-muted-foreground'>
                    {JSON.stringify(programmableRuntimeRequestPreview, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </KangurAdminCard>

      <KangurAdminCard>
        <div className='space-y-3'>
          <div>
            <div className='text-sm font-semibold text-foreground'>Batch capture preview</div>
            <div className='text-sm text-muted-foreground'>Capture multiple presets at once for the current post.</div>
          </div>
          <div className='grid gap-3 lg:grid-cols-3'>
            <FormField label='Base URL override' description='Optional local/preview URL.'>
              <Input
                type='url'
                placeholder='https://example.com'
                value={batchCaptureBaseUrl}
                onChange={(e) => setBatchCaptureBaseUrl(e.target.value)}
                size='sm'
              />
            </FormField>
            <FormField label='Capture limit' description='Max concurrent captures.'>
              <SelectSimple
                value={batchCapturePresetLimit == null ? '' : String(batchCapturePresetLimit)}
                onValueChange={setBatchCapturePresetLimit}
                options={[
                  { value: '', label: 'No limit' },
                  ...['5', '10', '20', '50'].map((v) => ({ value: v, label: v })),
                ]}
                size='sm'
              />
            </FormField>
          </div>
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Presets ({batchCapturePresetIds.length})</div>
              <div className='flex items-center gap-2'>
                <Button type='button' variant='ghost' size='xs' onClick={selectAllCapturePresets}>Select all</Button>
                <Button type='button' variant='ghost' size='xs' onClick={clearCapturePresets}>Clear</Button>
              </div>
            </div>
            <div className='flex flex-wrap gap-2 rounded-xl border border-border/60 bg-background/40 p-3'>
              {KANGUR_SOCIAL_CAPTURE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type='button'
                  onClick={() => handleToggleCapturePreset(preset.id)}
                  className={cn(
                    'inline-flex items-center rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors',
                    batchCapturePresetIds.includes(preset.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  )}
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>
          <div className='flex flex-wrap items-center gap-3'>
            <Button
              type='button'
              size='sm'
              onClick={handleBatchCapture}
              disabled={
                batchCapturePresetIds.length === 0 ||
                batchCaptureMutationPending ||
                hasBlockingRuntimeJob
              }
              title={captureActionTitle}
            >
              {batchCaptureMutationPending ? 'Capturing...' : 'Launch batch capture'}
            </Button>
            <div className='text-xs text-muted-foreground'>{batchCaptureLimitSummary}</div>
          </div>
          {batchCaptureResult && (
            <div className='rounded-xl border border-border/60 bg-background/40 p-3 text-xs'>
              <div className='font-semibold text-foreground'>Last batch: {batchCaptureResult.runId}</div>
              <div className='mt-1 text-muted-foreground'>
                Completed: {batchCaptureResult.addons.length} • Failed: {batchCaptureResult.failures.length} • Total:{' '}
                {batchCaptureResult.addons.length + batchCaptureResult.failures.length}
              </div>
            </div>
          )}
        </div>
      </KangurAdminCard>
    </div>
  );
}
