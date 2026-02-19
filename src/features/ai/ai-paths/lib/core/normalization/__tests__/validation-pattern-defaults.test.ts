import { describe, expect, it } from 'vitest';

import {
  getDefaultConfigForType,
  normalizeNodes,
} from '@/features/ai/ai-paths/lib/core/normalization';
import type { AiNode } from '@/shared/types/domain/ai-paths';

describe('validation_pattern normalization', () => {
  it('injects default config and ports for validation pattern nodes', () => {
    const rawNode = {
      id: 'node-validation-pattern',
      type: 'validation_pattern',
      title: 'Validation Pattern',
      description: 'Validation node',
      position: { x: 0, y: 0 },
      data: {},
      inputs: [],
      outputs: [],
      config: {},
    } as AiNode;

    const [normalized] = normalizeNodes([rawNode]);
    expect(normalized?.inputs).toEqual(
      expect.arrayContaining(['value', 'prompt', 'result', 'context'])
    );
    expect(normalized?.outputs).toEqual(
      expect.arrayContaining(['value', 'result', 'context', 'valid', 'errors', 'bundle'])
    );
    expect(normalized?.config?.validationPattern).toMatchObject({
      source: 'global_stack',
      scope: 'global',
      runtimeMode: 'validate_only',
      failPolicy: 'block_on_error',
      inputPort: 'auto',
      outputPort: 'value',
    });
  });

  it('provides default config via factory helper', () => {
    const config = getDefaultConfigForType('validation_pattern', [], []);
    expect(config?.validationPattern).toMatchObject({
      source: 'global_stack',
      scope: 'global',
      runtimeMode: 'validate_only',
      failPolicy: 'block_on_error',
      maxAutofixPasses: 1,
    });
  });
});

