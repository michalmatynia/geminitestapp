import { describe, expect, it } from 'vitest';

import { createCaseResolverFile } from '@/features/case-resolver/settings';
import { hasCaseResolverDraftMeaningfulChanges } from '@/features/case-resolver/hooks/useCaseResolverState.helpers';
import { buildFileEditDraft } from '@/features/case-resolver/utils/caseResolverUtils';
import { applyCaseResolverWysiwygDraftContentChange } from '@/features/case-resolver/hooks/useAdminCaseResolverDocumentActions';

describe('case resolver document editor onchange reducer', () => {
  it('does not mutate draft for semantically empty wysiwyg markup', () => {
    const file = createCaseResolverFile({
      id: 'onchange-empty',
      fileType: 'document',
      name: 'Onchange Empty',
      documentContent: '',
      documentContentHtml: '',
      documentContentMarkdown: '',
      documentContentPlainText: '',
    });
    const draft = buildFileEditDraft(file);

    const next = applyCaseResolverWysiwygDraftContentChange({
      current: draft,
      nextHtml: '<p></p>',
    });

    expect(next).toBe(draft);
    expect(
      hasCaseResolverDraftMeaningfulChanges({
        draft: next,
        file,
      })
    ).toBe(false);
  });

  it('updates draft when real text content changes', () => {
    const file = createCaseResolverFile({
      id: 'onchange-text-change',
      fileType: 'document',
      name: 'Onchange Text Change',
      documentContent: '',
      documentContentHtml: '',
      documentContentMarkdown: '',
      documentContentPlainText: '',
    });
    const draft = buildFileEditDraft(file);

    const next = applyCaseResolverWysiwygDraftContentChange({
      current: draft,
      nextHtml: '<p>Hello world</p>',
    });

    expect(next).not.toBe(draft);
    expect(next.documentContentHtml).toBe('<p>Hello world</p>');
    expect(next.documentContentPlainText).toBe('Hello world');
    expect(
      hasCaseResolverDraftMeaningfulChanges({
        draft: next,
        file,
      })
    ).toBe(true);
  });

  it('does not mutate draft for equivalent normalized html', () => {
    const file = createCaseResolverFile({
      id: 'onchange-equivalent',
      fileType: 'document',
      name: 'Onchange Equivalent',
      documentContent: '<p>Alpha</p>',
      documentContentHtml: '<p>Alpha</p>',
      documentContentMarkdown: 'Alpha',
      documentContentPlainText: 'Alpha',
    });
    const draft = buildFileEditDraft(file);

    const next = applyCaseResolverWysiwygDraftContentChange({
      current: draft,
      nextHtml: '<p>Alpha</p>',
    });

    expect(next).toBe(draft);
    expect(
      hasCaseResolverDraftMeaningfulChanges({
        draft: next,
        file,
      })
    ).toBe(false);
  });
});
