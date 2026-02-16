import { describe, expect, it } from 'vitest';

import {
  getPromptValidationObservabilitySnapshot,
  recordPromptValidationCounter,
  recordPromptValidationTiming,
  resetPromptValidationObservability,
} from '@/features/prompt-core/runtime-observability';

describe('prompt runtime observability', () => {
  it('calculates health as degraded when SLO checks fail', () => {
    resetPromptValidationObservability();

    for (let index = 0; index < 10; index += 1) {
      recordPromptValidationTiming('runtime_pipeline_ms', 180);
      recordPromptValidationTiming('explode_ms', 80);
      recordPromptValidationTiming('runtime_compile_ms', 20);
    }
    for (let index = 0; index < 20; index += 1) {
      recordPromptValidationCounter('runtime_selection_total', 1);
    }

    const snapshot = getPromptValidationObservabilitySnapshot();
    expect(snapshot.health.status).toBe('degraded');
    expect(snapshot.sloTargets.p95PipelineMs).toBe(120);
    expect(snapshot.counters.runtime_selection_total).toBe(20);
  });
});
