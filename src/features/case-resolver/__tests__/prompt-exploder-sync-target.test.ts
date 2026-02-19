import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  applyPendingPromptExploderPayloadToCaseResolver,
  discardPendingCaseResolverPromptExploderPayload,
  readPendingCaseResolverPromptExploderPayload,
} from '@/features/case-resolver/hooks/useCaseResolverState.prompt-exploder-sync';
import {
  createCaseResolverFile,
  parseCaseResolverWorkspace,
} from '@/features/case-resolver/settings';
import type {
  CaseResolverFileEditDraft,
  CaseResolverWorkspace,
} from '@/features/case-resolver/types';
import { parseCaseResolverCaptureSettings } from '@/features/case-resolver-capture/settings';
import { parseFilemakerDatabase } from '@/features/filemaker/settings';
import { savePromptExploderApplyPromptForCaseResolver } from '@/features/prompt-exploder/bridge';

import type { Dispatch, SetStateAction } from 'react';

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

describe('case resolver prompt exploder manual apply flow', () => {
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

  const createWorkspaceHarness = (): {
    getWorkspace: () => CaseResolverWorkspace;
    updateWorkspace: (
      updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace
    ) => void;
    setEditingDocumentDraft: Dispatch<SetStateAction<CaseResolverFileEditDraft | null>>;
  } => {
    const documentFile = createCaseResolverFile({
      id: 'doc-1',
      fileType: 'document',
      name: 'Document',
    });
    let workspace: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      files: [documentFile],
      activeFileId: documentFile.id,
    };
    let draft: CaseResolverFileEditDraft | null = null;
    const updateWorkspace = (
      updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace
    ): void => {
      workspace = updater(workspace);
    };
    const setEditingDocumentDraft: Dispatch<SetStateAction<CaseResolverFileEditDraft | null>> = (
      updater
    ): void => {
      if (typeof updater === 'function') {
        draft = (updater as (current: CaseResolverFileEditDraft | null) => CaseResolverFileEditDraft | null)(draft);
        return;
      }
      draft = updater;
    };
    return {
      getWorkspace: () => workspace,
      updateWorkspace,
      setEditingDocumentDraft,
    };
  };

  it('keeps payload pending until explicit apply is invoked', () => {
    savePromptExploderApplyPromptForCaseResolver('Pending content', {
      fileId: 'doc-1',
      fileName: 'Document',
    });

    const firstRead = readPendingCaseResolverPromptExploderPayload();
    const secondRead = readPendingCaseResolverPromptExploderPayload();

    expect(firstRead?.prompt).toBe('Pending content');
    expect(secondRead?.prompt).toBe('Pending content');
  });

  it('applies pending payload only on explicit apply call and then consumes it', () => {
    const harness = createWorkspaceHarness();
    const initialDocument = harness.getWorkspace().files[0];
    expect(initialDocument?.documentContentPlainText).toBe('');

    savePromptExploderApplyPromptForCaseResolver('Exploded output body', {
      fileId: 'doc-1',
      fileName: 'Document',
    });

    const result = applyPendingPromptExploderPayloadToCaseResolver({
      targetFileId: 'doc-1',
      workspaceFiles: harness.getWorkspace().files,
      updateWorkspace: harness.updateWorkspace,
      setEditingDocumentDraft: harness.setEditingDocumentDraft,
      filemakerDatabase: parseFilemakerDatabase(null),
      caseResolverCaptureSettings: parseCaseResolverCaptureSettings(null),
    });

    expect(result.applied).toBe(true);
    if (result.applied) {
      expect(result.workspaceChanged).toBe(true);
    }

    const updatedDocument = harness.getWorkspace().files.find((file) => file.id === 'doc-1');
    expect(updatedDocument?.documentContentPlainText).toContain('Exploded output body');
    expect(readPendingCaseResolverPromptExploderPayload()).toBeNull();
  });

  it('does not consume payload when apply target is missing', () => {
    const harness = createWorkspaceHarness();
    savePromptExploderApplyPromptForCaseResolver('Exploded output body', null);

    const result = applyPendingPromptExploderPayloadToCaseResolver({
      targetFileId: 'missing-doc',
      workspaceFiles: harness.getWorkspace().files,
      updateWorkspace: harness.updateWorkspace,
      setEditingDocumentDraft: harness.setEditingDocumentDraft,
      filemakerDatabase: parseFilemakerDatabase(null),
      caseResolverCaptureSettings: parseCaseResolverCaptureSettings(null),
    });

    expect(result.applied).toBe(false);
    if (!result.applied) {
      expect(result.reason).toBe('target_file_missing');
    }
    expect(readPendingCaseResolverPromptExploderPayload()?.prompt).toBe('Exploded output body');
  });

  it('discards pending payload explicitly', () => {
    savePromptExploderApplyPromptForCaseResolver('Discard me', {
      fileId: 'doc-1',
      fileName: 'Document',
    });

    const discarded = discardPendingCaseResolverPromptExploderPayload();
    expect(discarded?.prompt).toBe('Discard me');
    expect(readPendingCaseResolverPromptExploderPayload()).toBeNull();
  });

  it('resolves target ids using normalized id lookup', () => {
    const documentFile = createCaseResolverFile({
      id: '  doc-spaced  ',
      fileType: 'document',
      name: 'Document',
    });
    let workspace: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      files: [documentFile],
      activeFileId: documentFile.id,
    };
    const updateWorkspace = (
      updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace
    ): void => {
      workspace = updater(workspace);
    };
    const setEditingDocumentDraft: Dispatch<SetStateAction<CaseResolverFileEditDraft | null>> = () => {};

    savePromptExploderApplyPromptForCaseResolver('Normalized payload', {
      fileId: 'doc-spaced',
      fileName: 'Document',
    });
    const result = applyPendingPromptExploderPayloadToCaseResolver({
      targetFileId: 'doc-spaced',
      workspaceFiles: workspace.files,
      updateWorkspace,
      setEditingDocumentDraft,
      filemakerDatabase: parseFilemakerDatabase(null),
      caseResolverCaptureSettings: parseCaseResolverCaptureSettings(null),
    });

    expect(result.applied).toBe(true);
    const updatedDocument = workspace.files.find((file) => file.id === '  doc-spaced  ');
    expect(updatedDocument?.documentContentPlainText).toContain('Normalized payload');
  });

  it('falls back to case resolver context file id when explicit target is invalid', () => {
    const harness = createWorkspaceHarness();
    savePromptExploderApplyPromptForCaseResolver(
      'Context fallback payload',
      {
        fileId: 'doc-1',
        fileName: 'Document',
      }
    );

    const result = applyPendingPromptExploderPayloadToCaseResolver({
      targetFileId: 'missing-doc-id',
      workspaceFiles: harness.getWorkspace().files,
      updateWorkspace: harness.updateWorkspace,
      setEditingDocumentDraft: harness.setEditingDocumentDraft,
      filemakerDatabase: parseFilemakerDatabase(null),
      caseResolverCaptureSettings: parseCaseResolverCaptureSettings(null),
    });

    expect(result.applied).toBe(true);
    const updatedDocument = harness.getWorkspace().files.find((file) => file.id === 'doc-1');
    expect(updatedDocument?.documentContentPlainText).toContain('Context fallback payload');
  });

  it('accepts target file names when selector token is not a file id', () => {
    const harness = createWorkspaceHarness();
    savePromptExploderApplyPromptForCaseResolver(
      'Name fallback payload',
      {
        fileId: 'doc-1',
        fileName: 'Document',
      }
    );

    const result = applyPendingPromptExploderPayloadToCaseResolver({
      targetFileId: 'Document',
      workspaceFiles: harness.getWorkspace().files,
      updateWorkspace: harness.updateWorkspace,
      setEditingDocumentDraft: harness.setEditingDocumentDraft,
      filemakerDatabase: parseFilemakerDatabase(null),
      caseResolverCaptureSettings: parseCaseResolverCaptureSettings(null),
    });

    expect(result.applied).toBe(true);
    const updatedDocument = harness.getWorkspace().files.find((file) => file.id === 'doc-1');
    expect(updatedDocument?.documentContentPlainText).toContain('Name fallback payload');
  });
});
