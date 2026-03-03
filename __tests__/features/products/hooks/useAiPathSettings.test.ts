import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import {
  findTriggerPath,
  sanitizeLoadedPathConfig,
} from '@/features/products/hooks/useAiPathSettings';
import type { AiNode, PathConfig } from '@/shared/contracts/ai-paths';

import { describe, expect, it } from 'vitest';

const createTriggerNode = (args: {
  id: string;
  event?: string;
  withTriggerConfig?: boolean;
}): AiNode =>
  ({
    id: args.id,
    type: 'trigger',
    title: 'Trigger',
    description: 'Trigger node',
    inputs: [],
    outputs: ['trigger'],
    position: { x: 0, y: 0 },
    config: args.withTriggerConfig === false ? {} : { trigger: { event: args.event } },
  }) as unknown as AiNode;

const createPathWithTrigger = (args: {
  id: string;
  name: string;
  event?: string;
  withTriggerConfig?: boolean;
}): PathConfig => {
  const config = createDefaultPathConfig(args.id);
  return {
    ...config,
    name: args.name,
    nodes: [
      createTriggerNode({
        id: `${args.id}-trigger`,
        event: args.event,
        withTriggerConfig: args.withTriggerConfig,
      }),
    ],
    edges: [],
  };
};

describe('findTriggerPath', () => {
  it('returns undefined when there is no matching trigger and fallback is disabled', () => {
    const manualPath = createPathWithTrigger({
      id: 'manual-path',
      name: 'Manual Path',
      event: 'manual',
    });

    const selected = findTriggerPath([manualPath], null, null, 'path_generate_description', {
      fallbackToAnyPath: false,
    });

    expect(selected).toBeUndefined();
  });

  it('falls back to the first ordered path when fallback is enabled', () => {
    const manualPath = createPathWithTrigger({
      id: 'manual-path',
      name: 'Manual Path',
      event: 'manual',
    });

    const selected = findTriggerPath([manualPath], null, null, 'path_generate_description');

    expect(selected?.id).toBe('manual-path');
  });

  it('uses the configured default trigger event for trigger nodes without event config', () => {
    const pathWithoutEvent = createPathWithTrigger({
      id: 'implicit-manual-path',
      name: 'Implicit Manual Path',
      withTriggerConfig: false,
    });

    const manualSelection = findTriggerPath([pathWithoutEvent], null, null, 'manual', {
      fallbackToAnyPath: false,
      defaultTriggerEventId: 'manual',
    });
    const legacySelection = findTriggerPath(
      [pathWithoutEvent],
      null,
      null,
      'path_generate_description',
      { fallbackToAnyPath: false, defaultTriggerEventId: 'manual' }
    );

    expect(manualSelection?.id).toBe('implicit-manual-path');
    expect(legacySelection).toBeUndefined();
  });

  it('prefers the active path when multiple trigger candidates match', () => {
    const firstPath = createPathWithTrigger({
      id: 'path-first',
      name: 'First Path',
      event: 'manual',
    });
    const secondPath = createPathWithTrigger({
      id: 'path-second',
      name: 'Second Path',
      event: 'manual',
    });

    const selected = findTriggerPath([firstPath, secondPath], null, 'path-second', 'manual', {
      fallbackToAnyPath: false,
    });

    expect(selected?.id).toBe('path-second');
  });

  it('does not rewrite renamed legacy EN->PL translation paths for product-side loading', () => {
    const config = createDefaultPathConfig('path_translation_v2');
    config.name = 'Translation EN->PL Description + Parameters v2';
    config.uiState = {
      ...config.uiState,
      selectedNodeId: 'node-dddddddddddddddddddddddd',
    };
    config.nodes = [
      {
        id: 'node-dddddddddddddddddddddddd',
        instanceId: 'node-dddddddddddddddddddddddd',
        nodeTypeId: 'nt-4a16cd5ffba5be3e872f0307',
        type: 'regex',
        title: 'Regex JSON Extract',
        description: '',
        inputs: ['value', 'prompt', 'regexCallback'],
        outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
        position: { x: 0, y: 0 },
        data: {},
      } as unknown as AiNode,
      {
        id: 'node-eeeeeeeeeeeeeeeeeeeeeeee',
        instanceId: 'node-eeeeeeeeeeeeeeeeeeeeeeee',
        nodeTypeId: 'nt-52deb61aa96ee2271e8693b2',
        type: 'database',
        title: 'Database Query',
        description: '',
        inputs: ['entityId', 'entityType', 'value', 'result', 'bundle'],
        outputs: ['result', 'bundle'],
        position: { x: 320, y: 0 },
        data: {},
        config: {
          database: {
            operation: 'update',
            entityType: 'product',
            updatePayloadMode: 'mapping',
            updateTemplate: '',
            query: {
              provider: 'auto',
              collection: 'products',
              mode: 'custom',
              preset: 'by_id',
              field: 'id',
              idType: 'string',
              queryTemplate: '{"id":"{{entityId}}"}',
              limit: 1,
              sort: '',
              projection: '',
              single: true,
            },
          },
        },
      } as unknown as AiNode,
    ];
    config.edges = [
      {
        id: 'edge-legacy-regex-db',
        from: 'node-dddddddddddddddddddddddd',
        to: 'node-eeeeeeeeeeeeeeeeeeeeeeee',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const sanitized = sanitizeLoadedPathConfig(config);
    const databaseNode = sanitized.nodes.find(
      (node: AiNode): boolean => node.id === 'node-eeeeeeeeeeeeeeeeeeeeeeee'
    );

    expect(databaseNode?.config?.database?.updatePayloadMode).not.toBe('custom');
    expect(String(databaseNode?.config?.database?.updateTemplate ?? '')).not.toContain(
      '"description_pl": "{{value.description_pl}}"'
    );
    expect(String(databaseNode?.config?.database?.updateTemplate ?? '')).not.toContain(
      '"parameters": {{value.parameters}}'
    );
  });
});
