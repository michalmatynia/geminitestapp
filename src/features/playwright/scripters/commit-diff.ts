import type { ScripterImportDraft } from './scripter-import-source';

export type ExistingProductRef = {
  id: string;
  sku: string | null;
  name: string | null;
  price: number | null;
};

export type ScripterDiffEntry = {
  index: number;
  externalId: string | null;
  draftName: string | null;
  draftPrice: number | null;
  existing: ExistingProductRef | null;
  changedFields: Array<'name' | 'price' | 'sku'>;
};

export type ScripterCommitDiff = {
  new: ScripterDiffEntry[];
  update: ScripterDiffEntry[];
  noKey: ScripterDiffEntry[];
  unchanged: ScripterDiffEntry[];
  byExternalId: Record<string, ExistingProductRef>;
  totals: {
    new: number;
    update: number;
    noKey: number;
    unchanged: number;
  };
};

export type LookupExistingFn = (skus: string[]) => Promise<ExistingProductRef[]>;

const fieldChanged = (
  field: 'name' | 'price' | 'sku',
  draft: ScripterImportDraft['draft'],
  existing: ExistingProductRef
): boolean => {
  if (field === 'name') return (draft.name ?? null) !== existing.name;
  if (field === 'price') return (draft.price ?? null) !== existing.price;
  return (draft.sku ?? null) !== existing.sku;
};

export const buildScripterCommitDiff = async (
  drafts: ScripterImportDraft[],
  lookupExisting: LookupExistingFn
): Promise<ScripterCommitDiff> => {
  const skus = Array.from(
    new Set(
      drafts
        .map((d) => (d.draft.sku ?? d.externalId ?? '').trim())
        .filter((s) => s.length > 0)
    )
  );
  const existing = skus.length > 0 ? await lookupExisting(skus) : [];
  const byExternalId: Record<string, ExistingProductRef> = {};
  for (const ref of existing) {
    if (ref.sku) byExternalId[ref.sku] = ref;
  }

  const newDrafts: ScripterDiffEntry[] = [];
  const updateDrafts: ScripterDiffEntry[] = [];
  const unchangedDrafts: ScripterDiffEntry[] = [];
  const noKeyDrafts: ScripterDiffEntry[] = [];

  for (const draft of drafts) {
    const key = (draft.draft.sku ?? draft.externalId ?? '').trim();
    const draftName = draft.draft.name ?? null;
    const draftPrice = draft.draft.price ?? null;
    if (key.length === 0) {
      noKeyDrafts.push({
        index: draft.index,
        externalId: draft.externalId,
        draftName,
        draftPrice,
        existing: null,
        changedFields: [],
      });
      continue;
    }
    const existingRef = byExternalId[key] ?? null;
    if (!existingRef) {
      newDrafts.push({
        index: draft.index,
        externalId: key,
        draftName,
        draftPrice,
        existing: null,
        changedFields: [],
      });
      continue;
    }
    const changedFields: ScripterDiffEntry['changedFields'] = (
      ['name', 'price', 'sku'] as const
    ).filter((field) => fieldChanged(field, draft.draft, existingRef));
    const entry: ScripterDiffEntry = {
      index: draft.index,
      externalId: key,
      draftName,
      draftPrice,
      existing: existingRef,
      changedFields,
    };
    if (changedFields.length === 0) unchangedDrafts.push(entry);
    else updateDrafts.push(entry);
  }

  return {
    new: newDrafts,
    update: updateDrafts,
    noKey: noKeyDrafts,
    unchanged: unchangedDrafts,
    byExternalId,
    totals: {
      new: newDrafts.length,
      update: updateDrafts.length,
      noKey: noKeyDrafts.length,
      unchanged: unchangedDrafts.length,
    },
  };
};
