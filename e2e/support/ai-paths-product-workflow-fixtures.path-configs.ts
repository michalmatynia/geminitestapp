import { type AiNode, type PathConfig } from '@/shared/contracts/ai-paths';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';

import {
  parseAiNode,
  randomSuffix,
  type ProductParameterDefinitionRecord,
} from './ai-paths-product-workflow-fixtures.shared';

export const createDeterministicProductUpdatePathConfig = (args: {
  pathId: string;
  pathName: string;
  triggerEventId: string;
  updateField: 'description_pl' | 'description_de';
  expectedValue: string;
  timestamp: string;
  outcome?: 'success' | 'zero_affected_fail';
}): PathConfig => {
  const baseConfig = createDefaultPathConfig(args.pathId);
  const triggerNodeId = `node-trigger-${randomSuffix()}`;
  const constantNodeId = `node-constant-${randomSuffix()}`;
  const databaseNodeId = `node-database-${randomSuffix()}`;
  const shouldForceZeroAffected = args.outcome === 'zero_affected_fail';

  const nodes: AiNode[] = [
    parseAiNode({
      id: triggerNodeId,
      instanceId: triggerNodeId,
      type: 'trigger',
      title: 'Trigger',
      description: 'Playwright workflow trigger',
      position: { x: 80, y: 160 },
      data: {},
      inputs: [],
      outputs: ['trigger'],
      config: {
        trigger: {
          event: args.triggerEventId,
          contextMode: 'trigger_only',
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
    parseAiNode({
      id: constantNodeId,
      instanceId: constantNodeId,
      type: 'constant',
      title: 'Expected Update',
      description: 'Deterministic product mutation payload',
      position: { x: 360, y: 48 },
      data: {},
      inputs: ['trigger'],
      outputs: ['value'],
      config: {
        constant: {
          value: args.expectedValue,
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
    parseAiNode({
      id: databaseNodeId,
      instanceId: databaseNodeId,
      type: 'database',
      title: 'Update Product',
      description: 'Writes the deterministic localized field update back to the product',
      position: { x: 360, y: 220 },
      data: {},
      inputs: ['trigger', 'value'],
      outputs: ['result', 'bundle', 'query', 'queryMode', 'querySource'],
      config: {
        database: {
          operation: 'update',
          entityType: 'product',
          mode: 'replace',
          updatePayloadMode: 'custom',
          useMongoActions: true,
          actionCategory: 'update',
          action: 'updateOne',
          query: {
            provider: 'auto',
            collection: 'products',
            mode: 'custom',
            preset: 'by_id',
            field: 'id',
            idType: 'string',
            queryTemplate: shouldForceZeroAffected
              ? '{"id":"missing-{{entityId}}"}'
              : '{"id":"{{entityId}}"}',
            limit: 1,
            sort: '',
            projection: '',
            single: true,
          },
          updateTemplate: JSON.stringify(
            {
              $set: {
                [args.updateField]: '{{value}}',
              },
            },
            null,
            2
          ),
          writeOutcomePolicy: {
            onZeroAffected: 'fail',
          },
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
  ];

  return {
    ...baseConfig,
    name: args.pathName,
    description: shouldForceZeroAffected
      ? 'Playwright deterministic product workflow failure path'
      : 'Playwright deterministic product workflow success path',
    strictFlowMode: true,
    aiPathsValidation: { enabled: false },
    nodes,
    edges: [
      {
        id: `edge-trigger-constant-${randomSuffix()}`,
        from: triggerNodeId,
        to: constantNodeId,
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: `edge-trigger-database-${randomSuffix()}`,
        from: triggerNodeId,
        to: databaseNodeId,
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: `edge-constant-database-${randomSuffix()}`,
        from: constantNodeId,
        to: databaseNodeId,
        fromPort: 'value',
        toPort: 'value',
      },
    ],
    updatedAt: args.timestamp,
    runtimeState: { inputs: {}, outputs: {} },
    parserSamples: {},
    updaterSamples: {},
    lastRunAt: null,
    runCount: 0,
    uiState: {
      selectedNodeId: triggerNodeId,
      configOpen: false,
    },
  };
};

export const createDeterministicParameterTranslationPathConfig = (args: {
  pathId: string;
  pathName: string;
  triggerEventId: string;
  expectedDescriptionPl: string;
  translatedParameters: Array<{
    parameterId: string;
    value: string;
  }>;
  timestamp: string;
}): PathConfig => {
  const baseConfig = createDefaultPathConfig(args.pathId);
  const triggerNodeId = `node-trigger-${randomSuffix()}`;
  const descriptionNodeId = `node-description-${randomSuffix()}`;
  const descriptionRegexNodeId = `node-description-regex-${randomSuffix()}`;
  const parametersNodeId = `node-parameters-${randomSuffix()}`;
  const parametersRegexNodeId = `node-parameters-regex-${randomSuffix()}`;
  const databaseNodeId = `node-database-${randomSuffix()}`;

  const nodes: AiNode[] = [
    parseAiNode({
      id: triggerNodeId,
      instanceId: triggerNodeId,
      type: 'trigger',
      title: 'Trigger',
      description: 'Playwright translation workflow trigger',
      position: { x: 80, y: 220 },
      data: {},
      inputs: [],
      outputs: ['trigger'],
      config: {
        trigger: {
          event: args.triggerEventId,
          contextMode: 'trigger_only',
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
    parseAiNode({
      id: descriptionNodeId,
      instanceId: descriptionNodeId,
      type: 'constant',
      title: 'Translated Description',
      description: 'Deterministic Polish description payload',
      position: { x: 360, y: 84 },
      data: {},
      inputs: ['trigger'],
      outputs: ['value'],
      config: {
        constant: {
          value: JSON.stringify(
            {
              description_pl: args.expectedDescriptionPl,
            },
            null,
            2
          ),
          valueType: 'json',
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
    parseAiNode({
      id: descriptionRegexNodeId,
      instanceId: descriptionRegexNodeId,
      type: 'regex',
      title: 'Parse Description JSON',
      description: 'Parse deterministic Polish description payload',
      position: { x: 520, y: 84 },
      data: {},
      inputs: ['value', 'prompt', 'regexCallback'],
      outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
      config: {
        regex: {
          pattern: '\\{[\\s\\S]*\\}',
          flags: '',
          mode: 'extract_json',
          matchMode: 'first_overall',
          groupBy: 'match',
          outputMode: 'object',
          includeUnmatched: false,
          unmatchedKey: '__unmatched__',
          splitLines: false,
          sampleText: '',
          aiPrompt: '',
          aiAutoRun: false,
          activeVariant: 'manual',
          jsonIntegrityPolicy: 'repair',
        },
        runtime: {
          waitForInputs: true,
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
    parseAiNode({
      id: parametersNodeId,
      instanceId: parametersNodeId,
      type: 'constant',
      title: 'Translated Parameters',
      description: 'Deterministic translated parameter payload',
      position: { x: 360, y: 276 },
      data: {},
      inputs: ['trigger'],
      outputs: ['value'],
      config: {
        constant: {
          value: JSON.stringify(
            {
              parameters: args.translatedParameters,
            },
            null,
            2
          ),
          valueType: 'json',
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
    parseAiNode({
      id: parametersRegexNodeId,
      instanceId: parametersRegexNodeId,
      type: 'regex',
      title: 'Parse Parameters JSON',
      description: 'Parse deterministic translated parameters payload',
      position: { x: 520, y: 276 },
      data: {},
      inputs: ['value', 'prompt', 'regexCallback'],
      outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
      config: {
        regex: {
          pattern: '\\{[\\s\\S]*\\}',
          flags: '',
          mode: 'extract_json',
          matchMode: 'first_overall',
          groupBy: 'match',
          outputMode: 'object',
          includeUnmatched: false,
          unmatchedKey: '__unmatched__',
          splitLines: false,
          sampleText: '',
          aiPrompt: '',
          aiAutoRun: false,
          activeVariant: 'manual',
          jsonIntegrityPolicy: 'repair',
        },
        runtime: {
          waitForInputs: true,
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
    parseAiNode({
      id: databaseNodeId,
      instanceId: databaseNodeId,
      type: 'database',
      title: 'Persist Translation',
      description: 'Writes translated description and merged parameter languages back to the product',
      position: { x: 700, y: 220 },
      data: {},
      inputs: ['trigger', 'value', 'result'],
      outputs: ['result', 'bundle', 'query', 'queryMode', 'querySource'],
      config: {
        database: {
          operation: 'update',
          entityType: 'product',
          mode: 'replace',
          updatePayloadMode: 'custom',
          useMongoActions: true,
          actionCategory: 'update',
          action: 'updateOne',
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
          updateTemplate:
            '{\n' +
            '  "$set": {\n' +
            '    "description_pl": "{{value.description_pl}}",\n' +
            '    "parameters": {{result.parameters}}\n' +
            '  },\n' +
            '  "$unset": {\n' +
            '    "__noop__": ""\n' +
            '  }\n' +
            '}',
          mappings: [
            {
              sourcePort: 'value',
              sourcePath: 'description_pl',
              targetPath: 'description_pl',
            },
            {
              sourcePort: 'result',
              sourcePath: 'parameters',
              targetPath: 'parameters',
            },
          ],
          writeOutcomePolicy: {
            onZeroAffected: 'fail',
          },
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
  ];

  return {
    ...baseConfig,
    name: args.pathName,
    description: 'Playwright deterministic translation parameter merge workflow',
    strictFlowMode: true,
    aiPathsValidation: { enabled: false },
    nodes,
    edges: [
      {
        id: `edge-trigger-description-${randomSuffix()}`,
        from: triggerNodeId,
        to: descriptionNodeId,
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: `edge-description-regex-${randomSuffix()}`,
        from: descriptionNodeId,
        to: descriptionRegexNodeId,
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: `edge-trigger-parameters-${randomSuffix()}`,
        from: triggerNodeId,
        to: parametersNodeId,
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: `edge-parameters-regex-${randomSuffix()}`,
        from: parametersNodeId,
        to: parametersRegexNodeId,
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: `edge-trigger-database-${randomSuffix()}`,
        from: triggerNodeId,
        to: databaseNodeId,
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: `edge-description-database-${randomSuffix()}`,
        from: descriptionRegexNodeId,
        to: databaseNodeId,
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: `edge-parameters-database-${randomSuffix()}`,
        from: parametersRegexNodeId,
        to: databaseNodeId,
        fromPort: 'value',
        toPort: 'result',
      },
    ],
    updatedAt: args.timestamp,
    runtimeState: { inputs: {}, outputs: {} },
    parserSamples: {},
    updaterSamples: {},
    lastRunAt: null,
    runCount: 0,
    uiState: {
      selectedNodeId: triggerNodeId,
      configOpen: false,
    },
  };
};

export const createDeterministicParameterInferencePathConfig = (args: {
  pathId: string;
  pathName: string;
  triggerEventId: string;
  parameterDefinitions: ProductParameterDefinitionRecord[];
  inferredParameters: Array<{
    parameterId: string;
    value: string;
  }>;
  timestamp: string;
}): PathConfig => {
  const baseConfig = createDefaultPathConfig(args.pathId);
  const triggerNodeId = `node-trigger-${randomSuffix()}`;
  const definitionsNodeId = `node-definitions-${randomSuffix()}`;
  const parametersNodeId = `node-parameters-${randomSuffix()}`;
  const parametersRegexNodeId = `node-parameters-regex-${randomSuffix()}`;
  const databaseNodeId = `node-database-${randomSuffix()}`;

  const nodes: AiNode[] = [
    parseAiNode({
      id: triggerNodeId,
      instanceId: triggerNodeId,
      type: 'trigger',
      title: 'Trigger',
      description: 'Playwright parameter inference trigger',
      position: { x: 80, y: 220 },
      data: {},
      inputs: [],
      outputs: ['trigger'],
      config: {
        trigger: {
          event: args.triggerEventId,
          contextMode: 'trigger_only',
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
    parseAiNode({
      id: definitionsNodeId,
      instanceId: definitionsNodeId,
      type: 'constant',
      title: 'Parameter Definitions',
      description: 'Deterministic parameter definition payload',
      position: { x: 360, y: 276 },
      data: {},
      inputs: ['trigger'],
      outputs: ['value'],
      config: {
        constant: {
          value: JSON.stringify(
            args.parameterDefinitions.map((definition) => ({
              id: definition.id,
              catalogId: definition.catalogId,
              name_en: definition.name_en ?? null,
              selectorType: definition.selectorType ?? 'text',
              optionLabels: definition.optionLabels ?? [],
            })),
            null,
            2
          ),
          valueType: 'json',
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
    parseAiNode({
      id: parametersNodeId,
      instanceId: parametersNodeId,
      type: 'constant',
      title: 'Inferred Parameters',
      description: 'Deterministic inferred parameter payload',
      position: { x: 360, y: 84 },
      data: {},
      inputs: ['trigger'],
      outputs: ['value'],
      config: {
        constant: {
          value: JSON.stringify(
            {
              parameters: args.inferredParameters,
            },
            null,
            2
          ),
          valueType: 'json',
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
    parseAiNode({
      id: parametersRegexNodeId,
      instanceId: parametersRegexNodeId,
      type: 'regex',
      title: 'Parse Inference JSON',
      description: 'Parse deterministic inferred parameters payload',
      position: { x: 540, y: 84 },
      data: {},
      inputs: ['value', 'prompt', 'regexCallback'],
      outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
      config: {
        regex: {
          pattern: '\\{[\\s\\S]*\\}',
          flags: '',
          mode: 'extract_json',
          matchMode: 'first_overall',
          groupBy: 'match',
          outputMode: 'object',
          includeUnmatched: false,
          unmatchedKey: '__unmatched__',
          splitLines: false,
          sampleText: '',
          aiPrompt: '',
          aiAutoRun: false,
          activeVariant: 'manual',
          jsonIntegrityPolicy: 'repair',
        },
        runtime: {
          waitForInputs: true,
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
    parseAiNode({
      id: databaseNodeId,
      instanceId: databaseNodeId,
      type: 'database',
      title: 'Persist Inferred Parameters',
      description: 'Writes merged inferred parameters back to the product',
      position: { x: 760, y: 220 },
      data: {},
      inputs: ['trigger', 'value', 'result'],
      outputs: ['result', 'bundle', 'query', 'queryMode', 'querySource'],
      config: {
        database: {
          operation: 'update',
          entityType: 'product',
          mode: 'replace',
          updatePayloadMode: 'custom',
          useMongoActions: true,
          actionCategory: 'update',
          action: 'updateOne',
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
          updateTemplate:
            '{\n' +
            '  "$set": {\n' +
            '    "parameters": {{value.parameters}}\n' +
            '  }\n' +
            '}',
          parameterInferenceGuard: {
            enabled: true,
            targetPath: 'parameters',
            definitionsPort: 'result',
          },
          writeOutcomePolicy: {
            onZeroAffected: 'fail',
          },
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
  ];

  return {
    ...baseConfig,
    name: args.pathName,
    description: 'Playwright deterministic parameter inference workflow',
    strictFlowMode: true,
    aiPathsValidation: { enabled: false },
    nodes,
    edges: [
      {
        id: `edge-trigger-definitions-${randomSuffix()}`,
        from: triggerNodeId,
        to: definitionsNodeId,
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: `edge-trigger-parameters-${randomSuffix()}`,
        from: triggerNodeId,
        to: parametersNodeId,
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: `edge-parameters-regex-${randomSuffix()}`,
        from: parametersNodeId,
        to: parametersRegexNodeId,
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: `edge-trigger-database-${randomSuffix()}`,
        from: triggerNodeId,
        to: databaseNodeId,
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: `edge-definitions-database-${randomSuffix()}`,
        from: definitionsNodeId,
        to: databaseNodeId,
        fromPort: 'value',
        toPort: 'result',
      },
      {
        id: `edge-regex-database-${randomSuffix()}`,
        from: parametersRegexNodeId,
        to: databaseNodeId,
        fromPort: 'value',
        toPort: 'value',
      },
    ],
    updatedAt: args.timestamp,
    runtimeState: { inputs: {}, outputs: {} },
    parserSamples: {},
    updaterSamples: {},
    lastRunAt: null,
    runCount: 0,
    uiState: {
      selectedNodeId: triggerNodeId,
      configOpen: false,
    },
  };
};
