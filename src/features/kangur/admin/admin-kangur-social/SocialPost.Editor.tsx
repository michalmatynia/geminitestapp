'use client';

import React from 'react';
import {
  Button,
  FormSection,
  Input,
  SelectSimple,
  Textarea,
} from '@/features/kangur/shared/ui';
import type { KangurSocialPost, KangurSocialDocUpdatesResponse } from '@/shared/contracts/kangur-social-posts';
import type { KangurSocialImageAddon } from '@/shared/contracts/kangur-social-image-addons';
import type { ImageFileSelection } from '@/shared/contracts/files';
import { SocialPostVisuals } from './SocialPost.Visuals';

export function SocialPostEditor({
  activePost,
  editorState,
  setEditorState,
  scheduledAt,
  setScheduledAt,
  docReferenceInput,
  setDocReferenceInput,
  generationNotes,
  setGenerationNotes,
  handleGenerate,
  imageAssets,
  handleRemoveImage,
  setShowMediaLibrary,
  showMediaLibrary,
  handleAddImages,
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
  linkedinConnectionId,
  handleLinkedInConnectionChange,
  linkedInOptions,
  linkedinIntegration,
  selectedLinkedInConnection,
  linkedInExpiryStatus,
  linkedInExpiryLabel,
  linkedInDaysRemaining,
  handleSave,
  handlePublish,
  saveMutationPending,
  patchMutationPending,
  publishMutationPending,
  docsUsed,
}: {
  activePost: KangurSocialPost | null;
  editorState: any;
  setEditorState: React.Dispatch<React.SetStateAction<any>>;
  scheduledAt: string;
  setScheduledAt: React.Dispatch<React.SetStateAction<string>>;
  docReferenceInput: string;
  setDocReferenceInput: React.Dispatch<React.SetStateAction<string>>;
  generationNotes: string;
  setGenerationNotes: React.Dispatch<React.SetStateAction<string>>;
  handleGenerate: () => Promise<void>;
  imageAssets: ImageFileSelection[];
  handleRemoveImage: (id: string) => void;
  setShowMediaLibrary: React.Dispatch<React.SetStateAction<boolean>>;
  showMediaLibrary: boolean;
  handleAddImages: (filepaths: string[]) => void;
  addonForm: any;
  setAddonForm: React.Dispatch<React.SetStateAction<any>>;
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
  batchCaptureResult: any;
  recentAddons: KangurSocialImageAddon[];
  recentAddonsLoading: boolean;
  selectedAddonSet: Set<string>;
  handleSelectAddon: (addon: KangurSocialImageAddon) => void;
  handleRemoveAddon: (id: string) => void;
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
  docUpdatesPlan: any;
  linkedinConnectionId: string | null;
  handleLinkedInConnectionChange: (value: string) => void;
  linkedInOptions: any[];
  linkedinIntegration: any;
  selectedLinkedInConnection: any;
  linkedInExpiryStatus: 'expired' | 'warning' | 'ok' | null;
  linkedInExpiryLabel: string | null;
  linkedInDaysRemaining: number | null;
  handleSave: (status: KangurSocialPost['status']) => Promise<void>;
  handlePublish: () => Promise<void>;
  saveMutationPending: boolean;
  patchMutationPending: boolean;
  publishMutationPending: boolean;
  docsUsed: string[];
}) {
  return (
    <div className='space-y-4'>
      <div className='text-sm font-semibold text-foreground'>Post editor</div>

      <FormSection title='Polish' className='space-y-3'>
        <Input
          placeholder='Polish title'
          value={editorState.titlePl}
          onChange={(event) =>
            setEditorState((prev: any) => ({ ...prev, titlePl: event.target.value }))
          }
        />
        <Textarea
          placeholder='Polish body'
          rows={5}
          value={editorState.bodyPl}
          onChange={(event) =>
            setEditorState((prev: any) => ({ ...prev, bodyPl: event.target.value }))
          }
        />
      </FormSection>

      <FormSection title='English' className='space-y-3'>
        <Input
          placeholder='English title'
          value={editorState.titleEn}
          onChange={(event) =>
            setEditorState((prev: any) => ({ ...prev, titleEn: event.target.value }))
          }
        />
        <Textarea
          placeholder='English body'
          rows={5}
          value={editorState.bodyEn}
          onChange={(event) =>
            setEditorState((prev: any) => ({ ...prev, bodyEn: event.target.value }))
          }
        />
      </FormSection>

      <SocialPostVisuals
        activePost={activePost}
        addonForm={addonForm}
        setAddonForm={setAddonForm}
        handleCreateAddon={handleCreateAddon}
        createAddonPending={createAddonPending}
        batchCaptureBaseUrl={batchCaptureBaseUrl}
        setBatchCaptureBaseUrl={setBatchCaptureBaseUrl}
        batchCapturePresetIds={batchCapturePresetIds}
        handleToggleCapturePreset={handleToggleCapturePreset}
        selectAllCapturePresets={selectAllCapturePresets}
        clearCapturePresets={clearCapturePresets}
        handleBatchCapture={handleBatchCapture}
        batchCapturePending={batchCapturePending}
        batchCaptureResult={batchCaptureResult}
        recentAddons={recentAddons}
        recentAddonsLoading={recentAddonsLoading}
        selectedAddonSet={selectedAddonSet}
        handleSelectAddon={handleSelectAddon}
        handleRemoveAddon={handleRemoveAddon}
        imageAssets={imageAssets}
        handleRemoveImage={handleRemoveImage}
        setShowMediaLibrary={setShowMediaLibrary}
        showMediaLibrary={showMediaLibrary}
        handleAddImages={handleAddImages}
        docReferenceInput={docReferenceInput}
        setDocReferenceInput={setDocReferenceInput}
        generationNotes={generationNotes}
        setGenerationNotes={setGenerationNotes}
        handleGenerate={handleGenerate}
        docsUsed={docsUsed}
        hasVisualDocUpdates={hasVisualDocUpdates}
        handlePreviewDocUpdates={handlePreviewDocUpdates}
        previewDocUpdatesPending={previewDocUpdatesPending}
        handleApplyDocUpdates={handleApplyDocUpdates}
        applyDocUpdatesPending={applyDocUpdatesPending}
        docUpdatesResult={docUpdatesResult}
        docUpdatesAppliedAt={docUpdatesAppliedAt}
        docUpdatesAppliedBy={docUpdatesAppliedBy}
        docUpdatesAppliedCount={docUpdatesAppliedCount}
        docUpdatesSkippedCount={docUpdatesSkippedCount}
        docUpdatesPlan={docUpdatesPlan}
        scheduledAt={scheduledAt}
        setScheduledAt={setScheduledAt}
      />

      <FormSection title='LinkedIn connection' className='space-y-3'>
        <SelectSimple
          value={linkedinConnectionId ?? undefined}
          onValueChange={handleLinkedInConnectionChange}
          options={linkedInOptions}
          placeholder={
            linkedinIntegration
              ? 'Select LinkedIn connection'
              : 'Create LinkedIn integration first'
          }
          disabled={!linkedinIntegration || linkedInOptions.length === 0}
          size='sm'
          ariaLabel='LinkedIn connection'
          title='LinkedIn connection'
        />
        {!linkedinIntegration ? (
          <div className='text-xs text-muted-foreground'>
            Create the LinkedIn integration in Admin &gt; Integrations to enable publishing.
          </div>
        ) : linkedInOptions.length === 0 ? (
          <div className='text-xs text-muted-foreground'>
            Add a LinkedIn connection in Admin &gt; Integrations to select it here.
          </div>
        ) : selectedLinkedInConnection && !selectedLinkedInConnection.hasLinkedInAccessToken ? (
          <div className='text-xs text-red-500'>
            Selected connection is not authorized. Reconnect in Admin &gt; Integrations.
          </div>
        ) : linkedInExpiryStatus === 'expired' ? (
          <div className='text-xs text-red-500'>
            LinkedIn token expired{linkedInExpiryLabel ? ` on ${linkedInExpiryLabel}` : ''}.
          </div>
        ) : linkedInExpiryStatus === 'warning' ? (
          <div className='text-xs text-amber-500'>
            LinkedIn token expires in {linkedInDaysRemaining} day
            {linkedInDaysRemaining === 1 ? '' : 's'}
            {linkedInExpiryLabel ? ` (${linkedInExpiryLabel})` : ''}.
          </div>
        ) : null}
      </FormSection>

      <div className='flex flex-wrap items-center gap-2'>
        <Button
          type='button'
          size='sm'
          onClick={() => {
            void handleSave('draft');
          }}
          disabled={!activePost || saveMutationPending}
        >
          {saveMutationPending ? 'Saving...' : 'Save draft'}
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            void handleSave('scheduled');
          }}
          disabled={!activePost || !scheduledAt || patchMutationPending}
        >
          {patchMutationPending ? 'Scheduling...' : 'Schedule'}
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            void handlePublish();
          }}
          disabled={!activePost || publishMutationPending}
        >
          {publishMutationPending ? 'Publishing...' : 'Publish to LinkedIn'}
        </Button>
      </div>
    </div>
  );
}
