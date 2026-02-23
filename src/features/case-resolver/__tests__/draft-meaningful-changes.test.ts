import { describe, expect, it } from 'vitest';

import {
  canCaseResolverDraftPerformInitialManualSave,
  hasCaseResolverDraftMeaningfulChanges,
} from '@/features/case-resolver/hooks/useCaseResolverState.helpers';
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
