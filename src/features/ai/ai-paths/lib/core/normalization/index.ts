import type {
  AiNode,
  NodeConfig,
  NodeType,
  DatabaseConfig,
  DbQueryConfig,
} from '@/shared/types/domain/ai-paths';

import {
  AGENT_INPUT_PORTS,
  AGENT_OUTPUT_PORTS,
  CONTEXT_INPUT_PORTS,
  CONTEXT_OUTPUT_PORTS,
  DATABASE_INPUT_PORTS,
  DEFAULT_CONTEXT_ROLE,
  DEFAULT_DB_QUERY,
  DEFAULT_MODELS,
  DELAY_INPUT_PORTS,
  DELAY_OUTPUT_PORTS,
  DESCRIPTION_OUTPUT_PORTS,
  HTTP_INPUT_PORTS,
  MODEL_OUTPUT_PORTS,
  PARSER_PRESETS,
  POLL_INPUT_PORTS,
  POLL_OUTPUT_PORTS,
  PROMPT_INPUT_PORTS,
  PROMPT_OUTPUT_PORTS,
  REGEX_INPUT_PORTS,
  REGEX_OUTPUT_PORTS,
  STRING_MUTATOR_INPUT_PORTS,
  STRING_MUTATOR_OUTPUT_PORTS,
  VALIDATION_PATTERN_INPUT_PORTS,
  VALIDATION_PATTERN_OUTPUT_PORTS,
  ITERATOR_INPUT_PORTS,
  ITERATOR_OUTPUT_PORTS,
  ROUTER_INPUT_PORTS,
  ROUTER_OUTPUT_PORTS,
  SIMULATION_INPUT_PORTS,
  SIMULATION_OUTPUT_PORTS,
  TRIGGER_EVENTS,
  TRIGGER_INPUT_PORTS,
  TRIGGER_OUTPUT_PORTS,
  VIEWER_INPUT_PORTS,
} from '../constants';
import { createParserMappings, createViewerOutputs, ensureUniquePorts, normalizePortName } from '../utils';

const DEFAULT_LEGACY_DB_QUERY_TEMPLATE = '{\n  "_id": "{{value}}"\n}';

export const normalizeTemplateText = (value: string | undefined | null): string => {
  if (typeof value !== 'string') return '';
  if (!value.includes('\\n') || value.includes('\n')) return value;
  const trimmed = value.trim();
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return value;
  return value.replace(/\\n/g, '\n');
};

const isLegacyDefaultMongoQuery = (query: DbQueryConfig): boolean =>
  query.provider === 'mongodb' &&
  query.collection === 'products' &&
  query.mode === 'preset' &&
  query.preset === 'by_id' &&
  query.field === '_id' &&
  query.idType === 'string' &&
  query.queryTemplate === DEFAULT_LEGACY_DB_QUERY_TEMPLATE &&
  query.limit === 20 &&
  query.sort === '' &&
  query.projection === '' &&
  query.single === false;

const migrateLegacyDbQueryProvider = (query: DbQueryConfig): DbQueryConfig => {
  const normalizedTemplate = normalizeTemplateText(query.queryTemplate ?? '');
  const provider = query.provider;
  if (provider === 'auto' || provider === 'mongodb' || provider === 'prisma') {
    if (isLegacyDefaultMongoQuery(query)) {
      return {
        ...query,
        provider: 'auto',
        queryTemplate: normalizedTemplate,
      };
    }
    return {
      ...query,
      queryTemplate: normalizedTemplate,
    };
  }
  return {
    ...query,
    provider: 'auto',
    queryTemplate: normalizedTemplate,
  };
};

export const normalizeNodes = (items: AiNode[]): AiNode[] =>
  items
    .map((node: AiNode): AiNode | null => {
      if (node.type === 'context') {
        const contextConfig = node.config?.context;
        const cleanedOutputs = (node.outputs ?? []).filter(
          (port: string): boolean => normalizePortName(port) !== 'role'
        );
        return {
          ...node,
          inputs: ensureUniquePorts(node.inputs ?? [], CONTEXT_INPUT_PORTS),
          outputs: ensureUniquePorts(cleanedOutputs, CONTEXT_OUTPUT_PORTS),
          config: {
            ...node.config,
            context: {
              role: contextConfig?.role ?? DEFAULT_CONTEXT_ROLE,
              entityType: contextConfig?.entityType ?? 'auto',
              entityIdSource: contextConfig?.entityIdSource ?? 'simulation',
              entityId: contextConfig?.entityId ?? '',
              scopeMode: contextConfig?.scopeMode ?? 'full',
              scopeTarget: contextConfig?.scopeTarget ?? 'entity',
              includePaths: contextConfig?.includePaths ?? [],
              excludePaths: contextConfig?.excludePaths ?? [],
            },
          },
        };
      }
      if (node.type === 'trigger') {
        return {
          ...node,
          inputs: TRIGGER_INPUT_PORTS,
          outputs: TRIGGER_OUTPUT_PORTS,
          config: {
            ...node.config,
            trigger: {
              event: node.config?.trigger?.event ?? TRIGGER_EVENTS[0]?.id ?? 'manual',
            },
          },
        };
      }
      if (node.type === 'simulation') {
        const simulationConfig = node.config?.simulation;
        const rawEntityId = simulationConfig?.entityId ?? '';
        return {
          ...node,
          inputs: SIMULATION_INPUT_PORTS,
          outputs: SIMULATION_OUTPUT_PORTS,
          config: {
            ...node.config,
            simulation: {
              productId: rawEntityId,
              entityType: simulationConfig?.entityType ?? 'product',
              entityId: rawEntityId,
            },
          },
        };
      }
      if (node.type === 'mapper') {
        const mapperConfig = node.config?.mapper;
        const outputs = 
        mapperConfig?.outputs && mapperConfig.outputs.length > 0
          ? mapperConfig.outputs
          : node.outputs.length > 0
            ? node.outputs
            : ['value', 'result'];
        return {
          ...node,
          inputs: ensureUniquePorts(node.inputs ?? [], ['context', 'result', 'bundle', 'value']),
          outputs,
          config: {
            ...node.config,
            mapper: {
              outputs,
              mappings: mapperConfig?.mappings ?? createParserMappings(outputs),
            },
          },
        };
      }
      if (node.type === 'parser') {
        const parserConfig = node.config?.parser;
        const baseMappings = 
        parserConfig?.mappings ??
        (node.outputs.length > 0 ? createParserMappings(node.outputs) : {});
        const mappingKeys = Object.keys(baseMappings)
          .map((key: string): string => key.trim())
          .filter(Boolean);
        const outputsFromMappings = mappingKeys.length > 0 ? mappingKeys : node.outputs;
        const outputMode = parserConfig?.outputMode ?? 'individual';
        const hasImagesOutput = outputsFromMappings.some(
          (key: string): boolean => key.toLowerCase() === 'images'
        );
        const outputs = 
        outputMode === 'bundle'
          ? ['bundle', ...(hasImagesOutput ? ['images'] : [])]
          : outputsFromMappings;
        return {
          ...node,
          outputs,
          config: {
            ...node.config,
            parser: {
              mappings: baseMappings,
              outputMode,
              presetId: parserConfig?.presetId ?? PARSER_PRESETS[0]?.id ?? 'custom',
            },
          },
        };
      }
      if (node.type === 'regex') {
        const config = node.config?.regex;
        return {
          ...node,
          inputs: ensureUniquePorts(node.inputs ?? [], REGEX_INPUT_PORTS),
          outputs: ensureUniquePorts(node.outputs ?? [], REGEX_OUTPUT_PORTS),
          config: {
            ...node.config,
            regex: {
              pattern: config?.pattern ?? '',
              flags: config?.flags ?? 'g',
              mode: config?.mode ?? 'group',
              matchMode: config?.matchMode ?? 'first',
              groupBy: config?.groupBy ?? 'match',
              outputMode: config?.outputMode ?? 'object',
              includeUnmatched: config?.includeUnmatched ?? true,
              unmatchedKey: config?.unmatchedKey ?? '__unmatched__',
              splitLines: config?.splitLines ?? true,
              sampleText: config?.sampleText ?? '',
              aiPrompt: config?.aiPrompt ?? '',
              aiAutoRun: config?.aiAutoRun ?? false,
              activeVariant: config?.activeVariant ?? 'manual',
              ...(config?.manual ? { manual: config.manual } : {}),
              ...(config?.aiProposal ? { aiProposal: config.aiProposal } : {}),
              ...(config?.aiProposals ? { aiProposals: config.aiProposals } : {}),
            },
          },
        };
      }
      if (node.type === 'iterator') {
        const config = node.config?.iterator;
        return {
          ...node,
          inputs: ensureUniquePorts(node.inputs ?? [], ITERATOR_INPUT_PORTS),
          outputs: ensureUniquePorts(node.outputs ?? [], ITERATOR_OUTPUT_PORTS),
          config: {
            ...node.config,
            iterator: {
              autoContinue: config?.autoContinue ?? true,
              maxSteps: config?.maxSteps ?? 50,
            },
          },
        };
      }
      if (node.type === 'mutator') {
        return {
          ...node,
          config: {
            ...node.config,
            mutator: {
              path: node.config?.mutator?.path ?? 'entity.title',
              valueTemplate: node.config?.mutator?.valueTemplate ?? '{{value}}',
            },
          },
        };
      }
      if (node.type === 'string_mutator') {
        const operations = node.config?.stringMutator?.operations;
        return {
          ...node,
          inputs: ensureUniquePorts(node.inputs ?? [], STRING_MUTATOR_INPUT_PORTS),
          outputs: ensureUniquePorts(node.outputs ?? [], STRING_MUTATOR_OUTPUT_PORTS),
          config: {
            ...node.config,
            stringMutator: {
              operations: Array.isArray(operations) ? operations : [],
            },
          },
        };
      }
      if (node.type === 'validator') {
        return {
          ...node,
          config: {
            ...node.config,
            validator: {
              requiredPaths: node.config?.validator?.requiredPaths ?? ['entity.id'],
              mode: node.config?.validator?.mode ?? 'all',
            },
          },
        };
      }
      if (node.type === 'validation_pattern') {
        const config = node.config?.validationPattern;
        return {
          ...node,
          inputs: ensureUniquePorts(node.inputs ?? [], VALIDATION_PATTERN_INPUT_PORTS),
          outputs: ensureUniquePorts(node.outputs ?? [], VALIDATION_PATTERN_OUTPUT_PORTS),
          config: {
            ...node.config,
            validationPattern: {
              source: config?.source ?? 'global_stack',
              stackId: config?.stackId ?? '',
              scope: config?.scope ?? 'global',
              includeLearnedRules: config?.includeLearnedRules ?? true,
              runtimeMode: config?.runtimeMode ?? 'validate_only',
              failPolicy: config?.failPolicy ?? 'block_on_error',
              inputPort: config?.inputPort ?? 'auto',
              outputPort: config?.outputPort ?? 'value',
              maxAutofixPasses:
                typeof config?.maxAutofixPasses === 'number' &&
                Number.isFinite(config.maxAutofixPasses)
                  ? Math.max(1, Math.min(10, Math.trunc(config.maxAutofixPasses)))
                  : 1,
              includeRuleIds: config?.includeRuleIds ?? [],
              localListName: config?.localListName ?? 'Path Local Validation List',
              localListDescription: config?.localListDescription ?? '',
              rules: Array.isArray(config?.rules) ? config.rules : [],
              learnedRules: Array.isArray(config?.learnedRules)
                ? config.learnedRules
                : [],
            },
          },
        };
      }
      if (node.type === 'constant') {
        return {
          ...node,
          config: {
            ...node.config,
            constant: {
              valueType: node.config?.constant?.valueType ?? 'string',
              value: node.config?.constant?.value ?? '',
            },
          },
        };
      }
      if (node.type === 'math') {
        return {
          ...node,
          config: {
            ...node.config,
            math: {
              operation: node.config?.math?.operation ?? 'add',
              operand: node.config?.math?.operand ?? 0,
            },
          },
        };
      }
      if (node.type === 'template') {
        return {
          ...node,
          config: {
            ...node.config,
            template: {
              template:
              node.config?.template?.template ??
              'Write a summary for {{context.entity.title}}',
            },
          },
        };
      }
      if (node.type === 'bundle') {
        return {
          ...node,
          config: {
            ...node.config,
            bundle: {
              includePorts: node.config?.bundle?.includePorts ?? [],
            },
          },
        };
      }
      if (node.type === 'gate') {
        return {
          ...node,
          config: {
            ...node.config,
            gate: {
              mode: node.config?.gate?.mode ?? 'block',
              failMessage: node.config?.gate?.failMessage ?? 'Gate blocked',
            },
          },
        };
      }
      if (node.type === 'compare') {
        return {
          ...node,
          config: {
            ...node.config,
            compare: {
              operator: node.config?.compare?.operator ?? 'eq',
              compareTo: node.config?.compare?.compareTo ?? '',
              caseSensitive: node.config?.compare?.caseSensitive ?? false,
              message: node.config?.compare?.message ?? 'Comparison failed',
            },
          },
        };
      }
      if (node.type === 'router') {
        return {
          ...node,
          inputs: ensureUniquePorts(node.inputs, ROUTER_INPUT_PORTS),
          outputs: ensureUniquePorts(node.outputs, ROUTER_OUTPUT_PORTS),
          config: {
            ...node.config,
            router: {
              mode: node.config?.router?.mode ?? 'valid',
              matchMode: node.config?.router?.matchMode ?? 'truthy',
              compareTo: node.config?.router?.compareTo ?? '',
            },
          },
        };
      }
      if (node.type === 'delay') {
        return {
          ...node,
          inputs: ensureUniquePorts(node.inputs, DELAY_INPUT_PORTS),
          outputs: ensureUniquePorts(node.outputs, DELAY_OUTPUT_PORTS),
          config: {
            ...node.config,
            delay: {
              ms: node.config?.delay?.ms ?? 300,
            },
          },
        };
      }
      if (node.type === 'poll') {
        const pollConfig = node.config?.poll;
        const pollQuery = {
          ...DEFAULT_DB_QUERY,
          ...(pollConfig?.dbQuery ?? {}),
        };
        return {
          ...node,
          inputs: ensureUniquePorts(node.inputs, POLL_INPUT_PORTS),
          outputs: ensureUniquePorts(node.outputs, POLL_OUTPUT_PORTS),
          config: {
            ...node.config,
            poll: {
              intervalMs: pollConfig?.intervalMs ?? 2000,
              maxAttempts: pollConfig?.maxAttempts ?? 30,
              mode: pollConfig?.mode ?? 'job',
              dbQuery: pollQuery,
              successPath: pollConfig?.successPath ?? 'status',
              successOperator: pollConfig?.successOperator ?? 'equals',
              successValue: pollConfig?.successValue ?? 'completed',
              resultPath: pollConfig?.resultPath ?? 'result',
            },
          },
        };
      }
      if (node.type === 'http') {
        return {
          ...node,
          inputs: ensureUniquePorts(node.inputs, HTTP_INPUT_PORTS),
          outputs: ensureUniquePorts(node.outputs, ['value', 'bundle']),
          config: {
            ...node.config,
            http: {
              url: node.config?.http?.url ?? 'https://api.example.com',
              method: node.config?.http?.method ?? 'GET',
              headers:
              node.config?.http?.headers ?? '{\n  "Content-Type": "application/json"\n}',
              bodyTemplate: node.config?.http?.bodyTemplate ?? '',
              responseMode: node.config?.http?.responseMode ?? 'json',
              responsePath: node.config?.http?.responsePath ?? '',
            },
          },
        };
      }
      if (node.type === 'database') {
        const defaultQuery = {
          provider: 'auto' as const,
          collection: 'products',
          mode: 'preset' as const,
          preset: 'by_id' as const,
          field: '_id',
          idType: 'string' as const,
          queryTemplate: '{\n  "_id": "{{value}}"\n}',
          limit: 20,
          sort: '',
          projection: '',
          single: false,
        };
        const legacyDbQuery = (node.config as Record<string, unknown> | undefined)?.['dbQuery'];
        const queryConfig = {
          ...defaultQuery,
          ...(
            node.config?.database?.query ??
            (legacyDbQuery && typeof legacyDbQuery === 'object'
              ? (legacyDbQuery as Record<string, unknown>)
              : {})
          ),
        };
        const migratedQueryConfig = migrateLegacyDbQueryProvider(
          queryConfig as DbQueryConfig
        );
        const databaseConfig: DatabaseConfig = node.config?.database ?? { operation: 'query' };
        const mappings = 
        databaseConfig.mappings && databaseConfig.mappings.length > 0
          ? databaseConfig.mappings
          : [
            {
              targetPath: 'content_en',
              sourcePort: node.inputs.includes('result') ? 'result' : 'content_en',
            },
          ];
        const forcedInputs = ['result', 'content_en', 'productId', 'entityId'];
        const inferredUseMongoActions =
        databaseConfig.useMongoActions ??
        Boolean(databaseConfig.actionCategory || databaseConfig.action);
        const parameterInferenceGuard = databaseConfig.parameterInferenceGuard
          ? {
            enabled: databaseConfig.parameterInferenceGuard.enabled ?? false,
            targetPath: databaseConfig.parameterInferenceGuard.targetPath ?? 'parameters',
            definitionsPort: databaseConfig.parameterInferenceGuard.definitionsPort ?? 'result',
            definitionsPath: databaseConfig.parameterInferenceGuard.definitionsPath ?? '',
            enforceOptionLabels:
              databaseConfig.parameterInferenceGuard.enforceOptionLabels ?? true,
            allowUnknownParameterIds:
              databaseConfig.parameterInferenceGuard.allowUnknownParameterIds ?? false,
          }
          : undefined;
        const runtimeConfig = node.config?.runtime
          ? {
            ...node.config.runtime,
            ...(node.config.runtime.waitForInputs === undefined ? { waitForInputs: true } : {}),
          }
          : { waitForInputs: true };
        return {
          ...node,
          inputs: ensureUniquePorts(node.inputs, [...DATABASE_INPUT_PORTS, ...forcedInputs]),
          outputs: ensureUniquePorts(node.outputs, ['result', 'bundle', 'content_en', 'aiPrompt']),
          config: {
            ...node.config,
            ...(runtimeConfig ? { runtime: runtimeConfig } : {}),
            database: {
              ...databaseConfig,
              operation: databaseConfig.operation ?? 'query',
              entityType: databaseConfig.entityType ?? 'product',
              idField: databaseConfig.idField ?? 'entityId',
              mode: databaseConfig.mode ?? 'replace',
              updateStrategy: databaseConfig.updateStrategy ?? 'one',
              updatePayloadMode: databaseConfig.updatePayloadMode ?? 'mapping',
              useMongoActions: inferredUseMongoActions,
              ...(databaseConfig.actionCategory ? { actionCategory: databaseConfig.actionCategory } : {}),
              ...(databaseConfig.action ? { action: databaseConfig.action } : {}),
              distinctField: databaseConfig.distinctField ?? '',
              updateTemplate: normalizeTemplateText(databaseConfig.updateTemplate ?? ''),
              mappings,
              query: migratedQueryConfig,
              writeSource: databaseConfig.writeSource ?? 'bundle',
              writeSourcePath: databaseConfig.writeSourcePath ?? '',
              dryRun: databaseConfig.dryRun ?? false,
              ...(databaseConfig.presetId ? { presetId: databaseConfig.presetId } : {}),
              skipEmpty: databaseConfig.skipEmpty ?? false,
              trimStrings: databaseConfig.trimStrings ?? false,
              aiPrompt: databaseConfig.aiPrompt ?? '',
              validationRuleIds: databaseConfig.validationRuleIds ?? [],
              ...(parameterInferenceGuard
                ? { parameterInferenceGuard }
                : {}),
            },
          },
        };
      }
      if (node.type === 'db_schema') {
        const schemaConfig = node.config?.db_schema;
        return {
          ...node,
          config: {
            ...node.config,
            db_schema: {
              provider: schemaConfig?.provider ?? 'all',
              mode: schemaConfig?.mode ?? 'all',
              collections: schemaConfig?.collections ?? [],
              includeFields: schemaConfig?.includeFields ?? true,
              includeRelations: schemaConfig?.includeRelations ?? true,
              formatAs: schemaConfig?.formatAs ?? 'text',
            },
          },
        };
      }
      if (node.type === 'ai_description') {
        return {
          ...node,
          inputs: ensureUniquePorts(node.inputs, ['entityJson', 'images', 'title']),
          outputs: ensureUniquePorts(node.outputs, DESCRIPTION_OUTPUT_PORTS),
          config: {
            ...node.config,
            description: {
              visionOutputEnabled: node.config?.description?.visionOutputEnabled ?? true,
              generationOutputEnabled: node.config?.description?.generationOutputEnabled ?? true,
            },
          },
        };
      }
      if (node.type === 'description_updater') {
        return {
          ...node,
          outputs: ensureUniquePorts(node.outputs, ['description_en']),
        };
      }
      if (node.type === 'prompt') {
        return {
          ...node,
          inputs: ensureUniquePorts(node.inputs, PROMPT_INPUT_PORTS),
          outputs: ensureUniquePorts(node.outputs, PROMPT_OUTPUT_PORTS),
        };
      }
      if (node.type === 'model') {
        return {
          ...node,
          inputs: ensureUniquePorts(node.inputs, ['prompt', 'images', 'context']),
          outputs: ensureUniquePorts(node.outputs, MODEL_OUTPUT_PORTS),
          config: {
            ...node.config,
            model: {
              modelId: node.config?.model?.modelId ?? DEFAULT_MODELS[0] ?? 'gpt-4o',
              temperature: node.config?.model?.temperature ?? 0.7,
              maxTokens: node.config?.model?.maxTokens ?? 800,
              vision:
              node.config?.model?.vision ??
              node.inputs.includes('images'),
              ...(node.config?.model?.waitForResult !== undefined
                ? { waitForResult: node.config.model.waitForResult }
                : {}),
            },
          },
        };
      }
      if (node.type === 'agent') {
        const agentConfig = node.config?.agent;
        return {
          ...node,
          inputs: ensureUniquePorts(node.inputs, AGENT_INPUT_PORTS),
          outputs: ensureUniquePorts(node.outputs, AGENT_OUTPUT_PORTS),
          config: {
            ...node.config,
            agent: {
              personaId: agentConfig?.personaId ?? '',
              promptTemplate: agentConfig?.promptTemplate ?? '',
              waitForResult: agentConfig?.waitForResult ?? true,
            },
          },
        };
      }
      if (node.type === 'viewer') {
        const normalizedInputs = ensureUniquePorts(node.inputs, VIEWER_INPUT_PORTS);
        const existingOutputs = node.config?.viewer?.outputs;
        const outputs = existingOutputs ?? {
          ...createViewerOutputs(normalizedInputs),
        };
        return {
          ...node,
          inputs: normalizedInputs,
          config: {
            ...node.config,
            viewer: {
              outputs: {
                ...createViewerOutputs(normalizedInputs),
                ...outputs,
              },
              showImagesAsJson: node.config?.viewer?.showImagesAsJson ?? false,
            },
          },
        };
      }
      return node;
    })
    .filter((node: AiNode | null): node is AiNode => Boolean(node));

export const getDefaultConfigForType = (
  type: NodeType,
  outputs: string[],
  inputs: string[]
): NodeConfig | undefined => {
  if (type === 'trigger') {
    return { trigger: { event: TRIGGER_EVENTS[0]?.id ?? 'manual' } };
  }
  if (type === 'simulation') {
    return { simulation: { productId: '', entityType: 'product', entityId: '' } };
  }
  if (type === 'audio_oscillator') {
    return {
      audioOscillator: {
        waveform: 'sine',
        frequencyHz: 440,
        gain: 0.25,
        durationMs: 400,
      },
    };
  }
  if (type === 'audio_speaker') {
    return {
      audioSpeaker: {
        enabled: true,
        autoPlay: true,
        gain: 1,
        stopPrevious: true,
      },
    };
  }
  if (type === 'viewer') {
    return { viewer: { outputs: createViewerOutputs(inputs), showImagesAsJson: false } };
  }
  if (type === 'context') {
    return {
      context: {
        role: DEFAULT_CONTEXT_ROLE,
        entityType: 'auto',
        entityIdSource: 'simulation',
        entityId: '',
        scopeMode: 'full',
        includePaths: [],
        excludePaths: [],
      },
    };
  }
  if (type === 'mapper') {
    return {
      mapper: {
        outputs: outputs.length ? outputs : ['value'],
        mappings: createParserMappings(outputs.length ? outputs : ['value']),
      },
    };
  }
  if (type === 'mutator') {
    return {
      mutator: {
        path: 'entity.title',
        valueTemplate: '{{value}}',
      },
    };
  }
  if (type === 'string_mutator') {
    return {
      stringMutator: {
        operations: [],
      },
    };
  }
  if (type === 'validator') {
    return {
      validator: {
        requiredPaths: ['entity.id'],
        mode: 'all',
      },
    };
  }
  if (type === 'validation_pattern') {
    return {
      validationPattern: {
        source: 'global_stack',
        stackId: '',
        scope: 'global',
        includeLearnedRules: true,
        runtimeMode: 'validate_only',
        failPolicy: 'block_on_error',
        inputPort: 'auto',
        outputPort: 'value',
        maxAutofixPasses: 1,
        includeRuleIds: [],
        localListName: 'Path Local Validation List',
        localListDescription: '',
        rules: [],
        learnedRules: [],
      },
    };
  }
  if (type === 'constant') {
    return {
      constant: {
        valueType: 'string',
        value: '',
      },
    };
  }
  if (type === 'math') {
    return {
      math: {
        operation: 'add',
        operand: 0,
      },
    };
  }
  if (type === 'template') {
    return {
      template: {
        template: 'Write a summary for {{context.entity.title}}',
      },
    };
  }
  if (type === 'bundle') {
    return {
      bundle: {
        includePorts: [],
      },
    };
  }
  if (type === 'gate') {
    return {
      gate: {
        mode: 'block',
        failMessage: 'Gate blocked',
      },
    };
  }
  if (type === 'compare') {
    return {
      compare: {
        operator: 'eq',
        compareTo: '',
        caseSensitive: false,
        message: 'Comparison failed',
      },
    };
  }
  if (type === 'router') {
    return {
      router: {
        mode: 'valid',
        matchMode: 'truthy',
        compareTo: '',
      },
    };
  }
  if (type === 'delay') {
    return {
      delay: {
        ms: 300,
      },
    };
  }
  if (type === 'poll') {
    return {
      poll: {
        intervalMs: 2000,
        maxAttempts: 30,
        mode: 'job',
        dbQuery: { ...DEFAULT_DB_QUERY },
        successPath: 'status',
        successOperator: 'equals',
        successValue: 'completed',
        resultPath: 'result',
      },
    };
  }
  if (type === 'http') {
    return {
      http: {
        url: 'https://api.example.com',
        method: 'GET',
        headers: '{\n  "Content-Type": "application/json"\n}',
        bodyTemplate: '',
        responseMode: 'json',
        responsePath: '',
      },
    };
  }
  if (type === 'ai_description') {
    return {
      description: {
        visionOutputEnabled: true,
        generationOutputEnabled: true,
      },
    };
  }
  if (type === 'parser') {
    return {
      parser: {
        mappings: createParserMappings(outputs),
        outputMode: 'individual',
        presetId: PARSER_PRESETS[0]?.id ?? 'custom',
      },
    };
  }
  if (type === 'regex') {
    return {
      regex: {
        pattern: '',
        flags: 'g',
        mode: 'group',
        matchMode: 'first',
        groupBy: 'match',
        outputMode: 'object',
        includeUnmatched: true,
        unmatchedKey: '__unmatched__',
        splitLines: true,
        sampleText: '',
        aiPrompt: '',
        aiAutoRun: false,
        activeVariant: 'manual',
      },
    };
  }
  if (type === 'iterator') {
    return {
      iterator: {
        autoContinue: true,
        maxSteps: 50,
      },
    };
  }
  if (type === 'prompt') {
    return { prompt: { template: '' } };
  }
  if (type === 'model') {
    return {
      model: {
        modelId: DEFAULT_MODELS[0] ?? 'gpt-4o',
        temperature: 0.7,
        maxTokens: 800,
        vision: inputs.includes('images'),
        waitForResult: true,
      },
    };
  }
  if (type === 'agent') {
    return {
      agent: {
        personaId: '',
        promptTemplate: '',
        waitForResult: true,
      },
    };
  }
  if (type === 'database') {
    return {
      database: {
        operation: 'query',
        entityType: 'product',
        idField: 'entityId',
        mode: 'replace',
        updateStrategy: 'one',
        updatePayloadMode: 'mapping',
        useMongoActions: false,
        mappings: [
          {
            targetPath: 'content_en',
            sourcePort: inputs.includes('result') ? 'result' : 'content_en',
          },
        ],
        query: {
          provider: 'auto',
          collection: 'products',
          mode: 'preset',
          preset: 'by_id',
          field: '_id',
          idType: 'string',
          queryTemplate: '{\n  "_id": "{{value}}"\n}',
          limit: 20,
          sort: '',
          projection: '',
          single: false,
        },
        writeSource: 'bundle',
        writeSourcePath: '',
        dryRun: false,
      },
    };
  }
  if (type === 'db_schema') {
    return {
      db_schema: {
        provider: 'all',
        mode: 'all',
        collections: [],
        includeFields: true,
        includeRelations: true,
        formatAs: 'text',
      },
    };
  }
  return undefined;
};
