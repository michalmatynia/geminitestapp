import { describe, expect, it } from 'vitest';

import {
  createProductDraftSchema,
  productCreateInputSchema,
  productDraftSchema,
  productParameterValueSchema,
} from '@/shared/contracts/products';

describe('shared product contracts barrel', () => {
  it('exports draft and product schemas without runtime initialization errors', () => {
    expect(productParameterValueSchema).toBeDefined();
    expect(productCreateInputSchema).toBeDefined();
    expect(productDraftSchema).toBeDefined();
    expect(createProductDraftSchema).toBeDefined();
  });
});
