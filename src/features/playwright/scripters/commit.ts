import type { CreateProductDraftInput } from '@/shared/contracts/products/drafts';

import type { ScripterImportDraft } from './scripter-import-source';

export type CreatedDraftResult = {
  id: string;
};

export type CreateDraftFn = (
  input: CreateProductDraftInput
) => Promise<CreatedDraftResult>;

export type ScripterCommitOutcome =
  | { index: number; externalId: string | null; status: 'created'; draftId: string }
  | { index: number; externalId: string | null; status: 'skipped'; reason: string }
  | { index: number; externalId: string | null; status: 'failed'; error: string };

export type ScripterCommitResult = {
  outcomes: ScripterCommitOutcome[];
  createdCount: number;
  failedCount: number;
  skippedCount: number;
};

export type CommitScripterDraftsOptions = {
  createDraft: CreateDraftFn;
  skipRecordsWithErrors?: boolean;
  signal?: AbortSignal;
};

const hasBlockingIssue = (draft: ScripterImportDraft): boolean =>
  draft.issues.some((issue) => issue.severity === 'error');

export const commitScripterDrafts = async (
  drafts: ScripterImportDraft[],
  options: CommitScripterDraftsOptions
): Promise<ScripterCommitResult> => {
  const { createDraft, skipRecordsWithErrors = true, signal } = options;
  const outcomes: ScripterCommitOutcome[] = [];
  let createdCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const draft of drafts) {
    if (signal?.aborted) {
      outcomes.push({
        index: draft.index,
        externalId: draft.externalId,
        status: 'skipped',
        reason: 'aborted',
      });
      skippedCount += 1;
      continue;
    }

    if (skipRecordsWithErrors && hasBlockingIssue(draft)) {
      outcomes.push({
        index: draft.index,
        externalId: draft.externalId,
        status: 'skipped',
        reason: 'field-map errors',
      });
      skippedCount += 1;
      continue;
    }

    try {
      const created = await createDraft(draft.draft);
      outcomes.push({
        index: draft.index,
        externalId: draft.externalId,
        status: 'created',
        draftId: created.id,
      });
      createdCount += 1;
    } catch (err) {
      outcomes.push({
        index: draft.index,
        externalId: draft.externalId,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
      failedCount += 1;
    }
  }

  return { outcomes, createdCount, failedCount, skippedCount };
};
