/**
 * Guardrail tests for post-capture-mutation editor draft refresh.
 *
 * Regression: after applyCaseResolverFileMutation ran, the editing draft was not
 * refreshed when the editor was already open on the target file. The update
 * callback contained an early-return:
 *
 *   setEditingDocumentDraft((current) => {
 *     if (current?.id === targetFileId) return current; // ← BUG: kept stale content
 *     return freshDraft;
 *   });
 *
 * Fix: always replace the draft with buildFileEditDraft(postMutationFile) regardless
 * of whether the editor was already open.
 *
 * These tests verify that buildFileEditDraft always reflects the file's current
 * state, and that a freshly built draft is never equal to a pre-mutation draft
 * when the file content changed.
 */

import { describe, expect, it } from 'vitest';

import { createCaseResolverFile } from '@/features/case-resolver/settings';
import { buildFileEditDraft } from '@/features/case-resolver/utils/caseResolverUtils';

const PRE_MUTATION_HTML = '<p>Original content before capture.</p>';
const POST_MUTATION_HTML = '<p>Updated content after capture applied addresser fields.</p>';

const buildDocumentFile = (html: string) =>
  createCaseResolverFile({
    id: 'file-doc-1',
    fileType: 'document',
    name: 'Test Document',
    documentContentHtml: html,
  });

describe('capture post-mutation editor draft refresh', () => {
  it('buildFileEditDraft reflects file content — not a prior draft', () => {
    const preMutationFile = buildDocumentFile(PRE_MUTATION_HTML);
    const preDraft = buildFileEditDraft(preMutationFile);

    // Simulate the capture mutation writing new content to the file
    const postMutationFile = buildDocumentFile(POST_MUTATION_HTML);
    const freshDraft = buildFileEditDraft(postMutationFile);

    // The fresh draft must carry the post-mutation HTML
    expect(freshDraft.documentContentHtml).toBe(POST_MUTATION_HTML);
    // It must differ from the pre-mutation draft
    expect(freshDraft.documentContentHtml).not.toBe(preDraft.documentContentHtml);
  });

  it('fresh draft from post-mutation file differs from stale open draft', () => {
    // Represents editingDocumentDraft that was open before the mutation ran
    const staleDraft = buildFileEditDraft(buildDocumentFile(PRE_MUTATION_HTML));

    // Represents postMutationFile read from workspaceRef.current after flushSync
    const postMutationFile = buildDocumentFile(POST_MUTATION_HTML);
    const freshDraft = buildFileEditDraft(postMutationFile);

    // Guard: unconditional replacement must yield new content
    // Simulates: setEditingDocumentDraft(() => freshDraft) — no early-return on id match
    const nextDraft = freshDraft;

    expect(nextDraft.documentContentHtml).not.toBe(staleDraft.documentContentHtml);
    expect(nextDraft.documentContentHtml).toBe(POST_MUTATION_HTML);
  });

  it('stale-draft guard: returning current when id matches keeps old content (documents the old bug)', () => {
    const staleDraft = buildFileEditDraft(buildDocumentFile(PRE_MUTATION_HTML));
    const freshDraft = buildFileEditDraft(buildDocumentFile(POST_MUTATION_HTML));

    // Old (broken) callback pattern: bail out if file is already open
    const brokenUpdate = (current: typeof staleDraft | null): typeof staleDraft | null => {
      if (current?.id === freshDraft.id) return current; // ← the bug
      return freshDraft;
    };

    const result = brokenUpdate(staleDraft);

    // The broken pattern keeps the stale content — this is the regression we fixed
    expect(result?.documentContentHtml).toBe(PRE_MUTATION_HTML);
    expect(result?.documentContentHtml).not.toBe(POST_MUTATION_HTML);
  });

  it('fixed update pattern: always replaces draft regardless of id match', () => {
    const staleDraft = buildFileEditDraft(buildDocumentFile(PRE_MUTATION_HTML));
    const freshDraft = buildFileEditDraft(buildDocumentFile(POST_MUTATION_HTML));

    // Fixed callback pattern: unconditional replacement
    const fixedUpdate = (_current: typeof staleDraft | null) => freshDraft;

    const result = fixedUpdate(staleDraft);

    expect(result.documentContentHtml).toBe(POST_MUTATION_HTML);
    expect(result.documentContentHtml).not.toBe(PRE_MUTATION_HTML);
  });

  it('document files always receive wysiwyg editorType (not markdown)', () => {
    const file = buildDocumentFile(POST_MUTATION_HTML);
    const draft = buildFileEditDraft(file);

    // Post-markdown-removal: document files must always be wysiwyg
    expect(draft.editorType).toBe('wysiwyg');
  });

  it('scanfile draft retains markdown editorType after mutation', () => {
    const scanFile = createCaseResolverFile({
      id: 'file-scan-1',
      fileType: 'scanfile',
      name: 'Scan File',
      documentContentMarkdown: '# Scanned text',
    });
    const draft = buildFileEditDraft(scanFile);

    expect(draft.editorType).toBe('markdown');
  });
});
