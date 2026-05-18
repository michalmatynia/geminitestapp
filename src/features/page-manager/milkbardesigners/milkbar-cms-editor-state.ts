import type { MilkbarCmsUpdateInput } from './milkbar-cms.types';

export const DRAWING_IMAGE_SLOT_COUNT = 4;
export const MILKBAR_CMS_EDITOR_DRAFT_STORAGE_KEY = 'milkbar-cms-editor-draft:v1';

export type MilkbarCmsEditorDraft = {
  payload: MilkbarCmsUpdateInput;
  snapshotUpdatedAt: string | null;
  updatedAt: string;
};

const isUnknownRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseMilkbarCmsEditorDraftPayload = (
  payload: unknown
): MilkbarCmsUpdateInput | null => {
  if (!isUnknownRecord(payload)) return null;
  const localizedContent = payload['localizedContent'];
  const pageSettings = payload['pageSettings'];
  const projects = payload['projects'];
  const services = payload['services'];
  if (!isUnknownRecord(localizedContent)) return null;
  if (!isUnknownRecord(pageSettings)) return null;
  if (!Array.isArray(projects) || !Array.isArray(services)) return null;
  return {
    localizedContent: localizedContent as MilkbarCmsUpdateInput['localizedContent'],
    pageSettings: pageSettings as MilkbarCmsUpdateInput['pageSettings'],
    projects: projects as MilkbarCmsUpdateInput['projects'],
    services: services as MilkbarCmsUpdateInput['services'],
  };
};

export const parseMilkbarCmsEditorDraft = (raw: string): MilkbarCmsEditorDraft | null => {
  const parsed: unknown = JSON.parse(raw);
  if (!isUnknownRecord(parsed)) return null;
  const payload = parseMilkbarCmsEditorDraftPayload(parsed['payload']);
  const updatedAt = parsed['updatedAt'];
  if (payload === null || typeof updatedAt !== 'string' || updatedAt.trim().length === 0) {
    return null;
  }
  const snapshotUpdatedAt = parsed['snapshotUpdatedAt'];
  return {
    payload,
    snapshotUpdatedAt: typeof snapshotUpdatedAt === 'string' ? snapshotUpdatedAt : null,
    updatedAt,
  };
};

export const readMilkbarCmsEditorDraft = (): MilkbarCmsEditorDraft | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(MILKBAR_CMS_EDITOR_DRAFT_STORAGE_KEY);
  if (raw === null || raw.trim().length === 0) return null;
  try {
    return parseMilkbarCmsEditorDraft(raw);
  } catch {
    return null;
  }
};

export const writeMilkbarCmsEditorDraft = (draft: MilkbarCmsEditorDraft): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MILKBAR_CMS_EDITOR_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Local draft persistence is best-effort.
  }
};

export const clearMilkbarCmsEditorDraft = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(MILKBAR_CMS_EDITOR_DRAFT_STORAGE_KEY);
  } catch {
    // Local draft persistence is best-effort.
  }
};

export const createDrawingImageSlotValues = (images: string[]): string[] =>
  Array.from({ length: DRAWING_IMAGE_SLOT_COUNT }, (_, index) => images[index]?.trim() ?? '');

export const compactDrawingImageSlotValues = (values: string[]): string[] => {
  const next = values.slice(0, DRAWING_IMAGE_SLOT_COUNT).map((value) => value.trim());
  while (next.length > 0 && next[next.length - 1] === '') {
    next.pop();
  }
  return next;
};

export const setDrawingImageSlotValue = (
  values: string[],
  index: number,
  nextValue: string
): string[] | null => {
  if (index < 0 || index >= DRAWING_IMAGE_SLOT_COUNT) return null;
  const nextValues = createDrawingImageSlotValues(values);
  nextValues[index] = nextValue.trim();
  return nextValues;
};

export const fillDrawingImageSlotValues = (
  values: string[],
  filepaths: string[],
  preferredIndex: number | null
): string[] | null => {
  const accepted = filepaths
    .map((filepath) => filepath.trim())
    .filter((filepath) => filepath.length > 0);
  if (accepted.length === 0) return null;

  const nextValues = createDrawingImageSlotValues(values);
  let searchIndex = preferredIndex ?? 0;
  accepted.forEach((filepath, fileIndex) => {
    const targetIndex =
      preferredIndex !== null && fileIndex === 0
        ? preferredIndex
        : nextValues.findIndex((entry, index) => index >= searchIndex && entry.length === 0);
    if (targetIndex < 0 || targetIndex >= DRAWING_IMAGE_SLOT_COUNT) return;
    nextValues[targetIndex] = filepath;
    searchIndex = targetIndex + 1;
  });
  return nextValues;
};

export const swapDrawingImageSlotValues = (
  values: string[],
  fromIndex: number,
  toIndex: number
): string[] => {
  const nextValues = createDrawingImageSlotValues(values);
  [nextValues[fromIndex], nextValues[toIndex]] = [
    nextValues[toIndex] ?? '',
    nextValues[fromIndex] ?? '',
  ];
  return nextValues;
};
