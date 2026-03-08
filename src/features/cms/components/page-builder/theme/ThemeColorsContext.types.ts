import type { ColorSchemeColors } from '@/shared/contracts/cms-theme';

export interface ThemeColorsContextValue {
  schemeView: 'list' | 'edit';
  setSchemeView: (view: 'list' | 'edit') => void;
  editingSchemeId: string | null;
  setEditingSchemeId: (id: string | null) => void;
  activeScheme: { id: string; name: string; colors: ColorSchemeColors } | null;
  startAddScheme: () => void;
  startEditScheme: (schemeId: string) => void;
  handleSaveScheme: () => void;
  newSchemeName: string;
  setNewSchemeName: (value: string) => void;
  newSchemeColors: ColorSchemeColors;
  updateSchemeColor: (key: keyof ColorSchemeColors) => (value: string) => void;
  isGlobalPaletteOpen: boolean;
  toggleGlobalPalette: () => void;
  schemeAiPrompt: string;
  setSchemeAiPrompt: (value: string) => void;
  schemeAiLoading: boolean;
  schemeAiError: string | null;
  schemeAiOutput: string;
  schemeAiPreview: { name?: string | undefined; colors: Partial<ColorSchemeColors> } | null;
  brainAiProvider: 'model' | 'agent';
  brainAiModelId: string;
  brainAiAgentId: string;
  handleGenerateScheme: () => Promise<void>;
  handleCancelSchemeAi: () => void;
}

export type ThemeColorsStateContextValue = Omit<
  ThemeColorsContextValue,
  | 'setSchemeView'
  | 'setEditingSchemeId'
  | 'startAddScheme'
  | 'startEditScheme'
  | 'handleSaveScheme'
  | 'setNewSchemeName'
  | 'updateSchemeColor'
  | 'toggleGlobalPalette'
  | 'setSchemeAiPrompt'
  | 'handleGenerateScheme'
  | 'handleCancelSchemeAi'
>;

export type ThemeColorsActionsContextValue = Pick<
  ThemeColorsContextValue,
  | 'setSchemeView'
  | 'setEditingSchemeId'
  | 'startAddScheme'
  | 'startEditScheme'
  | 'handleSaveScheme'
  | 'setNewSchemeName'
  | 'updateSchemeColor'
  | 'toggleGlobalPalette'
  | 'setSchemeAiPrompt'
  | 'handleGenerateScheme'
  | 'handleCancelSchemeAi'
>;
