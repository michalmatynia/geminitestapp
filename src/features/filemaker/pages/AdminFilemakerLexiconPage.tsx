'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui/primitives.public';

import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import {
  FILEMAKER_DATABASE_KEY,
  parseFilemakerDatabase,
  toPersistedFilemakerDatabase,
} from '../settings';
import type { FilemakerDatabase, FilemakerLexiconTerm, FilemakerLexiconTermCategory } from '../types';
import {
  createFilemakerLexiconColumns,
  FilemakerLexiconPageView,
} from './AdminFilemakerLexiconPage.components';
import {
  DEFAULT_FILEMAKER_LEXICON_FORM,
  filterFilemakerLexiconTermRows,
  getFilemakerLexiconCreateCategory,
  hasDuplicateFilemakerLexiconTerm,
  toFilemakerLexiconTermRows,
  upsertFilemakerLexiconTermInDatabase,
  withDeletedFilemakerLexiconTerm,
  type FilemakerLexiconEditorState,
  type FilemakerLexiconFormState,
  type FilemakerLexiconTermRow,
} from './AdminFilemakerLexiconPage.helpers';
import { createClientFilemakerId } from './filemaker-page-utils';

type PersistFilemakerLexiconDatabase = (
  nextDatabase: FilemakerDatabase,
  message: string
) => Promise<void>;

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

const buildLexiconPageActions = (
  router: ReturnType<typeof useRouter>,
  openCreate: () => void
): PanelAction[] => [
  {
    key: 'create-lexicon-term',
    label: 'Create Term',
    icon: <Plus className='size-4' />,
    variant: 'success',
    onClick: openCreate,
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
  form: { category: term.category, label: term.label },
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
  return useMemo(
    () => filterFilemakerLexiconTermRows(rows, { category: categoryFilter, query: deferredQuery }),
    [categoryFilter, deferredQuery, rows]
  );
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
      toast('A lexicon term with this label and category already exists.', { variant: 'error' });
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

export function AdminFilemakerLexiconPage(): React.JSX.Element {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FilemakerLexiconTermCategory | 'all'>('all');
  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const filteredRows = useFilemakerLexiconRows(database, categoryFilter, query);
  const persistDatabase = useCallback<PersistFilemakerLexiconDatabase>(
    async (nextDatabase, message) => {
      await updateSetting.mutateAsync({
        key: FILEMAKER_DATABASE_KEY,
        value: JSON.stringify(toPersistedFilemakerDatabase(nextDatabase)),
      });
      settingsStore.refetch();
      toast(message, { variant: 'success' });
    },
    [settingsStore, toast, updateSetting]
  );
  const editor = useFilemakerLexiconEditor({
    categoryFilter,
    confirm,
    database,
    persistDatabase,
    toast,
  });
  const columns = useMemo(
    () => createFilemakerLexiconColumns({ onDeleteTerm: editor.deleteTerm, onEditTerm: editor.openEdit }),
    [editor.deleteTerm, editor.openEdit]
  );
  const actions = useMemo(
    () => buildLexiconPageActions(router, editor.openCreate),
    [editor.openCreate, router]
  );
  return (
    <FilemakerLexiconPageView
      actions={actions}
      categoryFilter={categoryFilter}
      columns={columns}
      ConfirmationModal={ConfirmationModal}
      data={filteredRows}
      editor={editor.editor}
      isLoading={settingsStore.isLoading || updateSetting.isPending}
      onCategoryFilterChange={setCategoryFilter}
      onEditorChange={editor.changeEditorForm}
      onEditorClose={editor.closeEditor}
      onEditorSave={editor.saveEditor}
      query={query}
      setQuery={setQuery}
    />
  );
}

export default AdminFilemakerLexiconPage;
