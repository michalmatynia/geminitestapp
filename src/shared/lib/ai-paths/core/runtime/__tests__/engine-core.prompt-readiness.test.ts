import { describe, expect, it, vi } from 'vitest';

import { evaluateGraphInternal } from '@/shared/lib/ai-paths/core/runtime/engine-core';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

const buildNode = (input: {
  id: string;
  type: string;
  inputs?: string[];
  outputs?: string[];
  config?: Record<string, unknown>;
}): AiNode =>
  ({
    id: input.id,
    type: input.type,
    title: input.id,
    description: '',
    position: { x: 0, y: 0 },
    data: {},
    config: input.config ?? {},
    inputs: input.inputs ?? [],
    outputs: input.outputs ?? ['value'],
  }) as AiNode;

const buildEdge = (input: {
  id: string;
  from: string;
  fromPort: string;
  to: string;
  toPort: string;
}): Edge =>
  ({
    id: input.id,
    from: input.from,
    fromPort: input.fromPort,
    to: input.to,
    toPort: input.toPort,
  }) as Edge;

describe('engine-core prompt readiness', () => {
  it('keeps prompt/model waiting when prompt template needs upstream values that are still missing', async () => {
    const sourceNode = buildNode({
      id: 'source-node',
      type: 'custom_source',
      inputs: ['trigger'],
      outputs: ['bundle'],
    });
    const promptNode = buildNode({
      id: 'prompt-node',
      type: 'prompt',
      inputs: ['bundle'],
      outputs: ['prompt'],
      config: {
        prompt: {
          template: 'Title: {{bundle.title}}',
        },
      },
    });
    const modelNode = buildNode({
      id: 'model-node',
      type: 'model',
      inputs: ['prompt'],
      outputs: ['result'],
      config: {
        model: {
          waitForResult: false,
        },
      },
    });

    const sourceHandler = vi.fn(async () => ({ bundle: { title: 'X' } }));
    const promptHandler = vi.fn(async () => ({ prompt: 'should-not-run' }));
    const modelHandler = vi.fn(async () => ({ result: 'should-not-run' }));

    const runtime = await evaluateGraphInternal(
      [sourceNode, promptNode, modelNode],
      [
        buildEdge({
          id: 'source->prompt',
          from: 'source-node',
          fromPort: 'bundle',
          to: 'prompt-node',
          toPort: 'bundle',
        }),
        buildEdge({
          id: 'prompt->model',
          from: 'prompt-node',
          fromPort: 'prompt',
          to: 'model-node',
          toPort: 'prompt',
        }),
      ],
      {
        resolveHandler: (type) => {
          if (type === 'custom_source') return sourceHandler;
          if (type === 'prompt') return promptHandler;
          if (type === 'model') return modelHandler;
          return null;
        },
        reportAiPathsError: (): void => {},
      }
    );

    expect(sourceHandler).not.toHaveBeenCalled();
    expect(promptHandler).not.toHaveBeenCalled();
    expect(modelHandler).not.toHaveBeenCalled();
    expect(runtime.nodeStatuses['prompt-node']).toBe('waiting_callback');
    expect(runtime.nodeStatuses['model-node']).toBe('waiting_callback');
  });

  it('allows prompt execution without upstream values when template is static text', async () => {
    const sourceNode = buildNode({
      id: 'source-node',
      type: 'custom_source',
      inputs: ['trigger'],
      outputs: ['bundle'],
    });
    const promptNode = buildNode({
      id: 'prompt-node',
      type: 'prompt',
      inputs: ['bundle'],
      outputs: ['prompt'],
      config: {
        prompt: {
          template: 'Write an engaging product title.',
        },
      },
    });

    const sourceHandler = vi.fn(async () => ({ bundle: { title: 'X' } }));
    const promptHandler = vi.fn(async () => ({ prompt: 'Write an engaging product title.' }));

    const runtime = await evaluateGraphInternal(
      [sourceNode, promptNode],
      [
        buildEdge({
          id: 'source->prompt',
          from: 'source-node',
          fromPort: 'bundle',
          to: 'prompt-node',
          toPort: 'bundle',
        }),
      ],
      {
        resolveHandler: (type) => {
          if (type === 'custom_source') return sourceHandler;
          if (type === 'prompt') return promptHandler;
          return null;
        },
        reportAiPathsError: (): void => {},
      }
    );

    expect(sourceHandler).not.toHaveBeenCalled();
    expect(promptHandler).toHaveBeenCalledTimes(1);
    expect(runtime.nodeStatuses['prompt-node']).toBe('completed');
  });
});
