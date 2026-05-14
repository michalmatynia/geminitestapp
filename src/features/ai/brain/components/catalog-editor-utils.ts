import type { AiBrainCatalogEntry } from '../settings';
import { isSameCatalogEntry } from '@/shared/lib/ai-brain/catalog-entries';

export function getUpdatedCatalogEntries(
  catalogEntries: AiBrainCatalogEntry[],
  candidate: AiBrainCatalogEntry,
  editorMode: 'create' | 'edit',
  editingOriginal: AiBrainCatalogEntry | null
): AiBrainCatalogEntry[] {
  if (editorMode === 'edit' && editingOriginal !== null) {
    const index = catalogEntries.findIndex((entry) => isSameCatalogEntry(entry, editingOriginal));
    if (index >= 0) {
      const next = [...catalogEntries];
      next[index] = candidate;
      return next;
    }
  }
  return [...catalogEntries, candidate];
}

export function isDuplicateEntry(
  catalogEntries: AiBrainCatalogEntry[],
  candidate: AiBrainCatalogEntry,
  editorMode: 'create' | 'edit',
  editingOriginal: AiBrainCatalogEntry | null
): boolean {
  return catalogEntries.some((entry) => {
    if (editorMode === 'edit' && editingOriginal !== null && isSameCatalogEntry(entry, editingOriginal)) {
      return false;
    }
    return isSameCatalogEntry(entry, candidate);
  });
}
