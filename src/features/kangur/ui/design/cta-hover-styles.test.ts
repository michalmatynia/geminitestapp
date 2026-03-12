import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const globalStylesheetPath = path.join(process.cwd(), 'src/app/globals.css');

describe('Kangur CTA hover styles', () => {
  it('keeps the primary cta on the orange base and hover treatment', () => {
    const source = readFileSync(globalStylesheetPath, 'utf8');

    expect(source).toMatch(/\.primary-cta\s*\{[\s\S]*#ffb347[\s\S]*#ff7a45/);
    expect(source).toMatch(
      /\.primary-cta:hover,\s*\.primary-cta:focus-visible\s*\{[\s\S]*#ffc670[\s\S]*#ff985f[\s\S]*#ff7a45/
    );
    expect(source).toMatch(
      /\.primary-cta:hover,\s*\.primary-cta:focus-visible\s*\{[\s\S]*rgba\(255,\s*154,\s*95,\s*0\.2\)/
    );
    expect(source).toMatch(
      /\.primary-cta:hover,\s*\.primary-cta:focus-visible\s*\{[\s\S]*transform:\s*translateY\(-1px\)\s*scale\(1\.014\)/
    );
  });

  it('keeps warning ctas on the same warm hover direction instead of introducing purple', () => {
    const source = readFileSync(globalStylesheetPath, 'utf8');

    expect(source).toMatch(
      /\.warning-cta:hover,\s*\.warning-cta:focus-visible\s*\{[\s\S]*rgba\(255,\s*247,\s*230,\s*0\.99\)[\s\S]*rgba\(255,\s*232,\s*195,\s*0\.96\)/
    );
    expect(source).toMatch(
      /\.warning-cta:hover,\s*\.warning-cta:focus-visible\s*\{[\s\S]*rgba\(255,\s*154,\s*95,\s*0\.2\)/
    );
    expect(source).toMatch(
      /\.warning-cta:hover,\s*\.warning-cta:focus-visible\s*\{[\s\S]*transform:\s*translateY\(-1px\)\s*scale\(1\.014\)/
    );
  });

  it('keeps the Kangur home action pills darker when the storefront is in dark mode', () => {
    const source = readFileSync(globalStylesheetPath, 'utf8');

    expect(source).toContain("[data-kangur-appearance-mode='dark'] .home-action-featured-shell");
    expect(source).toContain("[data-kangur-appearance-mode='dark'] .home-action-theme-neutral");
    expect(source).toContain("[data-kangur-appearance-mode='dark'] .home-action-theme-sand");
    expect(source).toContain('rgba(51, 65, 85, 0.9)');
    expect(source).toContain('rgba(122, 74, 46, 0.44)');
  });
});
