import { useCallback, useMemo, useState } from 'react';

import type { useUpdateSetting } from '@/shared/hooks/use-settings';
import type { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { useToast } from '@/shared/ui/primitives.public';

import { FILEMAKER_DATABASE_KEY, toPersistedFilemakerDatabase } from '../settings';
import type { FilemakerDatabase } from '../types';
import {
  buildFilemakerLexiconTypeEditOptions,
  buildFilemakerLexiconTypeFilterOptions,
  buildFilemakerLexiconTypeMetadata,
  hasInvalidFilemakerLexiconTypeDraft,
  toFilemakerLexiconTypeDrafts,
  withUpdatedFilemakerLexiconTypes,
  type FilemakerLexiconTypeDraft,
} from './AdminFilemakerLexiconPage.type-metadata';

export type PersistFilemakerLexiconDatabase = (
  nextDatabase: FilemakerDatabase,
  message: string
) => Promise<void>;

export type FilemakerLexiconTypeUi = {
  categoryOptions: ReturnType<typeof buildFilemakerLexiconTypeFilterOptions>;
  editCategoryOptions: ReturnType<typeof buildFilemakerLexiconTypeEditOptions>;
  typeMetadata: ReturnType<typeof buildFilemakerLexiconTypeMetadata>;
};

type FilemakerLexiconPersistenceInput = {
  settingsStore: ReturnType<typeof useSettingsStore>;
  toast: ReturnType<typeof useToast>['toast'];
  updateSetting: ReturnType<typeof useUpdateSetting>;
};

export type FilemakerLexiconTypeEditorController = {
  changeDraft: (
    key: FilemakerLexiconTypeDraft['key'],
    patch: Partial<FilemakerLexiconTypeDraft>
  ) => void;
  close: () => void;
  drafts: FilemakerLexiconTypeDraft[];
  open: boolean;
  openEditor: () => void;
  save: () => Promise<void>;
};

export const useFilemakerLexiconTypeUi = (
  database: FilemakerDatabase
): FilemakerLexiconTypeUi => {
  const typeMetadata = useMemo(() => buildFilemakerLexiconTypeMetadata(database), [database]);
  const categoryOptions = useMemo(
    () => buildFilemakerLexiconTypeFilterOptions(database),
    [database]
  );
  const editCategoryOptions = useMemo(
    () => buildFilemakerLexiconTypeEditOptions(database),
    [database]
  );
  return { categoryOptions, editCategoryOptions, typeMetadata };
};

export const usePersistFilemakerLexiconDatabase = (
  input: FilemakerLexiconPersistenceInput
): PersistFilemakerLexiconDatabase => {
  const { settingsStore, toast, updateSetting } = input;
  return useCallback<PersistFilemakerLexiconDatabase>(
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
};

export const useFilemakerLexiconTypeEditor = (input: {
  database: FilemakerDatabase;
  persistDatabase: PersistFilemakerLexiconDatabase;
  toast: ReturnType<typeof useToast>['toast'];
}): FilemakerLexiconTypeEditorController => {
  const { database, persistDatabase, toast } = input;
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<FilemakerLexiconTypeDraft[]>(() =>
    toFilemakerLexiconTypeDrafts(database)
  );
  const openEditor = useCallback((): void => {
    setDrafts(toFilemakerLexiconTypeDrafts(database));
    setOpen(true);
  }, [database]);
  const close = useCallback((): void => setOpen(false), []);
  const changeDraft = useCallback(
    (key: FilemakerLexiconTypeDraft['key'], patch: Partial<FilemakerLexiconTypeDraft>): void => {
      setDrafts((current) =>
        current.map((draft: FilemakerLexiconTypeDraft): FilemakerLexiconTypeDraft =>
          draft.key === key ? { ...draft, ...patch } : draft
        )
      );
    },
    []
  );
  const save = useCallback(async (): Promise<void> => {
    if (drafts.some(hasInvalidFilemakerLexiconTypeDraft)) {
      toast('Each lexicon type needs a label and numeric order.', { variant: 'error' });
      return;
    }
    await persistDatabase(
      withUpdatedFilemakerLexiconTypes(database, drafts, new Date().toISOString()),
      'Lexicon types updated.'
    );
    setOpen(false);
  }, [database, drafts, persistDatabase, toast]);
  return { changeDraft, close, drafts, open, openEditor, save };
};
