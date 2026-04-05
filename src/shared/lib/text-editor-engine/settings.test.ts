import { describe, expect, it } from 'vitest';

import { defaultTextEditorEngineProfiles } from './defaults';
import {
  getTextEditorInstanceSettingsHref,
  getTextEditorProfileKey,
  parseTextEditorProfileEntry,
  serializeTextEditorProfileEntry,
} from './settings';

describe('text-editor-engine settings', () => {
  it('builds stable profile keys and settings hrefs', () => {
    expect(getTextEditorProfileKey('notes_app')).toBe('text_editor_profile::notes_app');
    expect(getTextEditorInstanceSettingsHref('case_resolver')).toBe(
      '/admin/settings/text-editors#text-editor-instance-case_resolver'
    );
  });

  it('falls back to instance defaults when the stored payload is missing or invalid', () => {
    expect(parseTextEditorProfileEntry('notes_app', undefined)).toEqual(
      defaultTextEditorEngineProfiles.notes_app
    );
    expect(parseTextEditorProfileEntry('filemaker_email', 'bad-json')).toEqual(
      defaultTextEditorEngineProfiles.filemaker_email
    );
  });

  it('normalizes partial payloads on top of instance defaults', () => {
    expect(
      parseTextEditorProfileEntry(
        'filemaker_email',
        JSON.stringify({
          appearance: 'document-preview',
          allowFontFamily: false,
        })
      )
    ).toEqual({
      appearance: 'document-preview',
      allowFontFamily: false,
      allowTextAlign: true,
      enableAdvancedTools: true,
      allowImage: true,
      allowTable: true,
      allowTaskList: true,
    });
  });

  it('serializes profiles as JSON payloads', () => {
    expect(
      JSON.parse(serializeTextEditorProfileEntry(defaultTextEditorEngineProfiles.case_resolver))
    ).toEqual(defaultTextEditorEngineProfiles.case_resolver);
  });
});
