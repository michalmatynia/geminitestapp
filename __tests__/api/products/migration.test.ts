import { describe, expect, it } from 'vitest';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '../../..');

describe('products migrate runtime endpoint removal', () => {
  it('keeps /api/v2/products/migrate removed from runtime tree', () => {
    expect(existsSync(path.join(projectRoot, 'src/app/api/v2/products/migrate/route.ts'))).toBe(
      false
    );
    expect(existsSync(path.join(projectRoot, 'src/app/api/v2/products/migrate/handler.ts'))).toBe(
      false
    );
  });
});
