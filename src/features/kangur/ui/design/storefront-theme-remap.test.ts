import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const kangurStylesheetPath = path.join(process.cwd(), 'src/app/(frontend)/kangur/kangur.css');
const storefrontAppearanceLogicPath = path.join(
  process.cwd(),
  'src/features/cms/components/frontend/CmsStorefrontAppearance.logic.ts'
);
const storefrontAccentVarsPath = path.join(
  process.cwd(),
  'src/features/cms/components/frontend/appearance-logic/CmsStorefrontAppearance.accent-vars.ts'
);

describe('Kangur storefront theme remap', () => {
  it('keeps the legacy storefront utility remap layer inside the extracted Kangur stylesheet', () => {
    const source = readFileSync(kangurStylesheetPath, 'utf8');

    expect(source).toContain('.border-indigo-500');
    expect(source).toContain('.border-orange-400');
    expect(source).toContain('.bg-blue-500');
    expect(source).toContain('.bg-green-400');
    expect(source).toContain('.text-red-600');
    expect(source).toContain('.text-purple-600');
    expect(source).toContain('.hover\\:border-amber-200:hover');
    expect(source).toContain('.hover\\:bg-rose-500:hover');
    expect(source).toContain('.focus\\:border-indigo-500:focus');
    expect(source).toContain('.focus-visible\\:ring-indigo-300\\/70:focus-visible');
    expect(source).toContain('--kangur-accent-amber-focus-ring');
    expect(source).toContain('--tw-ring-offset-color: var(--kangur-page-background, #ffffff)');
  });

  it('keeps the storefront appearance resolver composing derived remap vars through extracted helpers', () => {
    const logicSource = readFileSync(storefrontAppearanceLogicPath, 'utf8');
    const accentSource = readFileSync(storefrontAccentVarsPath, 'utf8');

    expect(logicSource).toContain('buildKangurAccentThemeVars');
    expect(logicSource).toContain('const accentVars = buildKangurAccentThemeVars');
    expect(logicSource).toContain('...accentVars');
    expect(logicSource).toContain('...glassVars');
    expect(logicSource).toContain('...runtimeThemeVars');

    expect(accentSource).toContain('--kangur-accent-${name}-soft-fill');
    expect(accentSource).toContain('--kangur-accent-${name}-solid-fill');
    expect(accentSource).toContain('--kangur-accent-${name}-text');
    expect(accentSource).toContain('--kangur-accent-${name}-muted-text');
    expect(accentSource).toContain('--kangur-accent-${name}-contrast-text');
  });
});
