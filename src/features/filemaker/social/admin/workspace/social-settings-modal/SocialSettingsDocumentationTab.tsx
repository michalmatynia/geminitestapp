import { Badge, Button, Input, Textarea } from '@/shared/ui';
import { KangurAdminCard } from '@/features/kangur/admin/components/KangurAdminCard';
import { SocialJobStatusPill } from '../SocialJobStatusPill';
import { useSocialPostContext } from '../SocialPostContext';
import { useSocialSettingsModalContext } from './SocialSettingsModalContext';

type SocialPostContextState = ReturnType<typeof useSocialPostContext>;
type SocialSettingsModalState = ReturnType<typeof useSocialSettingsModalContext>;

const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (normalized === undefined || normalized.length === 0) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

const toNonEmptyText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getCurrentGenerationJobTitle = (context: SocialPostContextState): string | undefined => {
  const job = context.currentGenerationJob;
  if (job === null) return undefined;

  const parts = [
    toNonEmptyText(job.progress?.message),
    toNonEmptyText(job.failedReason),
    `Queue job: ${job.id}`,
  ];
  const title = parts.filter((value): value is string => value !== null).join(' · ');
  return title.length > 0 ? title : undefined;
};

const hasBlockingDocumentationRuntimeJob = (context: SocialPostContextState): boolean =>
  isSocialRuntimeJobInFlight(context.currentGenerationJob?.status) ||
  isSocialRuntimeJobInFlight(context.currentPipelineJob?.status);

const runAsyncAction = (action: () => unknown): void => {
  Promise.resolve(action()).catch(() => undefined);
};

const getDocumentationActionTitle = (isRuntimeLocked: boolean): string | undefined =>
  isRuntimeLocked ? 'Wait for the current Social runtime job to finish.' : undefined;

function SocialDocumentationInputs({
  context,
  isRuntimeLocked,
}: {
  context: SocialPostContextState;
  isRuntimeLocked: boolean;
}): JSX.Element {
  const documentationActionTitle = getDocumentationActionTitle(isRuntimeLocked);

  return (
    <>
      <Input
        placeholder='Optional doc IDs, paths, or keywords'
        value={context.docReferenceInput}
        onChange={(event) => context.setDocReferenceInput(event.target.value)}
        aria-label='Documentation references'
        disabled={isRuntimeLocked}
        title={documentationActionTitle}
      />
      <Textarea
        placeholder='Notes for the Brain generator'
        rows={3}
        value={context.generationNotes}
        onChange={(event) => context.setGenerationNotes(event.target.value)}
        aria-label='Notes for the Brain generator'
        disabled={isRuntimeLocked}
        title={documentationActionTitle}
      />
    </>
  );
}

const hasSelectedPost = (context: SocialPostContextState): boolean => context.activePost !== null;

const isLoadContextDisabled = ({
  context,
  isRuntimeLocked,
}: {
  context: SocialPostContextState;
  isRuntimeLocked: boolean;
}): boolean => !hasSelectedPost(context) || context.contextLoading || isRuntimeLocked;

const isGenerateDisabled = ({
  context,
  isRuntimeLocked,
}: {
  context: SocialPostContextState;
  isRuntimeLocked: boolean;
}): boolean => !hasSelectedPost(context) || !context.canGenerateSocialDraft || isRuntimeLocked;

const getSelectedPostMessage = ({
  context,
  selectedPostTitle,
}: {
  context: SocialPostContextState;
  selectedPostTitle: string;
}): string =>
  hasSelectedPost(context)
    ? `Applies to ${selectedPostTitle}.`
    : 'Select a post in the list to use documentation generation.';

function SocialGenerationJobStatus({
  context,
}: {
  context: SocialPostContextState;
}): JSX.Element | null {
  if (toNonEmptyText(context.currentGenerationJob?.status) === null) {
    return null;
  }
  return (
    <SocialJobStatusPill
      status={context.currentGenerationJob?.status}
      label='Generate draft'
      title={getCurrentGenerationJobTitle(context)}
      className='text-[10px]'
    />
  );
}

function SocialDocumentationActions({
  context,
  isRuntimeLocked,
  selectedPostTitle,
}: {
  context: SocialPostContextState;
  isRuntimeLocked: boolean;
  selectedPostTitle: string;
}): JSX.Element {
  const isGenerationJobInFlight = isSocialRuntimeJobInFlight(context.currentGenerationJob?.status);
  const documentationActionTitle = getDocumentationActionTitle(isRuntimeLocked);

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={() => runAsyncAction(context.handleLoadContext)}
        disabled={isLoadContextDisabled({ context, isRuntimeLocked })}
        title={documentationActionTitle}
      >
        {context.contextLoading ? 'Loading context...' : 'Load context'}
      </Button>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={() => runAsyncAction(context.handleGenerate)}
        disabled={isGenerateDisabled({ context, isRuntimeLocked })}
        title={documentationActionTitle}
      >
        {isGenerationJobInFlight ? 'Generate draft in progress...' : 'Generate PL/EN draft'}
      </Button>
      <SocialGenerationJobStatus context={context} />
      <div className='text-xs text-muted-foreground'>
        {getSelectedPostMessage({ context, selectedPostTitle })}
      </div>
    </div>
  );
}

function SocialDocumentationWarnings({
  context,
}: {
  context: SocialPostContextState;
}): JSX.Element | null {
  if (!context.canGenerateSocialDraft && toNonEmptyText(context.socialDraftBlockedReason) !== null) {
    return (
      <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200'>
        {context.socialDraftBlockedReason}
      </div>
    );
  }
  if (toNonEmptyText(context.socialVisionWarning) !== null) {
    return (
      <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'>
        {context.socialVisionWarning}
      </div>
    );
  }
  return null;
}

function SocialDocsUsedPanel({
  context,
  state,
}: {
  context: SocialPostContextState;
  state: SocialSettingsModalState;
}): JSX.Element {
  return (
    <div className='space-y-2 rounded-xl border border-border/60 bg-background/40 p-3'>
      <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Docs used</div>
      {state.docsUsed.length > 0 ? (
        <div className='flex flex-wrap gap-2'>
          {state.docsUsed.map((doc) => <Badge key={doc} variant='outline'>{doc}</Badge>)}
        </div>
      ) : (
        <div className='text-xs text-muted-foreground'>No documentation references selected yet.</div>
      )}
      {toNonEmptyText(context.activePost?.generatedSummary) !== null ? (
        <Textarea value={context.activePost?.generatedSummary ?? ''} rows={4} readOnly className='text-xs' />
      ) : (
        <div className='text-xs text-muted-foreground'>Generate a draft to preview the documentation summary.</div>
      )}
    </div>
  );
}

function SocialLoadedContextCard({
  contextSummary,
}: {
  contextSummary: string | null;
}): JSX.Element {
  return (
    <KangurAdminCard>
      <div className='space-y-3'>
        <div>
          <div className='text-sm font-semibold text-foreground'>Loaded context</div>
          <div className='text-sm text-muted-foreground'>Documentation context loaded for the selected post.</div>
        </div>
        {toNonEmptyText(contextSummary) !== null ? (
          <div className='max-h-48 overflow-y-auto rounded-xl border border-border bg-background/40 p-3'>
            <pre className='whitespace-pre-wrap text-xs text-muted-foreground'>{contextSummary}</pre>
          </div>
        ) : (
          <div className='text-xs text-muted-foreground'>Load context to review the current documentation summary.</div>
        )}
      </div>
    </KangurAdminCard>
  );
}

function SocialDocumentationEditorCard(): JSX.Element {
  const context = useSocialPostContext();
  const state = useSocialSettingsModalContext();
  const isRuntimeLocked = hasBlockingDocumentationRuntimeJob(context);

  return (
    <KangurAdminCard>
      <div className='space-y-3'>
        <div>
          <div className='text-sm font-semibold text-foreground'>Documentation references</div>
          <div className='text-sm text-muted-foreground'>
            Shared generation context for the currently selected Social Publishing post.
          </div>
        </div>
        <SocialDocumentationInputs context={context} isRuntimeLocked={isRuntimeLocked} />
        <SocialDocumentationActions
          context={context}
          isRuntimeLocked={isRuntimeLocked}
          selectedPostTitle={state.selectedPostTitle}
        />
        <SocialDocumentationWarnings context={context} />
        <SocialDocsUsedPanel context={context} state={state} />
      </div>
    </KangurAdminCard>
  );
}

export function SocialSettingsDocumentationTab(): JSX.Element {
  const { contextSummary } = useSocialPostContext();

  return (
    <div className='space-y-4'>
      <SocialDocumentationEditorCard />
      <SocialLoadedContextCard contextSummary={contextSummary} />
    </div>
  );
}
