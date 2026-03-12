import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryPath = path.join(currentDir, 'product-listing-repository.ts');

describe('product-listing-repository mongo-only contract', () => {
  it('does not import Prisma runtime modules', () => {
    const source = readFileSync(repositoryPath, 'utf8');

    expect(source).not.toContain('@/shared/lib/db/prisma\'');
    expect(source).not.toContain('@/shared/lib/db/prisma-client\'');
  });

  it('does not reintroduce provider switching for product listings', () => {
    const source = readFileSync(repositoryPath, 'utf8');

    expect(source).not.toContain('getAppDbProvider');
    expect(source).not.toMatch(/\bprismaRepository\b/);
  });
});
