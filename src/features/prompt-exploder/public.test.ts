import { describe, expect, it } from 'vitest';

import * as promptExploderPublic from './public';

describe('prompt-exploder public barrel', () => {
  it('exposes the admin pages through the root barrel', () => {
    expect(promptExploderPublic).toHaveProperty('AdminPromptExploderPage');
    expect(promptExploderPublic).toHaveProperty('AdminPromptExploderProjectsPage');
    expect(promptExploderPublic).toHaveProperty('AdminPromptExploderSettingsPage');
  });

  it('continues exposing runtime, settings, parser, and benchmark entry points', () => {
    expect(promptExploderPublic).toHaveProperty('ensurePromptExploderPatternPack');
    expect(promptExploderPublic).toHaveProperty('parsePromptExploderSettings');
    expect(promptExploderPublic).toHaveProperty('explodePromptText');
    expect(promptExploderPublic).toHaveProperty('runPromptExploderBenchmark');
  });
});
