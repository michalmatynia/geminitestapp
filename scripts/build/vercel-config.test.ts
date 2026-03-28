import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('root vercel.json', () => {
  it('pins the Next.js framework and npm-based install/build commands', () => {
    const configPath = path.resolve(process.cwd(), 'vercel.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    expect(config).toMatchObject({
      framework: 'nextjs',
      installCommand: 'npm ci --workspaces=false --include=dev --no-audit --no-fund',
      buildCommand: 'npm run build',
    });
  });
});
