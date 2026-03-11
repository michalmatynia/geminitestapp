import { describe, expect, it } from 'vitest';

import { renderAgenticBundleSelectionSummary } from './render-bundle-selection-summary';

describe('agentic bundle selection summary', () => {
  it('renders selected and skipped bundles', () => {
    const summary = renderAgenticBundleSelectionSummary({
      kind: 'agentic-bundle-selection',
      generatedAt: '2026-03-11T00:00:00.000Z',
      planPath: 'artifacts/agent-bundle-plan.json',
      previousHistoryPath: 'artifacts/agent-history/previous/base-branch.json',
      selectedBundles: ['ai_paths_runtime', 'admin_experience'],
      skippedBundles: [
        {
          bundle: 'product_data_pipeline',
          reason: 'unchanged',
        },
      ],
    });

    expect(summary).toContain('## Agentic bundle selection');
    expect(summary).toContain('`ai_paths_runtime`');
    expect(summary).toContain('`admin_experience`');
    expect(summary).toContain('`product_data_pipeline` (unchanged)');
  });
});
