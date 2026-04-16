import { describe, expect, it } from 'vitest';

import { buildTraderaCategoryScrapeScript } from './category-scrape-script';
import { buildTraderaCheckStatusScript } from './check-status-script';

describe('Tradera script builders', () => {
  it('buildTraderaCheckStatusScript injects the centralized execution steps init', () => {
    const script = buildTraderaCheckStatusScript(undefined, `const executionSteps = [
  { id: 'browser_preparation', label: 'Prep', status: 'pending', message: null },
  { id: 'resolve_status', label: 'Resolve', status: 'pending', message: null },
];`);

    expect(script).toContain("id: 'browser_preparation'");
    expect(script).toContain("id: 'resolve_status'");
    expect(script).toContain('const updateStep = (id, status, message = null) => {');
  });

  it('buildTraderaCategoryScrapeScript injects the centralized execution steps init', () => {
    const script = buildTraderaCategoryScrapeScript(`const executionSteps = [
  { id: 'browser_open', label: 'Open browser', status: 'pending', message: null },
  { id: 'categories_finalize', label: 'Finalize', status: 'pending', message: null },
];`);

    expect(script).toContain("id: 'browser_open'");
    expect(script).toContain("id: 'categories_finalize'");
    expect(script).toContain("updateStep('categories_finalize', 'success'");
  });
});
