import { describe, expect, it } from 'vitest';

import type { AgenticHistoryDiff } from '../../../scripts/agentic/diff-history';
import { renderAgenticHistoryDiffSummary } from '../../../scripts/agentic/render-history-diff-summary';

const buildDiff = (patch: Partial<AgenticHistoryDiff> = {}): AgenticHistoryDiff => ({
  kind: 'agentic-history-diff',
  generatedAt: '2026-04-03T00:00:00.000Z',
  currentPath: 'current.json',
  previousPath: 'previous.json',
  currentGeneratedAt: '2026-04-03T00:00:00.000Z',
  previousGeneratedAt: '2026-04-02T00:00:00.000Z',
  addedBundles: [],
  removedBundles: [],
  newlyHighRiskBundles: [],
  newlyAttemptedHighRiskSuppressions: [],
  riskEscalations: [],
  selectionChanges: [],
  bundlesWithRecommendationChanges: [],
  bundlesWithExecutionChanges: [],
  validationDecisionChanged: {
    changed: false,
    previous: null,
    current: null,
  },
  ...patch,
});

describe('renderAgenticHistoryDiffSummary', () => {
  it('renders empty diff summaries with the no-drift message', () => {
    const summary = renderAgenticHistoryDiffSummary(buildDiff());
    expect(summary).toContain('## Agentic history diff');
    expect(summary).toContain('No bundle-set or risk-level drift detected.');
  });

  it('renders populated diff sections in markdown', () => {
    const summary = renderAgenticHistoryDiffSummary(
      buildDiff({
        newlyAttemptedHighRiskSuppressions: ['bundle.high'],
        newlyHighRiskBundles: ['bundle.new'],
        riskEscalations: [
          {
            bundle: 'bundle.risk',
            previousPriority: 'medium',
            currentPriority: 'high',
          },
        ],
        addedBundles: ['bundle.added'],
        removedBundles: ['bundle.removed'],
        selectionChanges: [
          {
            bundle: 'bundle.selection',
            previousState: 'selected',
            currentState: 'skipped',
          },
        ],
        validationDecisionChanged: {
          changed: true,
          previous: 'allow',
          current: 'block',
        },
      })
    );

    expect(summary).toContain('### Warning: attempted suppression prevented for high-risk bundles');
    expect(summary).toContain('- `bundle.high`');
    expect(summary).toContain('### Newly introduced high-risk bundles');
    expect(summary).toContain('### Risk escalations');
    expect(summary).toContain('- Added: `bundle.added`');
    expect(summary).toContain('- Removed: `bundle.removed`');
    expect(summary).toContain('### Validation decision change');
    expect(summary).toContain('- `allow` -> `block`');
    expect(summary).toContain('### Bundle selection drift');
  });
});
