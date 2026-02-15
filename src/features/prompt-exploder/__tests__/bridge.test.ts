import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  consumePromptExploderApplyPromptForCaseResolver,
  PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY,
  savePromptExploderApplyPromptForCaseResolver,
} from '@/features/prompt-exploder/bridge';

type StorageMock = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const createLocalStorageMock = (): StorageMock => {
  const map = new Map<string, string>();
  return {
    getItem: (key: string): string | null => map.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      map.set(key, value);
    },
    removeItem: (key: string): void => {
      map.delete(key);
    },
  };
};

describe('prompt exploder bridge parties', () => {
  beforeEach(() => {
    const localStorage = createLocalStorageMock();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: {
        localStorage,
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
  });

  it('persists and consumes case resolver parties with context', () => {
    savePromptExploderApplyPromptForCaseResolver(
      'Reassembled text',
      {
        fileId: 'file-1',
        fileName: 'Notice',
      },
      {
        addresser: {
          role: 'addresser',
          displayName: 'Michał Matynia',
          rawText: 'Michał Matynia\nFioletowa 71/2\n70-781 Szczecin\nPolska',
          kind: 'person',
          firstName: 'Michał',
          lastName: 'Matynia',
          city: 'Szczecin',
          country: 'Polska',
        },
        addressee: {
          role: 'addressee',
          displayName: 'Inspektorat ZUS w Gryficach',
          rawText: 'Inspektorat ZUS w Gryficach\nDąbskiego 5\n72-300 Gryfice',
          kind: 'organization',
          organizationName: 'Inspektorat ZUS w Gryficach',
          city: 'Gryfice',
        },
      }
    );

    const payload = consumePromptExploderApplyPromptForCaseResolver();
    expect(payload?.prompt).toBe('Reassembled text');
    expect(payload?.caseResolverContext).toEqual({
      fileId: 'file-1',
      fileName: 'Notice',
    });
    expect(payload?.caseResolverParties?.addresser?.displayName).toBe('Michał Matynia');
    expect(payload?.caseResolverParties?.addresser?.kind).toBe('person');
    expect(payload?.caseResolverParties?.addressee?.organizationName).toBe(
      'Inspektorat ZUS w Gryficach'
    );
    expect(payload?.caseResolverParties?.addressee?.kind).toBe('organization');

    const secondRead = consumePromptExploderApplyPromptForCaseResolver();
    expect(secondRead).toBeNull();
  });

  it('sanitizes malformed party payloads', () => {
    window.localStorage.setItem(
      PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY,
      JSON.stringify({
        prompt: 'Bad payload',
        source: 'prompt-exploder',
        target: 'case-resolver',
        caseResolverParties: {
          addresser: {
            role: 'addresser',
            displayName: '',
            rawText: '',
          },
          addressee: {
            role: 'addressee',
            displayName: '  Inspektorat  ',
            rawText: '  ',
            kind: 'invalid-kind',
          },
        },
        createdAt: '2026-02-15T00:00:00.000Z',
      })
    );

    const payload = consumePromptExploderApplyPromptForCaseResolver();
    expect(payload?.caseResolverParties?.addresser).toBeUndefined();
    expect(payload?.caseResolverParties?.addressee?.displayName).toBe('Inspektorat');
    expect(payload?.caseResolverParties?.addressee?.kind).toBeUndefined();
  });
});
