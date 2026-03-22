import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const kangurStylesheetPath = path.join(process.cwd(), 'src/app/(frontend)/kangur/kangur.css');

describe('Kangur CTA hover styles', () => {
  it('keeps the primary cta driven by theme variables', () => {
    const source = readFileSync(kangurStylesheetPath, 'utf8');
    const primaryCtaBlock = source.match(/\.primary-cta\s*\{[\s\S]*?will-change:\s*transform;/)?.[0];
    const primaryHoverBlock = source.match(
      /\.primary-cta:hover,\s*\.primary-cta:focus-visible\s*\{[\s\S]*?transform:\s*translateY\(-1px\)\s*scale\(1\.014\)/
    )?.[0];

    expect(primaryCtaBlock).toBeTruthy();
    expect(primaryCtaBlock).toContain('--kangur-cta-primary-start');
    expect(primaryCtaBlock).toContain('background: var(--kangur-button-primary-background)');
    expect(primaryCtaBlock).not.toContain('#ffb347');
    expect(primaryCtaBlock).not.toContain('#ff7a45');
    expect(primaryHoverBlock).toBeTruthy();
    expect(primaryHoverBlock).toContain('--kangur-cta-primary-hover-start');
    expect(primaryHoverBlock).toMatch(
      /background:\s*var\(\s*--kangur-button-primary-hover-background/
    );
    expect(primaryHoverBlock).not.toContain('#ffc670');
    expect(primaryHoverBlock).not.toContain('#ff985f');
  });

  it('keeps warning ctas on the same warm hover direction instead of introducing purple', () => {
    const source = readFileSync(kangurStylesheetPath, 'utf8');

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
    const source = readFileSync(kangurStylesheetPath, 'utf8');

    expect(source).toContain("data-kangur-appearance-mode='dark'");
    expect(source).toContain("data-kangur-appearance-mode='sunset'");
    expect(source).toContain('.home-action-featured-shell');
    expect(source).toContain('.home-action-theme-neutral');
    expect(source).toContain('.home-action-theme-sand');
    expect(source).toContain('rgba(51, 65, 85, 0.9)');
    expect(source).toContain('rgba(122, 74, 46, 0.44)');
  });

  it('keeps shared gradient color shift on ctas and progress fills without attaching it to the excluded home action buttons', () => {
    const source = readFileSync(kangurStylesheetPath, 'utf8');
    const primaryCtaBlock = source.match(/\.primary-cta\s*\{[\s\S]*?will-change:\s*transform;/)?.[0];
    const warningCtaBlock = source.match(/\.warning-cta\s*\{[\s\S]*?will-change:\s*transform;/)?.[0];
    const sharedButtonGradientMotionBlock = source.match(
      /\.warning-cta,[\s\S]*?background-image:\s*linear-gradient\([\s\S]*?animation-name:\s*kangur-button-gradient-color-shift;[\s\S]*?animation-duration:\s*18s(?:\s*!important)?;\s*animation-timing-function:\s*cubic-bezier\(0\.37, 0, 0\.23, 1\)(?:\s*!important)?;\s*animation-iteration-count:\s*infinite(?:\s*!important)?;[\s\S]*?\}/
    )?.[0];
    const progressGradientMotionBlock = source.match(
      /\.kangur-progress-fill\s*\{[\s\S]*?--kangur-progress-primary:\s*var\(--tw-gradient-from,\s*transparent\);[\s\S]*?background-image:\s*linear-gradient\([\s\S]*?animation-name:\s*kangur-progress-gradient-color-shift;[\s\S]*?animation-duration:\s*10s(?:\s*!important)?;\s*animation-timing-function:\s*ease-in-out(?:\s*!important)?;\s*animation-iteration-count:\s*infinite(?:\s*!important)?;[\s\S]*?\}/
    )?.[0];

    expect(source).toContain('@property --kangur-gradient-live-start');
    expect(source).toContain('@property --kangur-gradient-live-mid');
    expect(source).toContain('@property --kangur-gradient-live-end');
    expect(source).toContain('@keyframes kangur-button-gradient-color-shift');
    expect(source).toContain('@keyframes kangur-progress-gradient-color-shift');
    expect(source).toContain('.kangur-progress-fill');
    expect(source).toContain("button[class*='bg-gradient-to-']");
    expect(source).toContain("button[class*='bg-[linear-gradient']");
    expect(source).toContain(".kangur-cta-pill[class*='bg-gradient-to-']");
    expect(source).toContain(".kangur-cta-pill[class*='bg-[linear-gradient']");
    expect(source).toContain('color-mix(in srgb, var(--tw-gradient-from, transparent) 88%, var(--tw-gradient-to, transparent) 12%)');
    expect(source).toContain(".kangur-progress-fill[data-kangur-accent='rose']");
    expect(source).toContain('--kangur-progress-primary: var(--kangur-accent-rose-start, #f87171);');
    expect(source).toContain('--kangur-progress-secondary: var(--kangur-accent-rose-end, #f472b6);');
    expect(primaryCtaBlock).not.toContain('background-position 420ms ease');
    expect(primaryCtaBlock).not.toContain('background 220ms ease');
    expect(warningCtaBlock).not.toContain('background-position 420ms ease');
    expect(warningCtaBlock).not.toContain('background 220ms ease');
    expect(sharedButtonGradientMotionBlock).toBeTruthy();
    expect(sharedButtonGradientMotionBlock).not.toContain('.primary-cta');
    expect(sharedButtonGradientMotionBlock).not.toContain('.home-action-featured');
    expect(progressGradientMotionBlock).toBeTruthy();
  });
});
