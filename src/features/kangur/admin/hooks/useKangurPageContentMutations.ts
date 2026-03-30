'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { DEFAULT_KANGUR_PAGE_CONTENT_STORE } from '@/features/kangur/ai-tutor/page-content-catalog';
import {
  parseKangurPageContentStore,
  type KangurPageContentEntry,
  type KangurPageContentFragment,
  type KangurPageContentStore,
} from '@/features/kangur/shared/contracts/kangur-page-content';
import { api } from '@/shared/lib/api-client';
import { useToast } from '@/features/kangur/shared/ui';
import {
  withKangurClientError,
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';
const AI_TUTOR_PAGE_CONTENT_EDITOR_LOCALE = 'pl';
const EMPTY_PAGE_CONTENT_EDITOR_VALUE = '';
const EMPTY_KANGUR_PAGE_CONTENT_STORE = parseKangurPageContentStore({
  locale: AI_TUTOR_PAGE_CONTENT_EDITOR_LOCALE,
  version: DEFAULT_KANGUR_PAGE_CONTENT_STORE.version,
  entries: [],
});

const stringifyPageContentStore = (store: KangurPageContentStore): string =>
  `${JSON.stringify(store, null, 2)}
`;

const normalizeEntries = (entries: KangurPageContentEntry[]): KangurPageContentEntry[] =>
  entries.map((entry, index) => ({
    ...entry,
    sortOrder: (index + 1) * 10,
  }));

const normalizeFragments = (
  fragments: KangurPageContentFragment[]
): KangurPageContentFragment[] =>
  fragments.map((fragment, index) => ({
    ...fragment,
    sortOrder: (index + 1) * 10,
  }));

const createEntryId = (): string =>
  `page-content-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createFragmentId = (): string =>
  `fragment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyEntry = (sortOrder: number): KangurPageContentEntry => ({
  id: createEntryId(),
  pageKey: 'Game',
  screenKey: 'custom',
  surface: 'game',
  route: '/game',
  componentId: 'custom-section',
  widget: 'CustomWidget',
  sourcePath: 'src/features/kangur/ui/pages/Game.tsx',
  title: 'Nowa sekcja',
  summary: 'Krótki opis nowej sekcji Kangur.',
  body: 'Pełny opis nowej sekcji Kangur do uzupełnienia przez administratora.',
  anchorIdPrefix: null,
  focusKind: 'screen',
  contentIdPrefixes: [],
  nativeGuideIds: [],
  triggerPhrases: [],
  fragments: [],
  tags: ['page-content'],
  notes: undefined,
  enabled: true,
  sortOrder,
});

const createEmptyFragment = (sortOrder: number): KangurPageContentFragment => ({
  id: createFragmentId(),
  text: 'Nowy fragment',
  aliases: [],
  explanation: 'Wyjaśnienie wybranego fragmentu dla AI Tutora.',
  nativeGuideIds: [],
  triggerPhrases: [],
  enabled: true,
  sortOrder,
});

type ParsedEditorState = {
  store: KangurPageContentStore | null;
  error: string | null;
};

export function useKangurPageContentMutations() {
  const { toast } = useToast();
  const [editorValue, setEditorValue] = useState(() => EMPTY_PAGE_CONTENT_EDITOR_VALUE);
  const [persistedEditorValue, setPersistedEditorValue] = useState(
    () => EMPTY_PAGE_CONTENT_EDITOR_VALUE
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedFragmentId, setSelectedFragmentId] = useState<string | null>(null);

  const isDirty = editorValue !== persistedEditorValue;

  const parsedState = useMemo<ParsedEditorState>(() => {
    if (editorValue.trim().length === 0) {
      return {
        store: null,
        error: null,
      };
    }

    return withKangurClientErrorSync(
      {
        source: 'kangur.admin.page-content',
        action: 'parse-editor-json',
        description: 'Parses the admin page content editor JSON payload.',
      },
      () => ({
        store: parseKangurPageContentStore(JSON.parse(editorValue)),
        error: null,
      }),
      {
        fallback: {
          store: null,
          error: 'Invalid page-content JSON.',
        } as ParsedEditorState,
      }
    );
  }, [editorValue]);

  const selectedEntry = useMemo(
    () => parsedState.store?.entries.find((entry) => entry.id === selectedEntryId) ?? null,
    [parsedState.store, selectedEntryId]
  );

  const selectedFragment = useMemo(
    () => selectedEntry?.fragments.find((fragment) => fragment.id === selectedFragmentId) ?? null,
    [selectedEntry, selectedFragmentId]
  );

  const loadStore = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    const didLoad = await withKangurClientError(
      {
        source: 'kangur.admin.page-content',
        action: 'load-store',
        description: 'Loads the Kangur page content store for the admin editor.',
        context: { locale: AI_TUTOR_PAGE_CONTENT_EDITOR_LOCALE },
      },
      async () => {
        const store = await api.get<KangurPageContentStore>(
          `/api/kangur/ai-tutor/page-content?locale=${encodeURIComponent(
            AI_TUTOR_PAGE_CONTENT_EDITOR_LOCALE
          )}`,
          {
            cache: 'no-store',
          }
        );
        const parsed = parseKangurPageContentStore(store);
        const serialized = stringifyPageContentStore(parsed);
        setEditorValue(serialized);
        setPersistedEditorValue(serialized);
        setSelectedEntryId(parsed.entries[0]?.id ?? null);
        return true;
      },
      {
        fallback: false,
        onError: (error) => {
          toast(
            error instanceof Error ? error.message : 'Failed to load Kangur page content.',
            {
              variant: 'error',
            }
          );
        },
      }
    );
    if (!didLoad) {
      // keep existing editor state
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    void loadStore();
  }, [loadStore]);

  const applyStore = useCallback((nextStore: KangurPageContentStore): void => {
    setEditorValue(stringifyPageContentStore(parseKangurPageContentStore(nextStore)));
  }, []);

  const updateSelectedEntry = useCallback((
    updater: (entry: KangurPageContentEntry) => KangurPageContentEntry
  ): void => {
    if (!parsedState.store || !selectedEntry) {
      return;
    }

    const nextEntry = updater(selectedEntry);
    applyStore({
      ...parsedState.store,
      entries: parsedState.store.entries.map((entry) =>
        entry.id === selectedEntry.id ? nextEntry : entry
      ),
    });
    setSelectedEntryId(nextEntry.id);
  }, [applyStore, parsedState.store, selectedEntry]);

  const handleAddEntry = useCallback((): void => {
    const baseStore = parsedState.store ?? EMPTY_KANGUR_PAGE_CONTENT_STORE;
    const nextEntries = normalizeEntries([
      ...baseStore.entries,
      createEmptyEntry((baseStore.entries.length + 1) * 10),
    ]);
    const nextEntry = nextEntries[nextEntries.length - 1] ?? null;

    applyStore({
      ...baseStore,
      entries: nextEntries,
    });
    setSelectedEntryId(nextEntry?.id ?? null);
  }, [applyStore, parsedState.store]);

  const handleDuplicateSelectedEntry = useCallback((): void => {
    if (!parsedState.store || !selectedEntry) {
      return;
    }

    const duplicate: KangurPageContentEntry = {
      ...selectedEntry,
      id: createEntryId(),
      title: `${selectedEntry.title} kopia`,
      sortOrder: selectedEntry.sortOrder + 1,
    };
    const currentIndex = parsedState.store.entries.findIndex((entry) => entry.id === selectedEntry.id);
    const nextEntries = [...parsedState.store.entries];
    nextEntries.splice(currentIndex + 1, 0, duplicate);
    const normalizedEntries = normalizeEntries(nextEntries);

    applyStore({
      ...parsedState.store,
      entries: normalizedEntries,
    });
    setSelectedEntryId(duplicate.id);
  }, [applyStore, parsedState.store, selectedEntry]);

  const handleDeleteSelectedEntry = useCallback((): void => {
    if (!parsedState.store || !selectedEntry) {
      return;
    }

    const nextEntries = normalizeEntries(
      parsedState.store.entries.filter((entry) => entry.id !== selectedEntry.id)
    );
    applyStore({
      ...parsedState.store,
      entries: nextEntries,
    });
    setSelectedEntryId(nextEntries[0]?.id ?? null);
  }, [applyStore, parsedState.store, selectedEntry]);

  const handleMoveSelectedEntry = useCallback((direction: -1 | 1): void => {
    if (!parsedState.store || !selectedEntry) {
      return;
    }

    const currentIndex = parsedState.store.entries.findIndex((entry) => entry.id === selectedEntry.id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= parsedState.store.entries.length) {
      return;
    }

    const nextEntries = [...parsedState.store.entries];
    const [removed] = nextEntries.splice(currentIndex, 1);
    if (!removed) {
      return;
    }
    nextEntries.splice(nextIndex, 0, removed);
    applyStore({
      ...parsedState.store,
      entries: normalizeEntries(nextEntries),
    });
  }, [applyStore, parsedState.store, selectedEntry]);

  const handleResetToDefaults = useCallback((): void => {
    const serialized = stringifyPageContentStore(DEFAULT_KANGUR_PAGE_CONTENT_STORE);
    setEditorValue(serialized);
    setSelectedEntryId(DEFAULT_KANGUR_PAGE_CONTENT_STORE.entries[0]?.id ?? null);
    setSelectedFragmentId(DEFAULT_KANGUR_PAGE_CONTENT_STORE.entries[0]?.fragments[0]?.id ?? null);
  }, []);

  const updateSelectedFragment = useCallback((
    updater: (fragment: KangurPageContentFragment) => KangurPageContentFragment
  ): void => {
    if (!selectedEntry || !selectedFragment) {
      return;
    }

    const nextFragment = updater(selectedFragment);
    updateSelectedEntry((entry) => ({
      ...entry,
      fragments: entry.fragments.map((fragment) =>
        fragment.id === selectedFragment.id ? nextFragment : fragment
      ),
    }));
    setSelectedFragmentId(nextFragment.id);
  }, [selectedEntry, selectedFragment, updateSelectedEntry]);

  const handleAddFragment = useCallback((): void => {
    if (!selectedEntry) {
      return;
    }

    const nextFragments = normalizeFragments([
      ...selectedEntry.fragments,
      createEmptyFragment((selectedEntry.fragments.length + 1) * 10),
    ]);
    const nextFragment = nextFragments[nextFragments.length - 1] ?? null;
    updateSelectedEntry((entry) => ({
      ...entry,
      fragments: nextFragments,
    }));
    setSelectedFragmentId(nextFragment?.id ?? null);
  }, [selectedEntry, updateSelectedEntry]);

  const handleDuplicateSelectedFragment = useCallback((): void => {
    if (!selectedEntry || !selectedFragment) {
      return;
    }

    const duplicate: KangurPageContentFragment = {
      ...selectedFragment,
      id: createFragmentId(),
      text: `${selectedFragment.text} kopia`,
      sortOrder: selectedFragment.sortOrder + 1,
    };
    const currentIndex = selectedEntry.fragments.findIndex(
      (fragment) => fragment.id === selectedFragment.id
    );
    const nextFragments = [...selectedEntry.fragments];
    nextFragments.splice(currentIndex + 1, 0, duplicate);
    const normalizedFragments = normalizeFragments(nextFragments);
    updateSelectedEntry((entry) => ({
      ...entry,
      fragments: normalizedFragments,
    }));
    setSelectedFragmentId(duplicate.id);
  }, [selectedEntry, selectedFragment, updateSelectedEntry]);

  const handleDeleteSelectedFragment = useCallback((): void => {
    if (!selectedEntry || !selectedFragment) {
      return;
    }

    const nextFragments = normalizeFragments(
      selectedEntry.fragments.filter((fragment) => fragment.id !== selectedFragment.id)
    );
    updateSelectedEntry((entry) => ({
      ...entry,
      fragments: nextFragments,
    }));
    setSelectedFragmentId(nextFragments[0]?.id ?? null);
  }, [selectedEntry, selectedFragment, updateSelectedEntry]);

  const handleMoveSelectedFragment = useCallback((direction: -1 | 1): void => {
    if (!selectedEntry || !selectedFragment) {
      return;
    }

    const currentIndex = selectedEntry.fragments.findIndex(
      (fragment) => fragment.id === selectedFragment.id
    );
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= selectedEntry.fragments.length) {
      return;
    }

    const nextFragments = [...selectedEntry.fragments];
    const [removed] = nextFragments.splice(currentIndex, 1);
    if (!removed) {
      return;
    }

    nextFragments.splice(nextIndex, 0, removed);
    const normalizedFragments = normalizeFragments(nextFragments);
    updateSelectedEntry((entry) => ({
      ...entry,
      fragments: normalizedFragments,
    }));
  }, [selectedEntry, selectedFragment, updateSelectedEntry]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (parsedState.error || !parsedState.store) {
      toast(parsedState.error ?? 'Page content JSON is invalid.', { variant: 'error' });
      return;
    }

    setIsSaving(true);
    const didSave = await withKangurClientError(
      {
        source: 'kangur.admin.page-content',
        action: 'save-store',
        description: 'Saves the Kangur page content store from the admin editor.',
      },
      async () => {
        const saved = await api.post<KangurPageContentStore>(
          '/api/kangur/ai-tutor/page-content',
          parsedState.store
        );
        const serialized = stringifyPageContentStore(parseKangurPageContentStore(saved));
        setEditorValue(serialized);
        setPersistedEditorValue(serialized);
        return true;
      },
      {
        fallback: false,
        onError: (error) => {
          toast(error instanceof Error ? error.message : 'Failed to save Kangur page content.', {
            variant: 'error',
          });
        },
      }
    );

    if (didSave) {
      toast('Kangur page content saved.', { variant: 'success' });
    }
    setIsSaving(false);
  }, [parsedState.error, parsedState.store, toast]);

  return {
    editorValue,
    setEditorValue,
    isLoading,
    isSaving,
    selectedEntryId,
    setSelectedEntryId,
    selectedFragmentId,
    setSelectedFragmentId,
    isDirty,
    parsedState,
    selectedEntry,
    selectedFragment,
    loadStore,
    handleSave,
    handleAddEntry,
    handleDuplicateSelectedEntry,
    handleDeleteSelectedEntry,
    handleMoveSelectedEntry,
    handleResetToDefaults,
    updateSelectedEntry,
    updateSelectedFragment,
    handleAddFragment,
    handleDuplicateSelectedFragment,
    handleDeleteSelectedFragment,
    handleMoveSelectedFragment,
  };
}
