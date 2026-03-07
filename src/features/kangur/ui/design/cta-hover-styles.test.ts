import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const globalStylesheetPath = path.join(process.cwd(), 'src/app/globals.css');

describe('Kangur CTA hover styles', () => {
  it('adds a subtle purple-tinted hover state and lift effect to the orange primary cta', () => {
    const source = readFileSync(globalStylesheetPath, 'utf8');

    expect(source).toMatch(
      /\.primary-cta:hover,\s*\.primary-cta:focus-visible\s*\{[\s\S]*#ffc06b[\s\S]*#ff8b58[\s\S]*#f0b4ff/
    );
    expect(source).toMatch(
      /\.primary-cta:hover,\s*\.primary-cta:focus-visible\s*\{[\s\S]*rgba\(132,\s*102,\s*234,\s*0\.16\)/
    );
    expect(source).toMatch(
      /\.primary-cta:hover,\s*\.primary-cta:focus-visible\s*\{[\s\S]*transform:\s*translateY\(-1px\)\s*scale\(1\.014\)/
    );
  });

  it('adds the same subtle purple accent and lift effect to warning ctas', () => {
    const source = readFileSync(globalStylesheetPath, 'utf8');

    expect(source).toMatch(
      /\.warning-cta:hover,\s*\.warning-cta:focus-visible\s*\{[\s\S]*rgba\(247,\s*239,\s*255,\s*0\.94\)/
    );
    expect(source).toMatch(
      /\.warning-cta:hover,\s*\.warning-cta:focus-visible\s*\{[\s\S]*rgba\(132,\s*102,\s*234,\s*0\.16\)/
    );
    expect(source).toMatch(
      /\.warning-cta:hover,\s*\.warning-cta:focus-visible\s*\{[\s\S]*transform:\s*translateY\(-1px\)\s*scale\(1\.014\)/
    );
  });
});
