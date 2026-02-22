import fs from 'fs/promises';
import path from 'path';

import { describe, expect, it } from 'vitest';

const FILES = [
  'src/features/products/validations/middleware.ts',
  'src/features/products/services/productService.ts',
];

describe('product formdata parsing guard', () => {
  it('does not use lossy Object.fromEntries(formData.entries()) in critical product flows', async () => {
    for (const relativePath of FILES) {
      const absolutePath = path.join(process.cwd(), relativePath);
      const source = await fs.readFile(absolutePath, 'utf8');
      expect(source).not.toContain('Object.fromEntries(formData.entries())');
    }
  });
});
