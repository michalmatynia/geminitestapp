import { describe, expect, it } from 'vitest';

import type { PathConfig } from '@/shared/contracts/ai-paths';
import {
  getStarterWorkflowTemplateById,
  materializeStarterWorkflowPathConfig,
  upgradeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';
import { evaluateRunPreflight } from '@/shared/lib/ai-paths/core/utils/run-preflight';
import {
  buildPathConfigFromTemplate,
  PATH_TEMPLATES,
} from '@/shared/lib/ai-paths/core/utils/path-templates';

const buildLegacyTranslationPathConfig = (args?: {
  includeParamsRegex?: boolean;
  paramsEdgeToPort?: 'value' | 'result';
}): PathConfig =>
  ({
    id: 'path_translation_v2',
    version: 1,
    name: 'Translation EN->PL Description + Parameters v2',
    description: '',
    trigger: 'manual',
    updatedAt: '2026-03-03T10:00:00.000Z',
    nodes: [
      {
        id: 'node-regex-translate-en-pl',
        type: 'regex',
        title: 'Regex JSON Extract',
        description: '',
        position: { x: 0, y: 0 },
        data: {},
        inputs: ['value', 'prompt', 'regexCallback'],
        outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
      },
      ...(args?.includeParamsRegex
        ? [
            {
              id: 'node-regex-params-translate-en-pl',
              type: 'regex',
              title: 'Regex Params',
              description: '',
              position: { x: 0, y: 160 },
              data: {},
              inputs: ['value', 'prompt', 'regexCallback'],
              outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
            },
          ]
        : []),
      {
        id: 'node-db-update-translate-en-pl',
        type: 'database',
        title: 'Database Query',
        description: '',
        position: { x: 320, y: 0 },
        data: {},
        inputs: ['entityId', 'entityType', 'value', 'result', 'bundle'],
        outputs: ['result', 'bundle'],
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
            mappings: [
              {
                sourcePath: 'description_pl',
                sourcePort: 'value',
                targetPath: 'description_pl',
              },
              {
                sourcePath: 'parameters',
                sourcePort: 'value',
                targetPath: 'parameters',
              },
            ],
          },
        },
      },
    ],
    edges: [
      {
        id: 'edge-description',
        from: 'node-regex-translate-en-pl',
        to: 'node-db-update-translate-en-pl',
        fromPort: 'value',
        toPort: 'value',
      },
      ...(args?.includeParamsRegex
        ? [
            {
              id: 'edge-params',
              from: 'node-regex-params-translate-en-pl',
              to: 'node-db-update-translate-en-pl',
              fromPort: 'value',
              toPort: args?.paramsEdgeToPort ?? 'value',
            },
          ]
        : []),
    ],
  }) as PathConfig;

describe('starter workflow registry', () => {
  it('materializes template configs from the shared registry', () => {
    const template = PATH_TEMPLATES.find(
      (entry) => entry.templateId === 'starter_parameter_inference'
    );
    if (!template) throw new Error('Missing starter_parameter_inference template');

    const config = buildPathConfigFromTemplate('path_created_from_template', template);

    expect(config.id).toBe('path_created_from_template');
    expect(config.name).toBe('Parameter Inference');
    expect(config.extensions?.['aiPathsStarter']).toEqual(
      expect.objectContaining({
        starterKey: 'parameter_inference',
        templateId: 'starter_parameter_inference',
        seededDefault: false,
      })
    );
  });

  it('materializes seeded starter configs with provenance', () => {
    const entry = getStarterWorkflowTemplateById('starter_base_export_blwo');
    if (!entry) throw new Error('Missing starter_base_export_blwo entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_base_export_blwo_v1',
      seededDefault: true,
    });

    expect(config.id).toBe('path_base_export_blwo_v1');
    expect(config.extensions?.['aiPathsStarter']).toEqual(
      expect.objectContaining({
        starterKey: 'base_export_blwo',
        templateId: 'starter_base_export_blwo',
        seededDefault: true,
      })
    );
  });

  it('materializes a runnable EN->PL translation starter graph', () => {
    const entry = getStarterWorkflowTemplateById('starter_translation_en_pl');
    if (!entry) throw new Error('Missing starter_translation_en_pl entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_translation_en_pl_runtime',
      seededDefault: false,
    });
    const report = evaluateRunPreflight({
      nodes: config.nodes,
      edges: config.edges,
      aiPathsValidation: { enabled: true },
      strictFlowMode: true,
      mode: 'full',
    });

    expect(config.nodes.some((node) => node.type === 'trigger')).toBe(true);
    expect(report.shouldBlock).toBe(false);
    expect(report.dependencyReport?.errors ?? 0).toBe(0);
  });

  it('does not resolve starter graphs with legacy edge alias fields', () => {
    const entry = getStarterWorkflowTemplateById('starter_parameter_inference');
    if (!entry) throw new Error('Missing starter_parameter_inference entry');

    const canonical = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_starter_alias_only_edges',
    });
    const aliasOnlyEdges = (canonical.edges ?? []).map((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      sourceHandle: edge.fromPort ?? null,
      targetHandle: edge.toPort ?? null,
      createdAt: edge.createdAt ?? null,
      updatedAt: edge.updatedAt ?? null,
      data: edge.data ?? {},
    }));
    const configWithLegacyAliasEdges = {
      ...canonical,
      extensions: {},
      edges: aliasOnlyEdges,
    } as unknown as PathConfig;

    const upgraded = upgradeStarterWorkflowPathConfig(configWithLegacyAliasEdges);

    expect(upgraded.resolution).toBeNull();
    expect(upgraded.changed).toBe(false);
  });

  it('does not upgrade renamed legacy translation variants', () => {
    const upgraded = upgradeStarterWorkflowPathConfig(buildLegacyTranslationPathConfig());

    expect(upgraded.resolution).toBeNull();
    expect(upgraded.changed).toBe(false);
  });

  it('does not overlay non-canonical graphs even when starter provenance is present', () => {
    const legacy = buildLegacyTranslationPathConfig({
      includeParamsRegex: true,
      paramsEdgeToPort: 'value',
    });
    const upgraded = upgradeStarterWorkflowPathConfig({
      ...legacy,
      extensions: {
        aiPathsStarter: {
          starterKey: 'translation_en_pl',
          templateId: 'starter_translation_en_pl',
          templateVersion: 1,
          seededDefault: false,
        },
      },
    } as PathConfig);

    expect(upgraded.changed).toBe(false);
    expect(upgraded.resolution?.matchedBy).toBe('provenance');
  });

  it('does not upgrade divergent graphs that no longer match starter fingerprints', () => {
    const config = buildLegacyTranslationPathConfig();
    config.nodes = config.nodes.map((node) => {
      if (node.id !== 'node-db-update-translate-en-pl') return node;
      return {
        ...node,
        id: 'node-db-update-translate-en-pl-diverged',
      };
    });
    config.edges = config.edges.map((edge) => {
      if (edge.to !== 'node-db-update-translate-en-pl') return edge;
      return {
        ...edge,
        to: 'node-db-update-translate-en-pl-diverged',
      };
    });

    const upgraded = upgradeStarterWorkflowPathConfig(config);

    expect(upgraded.resolution).toBeNull();
    expect(upgraded.changed).toBe(false);
  });

  it('does not resolve unrelated graphs by historical starter names', () => {
    const unrelated = {
      id: 'path_unrelated_named_like_starter',
      version: 1,
      name: 'Translation EN->PL Description + Parameters',
      description: '',
      trigger: 'manual',
      updatedAt: '2026-03-03T10:00:00.000Z',
      nodes: [
        {
          id: 'node-unrelated-viewer',
          type: 'viewer',
          title: 'Viewer',
          description: '',
          position: { x: 0, y: 0 },
          data: {},
          inputs: ['value'],
          outputs: [],
        },
      ],
      edges: [],
    } as PathConfig;

    const upgraded = upgradeStarterWorkflowPathConfig(unrelated);

    expect(upgraded.resolution).toBeNull();
    expect(upgraded.changed).toBe(false);
  });
});
