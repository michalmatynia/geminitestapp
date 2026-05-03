import type { TitleDescriptionDto } from '@/shared/contracts/base';

export const textEditorEngineInstanceValues = [
  'notes_app',
  'filemaker_email',
  'case_resolver',
] as const;

export type TextEditorEngineInstance = (typeof textEditorEngineInstanceValues)[number];

export type TextEditorEngineAppearance = 'default' | 'document-preview';

export type TextEditorEngineProfile = {
  appearance: TextEditorEngineAppearance;
  allowFontFamily: boolean;
  allowTextAlign: boolean;
  enableAdvancedTools: boolean;
  allowImage: boolean;
  allowTable: boolean;
  allowTaskList: boolean;
};

export type TextEditorEngineProfilesMap = Record<
  TextEditorEngineInstance,
  TextEditorEngineProfile
>;

export type { TitleDescriptionDto as TextEditorEngineSettingsMeta };
