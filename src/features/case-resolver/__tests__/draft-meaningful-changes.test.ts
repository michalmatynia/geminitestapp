import { describe, expect, it } from 'vitest';

import {
  canCaseResolverDraftPerformInitialManualSave,
  hasCaseResolverDraftMeaningfulChanges,
} from '@/features/case-resolver/hooks/useCaseResolverState.helpers';
import { createCaseResolverFile } from '@/features/case-resolver/settings';
import { buildFileEditDraft } from '@/features/case-resolver/utils/caseResolverUtils';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver/file';

describe('case resolver meaningful draft changes', () => {
  it('treats legacy exploded version flag without exploded content as unchanged', () => {
    const file = createCaseResolverFile({
      id: 'legacy-exploded',
      fileType: 'document',
      name: 'Legacy Exploded Flag',
      originalDocumentContent: 'Body',
      explodedDocumentContent: '',
      activeDocumentVersion: 'original',
      documentContent: 'Body',
    });
    const legacyFile = {
      ...file,
      activeDocumentVersion: 'exploded',
    } as CaseResolverFile;
    const draft = buildFileEditDraft(legacyFile);

    expect(
      hasCaseResolverDraftMeaningfulChanges({
        draft,
        file: legacyFile,
      })
    ).toBe(false);
  });

  it('treats legacy string documentDate format as unchanged', () => {
    const file = createCaseResolverFile({
      id: 'legacy-date',
      fileType: 'document',
      name: 'Legacy Date',
      documentDate: {
        isoDate: '2026-02-05',
        source: 'text',
        sourceLine: null,
        cityHint: null,
        city: null,
        action: 'useDetectedDate',
      },
      documentContent: 'Body',
    });
    const legacyFile = {
      ...file,
      documentDate: '2026-02-05',
    } as unknown as CaseResolverFile;
    const draft = buildFileEditDraft(legacyFile);

    expect(
      hasCaseResolverDraftMeaningfulChanges({
        draft,
        file: legacyFile,
      })
    ).toBe(false);
  });

  it('treats null and undefined parties as equivalent in dirty fingerprint', () => {
    const file = createCaseResolverFile({
      id: 'legacy-parties-nullish',
      fileType: 'document',
      name: 'Legacy Parties Nullish',
      documentContent: 'Body',
    });
    const legacyFile = {
      ...file,
      addresser: undefined,
      addressee: undefined,
    } as unknown as CaseResolverFile;
    const draft = buildFileEditDraft(legacyFile);
    const normalizedDraft = {
      ...draft,
      addresser: null,
      addressee: null,
    };

    expect(
      hasCaseResolverDraftMeaningfulChanges({
        draft: normalizedDraft,
        file: legacyFile,
      })
    ).toBe(false);
  });

  it('ignores extra legacy keys on party references in dirty fingerprint', () => {
    const file = createCaseResolverFile({
      id: 'legacy-parties-extra-keys',
      fileType: 'document',
      name: 'Legacy Parties Extra Keys',
      documentContent: 'Body',
      addresser: {
        kind: 'person',
        id: 'person-1',
      },
      addressee: {
        kind: 'organization',
        id: 'org-1',
      },
    });
    const legacyFile = {
      ...file,
      addresser: {
        kind: 'person',
        id: 'person-1',
        label: 'Legacy Person',
      },
      addressee: {
        kind: 'organization',
        id: 'org-1',
        label: 'Legacy Organization',
      },
    } as unknown as CaseResolverFile;
    const draft = buildFileEditDraft(file);

    expect(
      hasCaseResolverDraftMeaningfulChanges({
        draft,
        file: legacyFile,
      })
    ).toBe(false);
  });

  it('hydrates non-scan drafts from plain-text fallback when html and markdown are missing', () => {
    const file = {
      ...createCaseResolverFile({
        id: 'plain-text-fallback',
        fileType: 'document',
        name: 'Plain Text Fallback',
        documentContent: '',
        documentContentHtml: '',
        documentContentMarkdown: '',
      }),
      documentContent: '',
      documentContentHtml: '',
      documentContentMarkdown: '',
      documentContentPlainText: 'Recovered detached text',
    } as CaseResolverFile;

    const draft = buildFileEditDraft(file);

    expect(draft.editorType).toBe('wysiwyg');
    expect(draft.documentContentPlainText).toBe('Recovered detached text');
    expect(draft.documentContentHtml).toContain('Recovered detached text');
    expect(draft.documentContent).toContain('Recovered detached text');
  });

  it('treats sent flag updates as meaningful changes', () => {
    const file = createCaseResolverFile({
      id: 'sent-flag',
      fileType: 'document',
      name: 'Sent Flag',
      documentContent: 'Body',
      isSent: false,
    });
    const draft = buildFileEditDraft(file);
    draft.isSent = true;

    expect(
      hasCaseResolverDraftMeaningfulChanges({
        draft,
        file,
      })
    ).toBe(true);
  });

  it('treats semantically empty wysiwyg markup as unchanged', () => {
    const file = createCaseResolverFile({
      id: 'empty-html-equivalence',
      fileType: 'document',
      name: 'Empty HTML Equivalence',
      documentContent: '',
      documentContentHtml: '',
      documentContentMarkdown: '',
      documentContentPlainText: '',
    });
    const draft = buildFileEditDraft(file);
    draft.documentContent = '<p></p>';
    draft.documentContentHtml = '<p><br></p>';
    draft.documentContentMarkdown = '';
    draft.documentContentPlainText = '';

    expect(
      hasCaseResolverDraftMeaningfulChanges({
        draft,
        file,
      })
    ).toBe(false);
  });

  it('treats semantically empty wysiwyg markup variants as unchanged', () => {
    const file = createCaseResolverFile({
      id: 'empty-html-variant-equivalence',
      fileType: 'document',
      name: 'Empty HTML Variant Equivalence',
      documentContent: '',
      documentContentHtml: '',
      documentContentMarkdown: '',
      documentContentPlainText: '',
    });
    const draft = buildFileEditDraft(file);
    draft.documentContent = '<p><br></p>';
    draft.documentContentHtml = '<p></p>';
    draft.documentContentMarkdown = '';
    draft.documentContentPlainText = '';

    expect(
      hasCaseResolverDraftMeaningfulChanges({
        draft,
        file,
      })
    ).toBe(false);
  });

  it('treats non-empty text updates as meaningful changes', () => {
    const file = createCaseResolverFile({
      id: 'non-empty-change',
      fileType: 'document',
      name: 'Non-empty change',
      documentContent: '',
      documentContentHtml: '',
      documentContentMarkdown: '',
      documentContentPlainText: '',
    });
    const draft = buildFileEditDraft(file);
    draft.documentContent = '<p>Hello world</p>';
    draft.documentContentHtml = '<p>Hello world</p>';
    draft.documentContentMarkdown = 'Hello world';
    draft.documentContentPlainText = 'Hello world';

    expect(
      hasCaseResolverDraftMeaningfulChanges({
        draft,
        file,
      })
    ).toBe(true);
  });

  it('allows saving a pristine newly created empty document', () => {
    const file = createCaseResolverFile({
      id: 'initial-empty',
      fileType: 'document',
      name: 'Initial Empty',
    });
    const draft = buildFileEditDraft(file);

    expect(
      canCaseResolverDraftPerformInitialManualSave({
        draft,
        file,
      })
    ).toBe(true);
  });

  it('does not allow initial manual save after the first save/version bump', () => {
    const file = createCaseResolverFile({
      id: 'initial-empty-saved',
      fileType: 'document',
      name: 'Initial Empty Saved',
      documentContentVersion: 2,
      updatedAt: '2026-02-23T12:00:00.000Z',
      createdAt: '2026-02-23T11:59:00.000Z',
    });
    const draft = buildFileEditDraft(file);

    expect(
      canCaseResolverDraftPerformInitialManualSave({
        draft,
        file,
      })
    ).toBe(false);
  });
});
