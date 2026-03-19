'use client';

import React from 'react';

import {
  Badge,
  Button,
  Card,
  FormField,
  FormModal,
  Input,
  SelectSimple,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/features/kangur/shared/ui';
import { KANGUR_SOCIAL_CAPTURE_PRESETS } from '@/features/kangur/shared/social-capture-presets';
import { cn } from '@/shared/utils';
import type {
  KangurSocialDocUpdatePlan,
  KangurSocialDocUpdatesResponse,
  KangurSocialPost,
} from '@/shared/contracts/kangur-social-posts';
import type { KangurSocialImageAddonsBatchResult } from '@/features/kangur/ui/hooks/useKangurSocialImageAddons';
import type { AddonFormState } from './AdminKangurSocialPage.Constants';

import { BRAIN_MODEL_DEFAULT_VALUE } from './AdminKangurSocialPage.Constants';

type SelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type AdminKangurSocialSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  brainModelId: string | null;
  visionModelId: string | null;
  projectUrl: string;
  brainModelBadgeLabel: string;
  visionModelBadgeLabel: string;
  brainModelSelectOptions: SelectOption[];
  visionModelSelectOptions: SelectOption[];
  brainModelLoading: boolean;
  visionModelLoading: boolean;
  linkedinConnectionId: string | null;
  linkedInOptions: SelectOption[];
  linkedinIntegration: { id: string } | null;
  selectedLinkedInConnection: { id: string; hasLinkedInAccessToken?: boolean } | null;
  linkedInExpiryStatus: 'expired' | 'warning' | 'ok' | null;
  linkedInExpiryLabel: string | null;
  linkedInDaysRemaining: number | null;
  addonForm: AddonFormState;
  setAddonForm: React.Dispatch<React.SetStateAction<AddonFormState>>;
  createAddonPending: boolean;
  batchCaptureBaseUrl: string;
  batchCapturePresetIds: string[];
  batchCapturePending: boolean;
  batchCaptureResult: KangurSocialImageAddonsBatchResult | null;
  activePost: KangurSocialPost | null;
  contextSummary?: string | null;
  contextLoading?: boolean;
  docReferenceInput: string;
  generationNotes: string;
  docsUsed: string[];
  hasVisualDocUpdates: boolean;
  previewDocUpdatesPending: boolean;
  applyDocUpdatesPending: boolean;
  docUpdatesResult: KangurSocialDocUpdatesResponse | null;
  docUpdatesAppliedAt: string | null;
  docUpdatesAppliedBy: string | null;
  docUpdatesAppliedCount: number;
  docUpdatesSkippedCount: number;
  docUpdatesPlan: KangurSocialDocUpdatePlan | null;
  onBrainModelChange: (value: string) => void;
  onVisionModelChange: (value: string) => void;
  onLinkedInConnectionChange: (value: string) => void;
  onProjectUrlChange: (value: string) => void;
  onDocReferenceInputChange: (value: string) => void;
  onGenerationNotesChange: (value: string) => void;
  onLoadContext: () => Promise<void>;
  onGenerate: () => Promise<void>;
  onPreviewDocUpdates: () => Promise<void>;
  onApplyDocUpdates: () => Promise<void>;
  onHandleCreateAddon: () => Promise<void>;
  onBatchCaptureBaseUrlChange: (value: string) => void;
  onToggleCapturePreset: (id: string) => void;
  onSelectAllCapturePresets: () => void;
  onClearCapturePresets: () => void;
  onHandleBatchCapture: () => Promise<void>;
};

type SocialSettingsTab = 'models' | 'project' | 'documentation' | 'publishing' | 'capture';

export function AdminKangurSocialSettingsModal(
  props: AdminKangurSocialSettingsModalProps
): React.JSX.Element | null {
  const {
    open,
    onClose,
    onSave,
    isSaving,
    hasUnsavedChanges,
    brainModelId,
    visionModelId,
    projectUrl,
    brainModelBadgeLabel,
    visionModelBadgeLabel,
    brainModelSelectOptions,
    visionModelSelectOptions,
    brainModelLoading,
    visionModelLoading,
    linkedinConnectionId,
    linkedInOptions,
    linkedinIntegration,
    selectedLinkedInConnection,
    linkedInExpiryStatus,
    linkedInExpiryLabel,
    linkedInDaysRemaining,
    addonForm,
    setAddonForm,
    createAddonPending,
    batchCaptureBaseUrl,
    batchCapturePresetIds,
    batchCapturePending,
    batchCaptureResult,
    activePost,
    contextSummary,
    contextLoading,
    docReferenceInput,
    generationNotes,
    docsUsed,
    hasVisualDocUpdates,
    previewDocUpdatesPending,
    applyDocUpdatesPending,
    docUpdatesResult,
    docUpdatesAppliedAt,
    docUpdatesAppliedBy,
    docUpdatesAppliedCount,
    docUpdatesSkippedCount,
    docUpdatesPlan,
    onBrainModelChange,
    onVisionModelChange,
    onLinkedInConnectionChange,
    onProjectUrlChange,
    onDocReferenceInputChange,
    onGenerationNotesChange,
    onLoadContext,
    onGenerate,
    onPreviewDocUpdates,
    onApplyDocUpdates,
    onHandleCreateAddon,
    onBatchCaptureBaseUrlChange,
    onToggleCapturePreset,
    onSelectAllCapturePresets,
    onClearCapturePresets,
    onHandleBatchCapture,
  } = props;
  const [activeTab, setActiveTab] = React.useState<SocialSettingsTab>('models');

  React.useEffect(() => {
    if (!open) return;
    setActiveTab('models');
  }, [open]);

  const resolvedContextSummary = contextSummary ?? activePost?.contextSummary ?? null;
  const selectedPostTitle =
    activePost?.titlePl?.trim() || activePost?.titleEn?.trim() || 'selected post';
  const suggestedDocUpdates = activePost?.visualDocUpdates ?? [];

  if (!open) return null;

  return (
    <FormModal
      open
      onClose={onClose}
      title='Social Settings'
      subtitle='Model overrides and project references for StudiQ Social generation.'
      onSave={onSave}
      isSaving={isSaving}
      disableCloseWhileSaving
      isSaveDisabled={!hasUnsavedChanges || isSaving}
      hasUnsavedChanges={hasUnsavedChanges}
      saveText='Save Settings'
      cancelText='Close'
      size='xl'
      className='md:min-w-[52rem] max-w-[56rem]'
    >
      <Tabs
        value={activeTab}
        onValueChange={(value: string) => {
          if (
            value === 'project' ||
            value === 'documentation' ||
            value === 'publishing' ||
            value === 'capture'
          ) {
            setActiveTab(value);
            return;
          }
          setActiveTab('models');
        }}
        className='w-full'
      >
        <TabsList className='grid w-full grid-cols-2 sm:grid-cols-5' aria-label='Social settings tabs'>
          <TabsTrigger value='models'>Models</TabsTrigger>
          <TabsTrigger value='project'>Project</TabsTrigger>
          <TabsTrigger value='documentation'>Documentation</TabsTrigger>
          <TabsTrigger value='publishing'>Publishing</TabsTrigger>
          <TabsTrigger value='capture'>Capture</TabsTrigger>
        </TabsList>

        <TabsContent value='models' className='mt-4 space-y-4 data-[state=inactive]:hidden'>
          <div className='grid gap-4 xl:grid-cols-2'>
            <Card
              variant='subtle'
              padding='md'
              className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
            >
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <div className='text-sm font-semibold text-foreground'>Brain model</div>
                  <div className='text-sm text-muted-foreground'>
                    Capability: StudiQ Social Post Generation
                  </div>
                </div>
                <Badge variant='outline'>{brainModelBadgeLabel}</Badge>
              </div>
              <div className='mt-3'>
                <SelectSimple
                  value={brainModelId || BRAIN_MODEL_DEFAULT_VALUE}
                  onValueChange={onBrainModelChange}
                  options={brainModelSelectOptions}
                  placeholder='Select model override'
                  size='sm'
                  ariaLabel='Brain model override'
                  title='Brain model override'
                  disabled={brainModelLoading}
                />
              </div>
            </Card>

            <Card
              variant='subtle'
              padding='md'
              className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
            >
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <div className='text-sm font-semibold text-foreground'>Vision model</div>
                  <div className='text-sm text-muted-foreground'>
                    Capability: StudiQ Social Visual Analysis
                  </div>
                </div>
                <Badge variant='outline'>{visionModelBadgeLabel}</Badge>
              </div>
              <div className='mt-3'>
                <SelectSimple
                  value={visionModelId || BRAIN_MODEL_DEFAULT_VALUE}
                  onValueChange={onVisionModelChange}
                  options={visionModelSelectOptions}
                  placeholder='Select model override'
                  size='sm'
                  ariaLabel='Vision model override'
                  title='Vision model override'
                  disabled={visionModelLoading}
                />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value='project' className='mt-4 space-y-4 data-[state=inactive]:hidden'>
          <Card
            variant='subtle'
            padding='md'
            className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
          >
            <FormField
              label='Project URL'
              description='Current project link to reference in generated posts.'
            >
              <Input
                type='url'
                value={projectUrl}
                onChange={(event) => onProjectUrlChange(event.target.value)}
                placeholder='https://example.com/project'
                size='sm'
                aria-label='Project URL'
              />
            </FormField>
          </Card>
        </TabsContent>

        <TabsContent
          value='documentation'
          className='mt-4 space-y-4 data-[state=inactive]:hidden'
        >
          <Card
            variant='subtle'
            padding='md'
            className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
          >
            <div className='space-y-3'>
              <div>
                <div className='text-sm font-semibold text-foreground'>Documentation references</div>
                <div className='text-sm text-muted-foreground'>
                  Shared generation context for the currently selected StudiQ Social post.
                </div>
              </div>
              <Input
                placeholder='e.g. overview, learner-navigation, lessons-and-activities'
                value={docReferenceInput}
                onChange={(event) => onDocReferenceInputChange(event.target.value)}
                aria-label='Documentation references'
              />
              <Textarea
                placeholder='Notes for the Brain generator'
                rows={3}
                value={generationNotes}
                onChange={(event) => onGenerationNotesChange(event.target.value)}
                aria-label='Notes for the Brain generator'
              />
              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => void onLoadContext()}
                  disabled={!activePost || contextLoading}
                >
                  {contextLoading ? 'Loading context...' : 'Load context'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => void onGenerate()}
                  disabled={!activePost}
                >
                  Generate PL/EN draft
                </Button>
                <div className='text-xs text-muted-foreground'>
                  {activePost
                    ? `Applies to ${selectedPostTitle}.`
                    : 'Select a post in the list to use documentation generation.'}
                </div>
              </div>
              <div className='space-y-2 rounded-xl border border-border/60 bg-background/40 p-3'>
                <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                  Docs used
                </div>
                {docsUsed.length > 0 ? (
                  <div className='flex flex-wrap gap-2'>
                    {docsUsed.map((doc) => (
                      <Badge key={doc} variant='outline'>
                        {doc}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className='text-xs text-muted-foreground'>
                    No documentation references selected yet.
                  </div>
                )}
                {activePost?.generatedSummary ? (
                  <Textarea
                    value={activePost.generatedSummary}
                    rows={4}
                    readOnly
                    className='text-xs'
                  />
                ) : (
                  <div className='text-xs text-muted-foreground'>
                    Generate a draft to preview the documentation summary.
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card
            variant='subtle'
            padding='md'
            className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
          >
            <div className='space-y-3'>
              <div>
                <div className='text-sm font-semibold text-foreground'>Loaded context</div>
                <div className='text-sm text-muted-foreground'>
                  Documentation context loaded for the selected post.
                </div>
              </div>
              {resolvedContextSummary ? (
                <div className='max-h-48 overflow-y-auto rounded-xl border border-border bg-background/40 p-3'>
                  <pre className='whitespace-pre-wrap text-xs text-muted-foreground'>
                    {resolvedContextSummary}
                  </pre>
                </div>
              ) : (
                <div className='text-xs text-muted-foreground'>
                  Load context to review the current documentation summary.
                </div>
              )}
            </div>
          </Card>

          <Card
            variant='subtle'
            padding='md'
            className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
          >
            <div className='space-y-3'>
              <div>
                <div className='text-sm font-semibold text-foreground'>Documentation updates</div>
                <div className='text-sm text-muted-foreground'>
                  Review and apply suggested documentation changes outside the post editor.
                </div>
              </div>
              {suggestedDocUpdates.length > 0 ? (
                <div className='space-y-2'>
                  {suggestedDocUpdates.map((update, index) => (
                    <div
                      key={`${update.docPath}-${index}`}
                      className='rounded-lg border border-border/60 bg-background/60 p-3'
                    >
                      <div className='text-xs font-semibold text-foreground'>{update.docPath}</div>
                      {update.section ? (
                        <div className='text-xs text-muted-foreground'>Section: {update.section}</div>
                      ) : null}
                      {update.proposedText ? (
                        <div className='mt-2 whitespace-pre-wrap text-xs text-foreground'>
                          {update.proposedText}
                        </div>
                      ) : null}
                      {update.reason ? (
                        <div className='mt-2 text-xs text-muted-foreground'>
                          Reason: {update.reason}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-xs text-muted-foreground'>
                  No documentation updates suggested yet.
                </div>
              )}

              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  type='button'
                  size='sm'
                  onClick={() => void onPreviewDocUpdates()}
                  disabled={!activePost || previewDocUpdatesPending || !hasVisualDocUpdates}
                >
                  {previewDocUpdatesPending ? 'Previewing...' : 'Preview doc updates'}
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={() => void onApplyDocUpdates()}
                  disabled={!activePost || applyDocUpdatesPending || !hasVisualDocUpdates}
                >
                  {applyDocUpdatesPending ? 'Applying...' : 'Apply doc updates'}
                </Button>
              </div>

              {docUpdatesAppliedAt ? (
                <div className='text-xs text-muted-foreground'>
                  Last applied: {new Date(docUpdatesAppliedAt).toLocaleString()}
                  {docUpdatesAppliedBy ? ` by ${docUpdatesAppliedBy}.` : '.'}
                </div>
              ) : (
                <div className='text-xs text-muted-foreground'>
                  Documentation updates have not been applied yet.
                </div>
              )}

              {docUpdatesPlan ? (
                <div className='space-y-3'>
                  <div className='text-xs text-muted-foreground'>
                    Last run: {docUpdatesResult?.applied ? 'apply' : 'preview'}.{' '}
                    {docUpdatesPlan.files.length} file
                    {docUpdatesPlan.files.length === 1 ? '' : 's'},{' '}
                    {docUpdatesPlan.items.length} update
                    {docUpdatesPlan.items.length === 1 ? '' : 's'} ({docUpdatesAppliedCount}{' '}
                    applied, {docUpdatesSkippedCount} skipped).
                  </div>
                  {docUpdatesPlan.files.length > 0 ? (
                    <div className='space-y-2'>
                      {docUpdatesPlan.files.map((file) => (
                        <div
                          key={file.docPath}
                          className='rounded-lg border border-border/60 bg-background/60 p-3'
                        >
                          <div className='flex items-center justify-between gap-2 text-xs'>
                            <div className='font-semibold text-foreground'>{file.docPath}</div>
                            <Badge variant={file.applied ? 'secondary' : 'outline'}>
                              {file.applied ? 'Applied' : 'Preview'}
                            </Badge>
                          </div>
                          {file.diff ? (
                            <Textarea
                              value={file.diff}
                              rows={Math.min(12, file.diff.split('\n').length + 1)}
                              readOnly
                              className='mt-2 text-xs font-mono'
                            />
                          ) : (
                            <div className='mt-2 text-xs text-muted-foreground'>
                              No changes detected for this file.
                            </div>
                          )}
                          {file.truncated ? (
                            <div className='mt-2 text-[11px] text-amber-500'>
                              Diff truncated for readability.
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='text-xs text-muted-foreground'>
                      No file changes proposed.
                    </div>
                  )}
                </div>
              ) : (
                <div className='text-xs text-muted-foreground'>
                  Preview updates to see the proposed documentation diff.
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value='publishing' className='mt-4 space-y-4 data-[state=inactive]:hidden'>
          <Card
            variant='subtle'
            padding='md'
            className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
          >
            <FormField
              label='Default LinkedIn connection'
              description='Applies across StudiQ Social when saving or publishing posts.'
            >
              <SelectSimple
                value={linkedinConnectionId ?? undefined}
                onValueChange={onLinkedInConnectionChange}
                options={linkedInOptions}
                placeholder={
                  linkedinIntegration
                    ? 'Select LinkedIn connection'
                    : 'Create LinkedIn integration first'
                }
                disabled={!linkedinIntegration || linkedInOptions.length === 0}
                size='sm'
                ariaLabel='Default LinkedIn connection'
                title='Default LinkedIn connection'
              />
            </FormField>

            {!linkedinIntegration ? (
              <div className='mt-3 text-xs text-muted-foreground'>
                Create the LinkedIn integration in Admin &gt; Integrations to enable publishing.
              </div>
            ) : linkedInOptions.length === 0 ? (
              <div className='mt-3 text-xs text-muted-foreground'>
                Add a LinkedIn connection in Admin &gt; Integrations to use it here.
              </div>
            ) : selectedLinkedInConnection && !selectedLinkedInConnection.hasLinkedInAccessToken ? (
              <div className='mt-3 text-xs text-red-500'>
                Selected connection is not authorized. Reconnect in Admin &gt; Integrations.
              </div>
            ) : linkedInExpiryStatus === 'expired' ? (
              <div className='mt-3 text-xs text-red-500'>
                LinkedIn token expired{linkedInExpiryLabel ? ` on ${linkedInExpiryLabel}` : ''}.
              </div>
            ) : linkedInExpiryStatus === 'warning' ? (
              <div className='mt-3 text-xs text-amber-500'>
                LinkedIn token expires in {linkedInDaysRemaining} day
                {linkedInDaysRemaining === 1 ? '' : 's'}
                {linkedInExpiryLabel ? ` (${linkedInExpiryLabel})` : ''}.
              </div>
            ) : (
              <div className='mt-3 text-xs text-muted-foreground'>
                Per-post editors now use the default publishing connection from this settings modal.
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value='capture' className='mt-4 space-y-4 data-[state=inactive]:hidden'>
          <Card
            variant='subtle'
            padding='md'
            className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
          >
            <div className='space-y-3'>
              <div>
                <div className='text-sm font-semibold text-foreground'>Capture single add-on</div>
                <div className='text-sm text-muted-foreground'>
                  Create reusable visuals for any StudiQ Social post.
                </div>
              </div>
              <div className='grid gap-3 lg:grid-cols-2'>
                <Input
                  placeholder='Add-on title'
                  value={addonForm.title}
                  onChange={(event) =>
                    setAddonForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
                <Input
                  placeholder='Source URL'
                  value={addonForm.sourceUrl}
                  onChange={(event) =>
                    setAddonForm((prev) => ({ ...prev, sourceUrl: event.target.value }))
                  }
                />
                <Input
                  placeholder='CSS selector (optional)'
                  value={addonForm.selector}
                  onChange={(event) =>
                    setAddonForm((prev) => ({ ...prev, selector: event.target.value }))
                  }
                />
                <Input
                  type='number'
                  min={0}
                  placeholder='Wait (ms)'
                  value={addonForm.waitForMs}
                  onChange={(event) =>
                    setAddonForm((prev) => ({ ...prev, waitForMs: event.target.value }))
                  }
                />
              </div>
              <Textarea
                placeholder='Describe the visual (optional, helps Brain)'
                rows={2}
                value={addonForm.description}
                onChange={(event) =>
                  setAddonForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => void onHandleCreateAddon()}
                  disabled={
                    createAddonPending ||
                    !addonForm.title.trim() ||
                    !addonForm.sourceUrl.trim()
                  }
                >
                  {createAddonPending ? 'Capturing...' : 'Capture with Playwright'}
                </Button>
                <div className='text-xs text-muted-foreground'>
                  Captures a screenshot of the URL. Use a selector to focus on a specific section.
                </div>
              </div>
            </div>
          </Card>

          <Card
            variant='subtle'
            padding='md'
            className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
          >
            <div className='space-y-3'>
              <div>
                <div className='text-sm font-semibold text-foreground'>Batch capture presets</div>
                <div className='text-sm text-muted-foreground'>
                  Configure reusable capture runs for StudiQ Social assets.
                </div>
              </div>
              <Input
                placeholder='Base URL (e.g. https://kangur.app)'
                value={batchCaptureBaseUrl}
                onChange={(event) => onBatchCaptureBaseUrlChange(event.target.value)}
              />
              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  type='button'
                  size='xs'
                  variant='ghost'
                  onClick={onSelectAllCapturePresets}
                >
                  Select all
                </Button>
                <Button
                  type='button'
                  size='xs'
                  variant='ghost'
                  onClick={onClearCapturePresets}
                >
                  Clear
                </Button>
                <div className='text-[11px] text-muted-foreground'>
                  {batchCapturePresetIds.length} preset
                  {batchCapturePresetIds.length === 1 ? '' : 's'} selected.
                </div>
              </div>
              <div className='grid gap-2 sm:grid-cols-2'>
                {KANGUR_SOCIAL_CAPTURE_PRESETS.map((preset) => {
                  const isSelected = batchCapturePresetIds.includes(preset.id);
                  return (
                    <label
                      key={preset.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-2 rounded-lg border border-border/60 bg-background/50 p-2 text-left text-xs transition',
                        isSelected && 'border-primary/50 bg-primary/10'
                      )}
                    >
                      <input
                        type='checkbox'
                        checked={isSelected}
                        onChange={() => onToggleCapturePreset(preset.id)}
                        aria-label={preset.title}
                        className='mt-1 h-3 w-3'
                      />
                      <div className='space-y-1'>
                        <div className='font-semibold text-foreground'>{preset.title}</div>
                        {preset.description ? (
                          <div className='text-[11px] text-muted-foreground'>
                            {preset.description}
                          </div>
                        ) : null}
                        <div className='text-[11px] text-muted-foreground'>{preset.path}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => void onHandleBatchCapture()}
                  disabled={
                    batchCapturePending ||
                    !batchCaptureBaseUrl.trim() ||
                    batchCapturePresetIds.length === 0
                  }
                >
                  {batchCapturePending ? 'Capturing presets...' : 'Capture presets'}
                </Button>
                <div className='text-xs text-muted-foreground'>
                  Captures common Kangur screens and stores new add-ons.
                </div>
              </div>
              {batchCaptureResult ? (
                <div className='space-y-2 text-xs text-muted-foreground'>
                  <div>
                    Run {batchCaptureResult.runId}. Created {batchCaptureResult.addons.length}{' '}
                    add-on{batchCaptureResult.addons.length === 1 ? '' : 's'} with{' '}
                    {batchCaptureResult.failures.length} failure
                    {batchCaptureResult.failures.length === 1 ? '' : 's'}.
                  </div>
                  {batchCaptureResult.failures.length > 0 ? (
                    <div className='space-y-1'>
                      {batchCaptureResult.failures.map((failure) => (
                        <div
                          key={failure.id}
                          className='rounded-md border border-border/60 bg-background/60 p-2'
                        >
                          <div className='font-semibold text-foreground'>{failure.id}</div>
                          <div className='text-[11px] text-muted-foreground'>
                            {failure.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className='text-xs text-muted-foreground'>No batch capture run yet.</div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </FormModal>
  );
}
