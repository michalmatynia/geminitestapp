import type { PathConfig } from '@/shared/contracts/ai-paths';
import {
  hasAliasOrTriggerMatch,
  hasNodeOfType,
  normalizeText,
  normalizeTextLower,
  toRecord,
} from './utils';
import type { AiPathTemplateRegistryEntry } from './types';

export const hasCanonicalGraphHash = (entry: AiPathTemplateRegistryEntry, graphHash: string): boolean => {
  const normalizedHash = normalizeTextLower(graphHash);
  if (!normalizedHash) return false;
  return entry.starterLineage.canonicalGraphHashes.some(
    (hash) => normalizeTextLower(hash) === normalizedHash
  );
};

const hasTranslationRepairDatabaseUpdateTemplate = (config: PathConfig): boolean =>
  hasNodeOfType(config, 'database', (node) => {
    const database = toRecord(toRecord(node.config)?.['database']);
    const updateTemplate = normalizeText(database?.['updateTemplate']);
    return (
      updateTemplate.includes('"description_pl"') &&
      updateTemplate.includes('"parameters"') &&
      updateTemplate.includes('{{result.parameters}}')
    );
  });

const matchesLegacyTranslationRepairSignature = (config: PathConfig): boolean => {
  if (
    !hasAliasOrTriggerMatch(
      config,
      [
      'Translation EN->PL Description + Parameters',
      'Translation EN->PL Description + Parameters v2',
      ],
      ['Product Modal - Translate EN->PL (Desc+Params)']
    )
  ) {
    return false;
  }
  return hasTranslationRepairDatabaseUpdateTemplate(config);
};

export const hasParameterInferencePromptStructure = (config: PathConfig): boolean =>
  (config.nodes ?? []).some((node) => {
    if (node.type !== 'prompt') return false;
    const prompt = toRecord(toRecord(node.config)?.['prompt']);
    const template = normalizeText(prompt?.['template']);
    return template.includes('{{title}}') && template.includes('{{content_en}}');
  });

const hasParameterInferenceSeedRouterPromptContract = (config: PathConfig): boolean =>
  (config.nodes ?? []).some((node) => {
    if (node.type !== 'router' || normalizeText(node.id) !== 'node-router-seed-params') {
      return false;
    }
    return node.inputs?.includes('prompt') === true || node.outputs?.includes('prompt') === true;
  });

const hasParameterInferenceBlankProductCoreParser = (config: PathConfig): boolean =>
  (config.nodes ?? []).some((node) => {
    if (node.type !== 'parser') return false;
    const parser = toRecord(toRecord(node.config)?.['parser']);
    const mappings = toRecord(parser?.['mappings']);
    return (
      normalizeText(parser?.['presetId']) === 'product_core' &&
      normalizeText(mappings?.['title']) === '' &&
      normalizeText(mappings?.['content_en']) === ''
    );
  });

const hasParameterInferenceLegacyMappingUpdate = (config: PathConfig): boolean =>
  (config.nodes ?? []).some((node) => {
    if (node.type !== 'database') return false;
    const database = toRecord(toRecord(node.config)?.['database']);
    return (
      normalizeText(database?.['operation']).toLowerCase() === 'update' &&
      normalizeText(database?.['updatePayloadMode']).toLowerCase() === 'mapping'
    );
  });

const matchesLegacyParameterInferenceRepairSignature = (config: PathConfig): boolean => {
  if (
    !hasAliasOrTriggerMatch(
      config,
      ['Parameter Inference', 'Parameter Inference v2 No Param Add'],
      ['Product Modal - Infer Parameters']
    )
  ) {
    return false;
  }

  if (!hasParameterInferencePromptStructure(config)) return false;

  return (
    hasParameterInferenceBlankProductCoreParser(config) ||
    hasParameterInferenceSeedRouterPromptContract(config) ||
    hasParameterInferenceLegacyMappingUpdate(config)
  );
};

export const matchesLegacyStarterWorkflowRepairSignature = (
  entry: AiPathTemplateRegistryEntry,
  config: PathConfig
): boolean => {
  switch (entry.starterLineage.starterKey) {
    case 'translation_en_pl':
      return matchesLegacyTranslationRepairSignature(config);
    case 'parameter_inference':
      return matchesLegacyParameterInferenceRepairSignature(config);
    default:
      return false;
  }
};
