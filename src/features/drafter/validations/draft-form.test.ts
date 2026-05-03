import { describe, expect, it } from 'vitest';

import { draftSubmitSchema } from './draft-form';

const validDraftSubmitInput = {
  name: 'Stock draft',
  draftKind: 'standard',
  scrapeProfileId: null,
  iconColorMode: 'theme',
  iconColor: null,
  openProductFormTab: 'general',
};

describe('draftSubmitSchema', () => {
  it('parses whole-number stock from the Drafter form', () => {
    const result = draftSubmitSchema.safeParse({ ...validDraftSubmitInput, stock: '12' });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.stock).toBe(12);
  });

  it('treats empty stock as unset and rejects fractional stock', () => {
    const emptyResult = draftSubmitSchema.safeParse({ ...validDraftSubmitInput, stock: '' });
    const fractionalResult = draftSubmitSchema.safeParse({
      ...validDraftSubmitInput,
      stock: '4.5',
    });

    expect(emptyResult.success).toBe(true);
    if (emptyResult.success) expect(emptyResult.data.stock).toBeNull();
    expect(fractionalResult.success).toBe(false);
  });
});
