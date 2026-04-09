import { describe, expect, it } from 'vitest';

import type { PathConfig } from '@/shared/contracts/ai-paths';
import {
  STARTER_WORKFLOW_REGISTRY,
  materializeStarterWorkflowRecoveryBundle,
  materializeStarterWorkflowPathConfig,
  upgradeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';
import {
  buildPathConfigFromTemplate,
  PATH_TEMPLATES,
} from '@/shared/lib/ai-paths/core/utils/path-templates';
import {
  buildCustomModeRandomIdParameterInferencePathConfig,
  buildLegacyTranslationPathConfig,
  buildMappingModeLegacyParameterInferencePathConfig,
  buildProvenanceOnlyStaleParameterInferencePathConfig,
  buildStaleLiveParameterInferencePathConfig,
  buildStaleLiveTranslationPathConfig,
  buildV14ParameterInferencePathConfig,
  buildV15ParameterInferencePathConfig,
  buildV5DescriptionInferencePathConfig,
  buildV5TranslationPathConfig,
  evaluateStrictRunPreflight,
  expectSuccessfulStrictRunPreflight,
  getStarterWorkflowTemplateByIdOrThrow,
  hasDatabaseNodeWithUpdatePayloadMode,
  hasNodeId,
  toLegacyAliasOnlyEdges,
} from './registry.test-helpers';

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
    const config = materializeStarterWorkflowPathConfig(
      getStarterWorkflowTemplateByIdOrThrow('starter_base_export_blwo'),
      {
        pathId: 'path_base_export_blwo_v1',
        seededDefault: true,
      }
    );

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
    const config = materializeStarterWorkflowPathConfig(
      getStarterWorkflowTemplateByIdOrThrow('starter_translation_en_pl'),
      {
        pathId: 'path_translation_en_pl_runtime',
        seededDefault: false,
      }
    );
    const report = evaluateStrictRunPreflight(config);

    expect(config.nodes.some((node) => node.type === 'trigger')).toBe(true);
    expect(report.shouldBlock).toBe(false);
    expect(report.dependencyReport?.errors ?? 0).toBe(0);
  });

  it('materializes a runnable Normalize Product Name starter graph', () => {
    const config = materializeStarterWorkflowPathConfig(
      getStarterWorkflowTemplateByIdOrThrow('starter_product_name_normalize'),
      {
        pathId: 'path_product_name_normalize_runtime',
        seededDefault: false,
      }
    );
    const report = evaluateStrictRunPreflight(config);
    const databaseNode = (config.nodes ?? []).find(
      (node) => node.type === 'database' && node.id === 'node-update-name-normalize'
    );

    expect(config.nodes.some((node) => node.type === 'trigger')).toBe(true);
    expect(hasNodeId(config, 'node-update-name-normalize')).toBe(true);
    expect(databaseNode?.config?.database?.updatePayloadMode).toBe('custom');
    expect(databaseNode?.config?.database?.updateTemplate).toContain('"__noop__": ""');
    expect(databaseNode?.config?.database?.updateTemplate).not.toContain('"name_en"');
    expectSuccessfulStrictRunPreflight(report);
  });

  it('does not materialize starter workflows with embedded model selections', () => {
    STARTER_WORKFLOW_REGISTRY.forEach((entry) => {
      const config = materializeStarterWorkflowPathConfig(entry, {
        pathId: entry.seedPolicy?.defaultPathId ?? `${entry.templateId}_runtime_check`,
        seededDefault: false,
      });
      const modelNodes = config.nodes.filter((node) => node.type === 'model');

      modelNodes.forEach((node) => {
        const configuredModelId =
          typeof node.config?.model?.modelId === 'string' ? node.config.model.modelId.trim() : '';
        expect(
          configuredModelId,
          `Starter workflow ${entry.templateId} should not hardcode modelId on node ${node.id}`
        ).toBe('');
      });
    });
  });

  it('materializes a static recovery bundle that includes canonical non-auto-seeded workflows', () => {
    const bundle = materializeStarterWorkflowRecoveryBundle('static_recovery');

    expect(bundle.pathConfigs.some((config) => config.id === 'path_descv3lite')).toBe(true);
    expect(bundle.pathConfigs.some((config) => config.id === 'path_96708d')).toBe(true);
    expect(bundle.triggerButtons.some((button) => button.id === '4c07d35b-ea92-4d1f-b86b-c586359f68de')).toBe(true);
  });

  it('does not resolve starter graphs with legacy edge alias fields', () => {
    const canonical = materializeStarterWorkflowPathConfig(
      getStarterWorkflowTemplateByIdOrThrow('starter_parameter_inference'),
      {
        pathId: 'path_starter_alias_only_edges',
      }
    );
    const configWithLegacyAliasEdges = {
      ...canonical,
      extensions: {},
      edges: toLegacyAliasOnlyEdges(canonical),
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

  it('overlays stale provenance translation configs preserving diverged nodes while fixing the database node', () => {
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

    const dbNode = (upgraded.config.nodes ?? []).find(
      (node) => node.id === 'node-db-update-translate-en-pl'
    );
    const extraRegexNode = (upgraded.config.nodes ?? []).find(
      (node) => node.id === 'node-regex-params-translate-en-pl'
    );

    expect(upgraded.changed).toBe(true);
    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    // Database node gets writeOutcomePolicy fix from latest canvas
    expect(dbNode?.config?.database?.writeOutcomePolicy?.onZeroAffected).toBe('pass');
    // Extra user node is preserved (not removed by overlay)
    expect(extraRegexNode).toBeDefined();
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

  it('rehydrates starter provenance for canonical translation v2 configs without starter metadata', () => {
    const upgraded = upgradeStarterWorkflowPathConfig(buildStaleLiveTranslationPathConfig());
    const databaseNode = (upgraded.config.nodes ?? []).find(
      (node) => node.type === 'database' && node.config?.database?.operation === 'update'
    );

    expect(upgraded.resolution?.matchedBy).toBe('canonical_hash');
    expect(upgraded.changed).toBe(true);
    expect(upgraded.config.extensions?.['aiPathsStarter']).toEqual(
      expect.objectContaining({
        starterKey: 'translation_en_pl',
      })
    );
    expect(databaseNode?.config?.database?.updateTemplate).toContain('{{result.parameters}}');
  });

  it('upgrades stale parameter inference v2 configs with blank product_core parser mappings', () => {
    const upgraded = upgradeStarterWorkflowPathConfig(buildStaleLiveParameterInferencePathConfig());
    const parserNode = (upgraded.config.nodes ?? []).find((node) => node.type === 'parser');
    const parserMappings = parserNode?.config?.parser?.mappings;
    const report = evaluateStrictRunPreflight(upgraded.config);

    expect(upgraded.resolution?.matchedBy).toBe('legacy_alias');
    expect(upgraded.changed).toBe(true);
    expect(upgraded.config.extensions?.['aiPathsStarter']).toEqual(
      expect.objectContaining({
        starterKey: 'parameter_inference',
      })
    );
    expect(parserMappings?.['title']).toBe('$.name_en');
    expect(parserMappings?.['content_en']).toBe('$.description_en');
    expectSuccessfulStrictRunPreflight(report);
  });

  it('upgrades stale parameter inference starter provenance on non-default path ids', () => {
    const upgraded = upgradeStarterWorkflowPathConfig(
      buildProvenanceOnlyStaleParameterInferencePathConfig()
    );
    const seedRouterNode = (upgraded.config.nodes ?? []).find(
      (node) => node.type === 'router' && node.id === 'node-router-seed-params'
    );
    const report = evaluateStrictRunPreflight(upgraded.config);

    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(upgraded.changed).toBe(true);
    expect(seedRouterNode?.inputs).not.toContain('prompt');
    expect(seedRouterNode?.outputs).not.toContain('prompt');
    expectSuccessfulStrictRunPreflight(report);
  });

  it('upgrades v14 parameter inference configs to repair writeOutcomePolicy on both update nodes', () => {
    const upgraded = upgradeStarterWorkflowPathConfig(buildV14ParameterInferencePathConfig());
    const updateNodes = (upgraded.config.nodes ?? []).filter(
      (node) => node.type === 'database' && node.config?.database?.operation === 'update'
    );

    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(upgraded.changed).toBe(true);
    expect(updateNodes.length).toBeGreaterThanOrEqual(2);
    updateNodes.forEach((node) => {
      expect(node.config?.database?.writeOutcomePolicy?.onZeroAffected).toBe('pass');
    });
  });

  it('upgrades v15 parameter inference configs to repair writeOutcomePolicy on the query node', () => {
    const upgraded = upgradeStarterWorkflowPathConfig(buildV15ParameterInferencePathConfig());
    const queryNode = (upgraded.config.nodes ?? []).find(
      (node) => node.type === 'database' && node.config?.database?.operation === 'query'
    );

    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(upgraded.changed).toBe(true);
    expect(queryNode).toBeTruthy();
    expect(queryNode?.config?.database?.writeOutcomePolicy?.onZeroAffected).toBe('pass');
  });

  it('fully replaces partial parameter inference graphs that are missing canonical nodes', () => {
    // Simulate a stored config that has only a subset of canonical nodes (e.g., an old
    // partial migration). The overlay cannot add missing nodes, so full replacement is required.
    const canonical = materializeStarterWorkflowPathConfig(
      getStarterWorkflowTemplateByIdOrThrow('starter_parameter_inference'),
      {
        pathId: 'path_partial_overlap',
        seededDefault: false,
      }
    );

    // Keep a subset of canonical nodes — simulates a partially migrated config. Include the
    // prompt node so hasParameterInferencePromptStructure returns true (realistic scenario).
    const keepNodeIds = new Set([
      'node-seed-params',
      'node-update-params',
      'node-parser-params',
      'node-prompt-params',
    ]);
    const partialConfig: PathConfig = {
      ...canonical,
      nodes: (canonical.nodes ?? []).filter((node) => keepNodeIds.has(node.id)),
      edges: (canonical.edges ?? []).filter(
        (edge) => keepNodeIds.has(edge.from) && keepNodeIds.has(edge.to)
      ),
      extensions: {
        aiPathsStarter: {
          starterKey: 'parameter_inference',
          templateId: 'starter_parameter_inference',
          templateVersion: 14,
          seededDefault: false,
        },
      },
    } as PathConfig;

    const upgraded = upgradeStarterWorkflowPathConfig(partialConfig);
    const report = evaluateStrictRunPreflight(upgraded.config);

    expect(upgraded.changed).toBe(true);
    // All canonical nodes are present after full replacement
    expect(hasNodeId(upgraded.config, 'node-router-seed-params')).toBe(true);
    expect(hasNodeId(upgraded.config, 'node-vp-template-params')).toBe(true);
    expect(hasNodeId(upgraded.config, 'node-lc-template-params')).toBe(true);
    expectSuccessfulStrictRunPreflight(report);
  });

  it('upgrades v5 translation configs to add writeOutcomePolicy pass on the update node', () => {
    const upgraded = upgradeStarterWorkflowPathConfig(buildV5TranslationPathConfig());
    const dbNode = (upgraded.config.nodes ?? []).find(
      (node) => node.type === 'database' && node.config?.database?.operation === 'update'
    );

    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(upgraded.changed).toBe(true);
    expect(dbNode).toBeTruthy();
    expect(dbNode?.config?.database?.writeOutcomePolicy?.onZeroAffected).toBe('pass');
  });

  it('upgrades v5 description inference lite configs to add writeOutcomePolicy pass on the update node', () => {
    const upgraded = upgradeStarterWorkflowPathConfig(buildV5DescriptionInferencePathConfig());
    const dbNode = (upgraded.config.nodes ?? []).find(
      (node) => node.type === 'database' && node.config?.database?.operation === 'update'
    );

    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(upgraded.changed).toBe(true);
    expect(dbNode).toBeTruthy();
    expect(dbNode?.config?.database?.writeOutcomePolicy?.onZeroAffected).toBe('pass');
  });

  it('fully replaces a partially-upgraded graph whose provenance is already at the current templateVersion but nodes were never updated', () => {
    // Simulate a path that was partially upgraded: the overlay bumped provenance to v16
    // but couldn't update any nodes (zero ID overlap), leaving legacy random-ID nodes.
    const partiallyUpgraded: PathConfig = {
      ...buildCustomModeRandomIdParameterInferencePathConfig(),
      extensions: {
        aiPathsStarter: {
          starterKey: 'parameter_inference',
          templateId: 'starter_parameter_inference',
          templateVersion: 16, // already at current — safeToOverlay is false via provenance path
          seededDefault: false,
        },
      },
    } as PathConfig;

    const upgraded = upgradeStarterWorkflowPathConfig(partiallyUpgraded);
    const report = evaluateStrictRunPreflight(upgraded.config);

    expect(upgraded.changed).toBe(true);
    expect(hasNodeId(upgraded.config, 'node-model-params')).toBe(true);
    expectSuccessfulStrictRunPreflight(report);
  });

  it('fully replaces custom-mode parameter inference graphs with random node IDs (no canonical overlap)', () => {
    const upgraded = upgradeStarterWorkflowPathConfig(
      buildCustomModeRandomIdParameterInferencePathConfig()
    );
    const report = evaluateStrictRunPreflight(upgraded.config);

    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(upgraded.changed).toBe(true);
    // After full replacement all nodes use canonical IDs
    expect(hasNodeId(upgraded.config, 'node-model-params')).toBe(true);
    expect(hasNodeId(upgraded.config, 'node-regex-params')).toBe(true);
    expectSuccessfulStrictRunPreflight(report);
  });

  it('fully replaces stale parameter inference graphs with zero canonical node overlap', () => {
    const upgraded = upgradeStarterWorkflowPathConfig(
      buildMappingModeLegacyParameterInferencePathConfig()
    );
    const report = evaluateStrictRunPreflight(upgraded.config);

    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(upgraded.changed).toBe(true);
    expect(hasDatabaseNodeWithUpdatePayloadMode(upgraded.config, 'mapping')).toBe(false);
    expect(hasNodeId(upgraded.config, 'node-router-seed-params')).toBe(true);
    expectSuccessfulStrictRunPreflight(report);
  });
});
