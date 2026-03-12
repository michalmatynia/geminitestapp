import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { POST_handler } from '@/app/api/v2/products/categories/migrate/handler';

describe('product categories migrate handler', () => {
  it('rejects the removed legacy category migration route', async () => {
    await expect(
      POST_handler(
        new NextRequest('http://localhost/api/v2/products/categories/migrate', {
          method: 'POST',
        }),
        {} as any
      )
    ).rejects.toMatchObject({
      message: 'Legacy category migration has been removed. Categories are stored in MongoDB only.',
    });
  });
});
