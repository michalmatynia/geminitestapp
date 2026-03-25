/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logClientCatch: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: mocks.logClientCatch,
}));

import {
  clearPromptExploderApplyPayload,
  computePromptExploderBridgeChecksum,
  consumePromptExploderApplyPayload,
  consumePromptExploderDraftPayload,
  PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY,
  PROMPT_EXPLODER_BRIDGE_STORAGE_EVENT,
  PROMPT_EXPLODER_DRAFT_PROMPT_KEY,
  readPromptExploderApplyPayload,
  readPromptExploderApplyPayloadSnapshot,
  readPromptExploderDraftPayloadSnapshot,
  readPromptExploderDraftPrompt,
  savePromptExploderApplyPrompt,
  savePromptExploderDraftPromptFromCaseResolver,
} from './bridge';

type StorageMock = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const createStorageMock = (): StorageMock => {
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

describe('prompt-exploder bridge shared-lib', () => {
  beforeEach(() => {
    mocks.logClientCatch.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T18:15:00.000Z'));

    const localStorage = createStorageMock();
    const sessionStorage = createStorageMock();
    const dispatchEvent = vi.fn();

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: {
        localStorage,
        sessionStorage,
        dispatchEvent,
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
    vi.useRealTimers();
  });

  it('computes deterministic checksums and saves draft payloads for case resolver context', () => {
    const checksum = computePromptExploderBridgeChecksum('Prompt body', {
      fileId: 'file-1',
      fileName: 'Notice',
      sessionId: 'session-1',
      documentVersionAtStart: 3,
    });

    expect(checksum).toBe(
      computePromptExploderBridgeChecksum('Prompt body', {
        fileId: 'file-1',
        fileName: 'Notice',
        sessionId: 'session-1',
        documentVersionAtStart: 3,
      })
    );
    expect(checksum.startsWith('pe-')).toBe(true);

    savePromptExploderDraftPromptFromCaseResolver('Draft prompt', {
      fileId: 'file-1',
      fileName: 'Notice',
      sessionId: 'session-1',
      documentVersionAtStart: 3,
    });

    const snapshot = readPromptExploderDraftPayloadSnapshot();
    expect(snapshot.isExpired).toBe(false);
    expect(snapshot.payload).toEqual(
      expect.objectContaining({
        prompt: 'Draft prompt',
        source: 'case-resolver',
        target: 'prompt-exploder',
        payloadVersion: 2,
        status: 'pending',
        caseResolverContext: {
          fileId: 'file-1',
          fileName: 'Notice',
          sessionId: 'session-1',
          documentVersionAtStart: 3,
        },
      })
    );
    expect(readPromptExploderDraftPrompt()).toBe('Draft prompt');
    expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
    const dispatchedEvent = vi.mocked(window.dispatchEvent).mock.calls[0]?.[0];
    expect(dispatchedEvent?.type).toBe(PROMPT_EXPLODER_BRIDGE_STORAGE_EVENT);
  });

  it('consumes draft/apply payloads only for matching targets and clears persisted apply payloads', () => {
    savePromptExploderDraftPromptFromCaseResolver('Draft prompt', {
      fileId: 'file-2',
      fileName: 'Draft file',
    });

    expect(consumePromptExploderDraftPayload('case-resolver')).toBeNull();
    expect(readPromptExploderDraftPrompt()).toBe('Draft prompt');

    const consumedDraft = consumePromptExploderDraftPayload();
    expect(consumedDraft?.prompt).toBe('Draft prompt');
    expect(readPromptExploderDraftPrompt()).toBeNull();

    savePromptExploderApplyPrompt('Apply prompt', {
      transferId: 'apply-1',
      status: 'applied',
      appliedAt: '2026-03-25T18:16:00.000Z',
    });

    expect(consumePromptExploderApplyPayload('case-resolver')).toBeNull();
    expect(readPromptExploderApplyPayload()).toEqual(
      expect.objectContaining({
        prompt: 'Apply prompt',
        target: 'image-studio',
        transferId: 'apply-1',
        status: 'applied',
        appliedAt: '2026-03-25T18:16:00.000Z',
      })
    );

    clearPromptExploderApplyPayload();
    expect(readPromptExploderApplyPayload()).toBeNull();
  });

  it('marks expired payload snapshots and drops invalid apply payloads while logging parse failures', () => {
    window.localStorage.setItem(
      PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY,
      JSON.stringify({
        prompt: 'Old apply prompt',
        source: 'prompt-exploder',
        target: 'image-studio',
        createdAt: '2026-03-25T17:00:00.000Z',
        payloadVersion: 2,
      })
    );

    const expiredSnapshot = readPromptExploderApplyPayloadSnapshot();
    expect(expiredSnapshot.isExpired).toBe(true);
    expect(expiredSnapshot.payload?.prompt).toBe('Old apply prompt');

    expect(readPromptExploderApplyPayload()).toBeNull();
    expect(window.localStorage.getItem(PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY)).toBeNull();

    window.localStorage.setItem(PROMPT_EXPLODER_DRAFT_PROMPT_KEY, '{not-json');
    expect(readPromptExploderDraftPayloadSnapshot()).toEqual({
      payload: null,
      isExpired: false,
      expiresAt: null,
    });
    expect(mocks.logClientCatch).toHaveBeenCalledTimes(1);
  });
});
