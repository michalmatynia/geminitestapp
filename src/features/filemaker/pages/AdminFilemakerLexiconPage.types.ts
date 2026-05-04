import type React from 'react';
import type { PanelAction } from '@/shared/contracts/ui/panels';
import type {
  FilemakerLexiconTerm,
  FilemakerLexiconTermCategory,
  FilemakerLexiconValidationPattern,
} from '../types';
import type {
  FilemakerLexiconEditorState,
  FilemakerLexiconFormState,
  FilemakerLexiconTermRow,
} from './AdminFilemakerLexiconPage.helpers';
import type {
  FilemakerLexiconTypeMetadataMap,
  FilemakerLexiconTypeOption,
} from './AdminFilemakerLexiconPage.type-metadata';

export type FilemakerLexiconTypeEditorViewState = {
  changeDraft: (
    key: string,
    patch: Partial<any>
  ) => void;
  close: () => void;
  drafts: any[];
  open: boolean;
  save: () => Promise<void>;
};

export type FilemakerLexiconPatternEditorState = {
  addPattern: () => void;
  changePattern: (id: string, patch: Partial<FilemakerLexiconValidationPattern>) => void;
  close: () => void;
  drafts: FilemakerLexiconValidationPattern[];
  open: boolean;
  removePattern: (id: string) => void;
  save: () => Promise<void>;
};

export type FilemakerLexiconPageViewProps = {
  actions: PanelAction[];
  categoryOptions: Array<FilemakerLexiconTypeOption | { label: string; value: 'all' }>;
  categoryFilter: FilemakerLexiconTermCategory | 'all';
  data: FilemakerLexiconTermRow[];
  editor: FilemakerLexiconEditorState;
  editCategoryOptions: FilemakerLexiconTypeOption[];
  isLoading: boolean;
  onCategoryFilterChange: (value: FilemakerLexiconTermCategory | 'all') => void;
  onDeleteTerm: (term: FilemakerLexiconTerm) => void;
  onEditTerm: (term: FilemakerLexiconTerm) => void;
  onEditorChange: (patch: Partial<FilemakerLexiconFormState>) => void;
  onEditorClose: () => void;
  onEditorSave: () => Promise<void>;
  patternEditor: FilemakerLexiconPatternEditorState;
  query: string;
  setQuery: (value: string) => void;
  typeEditor: FilemakerLexiconTypeEditorViewState;
  typeMetadata: FilemakerLexiconTypeMetadataMap;
  ConfirmationModal: React.ComponentType;
};
