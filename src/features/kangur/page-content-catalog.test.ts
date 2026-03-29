import { describe, expect, it } from 'vitest';

import { buildDefaultKangurPageContentStore } from './page-content-catalog';

describe('page-content-catalog compatibility', () => {
  it('re-exports the ai-tutor page content catalog from the legacy path', () => {
    expect(buildDefaultKangurPageContentStore('pl').entries.length).toBeGreaterThan(0);
  });
});
