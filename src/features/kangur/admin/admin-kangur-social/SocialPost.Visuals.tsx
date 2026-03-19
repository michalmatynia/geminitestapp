'use client';

import React from 'react';
import { BookOpen, CalendarClock, Sparkles, ImagePlus, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  FormSection,
  Input,
  Textarea,
} from '@/features/kangur/shared/ui';
import { MediaLibraryPanel } from '@/features/cms/public';
import { cn } from '@/shared/utils';
import { KANGUR_SOCIAL_CAPTURE_PRESETS } from '@/features/kangur/shared/social-capture-presets';
import type {
  KangurSocialDocUpdatePlan,
  KangurSocialDocUpdatesResponse,
  KangurSocialPost,
} from '@/shared/contracts/kangur-social-posts';
import type { KangurSocialImageAddon } from '@/shared/contracts/kangur-social-image-addons';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { KangurSocialImageAddonsBatchResult } from '@/features/kangur/ui/hooks/useKangurSocialImageAddons';
import { resolveImagePreview } from './AdminKangurSocialPage.Constants';

type AddonFormState = {
  title: string;
  sourceUrl: string;
  selector: string;
  description: string;
  waitForMs: string;
};

type LoadContextHandler = () => Promise<{ summary: string | null; docCount: number | null; error?: boolean }>;

export function SocialPostVisuals({
  activePost,
  addonForm,
  setAddonForm,
  handleCreateAddon,
  createAddonPending,
  batchCaptureBaseUrl,
  setBatchCaptureBaseUrl,
  batchCapturePresetIds,
  handleToggleCapturePreset,
  selectAllCapturePresets,
  clearCapturePresets,
  handleBatchCapture,
  batchCapturePending,
  batchCaptureResult,
  recentAddons,
  recentAddonsLoading,
  selectedAddonSet,
  handleSelectAddon,
  handleRemoveAddon,
  imageAssets,
  handleRemoveImage,
  setShowMediaLibrary,
  showMediaLibrary,
  handleAddImages,
  docReferenceInput,
  setDocReferenceInput,
  generationNotes,
  setGenerationNotes,
  handleGenerate,
  handleLoadContext,
  contextLoading,
  docsUsed,
  hasVisualDocUpdates,
  handlePreviewDocUpdates,
  previewDocUpdatesPending,
  handleApplyDocUpdates,
  applyDocUpdatesPending,
  docUpdatesResult,
  docUpdatesAppliedAt,
  docUpdatesAppliedBy,
  docUpdatesAppliedCount,
  docUpdatesSkippedCount,
  docUpdatesPlan,
  scheduledAt,
  setScheduledAt,
}: {
  activePost: KangurSocialPost | null;
  addonForm: AddonFormState;
  setAddonForm: React.Dispatch<React.SetStateAction<AddonFormState>>;
  handleCreateAddon: () => Promise<void>;
  createAddonPending: boolean;
  batchCaptureBaseUrl: string;
  setBatchCaptureBaseUrl: React.Dispatch<React.SetStateAction<string>>;
  batchCapturePresetIds: string[];
  handleToggleCapturePreset: (id: string) => void;
  selectAllCapturePresets: () => void;
  clearCapturePresets: () => void;
  handleBatchCapture: () => Promise<void>;
  batchCapturePending: boolean;
  batchCaptureResult: KangurSocialImageAddonsBatchResult | null;
  recentAddons: KangurSocialImageAddon[];
  recentAddonsLoading: boolean;
  selectedAddonSet: Set<string>;
  handleSelectAddon: (addon: KangurSocialImageAddon) => void;
  handleRemoveAddon: (id: string) => void;
  imageAssets: ImageFileSelection[];
  handleRemoveImage: (id: string) => void;
  setShowMediaLibrary: React.Dispatch<React.SetStateAction<boolean>>;
  showMediaLibrary: boolean;
  handleAddImages: (filepaths: string[]) => void;
  docReferenceInput: string;
  setDocReferenceInput: React.Dispatch<React.SetStateAction<string>>;
  generationNotes: string;
  setGenerationNotes: React.Dispatch<React.SetStateAction<string>>;
  handleGenerate: () => Promise<void>;
  handleLoadContext?: LoadContextHandler;
  contextLoading?: boolean;
  docsUsed: string[];
  hasVisualDocUpdates: boolean;
  handlePreviewDocUpdates: () => Promise<void>;
  previewDocUpdatesPending: boolean;
  handleApplyDocUpdates: () => Promise<void>;
  applyDocUpdatesPending: boolean;
  docUpdatesResult: KangurSocialDocUpdatesResponse | null;
  docUpdatesAppliedAt: string | null;
  docUpdatesAppliedBy: string | null;
  docUpdatesAppliedCount: number;
  docUpdatesSkippedCount: number;
  docUpdatesPlan: KangurSocialDocUpdatePlan | null;
  scheduledAt: string;
  setScheduledAt: React.Dispatch<React.SetStateAction<string>>;
}): React.JSX.Element {
  return (
    <>
      <FormSection title='Recent image add-ons' className='space-y-3'>
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
            onClick={() => void handleCreateAddon()}
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
        <div className='space-y-3 rounded-xl border border-border/60 bg-background/40 p-3'>
          <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Batch capture presets
          </div>
          <Input
            placeholder='Base URL (e.g. https://kangur.app)'
            value={batchCaptureBaseUrl}
            onChange={(event) => setBatchCaptureBaseUrl(event.target.value)}
          />
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              size='xs'
              variant='ghost'
              onClick={selectAllCapturePresets}
            >
              Select all
            </Button>
            <Button
              type='button'
              size='xs'
              variant='ghost'
              onClick={clearCapturePresets}
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
                    onChange={() => handleToggleCapturePreset(preset.id)}
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
                    <div className='text-[11px] text-muted-foreground'>
                      {preset.path}
                    </div>
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
              onClick={() => void handleBatchCapture()}
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
                Run {batchCaptureResult.runId}. Created{' '}
                {batchCaptureResult.addons.length} add-on
                {batchCaptureResult.addons.length === 1 ? '' : 's'} with{' '}
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
            <div className='text-xs text-muted-foreground'>
              No batch capture run yet.
            </div>
          )}
        </div>
        {recentAddonsLoading ? (
          <div className='text-xs text-muted-foreground'>Loading add-ons...</div>
        ) : recentAddons.length === 0 ? (
          <div className='text-xs text-muted-foreground'>No image add-ons yet.</div>
        ) : (
          <div className='grid gap-3 sm:grid-cols-2'>
            {recentAddons.map((addon) => {
              const preview = resolveImagePreview(addon.imageAsset);
              const isSelected = selectedAddonSet.has(addon.id);
              const previousAddon = addon.previousAddonId
                ? recentAddons.find((a) => a.id === addon.previousAddonId) ?? null
                : null;
              const previousPreview = previousAddon
                ? resolveImagePreview(previousAddon.imageAsset)
                : null;
              const hasComparison = Boolean(previousPreview && preview);
              return (
                <div
                  key={addon.id}
                  className='rounded-xl border border-border/60 bg-background/40 p-2'
                >
                  {hasComparison ? (
                    <div className='grid grid-cols-2 gap-1'>
                      <div className='space-y-1'>
                        <div className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
                          Before
                        </div>
                        <div className='overflow-hidden rounded-lg border border-border/50'>
                          <img
                            src={previousPreview!}
                            alt={`Before: ${addon.title || 'previous capture'}`}
                            className='h-28 w-full object-cover opacity-75'
                            loading='lazy'
                          />
                        </div>
                      </div>
                      <div className='space-y-1'>
                        <div className='text-[10px] font-medium uppercase tracking-wide text-primary'>
                          After
                        </div>
                        <div className='overflow-hidden rounded-lg border border-primary/40'>
                          <img
                            src={preview}
                            alt={addon.title || 'Social add-on'}
                            className='h-28 w-full object-cover'
                            loading='lazy'
                          />
                        </div>
                      </div>
                    </div>
                  ) : preview ? (
                    <div className='overflow-hidden rounded-lg border border-border/50'>
                      <img
                        src={preview}
                        alt={addon.title || 'Social add-on'}
                        className='h-32 w-full object-cover'
                        loading='lazy'
                      />
                    </div>
                  ) : (
                    <div className='flex h-32 items-center justify-center rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground'>
                      Preview unavailable
                    </div>
                  )}
                  <div className='mt-2 flex items-start justify-between gap-2 text-xs text-muted-foreground'>
                    <div className='min-w-0 space-y-1'>
                      <div className='font-semibold text-foreground'>
                        {addon.title || 'Untitled add-on'}
                        {hasComparison ? (
                          <Badge variant='outline' className='ml-2 text-[10px]'>
                            Change detected
                          </Badge>
                        ) : null}
                      </div>
                      {addon.description ? (
                        <div className='text-muted-foreground'>{addon.description}</div>
                      ) : null}
                      {addon.sourceUrl ? (
                        <a
                          href={addon.sourceUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-[11px] text-muted-foreground underline'
                        >
                          Source
                        </a>
                      ) : null}
                    </div>
                    <Button
                      type='button'
                      size='xs'
                      variant={isSelected ? 'ghost' : 'outline'}
                      onClick={() =>
                        isSelected ? handleRemoveAddon(addon.id) : handleSelectAddon(addon)
                      }
                    >
                      {isSelected ? 'Added' : 'Add'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FormSection>

      <FormSection title='Images' className='space-y-3'>
        {imageAssets.length === 0 ? (
          <div className='text-xs text-muted-foreground'>
            No images selected yet.
          </div>
        ) : (
          <div className='grid gap-3 sm:grid-cols-2'>
            {imageAssets.map((asset) => {
              const preview = resolveImagePreview(asset);
              return (
                <div
                  key={asset.id}
                  className='rounded-xl border border-border/60 bg-background/40 p-2'
                >
                  {preview ? (
                    <div className='overflow-hidden rounded-lg border border-border/50'>
                      <img
                        src={preview}
                        alt={asset.filename ?? asset.id ?? 'Social image'}
                        className='h-32 w-full object-cover'
                        loading='lazy'
                      />
                    </div>
                  ) : (
                    <div className='flex h-32 items-center justify-center rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground'>
                      Preview unavailable
                    </div>
                  )}
                  <div className='mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground'>
                    <span className='truncate'>
                      {asset.filename ?? asset.filepath ?? asset.id}
                    </span>
                    <Button
                      type='button'
                      size='xs'
                      variant='ghost'
                      onClick={() => handleRemoveImage(asset.id)}
                      aria-label='Remove image'
                      title='Remove image'
                    >
                      <Trash2 className='h-3 w-3' />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => setShowMediaLibrary(true)}
          className='inline-flex items-center gap-2'
        >
          <ImagePlus className='h-4 w-4' />
          Add images
        </Button>
        <MediaLibraryPanel
          open={showMediaLibrary}
          onOpenChange={setShowMediaLibrary}
          selectionMode='multiple'
          onSelect={handleAddImages}
          title='Select social images'
        />
      </FormSection>

      <FormSection title='Scheduling' className='space-y-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <CalendarClock className='h-4 w-4 text-muted-foreground' />
          <Input
            type='datetime-local'
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
          />
        </div>
      </FormSection>

      <FormSection title='Documentation references' className='space-y-3'>
        <Input
          placeholder='e.g. overview, settings-and-narration'
          value={docReferenceInput}
          onChange={(event) => setDocReferenceInput(event.target.value)}
        />
        <Textarea
          placeholder='Notes for the Brain generator'
          rows={3}
          value={generationNotes}
          onChange={(event) => setGenerationNotes(event.target.value)}
        />
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => void handleLoadContext?.()}
            disabled={!activePost || contextLoading || !handleLoadContext}
            className='inline-flex items-center gap-2'
          >
            <BookOpen className='h-4 w-4' />
            {contextLoading ? 'Loading context...' : 'Load context'}
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => void handleGenerate()}
            disabled={!activePost}
            className='inline-flex items-center gap-2'
          >
            <Sparkles className='h-4 w-4' />
            Generate PL/EN draft
          </Button>
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
      </FormSection>

      <FormSection title='Visual analysis' className='space-y-3'>
        {activePost?.visualSummary ? (
          <Textarea
            value={activePost.visualSummary}
            rows={4}
            readOnly
            className='text-xs'
          />
        ) : (
          <div className='text-xs text-muted-foreground'>
            Generate a draft with image add-ons to analyze visuals.
          </div>
        )}
        {activePost?.visualHighlights && activePost.visualHighlights.length > 0 ? (
          <div className='flex flex-wrap gap-2'>
            {activePost.visualHighlights.map((highlight, index) => (
              <Badge key={`${highlight}-${index}`} variant='outline'>
                {highlight}
              </Badge>
            ))}
          </div>
        ) : (
          <div className='text-xs text-muted-foreground'>
            No visual highlights captured yet.
          </div>
        )}
        {activePost?.visualDocUpdates && activePost.visualDocUpdates.length > 0 ? (
          <div className='space-y-2'>
            {activePost.visualDocUpdates.map((update, index) => (
              <div
                key={`${update.docPath}-${index}`}
                className='rounded-lg border border-border/60 bg-background/60 p-3'
              >
                <div className='text-xs font-semibold text-foreground'>
                  {update.docPath}
                </div>
                {update.section ? (
                  <div className='text-xs text-muted-foreground'>
                    Section: {update.section}
                  </div>
                ) : null}
                {update.proposedText ? (
                  <div className='mt-2 text-xs whitespace-pre-wrap text-foreground'>
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
      </FormSection>

      <FormSection title='Documentation updates' className='space-y-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            size='sm'
            onClick={() => void handlePreviewDocUpdates()}
            disabled={
              !activePost || previewDocUpdatesPending || !hasVisualDocUpdates
            }
          >
            {previewDocUpdatesPending ? 'Previewing...' : 'Preview doc updates'}
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={() => void handleApplyDocUpdates()}
            disabled={
              !activePost || applyDocUpdatesPending || !hasVisualDocUpdates
            }
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
      </FormSection>
    </>
  );
}
