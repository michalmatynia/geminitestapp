import { describe, expect, it } from 'vitest';

import type { ProductCustomFieldValue } from '@/shared/contracts/products/custom-fields';

import { normalizeProductCustomFieldsForSubmission } from './useProductFormSubmit';

describe('normalizeProductCustomFieldsForSubmission', () => {
  it('trims text values and drops empty field ids', () => {
    const input: ProductCustomFieldValue[] = [
      {
        fieldId: '  packaging-notes  ',
        textValue: '  Handle with care  ',
      },
      {
        fieldId: '   ',
        textValue: 'ignored',
      },
    ];

    expect(normalizeProductCustomFieldsForSubmission(input)).toEqual([
      {
        fieldId: 'packaging-notes',
        textValue: 'Handle with care',
      },
    ]);
  });

  it('deduplicates checkbox option ids and preserves explicit empty clears', () => {
    const input: ProductCustomFieldValue[] = [
      {
        fieldId: 'flags',
        selectedOptionIds: ['gift-ready', 'gift-ready', ' fragile ', ''],
      },
      {
        fieldId: 'notes',
        textValue: '',
      },
    ];

    expect(normalizeProductCustomFieldsForSubmission(input)).toEqual([
      {
        fieldId: 'flags',
        selectedOptionIds: ['gift-ready', 'fragile'],
      },
      {
        fieldId: 'notes',
        textValue: '',
      },
    ]);
  });

  it('lets the latest entry for a field win when duplicates are present', () => {
    const input: ProductCustomFieldValue[] = [
      {
        fieldId: 'flags',
        selectedOptionIds: ['gift-ready'],
      },
      {
        fieldId: 'flags',
        selectedOptionIds: [],
      },
    ];

    expect(normalizeProductCustomFieldsForSubmission(input)).toEqual([
      {
        fieldId: 'flags',
        selectedOptionIds: [],
      },
    ]);
  });
});
