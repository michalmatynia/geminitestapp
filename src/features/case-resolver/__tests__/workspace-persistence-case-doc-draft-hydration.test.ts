import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CASE_RESOLVER_WORKSPACE_KEY,
  createCaseResolverFile,
  createDefaultCaseResolverWorkspace,
} from '@/features/case-resolver/settings';
import { buildFileEditDraft } from '@/features/case-resolver/utils/caseResolverUtils';
import { CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY } from '@/features/case-resolver/utils/workspace-settings-persistence-helpers';
import { fetchCaseResolverWorkspaceIfStale } from '@/features/case-resolver/workspace-persistence';

const toJsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

describe('case resolver case-open document hydration regression', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    }
    vi.restoreAllMocks();
  });

  it('hydrates detached document content and non-empty editor draft when required file is a case', async () => {
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      workspaceRevision: 42,
      lastMutationId: 'case-open-1',
      files: [
        createCaseResolverFile({
          id: 'case-1',
          fileType: 'case',
          name: 'Case 1',
        }),
        createCaseResolverFile({
          id: 'doc-under-case',
          fileType: 'document',
          name: 'Case Document',
          parentCaseId: 'case-1',
          documentContent: '',
          documentContentHtml: '',
          documentContentMarkdown: '',
          documentContentPlainText: '',
        }),
      ],
    };
    const detachedDocumentsPayload = {
      schema: 'case_resolver_workspace_detached_documents_v2',
      workspaceRevision: 42,
      lastMutationId: 'case-open-1',
      files: [
        {
          id: 'doc-under-case',
          documentContentHtml: '<p>Recovered body</p>',
          documentContentPlainText: 'Recovered body',
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(workspace),
        })
      )
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY,
          value: JSON.stringify(detachedDocumentsPayload),
        })
      );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceIfStale('test_source', 1, {
      includeDetachedDocuments: true,
      requiredFileId: 'case-1',
    });

    expect(result.updated).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `/api/settings?key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}&fresh=1&ifRevisionGt=1`
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY)}`
    );

    if (result.updated) {
      const hydrated = result.workspace.files.find((file) => file.id === 'doc-under-case');
      expect(hydrated?.documentContentPlainText).toBe('Recovered body');
      expect(hydrated?.documentContentHtml).toContain('Recovered body');

      const draft = buildFileEditDraft(hydrated!);
      expect(draft.documentContentPlainText).toBe('Recovered body');
      expect(draft.documentContentHtml).toContain('Recovered body');
      expect(draft.documentContent).toContain('Recovered body');
    }
  });
});
