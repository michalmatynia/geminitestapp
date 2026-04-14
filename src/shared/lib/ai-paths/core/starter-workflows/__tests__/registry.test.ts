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
    const mapperNode = (config.nodes ?? []).find(
      (node) => node.type === 'mapper' && node.id === 'node-mapper-name-normalize'
    );
    const dbSchemaNode = (config.nodes ?? []).find(
      (node) => node.type === 'db_schema' && node.id === 'node-db-schema-name-normalize'
    );
    const modelNode = (config.nodes ?? []).find(
      (node) => node.type === 'model' && node.id === 'node-model-name-normalize'
    );

    expect(config.nodes.some((node) => node.type === 'trigger')).toBe(true);
    expect(hasNodeId(config, 'node-db-schema-name-normalize')).toBe(true);
    expect(hasNodeId(config, 'node-category-context-name-normalize')).toBe(true);
    expect(hasNodeId(config, 'node-update-name-normalize')).toBe(true);
    expect(dbSchemaNode?.config?.db_schema?.contextTransform).toBe('product_categories_leaf_only');
    expect(dbSchemaNode?.config?.db_schema?.contextReuseMode).toBe('prefer_transformed_input');
    expect(modelNode?.config?.model?.vision).toBe(false);
    expect(modelNode?.config?.model?.maxTokens).toBe(500);
    expect(databaseNode?.config?.database?.dryRun).toBe(true);
    expect(databaseNode?.config?.database?.updatePayloadMode).toBe('custom');
    expect(databaseNode?.config?.database?.updateTemplate).toContain('"__noop__": ""');
    expect(databaseNode?.config?.database?.updateTemplate).not.toContain('"name_en"');
    expect(databaseNode?.config?.database?.writeOutcomePolicy?.onZeroAffected).toBe('warn');
    expect(mapperNode?.config?.mapper?.jsonIntegrityPolicy).toBe('repair');
    expectSuccessfulStrictRunPreflight(report);
  });

  it('fully replaces stale default normalize graphs with random node ids so dry-run database updates take effect', () => {
    const canonical = materializeStarterWorkflowPathConfig(
      getStarterWorkflowTemplateByIdOrThrow('starter_product_name_normalize'),
      {
        pathId: 'path_name_normalize_v1',
        seededDefault: true,
      }
    );

    const randomIdConfig: PathConfig = {
      ...canonical,
      nodes: (canonical.nodes ?? []).map((node, index) => ({
        ...node,
        id: `node-normalize-random-${index + 1}`,
      })),
      edges: (canonical.edges ?? []).map((edge, index) => {
        const fromIndex = (canonical.nodes ?? []).findIndex((node) => node.id === edge.from);
        const toIndex = (canonical.nodes ?? []).findIndex((node) => node.id === edge.to);
        return {
          ...edge,
          id: `edge-normalize-random-${index + 1}`,
          from: fromIndex >= 0 ? `node-normalize-random-${fromIndex + 1}` : edge.from,
          to: toIndex >= 0 ? `node-normalize-random-${toIndex + 1}` : edge.to,
        };
      }),
      extensions: {
        aiPathsStarter: {
          starterKey: 'product_name_normalize',
          templateId: 'starter_product_name_normalize',
          templateVersion: 3,
          seededDefault: true,
        },
      },
    };

    const upgraded = upgradeStarterWorkflowPathConfig(randomIdConfig);
    const databaseNode = (upgraded.config.nodes ?? []).find(
      (node) => node.id === 'node-update-name-normalize'
    );
    const report = evaluateStrictRunPreflight(upgraded.config);

    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(upgraded.changed).toBe(true);
    expect(hasNodeId(upgraded.config, 'node-update-name-normalize')).toBe(true);
    expect(databaseNode?.config?.database?.dryRun).toBe(true);
    expectSuccessfulStrictRunPreflight(report);
  });

  it('fully replaces legacy normalize graphs with random node ids and no starter provenance', () => {
    const canonical = materializeStarterWorkflowPathConfig(
      getStarterWorkflowTemplateByIdOrThrow('starter_product_name_normalize'),
      {
        pathId: 'path_name_normalize_v1',
        seededDefault: true,
      }
    );

    const legacyRandomIdConfig: PathConfig = {
      ...canonical,
      nodes: (canonical.nodes ?? []).map((node, index) => {
        const randomId = `node-normalize-legacy-${index + 1}`;
        if (node.type !== 'database') {
          return {
            ...node,
            id: randomId,
          };
        }

        return {
          ...node,
          id: randomId,
          config: {
            ...node.config,
            database: {
              ...node.config?.database,
              dryRun: false,
              updatePayloadMode: 'custom',
              updateTemplate:
                '{\n  "$set": {\n    "name_en": "{{result}}"\n  },\n  "$unset": {\n    "__noop__": ""\n  }\n}',
            },
          },
        };
      }),
      edges: (canonical.edges ?? []).map((edge, index) => {
        const fromIndex = (canonical.nodes ?? []).findIndex((node) => node.id === edge.from);
        const toIndex = (canonical.nodes ?? []).findIndex((node) => node.id === edge.to);
        return {
          ...edge,
          id: `edge-normalize-legacy-${index + 1}`,
          from: fromIndex >= 0 ? `node-normalize-legacy-${fromIndex + 1}` : edge.from,
          to: toIndex >= 0 ? `node-normalize-legacy-${toIndex + 1}` : edge.to,
        };
      }),
      extensions: undefined,
    };

    const upgraded = upgradeStarterWorkflowPathConfig(legacyRandomIdConfig);
    const promptNode = (upgraded.config.nodes ?? []).find(
      (node) => node.id === 'node-prompt-name-normalize'
    );
    const databaseNode = (upgraded.config.nodes ?? []).find(
      (node) => node.id === 'node-update-name-normalize'
    );
    const promptTemplate =
      typeof promptNode?.config?.prompt?.template === 'string'
        ? promptNode.config.prompt.template
        : '';

    expect(upgraded.resolution?.matchedBy).toBe('legacy_alias');
    expect(upgraded.changed).toBe(true);
    expect(hasNodeId(upgraded.config, 'node-prompt-name-normalize')).toBe(true);
    expect(databaseNode?.config?.database?.dryRun).toBe(true);
    expect(promptTemplate).toContain('live product_categories context fetched during this workflow run');
    expect(promptTemplate).toContain('bundle.categoryContext.allowedLeafLabels');
  });

  it('fully replaces partially-upgraded default normalize graphs whose provenance is current but node ids never migrated', () => {
    const canonical = materializeStarterWorkflowPathConfig(
      getStarterWorkflowTemplateByIdOrThrow('starter_product_name_normalize'),
      {
        pathId: 'path_name_normalize_v1',
        seededDefault: true,
      }
    );

    const partiallyUpgraded: PathConfig = {
      ...canonical,
      nodes: (canonical.nodes ?? []).map((node, index) => ({
        ...node,
        id: `node-normalize-current-${index + 1}`,
      })),
      edges: (canonical.edges ?? []).map((edge, index) => {
        const fromIndex = (canonical.nodes ?? []).findIndex((node) => node.id === edge.from);
        const toIndex = (canonical.nodes ?? []).findIndex((node) => node.id === edge.to);
        return {
          ...edge,
          id: `edge-normalize-current-${index + 1}`,
          from: fromIndex >= 0 ? `node-normalize-current-${fromIndex + 1}` : edge.from,
          to: toIndex >= 0 ? `node-normalize-current-${toIndex + 1}` : edge.to,
        };
      }),
      extensions: {
        aiPathsStarter: {
          starterKey: 'product_name_normalize',
          templateId: 'starter_product_name_normalize',
          templateVersion: 6,
          seededDefault: true,
        },
      },
    };

    const upgraded = upgradeStarterWorkflowPathConfig(partiallyUpgraded);

    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(upgraded.changed).toBe(true);
    expect(hasNodeId(upgraded.config, 'node-prompt-name-normalize')).toBe(true);
    expect(hasNodeId(upgraded.config, 'node-update-name-normalize')).toBe(true);
  });

  it('preserves an explicit Normalize model selection while overlaying stale starter assets', () => {
    const canonical = materializeStarterWorkflowPathConfig(
      getStarterWorkflowTemplateByIdOrThrow('starter_product_name_normalize'),
      {
        pathId: 'path_name_normalize_v1',
        seededDefault: true,
      }
    );

    const staleConfig: PathConfig = {
      ...canonical,
      nodes: (canonical.nodes ?? []).map((node) => {
        if (node.id !== 'node-model-name-normalize') return node;
        return {
          ...node,
          config: {
            ...node.config,
            model: {
              ...node.config?.model,
              modelId: 'ollama:gemma3',
            },
          },
        };
      }),
      extensions: {
        aiPathsStarter: {
          starterKey: 'product_name_normalize',
          templateId: 'starter_product_name_normalize',
          templateVersion: 4,
          seededDefault: true,
        },
      },
    };

    const upgraded = upgradeStarterWorkflowPathConfig(staleConfig);
    const modelNode = (upgraded.config.nodes ?? []).find(
      (node) => node.id === 'node-model-name-normalize'
    );

    expect(upgraded.changed).toBe(true);
    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(modelNode?.config?.model?.modelId).toBe('ollama:gemma3');
    expect(modelNode?.config?.model).toEqual(
      expect.objectContaining({
        temperature: expect.any(Number),
        maxTokens: expect.any(Number),
        vision: expect.any(Boolean),
      })
    );
  });

  it('preserves edited Normalize model settings while overlaying stale starter assets', () => {
    const canonical = materializeStarterWorkflowPathConfig(
      getStarterWorkflowTemplateByIdOrThrow('starter_product_name_normalize'),
      {
        pathId: 'path_name_normalize_v1',
        seededDefault: true,
      }
    );

    const staleConfig: PathConfig = {
      ...canonical,
      nodes: (canonical.nodes ?? []).map((node) => {
        if (node.id !== 'node-model-name-normalize') return node;
        return {
          ...node,
          config: {
            ...node.config,
            model: {
              ...node.config?.model,
              temperature: 0.35,
              maxTokens: 1337,
              systemPrompt: 'Only return normalized output.',
              waitForResult: false,
            },
          },
        };
      }),
      extensions: {
        aiPathsStarter: {
          starterKey: 'product_name_normalize',
          templateId: 'starter_product_name_normalize',
          templateVersion: 4,
          seededDefault: true,
        },
      },
    };

    const upgraded = upgradeStarterWorkflowPathConfig(staleConfig);
    const modelNode = (upgraded.config.nodes ?? []).find(
      (node) => node.id === 'node-model-name-normalize'
    );

    expect(upgraded.changed).toBe(true);
    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(modelNode?.config?.model).toEqual(
      expect.objectContaining({
        temperature: 0.35,
        maxTokens: 1337,
        systemPrompt: 'Only return normalized output.',
        waitForResult: false,
      })
    );
  });

  it('preserves edited Normalize prompt and fetcher settings while overlaying stale starter assets', () => {
    const canonical = materializeStarterWorkflowPathConfig(
      getStarterWorkflowTemplateByIdOrThrow('starter_product_name_normalize'),
      {
        pathId: 'path_name_normalize_v1',
        seededDefault: true,
      }
    );

    const staleConfig: PathConfig = {
      ...canonical,
      nodes: (canonical.nodes ?? []).map((node) => {
        if (node.id === 'node-fetcher-name-normalize') {
          return {
            ...node,
            config: {
              ...node.config,
              fetcher: {
                ...node.config?.fetcher,
                sourceMode: 'simulation_id',
                entityId: 'prod_custom_123',
                productId: 'prod_custom_123',
              },
            },
          };
        }
        if (node.id === 'node-prompt-name-normalize') {
          return {
            ...node,
            config: {
              ...node.config,
              prompt: {
                ...node.config?.prompt,
                template:
                  'Custom normalize prompt.\nReturn JSON with {"normalizedName":"","validationError":""}.',
              },
            },
          };
        }
        return node;
      }),
      extensions: {
        aiPathsStarter: {
          starterKey: 'product_name_normalize',
          templateId: 'starter_product_name_normalize',
          templateVersion: 4,
          seededDefault: true,
        },
      },
    };

    const upgraded = upgradeStarterWorkflowPathConfig(staleConfig);
    const fetcherNode = (upgraded.config.nodes ?? []).find(
      (node) => node.id === 'node-fetcher-name-normalize'
    );
    const promptNode = (upgraded.config.nodes ?? []).find(
      (node) => node.id === 'node-prompt-name-normalize'
    );

    expect(upgraded.changed).toBe(true);
    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(fetcherNode?.config?.fetcher).toEqual(
      expect.objectContaining({
        sourceMode: 'simulation_id',
        entityId: 'prod_custom_123',
        productId: 'prod_custom_123',
      })
    );
    expect(fetcherNode?.config?.runtime?.inputContracts?.trigger?.required).toBe(true);
    expect(promptNode?.config?.prompt?.template).toBe(
      'Custom normalize prompt.\nReturn JSON with {"normalizedName":"","validationError":""}.'
    );
  });

  it('preserves an explicit Normalize model selection while fully replacing legacy random-id graphs', () => {
    const canonical = materializeStarterWorkflowPathConfig(
      getStarterWorkflowTemplateByIdOrThrow('starter_product_name_normalize'),
      {
        pathId: 'path_name_normalize_v1',
        seededDefault: true,
      }
    );

    const legacyRandomIdConfig: PathConfig = {
      ...canonical,
      nodes: (canonical.nodes ?? []).map((node, index) => {
        const randomId = `node-normalize-model-legacy-${index + 1}`;
        if (node.type !== 'model') {
          return {
            ...node,
            id: randomId,
          };
        }
        return {
          ...node,
          id: randomId,
          config: {
            ...node.config,
            model: {
              ...node.config?.model,
              modelId: 'ollama:gemma3',
            },
          },
        };
      }),
      edges: (canonical.edges ?? []).map((edge, index) => {
        const fromIndex = (canonical.nodes ?? []).findIndex((node) => node.id === edge.from);
        const toIndex = (canonical.nodes ?? []).findIndex((node) => node.id === edge.to);
        return {
          ...edge,
          id: `edge-normalize-model-legacy-${index + 1}`,
          from: fromIndex >= 0 ? `node-normalize-model-legacy-${fromIndex + 1}` : edge.from,
          to: toIndex >= 0 ? `node-normalize-model-legacy-${toIndex + 1}` : edge.to,
        };
      }),
      extensions: undefined,
    };

    const upgraded = upgradeStarterWorkflowPathConfig(legacyRandomIdConfig);
    const modelNode = (upgraded.config.nodes ?? []).find(
      (node) => node.id === 'node-model-name-normalize'
    );

    expect(upgraded.changed).toBe(true);
    expect(upgraded.resolution?.matchedBy).toBe('legacy_alias');
    expect(modelNode?.config?.model?.modelId).toBe('ollama:gemma3');
  });

  it('upgrades stale normalize prompts to require the most specific terminal leaf category', () => {
    const canonical = materializeStarterWorkflowPathConfig(
      getStarterWorkflowTemplateByIdOrThrow('starter_product_name_normalize'),
      {
        pathId: 'path_name_normalize_v1',
        seededDefault: true,
      }
    );

    const staleConfig: PathConfig = {
      ...canonical,
      nodes: (canonical.nodes ?? []).map((node) => {
        if (node.id !== 'node-prompt-name-normalize') return node;
        return {
          ...node,
          config: {
            ...node.config,
            prompt: {
              ...node.config?.prompt,
              template:
                'You normalize English ecommerce product names into a strict parameterized format.\n' +
                'Use only evidence from the current product fields, images, and the Context Registry bundle supplied in the system context.\n' +
                'The Context Registry contains the authoritative leaf-category vocabulary for the active catalog selection. Some entries may include the full category hierarchy for disambiguation. Use that hierarchy only to identify the correct category. The final category field and normalizedName MUST use only the final leaf label, never the full hierarchy string, never a parent category, and never an invented category.\n',
            },
          },
        };
      }),
      extensions: {
        aiPathsStarter: {
          starterKey: 'product_name_normalize',
          templateId: 'starter_product_name_normalize',
          templateVersion: 4,
          seededDefault: true,
        },
      },
    };

    const upgraded = upgradeStarterWorkflowPathConfig(staleConfig);
    const promptNode = (upgraded.config.nodes ?? []).find(
      (node) => node.id === 'node-prompt-name-normalize'
    );
    const promptTemplate =
      typeof promptNode?.config?.prompt?.template === 'string'
        ? promptNode.config.prompt.template
        : '';

    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(upgraded.changed).toBe(true);
    expect(promptTemplate).toContain('live product_categories context fetched during this workflow run');
    expect(promptTemplate).toContain('bundle.categoryContext.leafCategories');
    expect(promptTemplate).toContain('Category context unavailable');
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

  it('materializes a static recovery bundle that includes all canonical recoverable workflows', () => {
    const bundle = materializeStarterWorkflowRecoveryBundle('static_recovery');

    expect(bundle.pathConfigs.some((config) => config.id === 'path_descv3lite')).toBe(true);
    expect(bundle.pathConfigs.some((config) => config.id === 'path_name_normalize_v1')).toBe(true);
    expect(bundle.pathConfigs.some((config) => config.id === 'path_marketplace_copy_debrand_v1')).toBe(true);
    expect(bundle.pathConfigs.some((config) => config.id === 'path_96708d')).toBe(true);
    expect(bundle.triggerButtons.some((button) => button.id === '4c07d35b-ea92-4d1f-b86b-c586359f68de')).toBe(true);
    expect(bundle.triggerButtons.some((button) => button.id === '7d58d6a0-44c7-4d69-a2e4-8d8d1f3f5a27')).toBe(true);
    expect(bundle.triggerButtons.some((button) => button.id === 'bdf0f5d2-a300-4f79-991c-2b5f1e0ef3a4')).toBe(true);
  });

  it('decouples starter upgrade scope from auto-seed policy', () => {
    const normalize = getStarterWorkflowTemplateByIdOrThrow('starter_product_name_normalize');
    const description = getStarterWorkflowTemplateByIdOrThrow('starter_description_inference_lite');
    const translation = getStarterWorkflowTemplateByIdOrThrow('starter_translation_en_pl');

    expect(normalize.seedPolicy?.autoSeed).toBe(true);
    expect(description.seedPolicy?.autoSeed).toBe(true);
    expect(translation.seedPolicy?.autoSeed).toBe(false);
    expect(normalize.upgradePolicy?.versionedOverlayScope).toBe('any_provenance_path');
    expect(description.upgradePolicy?.versionedOverlayScope).toBe('any_provenance_path');
    expect(translation.upgradePolicy?.versionedOverlayScope).toBe('any_provenance_path');
  });

  it('auto-seeds shipped trigger-backed starter workflows with canonical default path ids', () => {
    const triggerBackedDefaultEntries = STARTER_WORKFLOW_REGISTRY.filter(
      (entry) =>
        (entry.triggerButtonPresets?.length ?? 0) > 0 &&
        typeof entry.seedPolicy?.defaultPathId === 'string' &&
        entry.seedPolicy.defaultPathId.trim().length > 0
    );

    expect(triggerBackedDefaultEntries.length).toBeGreaterThan(0);
    const autoSeedTemplateIds = triggerBackedDefaultEntries
      .filter((entry) => entry.seedPolicy?.autoSeed === true)
      .map((entry) => entry.templateId);

    expect(autoSeedTemplateIds).toEqual(
      expect.arrayContaining([
        'starter_parameter_inference',
        'starter_product_name_normalize',
        'starter_description_inference_lite',
        'starter_marketplace_copy_debrand',
        'starter_base_export_blwo',
      ])
    );
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

  it('fully replaces stale provenance translation configs and prunes stale edge wiring', () => {
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
    const paramsRegexNode = (upgraded.config.nodes ?? []).find(
      (node) => node.id === 'node-regex-params-translate-en-pl'
    );
    const extraParamsEdge = (upgraded.config.edges ?? []).find(
      (edge) => edge.id === 'edge-params'
    );
    const canonicalParamsEdge = (upgraded.config.edges ?? []).find(
      (edge) => edge.id === 'edge-params-update-translate-en-pl'
    );

    expect(upgraded.changed).toBe(true);
    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(dbNode?.config?.database?.writeOutcomePolicy?.onZeroAffected).toBe('pass');
    expect(paramsRegexNode).toBeDefined();
    expect(extraParamsEdge).toBeUndefined();
    expect(canonicalParamsEdge?.toPort).toBe('result');
  });

  it('overlays stale provenance marketplace copy debrand configs and upgrades the database node targeting', () => {
    const canonical = materializeStarterWorkflowPathConfig(
      getStarterWorkflowTemplateByIdOrThrow('starter_marketplace_copy_debrand'),
      {
        pathId: 'path_marketplace_copy_debrand_v1',
        seededDefault: true,
      }
    );
    const stale = {
      ...canonical,
      version: 3,
      nodes: canonical.nodes.map((node) => {
        if (node.id !== 'node-db-update-marketplace-copy-debrand') return node;
        return {
          ...node,
          config: {
            ...node.config,
            database: {
              ...node.config?.database,
              updateTemplate:
                '{\n  "$set": {\n    "marketplaceContentOverrides.{{context.marketplaceCopyDebrandInput.targetRow.index}}.title": "{{value.debrandedTitle}}",\n    "marketplaceContentOverrides.{{context.marketplaceCopyDebrandInput.targetRow.index}}.description": "{{value.debrandedDescription}}"\n  },\n  "$unset": {\n    "__noop__": ""\n  }\n}',
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
              writeOutcomePolicy: {
                onZeroAffected: 'pass' as const,
              },
            },
          },
        };
      }),
      extensions: {
        aiPathsStarter: {
          starterKey: 'marketplace_copy_debrand',
          templateId: 'starter_marketplace_copy_debrand',
          templateVersion: 3,
          seededDefault: true,
        },
      },
    } as PathConfig;

    const upgraded = upgradeStarterWorkflowPathConfig(stale);
    const dbNode = (upgraded.config.nodes ?? []).find(
      (node) => node.id === 'node-db-update-marketplace-copy-debrand'
    );

    expect(upgraded.changed).toBe(true);
    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(dbNode?.config?.database?.writeOutcomePolicy?.onZeroAffected).toBe('fail');
    expect(dbNode?.config?.database?.updateTemplate).toContain('marketplaceContentOverrides.$.title');
    expect(dbNode?.config?.database?.query?.queryTemplate).toContain('"$elemMatch"');
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
    expect(databaseNode?.config?.database).toEqual(
      expect.objectContaining({
        updatePayloadMode: 'custom',
        updateTemplate: expect.stringContaining('{{value.description_pl}}'),
        skipEmpty: true,
        trimStrings: true,
        localizedParameterMerge: expect.objectContaining({
          enabled: true,
          targetPath: 'parameters',
          languageCode: 'pl',
          requireFullCoverage: false,
        }),
      })
    );
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
