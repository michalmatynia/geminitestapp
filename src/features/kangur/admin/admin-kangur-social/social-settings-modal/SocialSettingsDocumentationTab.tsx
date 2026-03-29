'use client';

import { Badge, Button, Input, Textarea } from '@/features/kangur/shared/ui';
import { KangurAdminCard } from '../../components/KangurAdminCard';
import type { KangurSocialPost } from '@/shared/contracts/kangur-social-posts';

export function SocialSettingsDocumentationTab({
  activePost,
  canGenerateSocialDraft,
  contextLoading,
  docReferenceInput,
  docsUsed,
  generationNotes,
  handleGenerate,
  handleLoadContext,
  contextSummary,
  selectedPostTitle,
  setDocReferenceInput,
  setGenerationNotes,
  socialDraftBlockedReason,
  socialVisionWarning,
}: {
  activePost: KangurSocialPost | null;
  canGenerateSocialDraft: boolean;
  contextLoading: boolean;
  docReferenceInput: string;
  docsUsed: string[];
  generationNotes: string;
  handleGenerate: () => void;
  handleLoadContext: () => void;
  contextSummary: string | null;
  selectedPostTitle: string;
  setDocReferenceInput: (val: string) => void;
  setGenerationNotes: (val: string) => void;
  socialDraftBlockedReason: string | null;
  socialVisionWarning: string | null;
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
              onClick={() => handleLoadContext()}
              disabled={!activePost || contextLoading}
            >
              {contextLoading ? 'Loading context...' : 'Load context'}
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => handleGenerate()}
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
          {contextSummary ? (
            <div className='max-h-48 overflow-y-auto rounded-xl border border-border bg-background/40 p-3'>
              <pre className='whitespace-pre-wrap text-xs text-muted-foreground'>{contextSummary}</pre>
            </div>
          ) : (
            <div className='text-xs text-muted-foreground'>Load context to review the current documentation summary.</div>
          )}
        </div>
      </KangurAdminCard>
    </div>
  );
}
