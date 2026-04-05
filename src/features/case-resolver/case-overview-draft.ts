import type { CaseResolverFile } from '@/shared/contracts/case-resolver/file';
import type { CaseMetadataDraft } from '@/shared/contracts/case-resolver/base';
export type { CaseMetadataDraft };

const NONE_OPTION_VALUE = '__none__';

export const buildCaseMetadataDraft = (caseFile: CaseResolverFile | null): CaseMetadataDraft => ({
  name: caseFile?.name ?? '',
  parentCaseId: caseFile?.parentCaseId ?? NONE_OPTION_VALUE,
  caseStatus: caseFile?.caseStatus === 'completed' ? 'completed' : 'pending',
  happeningDate: caseFile?.happeningDate ?? '',
  referenceCaseIds: caseFile?.referenceCaseIds ?? [],
  tagId: caseFile?.tagId ?? NONE_OPTION_VALUE,
  caseIdentifierId: caseFile?.caseIdentifierId ?? NONE_OPTION_VALUE,
  categoryId: caseFile?.categoryId ?? NONE_OPTION_VALUE,
});

const normalizeOptionalSelectValue = (value: string): string | null => {
  const normalized = value.trim();
  if (!normalized || normalized === NONE_OPTION_VALUE) return null;
  return normalized;
};

const normalizeReferenceCaseIds = (values: string[], activeCaseId: string): string[] =>
  Array.from(
    new Set(
      values
        .map((value): string => value.trim())
        .filter((value): boolean => value.length > 0 && value !== activeCaseId)
    )
  );

const areStringArraysEqual = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((value, index): boolean => value === right[index]);

export const buildCaseMetadataPatch = (
  activeCaseFile: CaseResolverFile | null,
  draft: CaseMetadataDraft | null
): Partial<
  Pick<
    CaseResolverFile,
    | 'name'
    | 'parentCaseId'
    | 'referenceCaseIds'
    | 'tagId'
    | 'caseIdentifierId'
    | 'categoryId'
    | 'caseStatus'
    | 'happeningDate'
  >
> | null => {
  if (!activeCaseFile || !draft) return null;

  const normalizedDraft = {
    name: draft.name.trim() || activeCaseFile.name || 'Untitled Case',
    parentCaseId: (() => {
      const nextParentCaseId = normalizeOptionalSelectValue(draft.parentCaseId);
      return nextParentCaseId === activeCaseFile.id ? null : nextParentCaseId;
    })(),
    caseStatus: draft.caseStatus === 'completed' ? 'completed' : 'pending',
    happeningDate: draft.happeningDate.trim() || null,
    referenceCaseIds: normalizeReferenceCaseIds(draft.referenceCaseIds, activeCaseFile.id),
    tagId: normalizeOptionalSelectValue(draft.tagId),
    caseIdentifierId: normalizeOptionalSelectValue(draft.caseIdentifierId),
    categoryId: normalizeOptionalSelectValue(draft.categoryId),
  };

  const patch: Partial<
    Pick<
      CaseResolverFile,
      | 'name'
      | 'parentCaseId'
      | 'referenceCaseIds'
      | 'tagId'
      | 'caseIdentifierId'
      | 'categoryId'
      | 'caseStatus'
      | 'happeningDate'
    >
  > = {};

  if (normalizedDraft.name !== activeCaseFile.name) {
    patch.name = normalizedDraft.name;
  }
  if (normalizedDraft.parentCaseId !== (activeCaseFile.parentCaseId?.trim() || null)) {
    patch.parentCaseId = normalizedDraft.parentCaseId;
  }
  if (
    normalizedDraft.caseStatus !==
    (activeCaseFile.caseStatus === 'completed' ? 'completed' : 'pending')
  ) {
    patch.caseStatus = normalizedDraft.caseStatus as 'pending' | 'completed';
  }
  if (normalizedDraft.happeningDate !== (activeCaseFile.happeningDate?.trim() || null)) {
    patch.happeningDate = normalizedDraft.happeningDate;
  }
  if (
    !areStringArraysEqual(
      normalizedDraft.referenceCaseIds,
      normalizeReferenceCaseIds(activeCaseFile.referenceCaseIds ?? [], activeCaseFile.id)
    )
  ) {
    patch.referenceCaseIds = normalizedDraft.referenceCaseIds;
  }
  if (normalizedDraft.tagId !== (activeCaseFile.tagId?.trim() || null)) {
    patch.tagId = normalizedDraft.tagId;
  }
  if (normalizedDraft.caseIdentifierId !== (activeCaseFile.caseIdentifierId?.trim() || null)) {
    patch.caseIdentifierId = normalizedDraft.caseIdentifierId;
  }
  if (normalizedDraft.categoryId !== (activeCaseFile.categoryId?.trim() || null)) {
    patch.categoryId = normalizedDraft.categoryId;
  }

  return Object.keys(patch).length > 0 ? patch : null;
};
