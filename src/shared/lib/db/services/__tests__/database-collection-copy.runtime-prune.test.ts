import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const runtimeFile = path.join(projectRoot, 'src/shared/lib/db/services/database-collection-copy.ts');

const requiredTokens = ['AI_PATHS_DEPRECATED_STORE_PREFIX', 'AI_PATHS_DEPRECATED_STORE_KEY_PREFIX'];
const forbiddenTokens = ['AI_PATHS_LEGACY_PREFIX', 'AI_PATHS_LEGACY_KEY_PREFIX'];

describe('database-collection-copy runtime naming-channel prune guard', () => {
  it('keeps canonical deprecated-store prefix naming and blocks legacy prefix naming', () => {
    const source = readFileSync(runtimeFile, 'utf8');

    requiredTokens.forEach((token: string): void => {
      expect(source.includes(token)).toBe(true);
    });

    forbiddenTokens.forEach((token: string): void => {
      expect(source.includes(token)).toBe(false);
    });
  });
});
