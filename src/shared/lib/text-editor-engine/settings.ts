import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

import { defaultTextEditorEngineProfiles } from './defaults';

import type {
  TextEditorEngineInstance,
  TextEditorEngineProfile,
} from './types';

export const TEXT_EDITOR_PROFILE_KEY_PREFIX = 'text_editor_profile::';

const normalizeAppearance = (
  value: unknown,
  fallback: TextEditorEngineProfile['appearance']
): TextEditorEngineProfile['appearance'] =>
  value === 'document-preview' || value === 'default' ? value : fallback;

const normalizeBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

export const toTextEditorEngineProfile = (
  value: Partial<TextEditorEngineProfile> | null | undefined,
  fallback: TextEditorEngineProfile
): TextEditorEngineProfile => ({
  appearance: normalizeAppearance(value?.appearance, fallback.appearance),
  allowFontFamily: normalizeBoolean(value?.allowFontFamily, fallback.allowFontFamily),
  allowTextAlign: normalizeBoolean(value?.allowTextAlign, fallback.allowTextAlign),
  enableAdvancedTools: normalizeBoolean(value?.enableAdvancedTools, fallback.enableAdvancedTools),
  allowImage: normalizeBoolean(value?.allowImage, fallback.allowImage),
  allowTable: normalizeBoolean(value?.allowTable, fallback.allowTable),
  allowTaskList: normalizeBoolean(value?.allowTaskList, fallback.allowTaskList),
});

export const getTextEditorProfileKey = (instance: TextEditorEngineInstance): string =>
  `${TEXT_EDITOR_PROFILE_KEY_PREFIX}${instance}`;

export const parseTextEditorProfileEntry = (
  instance: TextEditorEngineInstance,
  raw: string | null | undefined
): TextEditorEngineProfile => {
  const fallback = defaultTextEditorEngineProfiles[instance];
  const parsed = parseJsonSetting<Partial<TextEditorEngineProfile> | null>(raw, null);
  return toTextEditorEngineProfile(parsed, fallback);
};

export const serializeTextEditorProfileEntry = (profile: TextEditorEngineProfile): string =>
  serializeSetting(profile);

export const getTextEditorInstanceSettingsHref = (
  instance: TextEditorEngineInstance
): string => `/admin/settings/text-editors#text-editor-instance-${instance}`;
