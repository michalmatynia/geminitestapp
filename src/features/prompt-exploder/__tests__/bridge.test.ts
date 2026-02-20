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
        sessionId: 'session-1',
        documentVersionAtStart: 12,
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
          sourcePatternLabels: ['Case Resolver Role: Addresser'],
          sourceSequenceLabels: ['Case Resolver Parties'],
        },
        addressee: {
          role: 'addressee',
          displayName: 'Inspektorat ZUS w Gryficach',
          rawText: 'Inspektorat ZUS w Gryficach\nDąbskiego 5\n72-300 Gryfice',
          kind: 'organization',
          organizationName: 'Inspektorat ZUS w Gryficach',
          city: 'Gryfice',
          sourcePatternLabels: ['Case Resolver Role: Addressee'],
          sourceSequenceLabels: ['Case Resolver Parties'],
        },
      },
      {
        placeDate: {
          city: 'Szczecin',
          day: '25',
          month: '01',
          year: '2026',
          sourceSegmentId: 'segment-1',
          sourceSegmentTitle: 'Place + Date',
          sourcePatternLabels: ['Case Resolver Heading: Place + Date'],
          sourceSequenceLabels: ['Case Resolver Structure'],
        },
      }
    );

    const payload = consumePromptExploderApplyPromptForCaseResolver();
    expect(payload?.prompt).toBe('Reassembled text');
    expect(payload?.payloadVersion).toBe(2);
    expect(payload?.status).toBe('pending');
    expect(typeof payload?.transferId).toBe('string');
    expect((payload?.transferId ?? '').length).toBeGreaterThan(0);
    expect(typeof payload?.checksum).toBe('string');
    expect((payload?.checksum ?? '').startsWith('pe-')).toBe(true);
    expect(typeof payload?.expiresAt).toBe('string');
    expect(payload?.caseResolverContext).toEqual({
      fileId: 'file-1',
      fileName: 'Notice',
      sessionId: 'session-1',
      documentVersionAtStart: 12,
    });
    expect(payload?.caseResolverParties?.addresser?.displayName).toBe('Michał Matynia');
    expect(payload?.caseResolverParties?.addresser?.kind).toBe('person');
    expect(payload?.caseResolverParties?.addressee?.organizationName).toBe(
      'Inspektorat ZUS w Gryficach'
    );
    expect(payload?.caseResolverParties?.addressee?.kind).toBe('organization');
    expect(payload?.caseResolverParties?.addresser?.sourcePatternLabels).toEqual([
      'Case Resolver Role: Addresser',
    ]);
    expect(payload?.caseResolverParties?.addressee?.sourceSequenceLabels).toEqual([
      'Case Resolver Parties',
    ]);
    expect(payload?.caseResolverMetadata?.placeDate).toEqual({
      city: 'Szczecin',
      day: '25',
      month: '01',
      year: '2026',
      sourceSegmentId: 'segment-1',
      sourceSegmentTitle: 'Place + Date',
      sourcePatternLabels: ['Case Resolver Heading: Place + Date'],
      sourceSequenceLabels: ['Case Resolver Structure'],
    });

    const secondRead = consumePromptExploderApplyPromptForCaseResolver();
    expect(secondRead).toBeNull();
  });

  it('keeps provided transfer metadata when writing explicit options', () => {
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    savePromptExploderApplyPromptForCaseResolver(
      'Reassembled text',
      {
        fileId: 'file-1',
        fileName: 'Notice',
      },
      undefined,
      undefined,
      {
        transferId: 'transfer-fixed',
        payloadVersion: 7,
        status: 'pending',
        createdAt,
        expiresAt,
        checksum: 'pe-fixed-checksum',
      }
    );

    const payload = consumePromptExploderApplyPromptForCaseResolver();
    expect(payload?.transferId).toBe('transfer-fixed');
    expect(payload?.payloadVersion).toBe(7);
    expect(payload?.createdAt).toBe(createdAt);
    expect(payload?.expiresAt).toBe(expiresAt);
    expect(payload?.checksum).toBe('pe-fixed-checksum');
    expect(payload?.status).toBe('pending');
  });

  it('sanitizes malformed party payloads', () => {
    const freshCreatedAt = new Date().toISOString();
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
        createdAt: freshCreatedAt,
      })
    );

    const payload = consumePromptExploderApplyPromptForCaseResolver();
    expect(payload?.caseResolverParties?.addresser).toBeUndefined();
    expect(payload?.caseResolverParties?.addressee?.displayName).toBe('Inspektorat');
    expect(payload?.caseResolverParties?.addressee?.kind).toBeUndefined();
  });

  it('expires malformed payloads missing createdAt metadata', () => {
    window.localStorage.setItem(
      PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY,
      JSON.stringify({
        prompt: 'Fallback timestamp payload',
        source: 'prompt-exploder',
        target: 'case-resolver',
      })
    );

    const payload = consumePromptExploderApplyPromptForCaseResolver();
    expect(payload).toBeNull();
  });

  it('falls back to sessionStorage when localStorage quota is exceeded', () => {
    const sessionStorage = createLocalStorageMock();
    const localStorage = createLocalStorageMock();
    const quotaError = new Error('Quota exceeded');
    (quotaError as Error & { name: string }).name = 'QuotaExceededError';
    const failingLocalStorage: StorageMock = {
      getItem: localStorage.getItem,
      setItem: (_key: string, _value: string): void => {
        throw quotaError;
      },
      removeItem: localStorage.removeItem,
    };

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: {
        localStorage: failingLocalStorage,
        sessionStorage,
      },
    });

    savePromptExploderApplyPromptForCaseResolver('Stored in session fallback', {
      fileId: 'file-s',
      fileName: 'Session',
    });

    const payload = consumePromptExploderApplyPromptForCaseResolver();
    expect(payload?.prompt).toBe('Stored in session fallback');
    expect(payload?.caseResolverContext?.fileId).toBe('file-s');
  });

  it('clears stale apply payload when storage write fails in all storages', () => {
    const sessionStorage = createLocalStorageMock();
    const localStorage = createLocalStorageMock();
    const quotaError = new Error('Quota exceeded');
    (quotaError as Error & { name: string }).name = 'QuotaExceededError';
    const freshCreatedAt = new Date().toISOString();

    localStorage.setItem(
      PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY,
      JSON.stringify({
        prompt: 'stale-local-payload',
        source: 'prompt-exploder',
        target: 'case-resolver',
        caseResolverContext: {
          fileId: 'stale-local-file',
          fileName: 'Stale Local',
          sessionId: 'stale-local-session',
        },
        createdAt: freshCreatedAt,
      })
    );
    sessionStorage.setItem(
      PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY,
      JSON.stringify({
        prompt: 'stale-session-payload',
        source: 'prompt-exploder',
        target: 'case-resolver',
        caseResolverContext: {
          fileId: 'stale-session-file',
          fileName: 'Stale Session',
          sessionId: 'stale-session',
        },
        createdAt: freshCreatedAt,
      })
    );

    const failingLocalStorage: StorageMock = {
      getItem: localStorage.getItem,
      setItem: (_key: string, _value: string): void => {
        throw quotaError;
      },
      removeItem: localStorage.removeItem,
    };
    const failingSessionStorage: StorageMock = {
      getItem: sessionStorage.getItem,
      setItem: (_key: string, _value: string): void => {
        throw quotaError;
      },
      removeItem: sessionStorage.removeItem,
    };

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: {
        localStorage: failingLocalStorage,
        sessionStorage: failingSessionStorage,
      },
    });

    savePromptExploderApplyPromptForCaseResolver('New payload', {
      fileId: 'fresh-file',
      fileName: 'Fresh',
    });

    const payload = consumePromptExploderApplyPromptForCaseResolver();
    expect(payload).toBeNull();
  });

  it('keeps case resolver context when fileName is missing', () => {
    const freshCreatedAt = new Date().toISOString();
    window.localStorage.setItem(
      PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY,
      JSON.stringify({
        prompt: 'Context without file name',
        source: 'prompt-exploder',
        target: 'case-resolver',
        caseResolverContext: {
          fileId: 'file-ctx-1',
          sessionId: 'ctx-session',
          documentVersionAtStart: 5,
        },
        createdAt: freshCreatedAt,
      })
    );

    const payload = consumePromptExploderApplyPromptForCaseResolver();
    expect(payload?.caseResolverContext).toEqual({
      fileId: 'file-ctx-1',
      fileName: 'file-ctx-1',
      sessionId: 'ctx-session',
      documentVersionAtStart: 5,
    });
  });

  it('sanitizes malformed case resolver context metadata', () => {
    const freshCreatedAt = new Date().toISOString();
    window.localStorage.setItem(
      PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY,
      JSON.stringify({
        prompt: 'Context sanitization',
        source: 'prompt-exploder',
        target: 'case-resolver',
        caseResolverContext: {
          fileId: ' file-ctx-2 ',
          fileName: '  ',
          sessionId: '   ',
          documentVersionAtStart: -3,
        },
        createdAt: freshCreatedAt,
      })
    );

    const payload = consumePromptExploderApplyPromptForCaseResolver();
    expect(payload?.caseResolverContext).toEqual({
      fileId: 'file-ctx-2',
      fileName: 'file-ctx-2',
      sessionId: undefined,
      documentVersionAtStart: undefined,
    });
  });
});
