import { describe, expect, it } from 'vitest';

import { createCaseResolverFile } from '@/features/case-resolver/settings';
import {
  hasCaseResolverDraftMeaningfulChanges,
} from '@/features/case-resolver/hooks/useCaseResolverState.helpers';
import { buildFileEditDraft } from '@/features/case-resolver/utils/caseResolverUtils';
import {
  applyCaseResolverScanDraftContentChange,
} from '@/features/case-resolver/hooks/useAdminCaseResolverDocumentActions';

describe('case resolver scan editor onchange reducer', () => {
  it('does not mutate draft for semantically empty markdown', () => {
    const file = createCaseResolverFile({
      id: 'scan-onchange-empty',
      fileType: 'scanfile',
      name: 'Scan Empty',
      documentContent: '',
      documentContentHtml: '',
      documentContentMarkdown: '',
      documentContentPlainText: '',
    });
    const draft = buildFileEditDraft(file);

    const next = applyCaseResolverScanDraftContentChange({
      current: draft,
      nextMarkdown: '',
    });

    expect(next).toBe(draft);
    expect(
      hasCaseResolverDraftMeaningfulChanges({
        draft: next,
        file,
      })
    ).toBe(false);
  });

  it('updates scan draft for large markdown paste without html enrichment churn', () => {
    const file = createCaseResolverFile({
      id: 'scan-onchange-large',
      fileType: 'scanfile',
      name: 'Scan Large',
      documentContent: '',
      documentContentHtml: '',
      documentContentMarkdown: '',
      documentContentPlainText: '',
    });
    const draft = buildFileEditDraft(file);
    const largeMarkdown = Array.from({ length: 2000 }, (_value, index) => `Line ${index}: [tag] & value`).join('\n');

    const next = applyCaseResolverScanDraftContentChange({
      current: draft,
      nextMarkdown: largeMarkdown,
    });

    expect(next).not.toBe(draft);
    expect(next.documentContentMarkdown).toBe(largeMarkdown);
    expect(next.documentContentPlainText).toContain('Line 1999: [tag] & value');
    expect(next.documentContentHtml).toContain('Line 1999: [tag] &amp; value');

    const secondPass = applyCaseResolverScanDraftContentChange({
      current: next,
      nextMarkdown: largeMarkdown,
    });

    expect(secondPass).toBe(next);
    expect(
      hasCaseResolverDraftMeaningfulChanges({
        draft: next,
        file,
      })
    ).toBe(true);
  });

  it('does not mutate draft for equivalent markdown content', () => {
    const file = createCaseResolverFile({
      id: 'scan-onchange-equivalent',
      fileType: 'scanfile',
      name: 'Scan Equivalent',
      documentContent: 'Alpha',
      documentContentHtml: '<p>Alpha</p>',
      documentContentMarkdown: 'Alpha',
      documentContentPlainText: 'Alpha',
    });
    const draft = buildFileEditDraft(file);

    const next = applyCaseResolverScanDraftContentChange({
      current: draft,
      nextMarkdown: 'Alpha',
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
