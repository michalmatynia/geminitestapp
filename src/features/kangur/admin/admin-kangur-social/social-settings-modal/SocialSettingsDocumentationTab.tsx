'use client';

import React from 'react';
import { Badge, Button, Input, Textarea } from '@/features/kangur/shared/ui';
import { KangurAdminCard } from '../../components/KangurAdminCard';
import type { SocialPostContextValue } from './SocialSettingsModal.hooks';

export function SocialSettingsDocumentationTab({
  activePost,
  canGenerateSocialDraft,
  contextLoading,
  docReferenceInput,
  docUpdatesAppliedAt,
  docUpdatesAppliedBy,
  docUpdatesAppliedCount,
  docUpdatesPlan,
  docUpdatesResult,
  docUpdatesSkippedCount,
  docsUsed,
  generationNotes,
  handleApplyDocUpdates,
  handleGenerate,
  handleLoadContext,
  handlePreviewDocUpdates,
  hasVisualDocUpdates,
  previewDocUpdatesMutationPending,
  applyDocUpdatesMutationPending,
  resolvedContextSummary,
  selectedPostTitle,
  setDocReferenceInput,
  setGenerationNotes,
  socialDraftBlockedReason,
  socialVisionWarning,
  suggestedDocUpdates,
}: {
  activePost: SocialPostContextValue['activePost'];
  canGenerateSocialDraft: boolean;
  contextLoading: boolean;
  docReferenceInput: string;
  docUpdatesAppliedAt: string | null;
  docUpdatesAppliedBy: string | null;
  docUpdatesAppliedCount: number;
  docUpdatesPlan: NonNullable<SocialPostContextValue['docUpdatesResult']>['plan'] | null;
  docUpdatesResult: SocialPostContextValue['docUpdatesResult'];
  docUpdatesSkippedCount: number;
  docsUsed: string[];
  generationNotes: string;
  handleApplyDocUpdates: () => void;
  handleGenerate: () => void;
  handleLoadContext: () => void;
  handlePreviewDocUpdates: () => void;
  hasVisualDocUpdates: boolean;
  previewDocUpdatesMutationPending: boolean;
  applyDocUpdatesMutationPending: boolean;
  resolvedContextSummary: string | null;
  selectedPostTitle: string;
  setDocReferenceInput: (val: string) => void;
  setGenerationNotes: (val: string) => void;
  socialDraftBlockedReason: string | null;
  socialVisionWarning: string | null;
  suggestedDocUpdates: NonNullable<SocialPostContextValue['activePost']>['visualDocUpdates'];
}) {
  return (
    <div className='space-y-4'>
      <KangurAdminCard>
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
            onChange={(event) => setDocReferenceInput(event.target.value)}
            aria-label='Documentation references'
          />
          <Textarea
            placeholder='Notes for the Brain generator'
            rows={3}
            value={generationNotes}
            onChange={(event) => setGenerationNotes(event.target.value)}
            aria-label='Notes for the Brain generator'
          />
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => void handleLoadContext()}
              disabled={!activePost || contextLoading}
            >
              {contextLoading ? 'Loading context...' : 'Load context'}
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => void handleGenerate()}
              disabled={!activePost || !canGenerateSocialDraft}
            >
              Generate PL/EN draft
            </Button>
            <div className='text-xs text-muted-foreground'>
              {activePost
                ? `Applies to ${selectedPostTitle}.`
                : 'Select a post in the list to use documentation generation.'}
            </div>
          </div>
          {!canGenerateSocialDraft && socialDraftBlockedReason ? (
            <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200'>
              {socialDraftBlockedReason}
            </div>
          ) : null}
          {socialVisionWarning ? (
            <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'>
              {socialVisionWarning}
            </div>
          ) : null}
          <div className='space-y-2 rounded-xl border border-border/60 bg-background/40 p-3'>
            <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Docs used</div>
            {docsUsed.length > 0 ? (
              <div className='flex flex-wrap gap-2'>
                {docsUsed.map((doc) => <Badge key={doc} variant='outline'>{doc}</Badge>)}
              </div>
            ) : (
              <div className='text-xs text-muted-foreground'>No documentation references selected yet.</div>
            )}
            {activePost?.generatedSummary ? (
              <Textarea value={activePost.generatedSummary} rows={4} readOnly className='text-xs' />
            ) : (
              <div className='text-xs text-muted-foreground'>Generate a draft to preview the documentation summary.</div>
            )}
          </div>
        </div>
      </KangurAdminCard>

      <KangurAdminCard>
        <div className='space-y-3'>
          <div>
            <div className='text-sm font-semibold text-foreground'>Loaded context</div>
            <div className='text-sm text-muted-foreground'>Documentation context loaded for the selected post.</div>
          </div>
          {resolvedContextSummary ? (
            <div className='max-h-48 overflow-y-auto rounded-xl border border-border bg-background/40 p-3'>
              <pre className='whitespace-pre-wrap text-xs text-muted-foreground'>{resolvedContextSummary}</pre>
            </div>
          ) : (
            <div className='text-xs text-muted-foreground'>Load context to review the current documentation summary.</div>
          )}
        </div>
      </KangurAdminCard>

      <KangurAdminCard>
        <div className='space-y-3'>
          <div>
            <div className='text-sm font-semibold text-foreground'>Documentation updates</div>
            <div className='text-sm text-muted-foreground'>Review and apply suggested documentation changes outside the post editor.</div>
          </div>
          {suggestedDocUpdates.length > 0 ? (
            <div className='space-y-2'>
              {suggestedDocUpdates.map((update, index) => (
                <div key={`${update.docPath}-${index}`} className='rounded-lg border border-border/60 bg-background/60 p-3'>
                  <div className='text-xs font-semibold text-foreground'>{update.docPath}</div>
                  {update.section && <div className='text-xs text-muted-foreground'>Section: {update.section}</div>}
                  {update.proposedText && <div className='mt-2 whitespace-pre-wrap text-xs text-foreground'>{update.proposedText}</div>}
                  {update.reason && <div className='mt-2 text-xs text-muted-foreground'>Reason: {update.reason}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div className='text-xs text-muted-foreground'>No documentation updates suggested yet.</div>
          )}

          <div className='flex flex-wrap items-center gap-2'>
            <Button type='button' size='sm' onClick={() => void handlePreviewDocUpdates()} disabled={!activePost || previewDocUpdatesMutationPending || !hasVisualDocUpdates}>
              {previewDocUpdatesMutationPending ? 'Previewing...' : 'Preview doc updates'}
            </Button>
            <Button type='button' size='sm' variant='outline' onClick={() => void handleApplyDocUpdates()} disabled={!activePost || applyDocUpdatesMutationPending || !hasVisualDocUpdates}>
              {applyDocUpdatesMutationPending ? 'Applying...' : 'Apply doc updates'}
            </Button>
          </div>

          {docUpdatesAppliedAt ? (
            <div className='text-xs text-muted-foreground'>Last applied: {new Date(docUpdatesAppliedAt).toLocaleString()}{docUpdatesAppliedBy ? ` by ${docUpdatesAppliedBy}.` : '.'}</div>
          ) : (
            <div className='text-xs text-muted-foreground'>Documentation updates have not been applied yet.</div>
          )}

          {docUpdatesPlan ? (
            <div className='space-y-3'>
              <div className='text-xs text-muted-foreground'>
                Last run: {docUpdatesResult?.applied ? 'apply' : 'preview'}.{' '}
                {docUpdatesPlan.files.length} file{docUpdatesPlan.files.length === 1 ? '' : 's'},{' '}
                {docUpdatesPlan.items.length} update{docUpdatesPlan.items.length === 1 ? '' : 's'} ({docUpdatesAppliedCount} applied, {docUpdatesSkippedCount} skipped).
              </div>
              {docUpdatesPlan.files.length > 0 ? (
                <div className='space-y-2'>
                  {docUpdatesPlan.files.map((file) => (
                    <div key={file.docPath} className='rounded-lg border border-border/60 bg-background/60 p-3'>
                      <div className='flex items-center justify-between gap-2 text-xs'>
                        <div className='font-semibold text-foreground'>{file.docPath}</div>
                        <Badge variant={file.applied ? 'secondary' : 'outline'}>{file.applied ? 'Applied' : 'Preview'}</Badge>
                      </div>
                      {file.diff ? (
                        <Textarea value={file.diff} rows={Math.min(12, file.diff.split('\n').length + 1)} readOnly className='mt-2 text-xs font-mono' />
                      ) : (
                        <div className='mt-2 text-xs text-muted-foreground'>No changes detected for this file.</div>
                      )}
                      {file.truncated && <div className='mt-2 text-[11px] text-amber-500'>Diff truncated for readability.</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-xs text-muted-foreground'>No file changes proposed.</div>
              )}
            </div>
          ) : (
            <div className='text-xs text-muted-foreground'>Preview updates to see the proposed documentation diff.</div>
          )}
        </div>
      </KangurAdminCard>
    </div>
  );
}
