import { describe, expect, it } from 'vitest';

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
});
