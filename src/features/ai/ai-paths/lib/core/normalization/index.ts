import type { AiNode, NodeConfig, NodeType, DatabaseConfig } from '@/shared/types/ai-paths';

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
import {
  createParserMappings,
  createViewerOutputs,
  ensureUniquePorts,
  normalizePortName,
} from '../utils';

type LegacyUpdaterConfig = {
  targetField?: string;
  mappings?: Array<{ 
    targetPath: string;
    sourcePort: string;
    sourcePath?: string;
  }>;
  entityType?: string;
  idField?: string;
  mode?: 'replace' | 'append';
};

export const normalizeNodes = (items: AiNode[]): AiNode[] =>
  items
    .map((node: AiNode): AiNode | null => {
      const nodeType: string = node.type as string;
      // Remove legacy node that is no longer supported/exposed.
      if (node.type === 'trigger' && node.title === 'Trigger: Path Generate Description') {
        return null;
      }
      if (node.type === 'context') {
        const contextConfig = node.config?.context;
        const cleanedOutputs = (node.outputs ?? []).filter(
          (port: string): boolean => normalizePortName(port) !== 'role'
        );
        return {
          ...node,
          title: node.title === 'Context Grabber' ? 'Context Filter' : node.title,
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
        const rawProductId = simulationConfig?.productId ?? '';
        const resolvedId = rawEntityId.trim() || rawProductId.trim() || '';
        return {
          ...node,
          inputs: SIMULATION_INPUT_PORTS,
          outputs: SIMULATION_OUTPUT_PORTS,
          config: {
            ...node.config,
            simulation: {
              productId: rawProductId || resolvedId,
              entityType: simulationConfig?.entityType ?? 'product',
              entityId: rawEntityId || resolvedId,
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
          provider: 'mongodb' as const,
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
        const queryConfig = {
          ...defaultQuery,
          ...(node.config?.database?.query ?? node.config?.dbQuery ?? {}),
        };
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
              useMongoActions: inferredUseMongoActions,
              ...(databaseConfig.actionCategory ? { actionCategory: databaseConfig.actionCategory } : {}),
              ...(databaseConfig.action ? { action: databaseConfig.action } : {}),
              distinctField: databaseConfig.distinctField ?? '',
              updateTemplate: databaseConfig.updateTemplate ?? '',
              mappings,
              query: queryConfig,
              writeSource: databaseConfig.writeSource ?? 'bundle',
              writeSourcePath: databaseConfig.writeSourcePath ?? '',
              dryRun: databaseConfig.dryRun ?? false,
              ...(databaseConfig.presetId ? { presetId: databaseConfig.presetId } : {}),
              skipEmpty: databaseConfig.skipEmpty ?? false,
              trimStrings: databaseConfig.trimStrings ?? false,
              aiPrompt: databaseConfig.aiPrompt ?? '',
              validationRuleIds: databaseConfig.validationRuleIds ?? [],
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
              mode: schemaConfig?.mode ?? 'all',
              collections: schemaConfig?.collections ?? [],
              includeFields: schemaConfig?.includeFields ?? true,
              includeRelations: schemaConfig?.includeRelations ?? true,
              formatAs: schemaConfig?.formatAs ?? 'text',
            },
          },
        };
      }
      if (nodeType === 'db_query') {
        const dbQuery = {
          provider: node.config?.dbQuery?.provider ?? 'auto',
          collection: node.config?.dbQuery?.collection ?? 'products',
          mode: node.config?.dbQuery?.mode ?? 'preset',
          preset: node.config?.dbQuery?.preset ?? 'by_id',
          field: node.config?.dbQuery?.field ?? '_id',
          idType: node.config?.dbQuery?.idType ?? 'string',
          queryTemplate:
          node.config?.dbQuery?.queryTemplate ?? '{\n  "_id": "{{value}}"\n}',
          limit: node.config?.dbQuery?.limit ?? 20,
          sort: node.config?.dbQuery?.sort ?? '',
          projection: node.config?.dbQuery?.projection ?? '',
          single: node.config?.dbQuery?.single ?? false,
        };
        const legacyDbConfig: DatabaseConfig = node.config?.database ?? { operation: 'query' };
        const inferredUseMongoActions =
        legacyDbConfig.useMongoActions ?? Boolean(legacyDbConfig.actionCategory || legacyDbConfig.action);
        const runtimeConfig = node.config?.runtime
          ? {
            ...node.config.runtime,
            ...(node.config.runtime.waitForInputs === undefined ? { waitForInputs: true } : {}),
          }
          : { waitForInputs: true };
        return {
          ...node,
          type: 'database',
          inputs: ensureUniquePorts(node.inputs, DATABASE_INPUT_PORTS),
          outputs: ensureUniquePorts(node.outputs, ['result', 'bundle', 'content_en', 'aiPrompt']),
          config: {
            ...node.config,
            ...(runtimeConfig ? { runtime: runtimeConfig } : {}),
            database: {
              operation: 'query',
              entityType: legacyDbConfig.entityType ?? 'product',
              idField: legacyDbConfig.idField ?? 'entityId',
              mode: legacyDbConfig.mode ?? 'replace',
              updateStrategy: legacyDbConfig.updateStrategy ?? 'one',
              useMongoActions: inferredUseMongoActions,
              ...(legacyDbConfig.actionCategory ? { actionCategory: legacyDbConfig.actionCategory } : {}),
              ...(legacyDbConfig.action ? { action: legacyDbConfig.action } : {}),
              distinctField: legacyDbConfig.distinctField ?? '',
              updateTemplate: legacyDbConfig.updateTemplate ?? '',
              mappings: legacyDbConfig.mappings ?? [],
              query: dbQuery,
              writeSource: legacyDbConfig.writeSource ?? 'bundle',
              writeSourcePath: legacyDbConfig.writeSourcePath ?? '',
              dryRun: legacyDbConfig.dryRun ?? false,
              ...(legacyDbConfig.presetId ? { presetId: legacyDbConfig.presetId } : {}),
              skipEmpty: legacyDbConfig.skipEmpty ?? false,
              trimStrings: legacyDbConfig.trimStrings ?? false,
              aiPrompt: legacyDbConfig.aiPrompt ?? '',
              validationRuleIds: legacyDbConfig.validationRuleIds ?? [],
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
      if (nodeType === 'updater') {
        const updaterConfig: LegacyUpdaterConfig =
        (node.config as { updater?: LegacyUpdaterConfig } | undefined)?.updater ?? {};
        const legacyTarget = updaterConfig.targetField ?? node.outputs[0] ?? 'content_en';
        const legacyMappings =
        updaterConfig.mappings && updaterConfig.mappings.length > 0
          ? updaterConfig.mappings
          : [
            {
              targetPath: legacyTarget,
              sourcePort: node.inputs.includes('result') ? 'result' : legacyTarget,
            },
          ];
        const defaultQuery = {
          provider: 'mongodb' as const,
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
        return {
          ...node,
          type: 'database',
          inputs: ensureUniquePorts(node.inputs, DATABASE_INPUT_PORTS),
          outputs: ensureUniquePorts(node.outputs, ['result', 'bundle', 'content_en', 'aiPrompt']),
          config: {
            ...node.config,
            database: {
              operation: 'update',
              entityType: updaterConfig.entityType ?? 'product',
              idField: updaterConfig.idField ?? 'productId',
              mode: updaterConfig.mode ?? 'replace',
              updateStrategy: 'one',
              mappings: legacyMappings,
              query: {
                ...defaultQuery,
                ...(node.config?.database?.query ?? {}),
              },
              writeSource: node.config?.database?.writeSource ?? 'bundle',
              writeSourcePath: node.config?.database?.writeSourcePath ?? '',
              dryRun: node.config?.database?.dryRun ?? false,
              skipEmpty: node.config?.database?.skipEmpty ?? false,
              trimStrings: node.config?.database?.trimStrings ?? false,
              aiPrompt: node.config?.database?.aiPrompt ?? '',
              validationRuleIds: node.config?.database?.validationRuleIds ?? [],
            },
          },
        };
      }
      if (node.type === 'viewer') {
        const normalizedInputs = ensureUniquePorts(node.inputs, VIEWER_INPUT_PORTS);
        const existingOutputs = node.config?.viewer?.outputs;
        const legacyOutput = 
        (node.config as { viewer?: { sampleOutput?: string } } | undefined)?.viewer
          ?.sampleOutput ?? '';
        const outputs = existingOutputs ?? {
          ...createViewerOutputs(normalizedInputs),
          ...(legacyOutput ? { result: legacyOutput } : {}),
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
  if (type === 'validator') {
    return {
      validator: {
        requiredPaths: ['entity.id'],
        mode: 'all',
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
