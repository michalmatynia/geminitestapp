'use client';

import { Plus, SlidersHorizontal, Workflow } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui/primitives.public';

import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import {
  createFilemakerLexiconValidationPattern,
  FILEMAKER_DATABASE_KEY,
  parseFilemakerDatabase,
} from '../settings';
import type {
  FilemakerDatabase,
  FilemakerLexiconTerm,
  FilemakerLexiconTermCategory,
  FilemakerLexiconValidationPattern,
} from '../types';
import { FilemakerLexiconPageView } from './AdminFilemakerLexiconPage.components';
import {
  buildFilemakerLexiconTypeMetadata,
  getFilemakerLexiconCreateCategory,
  parseFilemakerLexiconCategoryFilter,
} from './AdminFilemakerLexiconPage.type-metadata';
import {
  useFilemakerLexiconTypeUi,
  usePersistFilemakerLexiconDatabase,
  useFilemakerLexiconTypeEditor,
  type PersistFilemakerLexiconDatabase,
} from './AdminFilemakerLexiconPage.type-editor';

/* eslint-disable max-lines */
import {
  DEFAULT_FILEMAKER_LEXICON_FORM,
  filterFilemakerLexiconTermRows,
  hasDuplicateFilemakerLexiconTerm,
  toFilemakerLexiconTermRows,
  upsertFilemakerLexiconTermInDatabase,
  withDeletedFilemakerLexiconTerm,
  type FilemakerLexiconEditorState,
  type FilemakerLexiconFormState,
  type FilemakerLexiconTermRow,
} from './AdminFilemakerLexiconPage.helpers';
import { createClientFilemakerId } from './filemaker-page-utils';

type FilemakerLexiconEditorController = {
  changeEditorForm: (patch: Partial<FilemakerLexiconFormState>) => void;
  closeEditor: () => void;
  deleteTerm: (term: FilemakerLexiconTerm) => void;
  editor: FilemakerLexiconEditorState;
  openCreate: () => void;
  openEdit: (term: FilemakerLexiconTerm) => void;
  saveEditor: () => Promise<void>;
};

type UseFilemakerLexiconEditorInput = {
  categoryFilter: FilemakerLexiconTermCategory | 'all';
  confirm: ReturnType<typeof useConfirm>['confirm'];
  database: FilemakerDatabase;
  persistDatabase: PersistFilemakerLexiconDatabase;
  toast: ReturnType<typeof useToast>['toast'];
};

type FilemakerLexiconPatternEditorController = {
  addPattern: () => void;
  changePattern: (id: string, patch: Partial<FilemakerLexiconValidationPattern>) => void;
  close: () => void;
  drafts: FilemakerLexiconValidationPattern[];
  open: boolean;
  openEditor: () => void;
  removePattern: (id: string) => void;
  save: () => Promise<void>;
};

const buildLexiconPageActions = (
  router: ReturnType<typeof useRouter>,
  openCreate: () => void,
  openTypes: () => void,
  openPatterns: () => void
): PanelAction[] => [
  {
    key: 'create-lexicon-term',
    label: 'Create Term',
    icon: <Plus className='size-4' />,
    variant: 'default',
    onClick: openCreate,
  },
  {
    key: 'manage-lexicon-types',
    label: 'Manage Types',
    icon: <SlidersHorizontal className='size-4' />,
    variant: 'outline',
    onClick: openTypes,
  },
  {
    key: 'manage-lexicon-validation-patterns',
    label: 'Manage Patterns',
    icon: <Workflow className='size-4' />,
    variant: 'outline',
    onClick: openPatterns,
  },
  ...buildFilemakerNavActions(router, 'lexicon'),
];

const createNewEditorState = (
  categoryFilter: FilemakerLexiconTermCategory | 'all'
): FilemakerLexiconEditorState => ({
  editing: null,
  form: {
    ...DEFAULT_FILEMAKER_LEXICON_FORM,
    category: getFilemakerLexiconCreateCategory(categoryFilter),
  },
  open: true,
});

const createExistingEditorState = (
  term: FilemakerLexiconTerm
): FilemakerLexiconEditorState => ({
  editing: term,
  form: { category: term.typeKey, iconUrl: term.iconUrl ?? '', label: term.label },
  open: true,
});

const getSaveMessage = (editing: FilemakerLexiconTerm | null): string => {
  if (editing === null) return 'Lexicon term created.';
  return 'Lexicon term updated.';
};

const useFilemakerLexiconRows = (
  database: FilemakerDatabase,
  categoryFilter: FilemakerLexiconTermCategory | 'all',
  query: string
): FilemakerLexiconTermRow[] => {
  const deferredQuery = useDeferredValue(query.trim());
  const rows = useMemo(() => toFilemakerLexiconTermRows(database), [database]);
  const typeMetadata = useMemo(() => buildFilemakerLexiconTypeMetadata(database), [database]);
  return useMemo(
    () =>
      filterFilemakerLexiconTermRows(
        rows,
        { category: categoryFilter, query: deferredQuery },
        typeMetadata
      ),
    [categoryFilter, deferredQuery, rows, typeMetadata]
  );
};

const readUrlLexiconFilters = (): {
  categoryFilter: FilemakerLexiconTermCategory | 'all';
  query: string;
} => {
  if (typeof window === 'undefined') return { categoryFilter: 'all', query: '' };
  const params = new URLSearchParams(window.location.search);
  return {
    categoryFilter: parseFilemakerLexiconCategoryFilter(
      params.get('type') ?? params.get('category') ?? 'all'
    ),
    query: params.get('query') ?? '',
  };
};

const useUrlBackedLexiconFilters = (): {
  categoryFilter: FilemakerLexiconTermCategory | 'all';
  query: string;
  setCategoryFilter: React.Dispatch<React.SetStateAction<FilemakerLexiconTermCategory | 'all'>>;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
} => {
  const initialFilters = readUrlLexiconFilters;
  const [query, setQuery] = useState(() => initialFilters().query);
  const [categoryFilter, setCategoryFilter] = useState<FilemakerLexiconTermCategory | 'all'>(
    () => initialFilters().categoryFilter
  );
  useEffect(() => {
    const syncFromLocation = (): void => {
      const filters = readUrlLexiconFilters();
      setQuery(filters.query);
      setCategoryFilter(filters.categoryFilter);
    };
    window.addEventListener('popstate', syncFromLocation);
    syncFromLocation();
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, []);
  return { categoryFilter, query, setCategoryFilter, setQuery };
};

const useFilemakerLexiconEditor = (
  input: UseFilemakerLexiconEditorInput
): FilemakerLexiconEditorController => {
  const { categoryFilter, confirm, database, persistDatabase, toast } = input;
  const [editor, setEditor] = useState<FilemakerLexiconEditorState>({
    editing: null,
    form: DEFAULT_FILEMAKER_LEXICON_FORM,
    open: false,
  });
  const closeEditor = useCallback((): void => {
    setEditor((current) => ({ ...current, open: false }));
  }, []);
  const changeEditorForm = useCallback((patch: Partial<FilemakerLexiconFormState>): void => {
    setEditor((current) => ({ ...current, form: { ...current.form, ...patch } }));
  }, []);
  const openCreate = useCallback((): void => {
    setEditor(createNewEditorState(categoryFilter));
  }, [categoryFilter]);
  const openEdit = useCallback((term: FilemakerLexiconTerm): void => {
    setEditor(createExistingEditorState(term));
  }, []);
  const saveEditor = useCallback(async (): Promise<void> => {
    if (hasDuplicateFilemakerLexiconTerm(database, editor.editing?.id ?? null, editor.form)) {
      toast('A lexicon term with this label and type already exists.', { variant: 'error' });
      return;
    }
    await persistDatabase(
      upsertFilemakerLexiconTermInDatabase({
        database,
        editing: editor.editing,
        fallbackId: createClientFilemakerId('filemaker-lexicon-term'),
        form: editor.form,
        now: new Date().toISOString(),
      }),
      getSaveMessage(editor.editing)
    );
    closeEditor();
  }, [closeEditor, database, editor, persistDatabase, toast]);
  const deleteTerm = useCallback(
    (term: FilemakerLexiconTerm): void => {
      confirm({
        title: 'Delete lexicon term?',
        message: `Delete "${term.label}" and remove it from linked job listings?`,
        isDangerous: true,
        onConfirm: async () => {
          await persistDatabase(withDeletedFilemakerLexiconTerm(database, term), 'Lexicon term deleted.');
        },
      });
    },
    [confirm, database, persistDatabase]
  );
  return { changeEditorForm, closeEditor, deleteTerm, editor, openCreate, openEdit, saveEditor };
};

// eslint-disable-next-line max-lines-per-function
const useFilemakerLexiconPatternEditor = (input: {
  database: FilemakerDatabase;
  persistDatabase: PersistFilemakerLexiconDatabase;
}): FilemakerLexiconPatternEditorController => {
  const { database, persistDatabase } = input;
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<FilemakerLexiconValidationPattern[]>([]);
  const openEditor = useCallback((): void => {
    setDrafts(database.lexiconValidationPatterns);
    setOpen(true);
  }, [database.lexiconValidationPatterns]);
  const close = useCallback((): void => setOpen(false), []);
  const changePattern = useCallback(
    (id: string, patch: Partial<FilemakerLexiconValidationPattern>): void => {
      setDrafts((current) =>
        current.map((pattern) => {
          if (pattern.id !== id) return pattern;
          const onlyToggledEnabled =
            Object.keys(patch).length === 1 &&
            Object.prototype.hasOwnProperty.call(patch, 'enabled');
          return {
            ...pattern,
            ...patch,
            system: pattern.system && onlyToggledEnabled ? pattern.system : false,
          };
        })
      );
    },
    []
  );
  const addPattern = useCallback((): void => {
    const now = new Date().toISOString();
    setDrafts((current) => [
      ...current,
      createFilemakerLexiconValidationPattern({
        id: createClientFilemakerId('filemaker-lexicon-validation-pattern'),
        label: 'New validation pattern',
        enabled: true,
        priority:
          current.length > 0
            ? Math.max(...current.map((pattern) => pattern.priority)) + 10
            : 100,
        matchMode: 'regex',
        pattern: '',
        targetTypeKey: 'other',
        sourceScope: 'all',
        confidence: 0.8,
        system: false,
        createdAt: now,
        updatedAt: now,
      }),
    ]);
  }, []);
  const removePattern = useCallback((id: string): void => {
    setDrafts((current) =>
      current.flatMap((pattern) => {
        if (pattern.id !== id) return [pattern];
        return pattern.system ? [{ ...pattern, enabled: false }] : [];
      })
    );
  }, []);
  const save = useCallback(async (): Promise<void> => {
    const now = new Date().toISOString();
    await persistDatabase(
      {
        ...database,
        lexiconValidationPatterns: drafts
          .filter((pattern) => pattern.label.trim().length > 0 && pattern.pattern.trim().length > 0)
          .map((pattern) =>
            createFilemakerLexiconValidationPattern({
              ...pattern,
              updatedAt: now,
            })
          ),
      },
      'Lexicon validation patterns updated.'
    );
    close();
  }, [close, database, drafts, persistDatabase]);
  return { addPattern, changePattern, close, drafts, open, openEditor, removePattern, save };
};

export function AdminFilemakerLexiconPage(): React.JSX.Element {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const { categoryFilter, query, setCategoryFilter, setQuery } = useUrlBackedLexiconFilters();
  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const { categoryOptions, editCategoryOptions } = useFilemakerLexiconTypeUi(database);
  const filteredRows = useFilemakerLexiconRows(database, categoryFilter, query);
  const persistDatabase = usePersistFilemakerLexiconDatabase({
    settingsStore,
    toast,
    updateSetting,
  });
  const typeEditor = useFilemakerLexiconTypeEditor({ database, persistDatabase, toast });
  const patternEditor = useFilemakerLexiconPatternEditor({ database, persistDatabase });
  const editor = useFilemakerLexiconEditor({
    categoryFilter,
    confirm,
    database,
    persistDatabase,
    toast,
  });
  const actions = useMemo(
    () =>
      buildLexiconPageActions(
        router,
        editor.openCreate,
        typeEditor.openEditor,
        patternEditor.openEditor
      ),
    [editor.openCreate, patternEditor.openEditor, router, typeEditor.openEditor]
  );
  return (
    <FilemakerLexiconPageView
      actions={actions}
      categoryOptions={categoryOptions}
      categoryFilter={categoryFilter}
      ConfirmationModal={ConfirmationModal}
      data={filteredRows}
      editCategoryOptions={editCategoryOptions}
      editor={editor.editor}
      isLoading={settingsStore.isLoading || updateSetting.isPending}
      onCategoryFilterChange={setCategoryFilter}
      onEditorChange={editor.changeEditorForm}
      onEditorClose={editor.closeEditor}
      onEditorSave={editor.saveEditor}
      onDeleteTerm={editor.deleteTerm}
      onEditTerm={editor.openEdit}
      query={query}
      setQuery={setQuery}
      typeEditor={typeEditor}
      patternEditor={patternEditor}
    />
  );
}

export default AdminFilemakerLexiconPage;
