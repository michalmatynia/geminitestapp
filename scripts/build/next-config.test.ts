import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const configPath = path.join(repoRoot, 'next.config.mjs');
const configText = fs.readFileSync(configPath, 'utf8');

describe('next.config.mjs', () => {
  it('does not use deprecated experimental.ppr — ppr has been merged into top-level cacheComponents', () => {
    // `ppr: 'incremental'` inside the experimental block causes an unhandled
    // rejection at startup. The feature is now enabled via `cacheComponents: true`
    // at the top level. Older branches still carry the deprecated key; this test
    // catches it on merge so the server never crashes on startup.
    const experimentalBlock = configText.match(/experimental\s*:\s*\{([\s\S]*?)\n  \}/)?.[1] ?? '';
    expect(experimentalBlock).not.toMatch(/\bppr\s*:/);
  });

  it('does not use deprecated experimental.reactCompiler — reactCompiler belongs at the top level', () => {
    // Next.js moved reactCompiler out of experimental. Placing it inside
    // experimental produces an "Unrecognized key" warning and the compiler does
    // not activate. The correct location is the top-level nextConfig object.
    const experimentalBlock = configText.match(/experimental\s*:\s*\{([\s\S]*?)\n  \}/)?.[1] ?? '';
    expect(experimentalBlock).not.toMatch(/\breactCompiler\s*:/);
  });

  it('enables reactCompiler at the top level of nextConfig', () => {
    // Verify the correct placement so a merge that removes it entirely is also caught.
    expect(configText).toMatch(/reactCompiler\s*:\s*true/);
  });

  it('enables cacheComponents at the top level of nextConfig', () => {
    // cacheComponents: true is the replacement for experimental.ppr.
    expect(configText).toMatch(/cacheComponents\s*:\s*true/);
  });
});
