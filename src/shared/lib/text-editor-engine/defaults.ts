import type {
  TextEditorEngineInstance,
  TextEditorEngineProfile,
  TextEditorEngineProfilesMap,
  TextEditorEngineSettingsMeta,
} from './types';

export const defaultTextEditorEngineProfiles: TextEditorEngineProfilesMap = {
  notes_app: {
    appearance: 'default',
    allowFontFamily: false,
    allowTextAlign: false,
    enableAdvancedTools: false,
    allowImage: true,
    allowTable: true,
    allowTaskList: true,
  },
  filemaker_email: {
    appearance: 'default',
    allowFontFamily: true,
    allowTextAlign: true,
    enableAdvancedTools: true,
    allowImage: true,
    allowTable: true,
    allowTaskList: true,
  },
  case_resolver: {
    appearance: 'default',
    allowFontFamily: true,
    allowTextAlign: true,
    enableAdvancedTools: true,
    allowImage: true,
    allowTable: true,
    allowTaskList: true,
  },
};

export const textEditorEngineSettingsMetaByInstance: Record<
  TextEditorEngineInstance,
  TextEditorEngineSettingsMeta
> = {
  notes_app: {
    title: 'Notes App',
    description:
      'Controls the shared editor engine used by the Notes App markdown and WYSIWYG surfaces.',
  },
  filemaker_email: {
    title: 'Filemaker Email',
    description:
      'Controls the compose, reply, and campaign rich-text editor used in Filemaker Email.',
  },
  case_resolver: {
    title: 'Case Resolver',
    description:
      'Controls the document and inline rich-text editor used throughout Case Resolver.',
  },
};

export const cloneTextEditorEngineProfile = (
  profile: TextEditorEngineProfile
): TextEditorEngineProfile => ({
  ...profile,
});

export const createDefaultTextEditorEngineProfiles = (): TextEditorEngineProfilesMap => ({
  notes_app: cloneTextEditorEngineProfile(defaultTextEditorEngineProfiles.notes_app),
  filemaker_email: cloneTextEditorEngineProfile(defaultTextEditorEngineProfiles.filemaker_email),
  case_resolver: cloneTextEditorEngineProfile(defaultTextEditorEngineProfiles.case_resolver),
});
