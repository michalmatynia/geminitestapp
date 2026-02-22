import { describe, expect, it } from 'vitest';

import { hasCaseResolverDraftMeaningfulChanges } from '@/features/case-resolver/hooks/useCaseResolverState.helpers';
import { createCaseResolverFile } from '@/features/case-resolver/settings';
import { buildFileEditDraft } from '@/features/case-resolver/utils/caseResolverUtils';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver';

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
      documentDate: { isoDate: '2026-02-05', source: 'text', sourceLine: null, cityHint: null, city: null, action: 'useDetectedDate' },
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
});
