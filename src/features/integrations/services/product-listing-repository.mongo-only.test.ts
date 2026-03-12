import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryPath = path.join(currentDir, 'product-listing-repository.ts');

describe('product-listing-repository mongo-only contract', () => {
  it('does not import removed runtime modules', () => {
    const source = readFileSync(repositoryPath, 'utf8');

    expect(source).not.toContain('@/shared/lib/db/legacy-sql-client\'');
    expect(source).not.toContain('@/shared/lib/db/legacy-sql-client"');
  });

  it('does not reintroduce provider switching for product listings', () => {
    const source = readFileSync(repositoryPath, 'utf8');

    expect(source).not.toContain('getAppDbProvider');
  });
});
