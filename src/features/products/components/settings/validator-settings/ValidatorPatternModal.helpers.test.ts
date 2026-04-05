import { describe, expect, it } from 'vitest';

import { buildSemanticTransitionNotice } from './ValidatorPatternModal.helpers';

describe('ValidatorPatternModal helpers', () => {
  it('builds recognized, cleared, migrated, and updated notices when required titles exist', () => {
    expect(
      buildSemanticTransitionNotice({
        kind: 'recognized',
        previousTitle: null,
        currentTitle: 'Mirror Name Locale',
      })
    ).toEqual({
      tone: 'info',
      title: 'Semantic Metadata Detected',
      body: 'This rule now matches "Mirror Name Locale" and will be saved with semantic metadata.',
    });

    expect(
      buildSemanticTransitionNotice({
        kind: 'cleared',
        previousTitle: 'Mirror Latest Field',
        currentTitle: null,
      })
    ).toEqual({
      tone: 'warning',
      title: 'Converted To Generic Rule',
      body: 'This rule no longer matches "Mirror Latest Field" and will be saved as a generic custom validator.',
    });

    expect(
      buildSemanticTransitionNotice({
        kind: 'migrated',
        previousTitle: 'Mirror Latest Field',
        currentTitle: 'Mirror Name Locale',
      })
    ).toEqual({
      tone: 'info',
      title: 'Semantic Operation Migrated',
      body: 'This rule no longer matches "Mirror Latest Field" and now matches "Mirror Name Locale". Saving will migrate its semantic metadata.',
    });

    expect(
      buildSemanticTransitionNotice({
        kind: 'updated',
        previousTitle: 'Mirror Name Locale',
        currentTitle: 'Mirror Name Locale',
      })
    ).toEqual({
      tone: 'info',
      title: 'Semantic Metadata Updated',
      body: 'This rule still matches "Mirror Name Locale", but its semantic metadata has been updated to reflect the edited shape.',
    });
  });

  it('returns null for unsupported transitions or missing notice titles', () => {
    expect(
      buildSemanticTransitionNotice({
        kind: 'none',
        previousTitle: 'Mirror Latest Field',
        currentTitle: 'Mirror Name Locale',
      })
    ).toBeNull();

    expect(
      buildSemanticTransitionNotice({
        kind: 'preserved',
        previousTitle: 'Mirror Latest Field',
        currentTitle: 'Mirror Latest Field',
      })
    ).toBeNull();

    expect(
      buildSemanticTransitionNotice({
        kind: 'recognized',
        previousTitle: null,
        currentTitle: null,
      })
    ).toBeNull();

    expect(
      buildSemanticTransitionNotice({
        kind: 'migrated',
        previousTitle: 'Mirror Latest Field',
        currentTitle: null,
      })
    ).toBeNull();
  });
});
