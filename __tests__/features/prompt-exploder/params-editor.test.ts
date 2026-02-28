import { describe, expect, it } from 'vitest';

import {
  buildPromptExploderParamEntries,
  renderPromptExploderParamsText,
  setParamTextMetaForPath,
  setParamUiControlForPath,
  type PromptExploderParamEntry,
} from '@/features/prompt-exploder/params-editor';

describe('prompt exploder params editor', () => {
  it('extracts flattened parameter entries with comment and description metadata', () => {
    const paramsText = `params = {
  // Enables relighting pipeline.
  "apply_studio_relighting": true,
  "relight": {
    // Main key-to-fill ratio.
    "key_to_fill_ratio": 2.5, // >=1.5 for dramatic look
    "preset": "dramatic_softbox" // dramatic_softbox|dramatic_rim|high_key
  }
}`;

    const state = buildPromptExploderParamEntries({
      paramsObject: {
        apply_studio_relighting: true,
        relight: {
          key_to_fill_ratio: 2.5,
          preset: 'dramatic_softbox',
        },
      },
      paramsText,
    });

    const ratio = state.entries.find(
      (entry: PromptExploderParamEntry) => entry.path === 'relight.key_to_fill_ratio'
    );
    const preset = state.entries.find(
      (entry: PromptExploderParamEntry) => entry.path === 'relight.preset'
    );
    const enabled = state.entries.find(
      (entry: PromptExploderParamEntry) => entry.path === 'apply_studio_relighting'
    );

    expect(state.entries.length).toBe(3);
    expect(enabled?.description).toContain('Enables relighting pipeline.');
    expect(ratio?.description).toContain('Main key-to-fill ratio.');
    expect(ratio?.comment).toContain('>=1.5');
    expect(preset?.comment).toContain('dramatic_softbox|dramatic_rim|high_key');
    expect(preset?.recommendation.baseKind).toBe('enum');
  });

  it('renders params text with editable comments and descriptions', () => {
    const rendered = renderPromptExploderParamsText({
      paramsObject: {
        apply_studio_relighting: true,
        relight: {
          key_to_fill_ratio: 2.5,
        },
      },
      paramComments: {
        'relight.key_to_fill_ratio': '>=1.5 for dramatic lighting',
      },
      paramDescriptions: {
        apply_studio_relighting: 'Toggle relighting mode.',
      },
    });

    expect(rendered.startsWith('params = {')).toBe(true);
    expect(rendered).toContain('// Toggle relighting mode.');
    expect(rendered).toContain('"key_to_fill_ratio": 2.5 // >=1.5 for dramatic lighting');
  });

  it('updates selector and text metadata maps path-by-path', () => {
    const controls = setParamUiControlForPath({}, 'relight.key_to_fill_ratio', 'slider');
    const clearedControls = setParamUiControlForPath(controls, 'relight.key_to_fill_ratio', 'auto');
    const comments = setParamTextMetaForPath({}, 'relight.key_to_fill_ratio', '>=1.5');
    const clearedComments = setParamTextMetaForPath(comments, 'relight.key_to_fill_ratio', '');

    expect(controls['relight.key_to_fill_ratio']).toBe('slider');
    expect(clearedControls['relight.key_to_fill_ratio']).toBeUndefined();
    expect(comments['relight.key_to_fill_ratio']).toBe('>=1.5');
    expect(clearedComments['relight.key_to_fill_ratio']).toBeUndefined();
  });
});
