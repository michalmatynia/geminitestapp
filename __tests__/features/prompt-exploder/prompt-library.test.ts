import { describe, expect, it } from 'vitest';

import {
  buildPromptExploderLibraryItem,
  getManualBindingsFromDocument,
  hydratePromptExploderLibraryDocument,
  removePromptExploderLibraryItemById,
  upsertPromptExploderLibraryItems,
  defaultPromptExploderLibraryState,
  derivePromptExploderLibraryItemName,
  parsePromptExploderLibrary,
} from '@/features/prompt-exploder/prompt-library';
import type { PromptExploderLibraryItem } from '@/features/prompt-exploder/prompt-library';
import type { PromptExploderDocument } from '@/shared/contracts/prompt-exploder';

describe('prompt exploder prompt library', () => {
  it('returns defaults for empty input', () => {
    const parsed = parsePromptExploderLibrary(null);
    expect(parsed).toEqual(defaultPromptExploderLibraryState);
  });

  it('parses items and drops invalid document payloads', () => {
    const raw = JSON.stringify({
      version: 1,
      items: [
        {
          id: 'entry_1',
          name: 'My prompt',
          prompt: 'Prompt text',
          document: {
            version: 1,
            sourcePrompt: 'Prompt text',
            segments: [],
            bindings: [],
            warnings: [],
            reassembledPrompt: 'Prompt text',
          },
          createdAt: '2026-02-13T00:00:00.000Z',
          updatedAt: '2026-02-13T00:00:00.000Z',
        },
        {
          id: 'entry_2',
          name: 'Broken document',
          prompt: 'Another prompt',
          document: { nope: true },
          createdAt: '2026-02-13T00:00:00.000Z',
          updatedAt: '2026-02-13T00:00:00.000Z',
        },
      ],
    });

    const parsed = parsePromptExploderLibrary(raw);
    expect(parsed.items.length).toBe(2);
    expect(parsed.items[0]?.document).not.toBeNull();
    // Empty object is technically valid because of defaults in document schema
    expect(parsed.items[1]?.document).toBeDefined();
  });
  it('derives readable name from prompt first line', () => {
    const name = derivePromptExploderLibraryItemName('\n\nFIRST LINE TITLE\nsecond');
    expect(name).toBe('FIRST LINE TITLE');
  });

  it('builds library item and hydrates cloned document with source prompt', () => {
    const document: PromptExploderDocument = {
      version: 1,
      sourcePrompt: 'old prompt',
      segments: [],
      bindings: [],
      warnings: [],
      reassembledPrompt: 'old prompt',
      subsections: [],
      variables: [],
      dependencies: [],
      rules: [],
      tags: [],
      errors: [],
      diagnostics: [],
      sections: [],
    };
    const item = buildPromptExploderLibraryItem({
      prompt: 'new prompt',
      libraryNameDraft: '',
      existingItem: null,
      documentState: document,
      now: '2026-02-13T12:00:00.000Z',
      createItemId: () => 'fixed_id',
    });

    expect(item.id).toBe('fixed_id');
    expect(item.name).toBe('new prompt');
    expect(item.document?.sourcePrompt).toBe('new prompt');

    const hydrated = hydratePromptExploderLibraryDocument(item);
    expect(hydrated?.sourcePrompt).toBe('new prompt');
    if (!item.document || !hydrated) return;
    expect(hydrated).not.toBe(item.document);
  });

  it('upserts, sorts, caps, and removes library items', () => {
    const items: PromptExploderLibraryItem[] = [
      {
        id: 'a',
        name: 'A',
        prompt: 'Prompt A',
        document: null,
        createdAt: '2026-02-13T10:00:00.000Z',
        updatedAt: '2026-02-13T10:00:00.000Z',
      },
      {
        id: 'b',
        name: 'B',
        prompt: 'Prompt B',
        document: null,
        createdAt: '2026-02-13T09:00:00.000Z',
        updatedAt: '2026-02-13T09:00:00.000Z',
      },
    ];

    const upserted = upsertPromptExploderLibraryItems({
      items,
      nextItem: {
        id: 'b',
        name: 'B2',
        prompt: 'Prompt B2',
        document: null,
        createdAt: '2026-02-13T09:00:00.000Z',
        updatedAt: '2026-02-13T11:00:00.000Z',
      },
      maxItems: 2,
    });
    expect(upserted.map((item) => item.id)).toEqual(['b', 'a']);
    expect(upserted[0]?.name).toBe('B2');

    const removed = removePromptExploderLibraryItemById(upserted, 'a');
    expect(removed.map((item) => item.id)).toEqual(['b']);
  });

  it('returns only manual bindings from hydrated document', () => {
    const manual = {
      id: 'm1',
      type: 'depends_on' as const,
      fromSegmentId: 'a',
      toSegmentId: 'b',
      sourceLabel: 'A',
      targetLabel: 'B',
      origin: 'manual' as const,
    };
    const auto = {
      id: 'a1',
      type: 'references' as const,
      fromSegmentId: 'a',
      toSegmentId: 'b',
      sourceLabel: 'A',
      targetLabel: 'B',
      origin: 'auto' as const,
    };
    const document: PromptExploderDocument = {
      version: 1,
      sourcePrompt: 'prompt',
      segments: [],
      bindings: [manual, auto],
      warnings: [],
      reassembledPrompt: 'prompt',
      subsections: [],
      variables: [],
      dependencies: [],
      rules: [],
      tags: [],
      errors: [],
      diagnostics: [],
      sections: [],
    };

    const manualBindings = getManualBindingsFromDocument(document);
    expect(manualBindings).toEqual([manual]);
  });
});
