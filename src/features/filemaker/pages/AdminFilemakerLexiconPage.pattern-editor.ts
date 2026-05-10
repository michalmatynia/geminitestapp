import { useCallback, useState } from 'react';

import { createFilemakerLexiconValidationPattern } from '../settings';
import type { FilemakerDatabase, FilemakerLexiconValidationPattern } from '../types';
import { createClientFilemakerId } from './filemaker-page-utils';
import type { PersistFilemakerLexiconDatabase } from './AdminFilemakerLexiconPage.type-editor';

export type FilemakerLexiconPatternEditorController = {
  addPattern: () => void;
  changePattern: (id: string, patch: Partial<FilemakerLexiconValidationPattern>) => void;
  close: () => void;
  drafts: FilemakerLexiconValidationPattern[];
  open: boolean;
  openEditor: () => void;
  removePattern: (id: string) => void;
  save: () => Promise<void>;
};

const applyPatternPatch = (
  pattern: FilemakerLexiconValidationPattern,
  patch: Partial<FilemakerLexiconValidationPattern>
): FilemakerLexiconValidationPattern => {
  const onlyToggledEnabled =
    Object.keys(patch).length === 1 && Object.prototype.hasOwnProperty.call(patch, 'enabled');
  return {
    ...pattern,
    ...patch,
    system: pattern.system && onlyToggledEnabled ? pattern.system : false,
  };
};

const updatePatternDrafts = (
  current: FilemakerLexiconValidationPattern[],
  id: string,
  patch: Partial<FilemakerLexiconValidationPattern>
): FilemakerLexiconValidationPattern[] =>
  current.map((pattern) => (pattern.id === id ? applyPatternPatch(pattern, patch) : pattern));

const createDraftPattern = (
  current: FilemakerLexiconValidationPattern[]
): FilemakerLexiconValidationPattern => {
  const now = new Date().toISOString();
  return createFilemakerLexiconValidationPattern({
    id: createClientFilemakerId('filemaker-lexicon-validation-pattern'),
    label: 'New validation pattern',
    enabled: true,
    priority: current.length > 0 ? Math.max(...current.map((pattern) => pattern.priority)) + 10 : 100,
    matchMode: 'regex',
    pattern: '',
    targetTypeKey: 'other',
    sourceScope: 'all',
    confidence: 0.8,
    system: false,
    createdAt: now,
    updatedAt: now,
  });
};

const removePatternDraft = (
  current: FilemakerLexiconValidationPattern[],
  id: string
): FilemakerLexiconValidationPattern[] =>
  current.flatMap((pattern) => {
    if (pattern.id !== id) return [pattern];
    return pattern.system ? [{ ...pattern, enabled: false }] : [];
  });

const toSavedPatterns = (
  drafts: FilemakerLexiconValidationPattern[],
  now: string
): FilemakerLexiconValidationPattern[] =>
  drafts
    .filter((pattern) => pattern.label.trim().length > 0 && pattern.pattern.trim().length > 0)
    .map((pattern) => createFilemakerLexiconValidationPattern({ ...pattern, updatedAt: now }));

export const useFilemakerLexiconPatternEditor = (input: {
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
      setDrafts((current) => updatePatternDrafts(current, id, patch));
    },
    []
  );
  const addPattern = useCallback((): void => {
    setDrafts((current) => [...current, createDraftPattern(current)]);
  }, []);
  const removePattern = useCallback((id: string): void => {
    setDrafts((current) => removePatternDraft(current, id));
  }, []);
  const save = useCallback(async (): Promise<void> => {
    await persistDatabase(
      { ...database, lexiconValidationPatterns: toSavedPatterns(drafts, new Date().toISOString()) },
      'Lexicon validation patterns updated.'
    );
    close();
  }, [close, database, drafts, persistDatabase]);
  return { addPattern, changePattern, close, drafts, open, openEditor, removePattern, save };
};
