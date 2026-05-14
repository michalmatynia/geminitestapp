import { useCallback, useState, useMemo } from 'react';
import { useToast } from '@/shared/ui/primitives.public';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import {
  BRAIN_CATALOG_POOL_LABELS,
  catalogToEntries,
  isSameCatalogEntry,
} from '@/shared/lib/ai-brain/catalog-entries';
import {
  sanitizeBrainProviderCatalog,
  type AiBrainCatalogEntry,
  type AiBrainCatalogPool,
  type AiBrainProviderCatalog,
} from '../settings';
import { getUpdatedCatalogEntries, isDuplicateEntry } from './catalog-editor-utils';

export type CatalogEntryEditorState = { value: string; pool: AiBrainCatalogPool };
const EMPTY_EDITOR_STATE: CatalogEntryEditorState = { value: '', pool: 'modelPresets' };
type CatalogEditorMode = 'create' | 'edit';

interface UseCatalogEditorProps {
  providerCatalog: AiBrainProviderCatalog;
  setProviderCatalog: (catalog: (prev: AiBrainProviderCatalog) => AiBrainProviderCatalog) => void;
}

export interface UseCatalogEditorResult {
  editorMode: CatalogEditorMode;
  editorOpen: boolean;
  editorState: CatalogEntryEditorState;
  catalogEntries: AiBrainCatalogEntry[];
  openCreateEditor: () => void;
  openEditEditor: (entry: AiBrainCatalogEntry) => void;
  closeEditor: () => void;
  handleEditorChange: (patch: Partial<CatalogEntryEditorState>) => void;
  handleSaveEditor: () => void;
  handleRemoveEntry: (entry: AiBrainCatalogEntry) => void;
  setCatalogEntries: (entries: AiBrainCatalogEntry[]) => void;
  ConfirmationModal: () => React.JSX.Element | null;
}

export function useCatalogEditor({
  providerCatalog, setProviderCatalog,
}: UseCatalogEditorProps): UseCatalogEditorResult {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const [editorMode, setEditorMode] = useState<CatalogEditorMode>('create');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorState, setEditorState] = useState<CatalogEntryEditorState>(EMPTY_EDITOR_STATE);
  const [editingOriginal, setEditingOriginal] = useState<AiBrainCatalogEntry | null>(null);

  const catalogEntries = useMemo(() => catalogToEntries(providerCatalog), [providerCatalog]);

  const setCatalogEntries = useCallback((next: AiBrainCatalogEntry[]): void => {
    setProviderCatalog((prev) => sanitizeBrainProviderCatalog({ ...prev, entries: next }));
  }, [setProviderCatalog]);

  const openCreateEditor = useCallback((): void => {
    setEditorMode('create'); setEditingOriginal(null);
    setEditorState(EMPTY_EDITOR_STATE); setEditorOpen(true);
  }, []);

  const openEditEditor = useCallback((entry: AiBrainCatalogEntry): void => {
    setEditorMode('edit'); setEditingOriginal(entry);
    setEditorState({ value: entry.value, pool: entry.pool }); setEditorOpen(true);
  }, []);

  const closeEditor = useCallback((): void => {
    setEditorOpen(false); setEditorMode('create');
    setEditingOriginal(null); setEditorState(EMPTY_EDITOR_STATE);
  }, []);

  const handleEditorChange = useCallback((patch: Partial<CatalogEntryEditorState>): void => {
    setEditorState((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSaveEditor = useCallback((): void => {
    const val = editorState.value.trim();
    if (val === '') { toast('Item ID is required.', { variant: 'error' }); return; }
    const candidate: AiBrainCatalogEntry = { pool: editorState.pool, value: val };
    if (isDuplicateEntry(catalogEntries, candidate, editorMode, editingOriginal)) {
      toast('This item already exists in the selected pool.', { variant: 'error' }); return;
    }
    setCatalogEntries(getUpdatedCatalogEntries(catalogEntries, candidate, editorMode, editingOriginal));
    closeEditor(); toast('Catalog entry updated. Save Brain settings to persist.', { variant: 'success' });
  }, [catalogEntries, closeEditor, editingOriginal, editorMode, editorState, setCatalogEntries, toast]);

  const handleRemoveEntry = useCallback((entry: AiBrainCatalogEntry): void => {
    confirm({
      title: 'Remove catalog item?',
      message: `Remove "${entry.value}" from ${BRAIN_CATALOG_POOL_LABELS[entry.pool]}? Save Brain settings to persist.`,
      confirmText: 'Remove', isDangerous: true,
      onConfirm: (): void => {
        setCatalogEntries(catalogEntries.filter((c) => !isSameCatalogEntry(c, entry)));
        toast('Catalog entry removed. Save Brain settings to persist.', { variant: 'success' });
      },
    });
  }, [catalogEntries, confirm, setCatalogEntries, toast]);

  return {
    editorMode, editorOpen, editorState, catalogEntries, openCreateEditor, openEditEditor,
    closeEditor, handleEditorChange, handleSaveEditor, handleRemoveEntry, setCatalogEntries, ConfirmationModal,
  };
}
