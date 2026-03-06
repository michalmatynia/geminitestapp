import type { NodeType } from '@/shared/contracts/ai-paths';
import { isObjectRecord } from '@/shared/utils/object-utils';
import { palette as NODE_DEFINITIONS } from '../definitions';
import { COMMON_RUNTIME_FIELDS } from './node-docs.constants';
import { CONFIG_DOCS_BY_TYPE } from './node-docs.registry';
import type { AiPathsNodeDoc } from './node-docs.types';

export type { NodeConfigDocField, AiPathsNodeDoc } from './node-docs.types';

const ALL_NODE_TYPES: NodeType[] = [
  'trigger',
  'fetcher',
  'simulation',
  'audio_oscillator',
  'audio_speaker',
  'context',
  'parser',
  'regex',
  'iterator',
  'mapper',
  'mutator',
  'string_mutator',
  'validator',
  'validation_pattern',
  'constant',
  'math',
  'template',
  'bundle',
  'gate',
  'compare',
  'router',
  'delay',
  'poll',
  'http',
  'api_advanced',
  'playwright',
  'prompt',
  'model',
  'agent',
  'learner_agent',
  'database',
  'db_schema',
  'viewer',
  'notification',
  'ai_description',
  'description_updater',
];

const definitionByType = new Map(
  NODE_DEFINITIONS.map((def: (typeof NODE_DEFINITIONS)[number]) => [def.type, def])
);

const resolveDefaultConfigFromDefinition = (
  definition: unknown
): Record<string, unknown> | null => {
  if (!isObjectRecord(definition)) return null;
  const config = definition['config'];
  return isObjectRecord(config) ? config : null;
};

export const AI_PATHS_NODE_DOCS: AiPathsNodeDoc[] = ALL_NODE_TYPES.map((type: NodeType) => {
  const fallbackDefinition =
    type === 'description_updater'
      ? {
          type: 'description_updater' as const,
          title: 'Description Updater (Deprecated)',
          description: 'Writes description_en back to the product.',
          inputs: ['productId', 'description_en'],
          outputs: ['description_en'],
        }
      : null;
  const def = definitionByType.get(type) ?? fallbackDefinition;
  const notes =
    type === 'description_updater'
      ? ['Deprecated node. Prefer Database node write operations for updates.']
      : type === 'notification'
        ? ['Configuration UI is not available yet; it runs with defaults.']
        : type === 'playwright'
          ? ['Built-in script templates are available in the Playwright node config dialog.']
          : undefined;
  const defaultConfig = resolveDefaultConfigFromDefinition(def);
  return {
    type,
    title: def?.title ?? type,
    purpose: def?.description ?? '—',
    inputs: def?.inputs ?? [],
    outputs: def?.outputs ?? [],
    config: CONFIG_DOCS_BY_TYPE[type] ?? COMMON_RUNTIME_FIELDS,
    ...(defaultConfig ? { defaultConfig } : {}),
    ...(notes ? { notes } : {}),
  };
});

export const buildAiPathsNodeDocJsonSnippet = (doc: AiPathsNodeDoc): string =>
  `${JSON.stringify(
    {
      type: doc.type,
      title: doc.title,
      description: doc.purpose,
      inputs: doc.inputs,
      outputs: doc.outputs,
      config: doc.defaultConfig ?? {},
      notes: doc.notes ?? [],
    },
    null,
    2
  )}\n`;
