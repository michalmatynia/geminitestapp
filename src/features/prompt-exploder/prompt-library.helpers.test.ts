import { describe, expect, it } from 'vitest';

import {
  resolvePromptExploderLibraryItemIdentity,
  resolvePromptExploderLibraryItemName,
} from './prompt-library.helpers';

describe('prompt library helpers', () => {
  it('prefers trimmed draft names, then existing item names, then derived names', () => {
    expect(
      resolvePromptExploderLibraryItemName({
        prompt: 'Prompt body',
        libraryNameDraft: '  Draft name  ',
        existingItem: {
          id: 'item-1',
          name: 'Existing name',
          createdAt: '2026-02-10T00:00:00.000Z',
        },
        deriveName: () => 'Derived name',
      })
    ).toBe('Draft name');

    expect(
      resolvePromptExploderLibraryItemName({
        prompt: 'Prompt body',
        libraryNameDraft: '   ',
        existingItem: {
          id: 'item-1',
          name: ' Existing name ',
          createdAt: '2026-02-10T00:00:00.000Z',
        },
        deriveName: () => 'Derived name',
      })
    ).toBe('Existing name');

    expect(
      resolvePromptExploderLibraryItemName({
        prompt: 'Prompt body',
        libraryNameDraft: '   ',
        existingItem: null,
        deriveName: () => 'Derived name',
      })
    ).toBe('Derived name');
  });

  it('preserves existing ids and createdAt values or generates new identity fields', () => {
    expect(
      resolvePromptExploderLibraryItemIdentity({
        existingItem: {
          id: 'existing-id',
          name: 'Existing name',
          createdAt: '2026-02-10T00:00:00.000Z',
        },
        now: '2026-02-13T12:00:00.000Z',
        createItemId: () => 'generated-id',
      })
    ).toEqual({
      id: 'existing-id',
      createdAt: '2026-02-10T00:00:00.000Z',
      updatedAt: '2026-02-13T12:00:00.000Z',
    });

    expect(
      resolvePromptExploderLibraryItemIdentity({
        existingItem: null,
        now: '2026-02-13T12:00:00.000Z',
        createItemId: () => 'generated-id',
      })
    ).toEqual({
      id: 'generated-id',
      createdAt: '2026-02-13T12:00:00.000Z',
      updatedAt: '2026-02-13T12:00:00.000Z',
    });
  });
});
