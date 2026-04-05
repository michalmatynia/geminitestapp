import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  readStoredEditorDraft,
  writeStoredEditorDraft,
} from '@/features/case-resolver/hooks/useCaseResolverState.helpers';
import type { CaseResolverFileEditDraft } from '@/shared/contracts/case-resolver/file';
import { buildFileEditDraft } from '@/features/case-resolver/utils/caseResolverUtils';
import { createCaseResolverFile } from '@/features/case-resolver/settings';

type StorageMock = Storage & { _map: Map<string, string> };

const createQuotaError = (): Error & { name: string } => {
  const error = new Error('Quota exceeded') as Error & { name: string };
  error.name = 'QuotaExceededError';
  return error;
};

const createStorageMock = ({
  initialEntries = [],
  shouldThrowOnSet,
}: {
  initialEntries?: Array<[string, string]>;
  shouldThrowOnSet?: (args: { key: string; value: string; map: Map<string, string> }) => boolean;
} = {}): StorageMock => {
  const map = new Map<string, string>(initialEntries);
  return {
    _map: map,
    get length(): number {
      return map.size;
    },
    clear(): void {
      map.clear();
    },
    getItem(key: string): string | null {
      return map.get(key) ?? null;
    },
    key(index: number): string | null {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string): void {
      map.delete(key);
    },
    setItem(key: string, value: string): void {
      if (shouldThrowOnSet?.({ key, value, map }) === true) {
        throw createQuotaError();
      }
      map.set(key, value);
    },
  };
};

const buildDraft = (): CaseResolverFileEditDraft => {
  const file = createCaseResolverFile({
    id: 'case-file-1',
    fileType: 'scanfile',
    name: 'Draft File',
    documentContent: 'Body',
    documentContentMarkdown: '# Body',
    documentContentHtml: '<p>Body</p>',
    scanSlots: [
      {
        id: 'slot-1',
        fileId: 'case-file-1',
        status: 'completed',
        progress: 100,
        name: 'slot',
        filepath: '/tmp/slot.png',
        sourceFileId: null,
        mimeType: 'image/png',
        size: 123,
        ocrText: 'very long OCR text',
        ocrError: null,
      },
    ],
  });
  return buildFileEditDraft(file);
};

describe('case resolver editor draft storage', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
  });

  beforeEach(() => {
    const localStorage = createStorageMock();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: {
        localStorage,
      },
    });
  });

  it('returns quota result instead of throwing when storage cannot persist draft', () => {
    const localStorage = createStorageMock({
      shouldThrowOnSet: ({ key }) => key.includes('case-resolver-editor-draft-v1'),
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: {
        localStorage,
      },
    });

    const result = writeStoredEditorDraft('case-file-1', buildDraft());
    expect(result).toEqual({ ok: false, reason: 'quota' });
  });

  it('removes older draft entries and retries after quota error', () => {
    const currentKey = 'case-resolver-editor-draft-v1:case-file-1';
    const oldKey = 'case-resolver-editor-draft-v1:case-file-older';
    const localStorage = createStorageMock({
      initialEntries: [[oldKey, '{"updatedAt":"2026-02-01T00:00:00.000Z"}']],
      shouldThrowOnSet: ({ key, map }) => key === currentKey && map.has(oldKey),
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: {
        localStorage,
      },
    });

    const result = writeStoredEditorDraft('case-file-1', buildDraft());
    expect(result).toEqual({ ok: true });
    expect(localStorage.getItem(oldKey)).toBeNull();
    expect(localStorage.getItem(currentKey)).toBeTruthy();
  });

  it('stores compact draft payload and can read it back', () => {
    const result = writeStoredEditorDraft('case-file-1', buildDraft());
    expect(result).toEqual({ ok: true });

    const persisted = readStoredEditorDraft('case-file-1');
    expect(persisted).not.toBeNull();
    const draft = persisted?.draft as unknown as CaseResolverFileEditDraft;
    expect(draft.documentHistory).toBeUndefined();
    expect(draft.documentContentPlainText).toBeUndefined();
    expect(draft.documentContent).toBeUndefined();
    if (draft.editorType === 'wysiwyg') {
      expect(draft.documentContentHtml).toBe('<p>Body</p>');
      expect(draft.documentContentMarkdown).toBeUndefined();
    } else {
      expect(draft.documentContentHtml).toBeUndefined();
      expect(draft.documentContentMarkdown).toBe('# Body');
    }
    expect(draft.scanSlots?.[0]?.ocrText).toBe('');
  });

  it('falls back to minimal payload when primary payload keeps hitting quota', () => {
    const localStorage = createStorageMock({
      shouldThrowOnSet: ({ key, value }) =>
        key === 'case-resolver-editor-draft-v1:case-file-1' &&
        (value.includes('documentContentMarkdown') || value.includes('originalDocumentContent')),
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: {
        localStorage,
      },
    });

    const result = writeStoredEditorDraft('case-file-1', buildDraft());
    expect(result).toEqual({ ok: true });
    const persisted = readStoredEditorDraft('case-file-1');
    expect(persisted).not.toBeNull();
    const draft = persisted?.draft as unknown as CaseResolverFileEditDraft;
    expect(draft.documentContentMarkdown).toBeUndefined();
    expect(draft.originalDocumentContent).toBeUndefined();
  });
});
