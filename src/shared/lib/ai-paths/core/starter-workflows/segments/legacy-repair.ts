import type { PathConfig } from '@/shared/contracts/ai-paths';
import {
  hasAliasOrTriggerMatch,
  hasNodeOfType,
  normalizeText,
  toRecord,
} from './utils';
import type { AiPathTemplateRegistryEntry } from './types';

const hasTranslationRepairDatabaseContract = (config: PathConfig): boolean =>
  hasNodeOfType(config, 'database', (node) => {
    const database = toRecord(toRecord(node.config)?.['database']);
    const updateTemplate = normalizeText(database?.['updateTemplate']);
    const hasLegacyCustomTemplate =
      updateTemplate.includes('"description_pl"') &&
      updateTemplate.includes('"parameters"') &&
      updateTemplate.includes('{{result.parameters}}');
    if (hasLegacyCustomTemplate) {
      return true;
    }

    const mappings = Array.isArray(database?.['mappings'])
      ? (database?.['mappings'] as Array<unknown>)
      : [];

    const hasDescriptionMapping = mappings.some((entry) => {
      const record = toRecord(entry);
      return (
        normalizeText(record?.['targetPath']) === 'description_pl' &&
        normalizeText(record?.['sourcePort']) === 'value' &&
        normalizeText(record?.['sourcePath']) === 'description_pl'
      );
    });
    const hasParametersMapping = mappings.some((entry) => {
      const record = toRecord(entry);
      return (
        normalizeText(record?.['targetPath']) === 'parameters' &&
        normalizeText(record?.['sourcePort']) === 'result' &&
        normalizeText(record?.['sourcePath']) === 'parameters'
      );
    });

    return hasDescriptionMapping && hasParametersMapping;
  });

export const matchesLegacyTranslationRepairSignature = (config: PathConfig): boolean => {
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
  return hasTranslationRepairDatabaseContract(config);
};

const hasNormalizeProductNamePromptStructure = (config: PathConfig): boolean =>
  (config.nodes ?? []).some((node) => {
    if (node.type !== 'prompt') return false;
    const prompt = toRecord(toRecord(node.config)?.['prompt']);
    const template = normalizeText(prompt?.['template']);
    return (
      template.includes('{{title}}') &&
      template.includes('{{content_en}}') &&
      template.includes('normalizedName') &&
      template.includes('validationError')
    );
  });

const hasNormalizeProductNameLegacyDatabaseUpdate = (config: PathConfig): boolean =>
  hasNodeOfType(config, 'database', (node) => {
    const database = toRecord(toRecord(node.config)?.['database']);
    if (normalizeText(database?.['operation']).toLowerCase() !== 'update') {
      return false;
    }

    const updateTemplate = normalizeText(database?.['updateTemplate']);
    if (updateTemplate.includes('"name_en"') || updateTemplate.includes('\'name_en\'')) {
      return true;
    }

    const mappings = Array.isArray(database?.['mappings'])
      ? (database?.['mappings'] as Array<unknown>)
      : [];
    return mappings.some((entry) => normalizeText(toRecord(entry)?.['targetPath']) === 'name_en');
  });

export const matchesLegacyNormalizeProductNameRepairSignature = (
  config: PathConfig
): boolean => {
  if (
    !hasAliasOrTriggerMatch(
      config,
      ['Normalize Product Name'],
      ['Product Modal - Normalize']
    )
  ) {
    return false;
  }

  if (!hasNormalizeProductNamePromptStructure(config)) return false;

  return hasNormalizeProductNameLegacyDatabaseUpdate(config);
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

export const matchesLegacyParameterInferenceRepairSignature = (config: PathConfig): boolean => {
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
): boolean => entry.upgradePolicy?.legacyRepairMatcher?.(config) ?? false;
