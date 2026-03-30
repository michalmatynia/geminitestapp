import { describe, expect, it } from 'vitest';

import {
  buildFullValidatorDocumentationClipboardText,
  VALIDATOR_SAMPLE_IMPORT_JSON,
} from '@/features/products/components/settings/validator-settings/validator-documentation-clipboard';

describe('validator-documentation-clipboard', () => {
  it('includes semantic grammar JSON sections and validator docs catalogs', () => {
    const text = buildFullValidatorDocumentationClipboardText();

    expect(text).toContain('# Validator Pattern Documentation');
    expect(text).toContain('## Semantic Grammar Schema');
    expect(text).toContain('## Semantic Grammar Options');
    expect(text).toContain('## Semantic Grammar Types');
    expect(text).toContain('validator.import.mode.upsert');
    expect(text).toContain('validator.import.entity.pattern');
    expect(text).toContain('## Function Reference');
    expect(text).toContain('core.buildFieldIssues');
    expect(text).toContain('## UI Controls & Tooltips');
    expect(text).toContain('ui.ValidatorPatternModal');
    expect(text).toContain('docs/validator/tooltips.md');
  });

  it('contains the same sample import JSON used by import modal', () => {
    const text = buildFullValidatorDocumentationClipboardText();
    expect(text).toContain(VALIDATOR_SAMPLE_IMPORT_JSON.trim());
  });
});
