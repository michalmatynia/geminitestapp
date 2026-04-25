import type { CanvasSemanticDocument } from '@/shared/contracts/ai-paths-semantic-grammar';
import {
  MARKETPLACE_COPY_DEBRAND_PATH_ID,
  MARKETPLACE_COPY_DEBRAND_STARTER_TEMPLATE_ID,
  MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID,
  MARKETPLACE_COPY_DEBRAND_TRIGGER_LOCATION,
  MARKETPLACE_COPY_DEBRAND_TRIGGER_NAME,
  MARKETPLACE_COPY_DEBRAND_TRIGGER_SORT_INDEX,
} from '@/shared/lib/ai-paths/marketplace-copy-debrand';
import {
  PARAMETER_VALUE_INFERENCE_PATH_ID,
  PARAMETER_VALUE_INFERENCE_STARTER_TEMPLATE_ID,
  PARAMETER_VALUE_INFERENCE_TRIGGER_BUTTON_ID,
  PARAMETER_VALUE_INFERENCE_TRIGGER_LOCATION,
  PARAMETER_VALUE_INFERENCE_TRIGGER_NAME,
  PARAMETER_VALUE_INFERENCE_TRIGGER_SORT_INDEX,
} from '@/shared/lib/ai-paths/parameter-value-inference';
import descriptionInferenceLiteAsset from '../assets/description-inference-lite.canvas.json';
import gemmaVisionObjectAnalyserApiAsset from '../assets/gemma-vision-object-analyser-api.canvas.json';
import gemmaVisionObjectAnalyserModelAsset from '../assets/gemma-vision-object-analyser-model.canvas.json';
import marketplaceCopyDebrandAsset from '../assets/marketplace-copy-debrand.canvas.json';
import parameterInferenceAsset from '../assets/parameter-inference.canvas.json';
import parameterValueInferenceAsset from '../assets/parameter-value-inference.canvas.json';
import productNameNormalizeAsset from '../assets/product-name-normalize.canvas.json';
import translationEnPlAsset from '../assets/translation-en-pl.canvas.json';
import { hasParameterInferencePromptStructure } from './structural-matchers';
import {
  buildTriggerDisplay,
  computeStarterWorkflowGraphHash,
  materializeSemanticAsset,
} from './utils';
import type { AiPathTemplateRegistryEntry } from './types';

const TRANSLATION_EN_PL_ADDITIONAL_GRAPH_HASHES: string[] = ['97eb2bff', '7994bd47'];
const PARAMETER_INFERENCE_ADDITIONAL_GRAPH_HASHES: string[] = ['7f2d8625'];
const PRODUCT_NAME_NORMALIZE_ADDITIONAL_GRAPH_HASHES: string[] = ['fbe949f9', '30c56611'];

const rawRegistryEntries: AiPathTemplateRegistryEntry[] = [
  {
    templateId: 'starter_parameter_inference',
    name: 'Parameter Inference',
    description:
      'Infer product parameter values from title, description, and images, then update product parameters.',
    semanticAsset: parameterInferenceAsset as CanvasSemanticDocument,
    seedPolicy: {
      autoSeed: true,
      defaultPathId: 'path_syr8f4',
      isActive: true,
      isLocked: false,
      sortOrder: 20,
      includeInCanonicalSeed: true,
    },
    triggerButtonPresets: [
      {
        id: '0ef40981-7ac6-416e-9205-7200289f851c',
        name: 'Infer Parameters',
        pathId: 'path_syr8f4',
        locations: ['product_modal'],
        display: buildTriggerDisplay('Infer Parameters'),
        enabled: true,
        mode: 'click',
        sortIndex: 20,
      },
    ],
    starterLineage: {
      starterKey: 'parameter_inference',
      templateVersion: 16,
      canonicalGraphHashes: PARAMETER_INFERENCE_ADDITIONAL_GRAPH_HASHES,
    },
    upgradePolicy: {
      versionedOverlayScope: 'any_provenance_path',
      lowOverlapReplacementMode: 'any_resolved',
      lowOverlapStructuralMatcher: hasParameterInferencePromptStructure,
    },
  },
  {
    templateId: PARAMETER_VALUE_INFERENCE_STARTER_TEMPLATE_ID,
    name: 'Infer Parameter Value',
    description:
      'Infer one selected product parameter value from title, description, images, and parameter metadata.',
    semanticAsset: parameterValueInferenceAsset as CanvasSemanticDocument,
    seedPolicy: {
      autoSeed: true,
      defaultPathId: PARAMETER_VALUE_INFERENCE_PATH_ID,
      isActive: true,
      isLocked: false,
      sortOrder: PARAMETER_VALUE_INFERENCE_TRIGGER_SORT_INDEX,
      includeInCanonicalSeed: true,
    },
    triggerButtonPresets: [
      {
        id: PARAMETER_VALUE_INFERENCE_TRIGGER_BUTTON_ID,
        name: PARAMETER_VALUE_INFERENCE_TRIGGER_NAME,
        pathId: PARAMETER_VALUE_INFERENCE_PATH_ID,
        locations: [PARAMETER_VALUE_INFERENCE_TRIGGER_LOCATION],
        display: buildTriggerDisplay(PARAMETER_VALUE_INFERENCE_TRIGGER_NAME),
        enabled: true,
        mode: 'click',
        sortIndex: PARAMETER_VALUE_INFERENCE_TRIGGER_SORT_INDEX,
      },
    ],
    starterLineage: {
      starterKey: 'parameter_value_inference',
      templateVersion: 2,
      canonicalGraphHashes: [],
    },
    upgradePolicy: {
      versionedOverlayScope: 'any_provenance_path',
    },
  },
  {
    templateId: 'starter_product_name_normalize',
    name: 'Normalize Product Name',
    description:
      'Normalize the English product name from title, description, images, and leaf-category context.',
    semanticAsset: productNameNormalizeAsset as CanvasSemanticDocument,
    seedPolicy: {
      autoSeed: true,
      defaultPathId: 'path_name_normalize_v1',
      isActive: true,
      isLocked: false,
      sortOrder: 25,
      includeInCanonicalSeed: true,
    },
    triggerButtonPresets: [
      {
        id: '7d58d6a0-44c7-4d69-a2e4-8d8d1f3f5a27',
        name: 'Normalize',
        pathId: 'path_name_normalize_v1',
        locations: ['product_modal'],
        display: buildTriggerDisplay('Normalize'),
        enabled: true,
        mode: 'click',
        sortIndex: 25,
      },
    ],
    starterLineage: {
      starterKey: 'product_name_normalize',
      templateVersion: 8,
      canonicalGraphHashes: PRODUCT_NAME_NORMALIZE_ADDITIONAL_GRAPH_HASHES,
    },
    upgradePolicy: {
      versionedOverlayScope: 'any_provenance_path',
      lowOverlapReplacementMode: 'seeded_default_only',
      allowCurrentVersionSeededDefaultZeroOverlap: true,
    },
  },
  {
    templateId: 'starter_description_inference_lite',
    name: 'Description Inference v3 Lite',
    description:
      'Single-model grounded description generation workflow optimized for server execution.',
    semanticAsset: descriptionInferenceLiteAsset as CanvasSemanticDocument,
    seedPolicy: {
      autoSeed: true,
      defaultPathId: 'path_descv3lite',
      isActive: true,
      isLocked: false,
      sortOrder: 30,
      includeInCanonicalSeed: true,
    },
    triggerButtonPresets: [
      {
        id: '4c07d35b-ea92-4d1f-b86b-c586359f68de',
        name: 'Infer Description Lite',
        pathId: 'path_descv3lite',
        locations: ['product_modal'],
        display: buildTriggerDisplay('Infer Description Lite'),
        enabled: true,
        mode: 'click',
        sortIndex: 30,
      },
    ],
    starterLineage: {
      starterKey: 'description_inference_lite',
      templateVersion: 6,
      canonicalGraphHashes: [],
    },
    upgradePolicy: {
      versionedOverlayScope: 'any_provenance_path',
    },
  },
  {
    templateId: MARKETPLACE_COPY_DEBRAND_STARTER_TEMPLATE_ID,
    name: 'Debrand Marketplace Copy',
    description:
      'Generate debranded alternate marketplace title and description from English product copy and images.',
    semanticAsset: marketplaceCopyDebrandAsset as CanvasSemanticDocument,
    seedPolicy: {
      autoSeed: true,
      defaultPathId: MARKETPLACE_COPY_DEBRAND_PATH_ID,
      isActive: true,
      isLocked: false,
      sortOrder: MARKETPLACE_COPY_DEBRAND_TRIGGER_SORT_INDEX,
      includeInCanonicalSeed: true,
    },
    triggerButtonPresets: [
      {
        id: MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID,
        name: MARKETPLACE_COPY_DEBRAND_TRIGGER_NAME,
        pathId: MARKETPLACE_COPY_DEBRAND_PATH_ID,
        locations: [MARKETPLACE_COPY_DEBRAND_TRIGGER_LOCATION],
        display: buildTriggerDisplay(MARKETPLACE_COPY_DEBRAND_TRIGGER_NAME),
        enabled: true,
        mode: 'click',
        sortIndex: MARKETPLACE_COPY_DEBRAND_TRIGGER_SORT_INDEX,
      },
    ],
    starterLineage: {
      starterKey: 'marketplace_copy_debrand',
      templateVersion: 7,
      canonicalGraphHashes: [],
    },
    upgradePolicy: {
      versionedOverlayScope: 'any_provenance_path',
    },
  },
  {
    templateId: 'starter_translation_en_pl',
    name: 'Translation EN->PL Description + Parameters',
    description: 'Translate English description and parameters to Polish and update the product.',
    semanticAsset: translationEnPlAsset as CanvasSemanticDocument,
    seedPolicy: {
      autoSeed: false,
      defaultPathId: 'path_96708d',
      isActive: true,
      isLocked: false,
      sortOrder: 50,
      includeInCanonicalSeed: true,
    },
    starterLineage: {
      starterKey: 'translation_en_pl',
      templateVersion: 7,
      canonicalGraphHashes: TRANSLATION_EN_PL_ADDITIONAL_GRAPH_HASHES,
    },
    upgradePolicy: {
      versionedOverlayScope: 'any_provenance_path',
    },
  },
  {
    templateId: 'gemma_vision_object_analyser_model',
    name: 'Gemma Vision Object Analyser',
    description:
      'Image Studio → Fetcher → Prompt → vision model → bounds extraction → canvas repositioning.',
    semanticAsset: gemmaVisionObjectAnalyserModelAsset as CanvasSemanticDocument,
    starterLineage: {
      starterKey: 'gemma_vision_object_analyser_model',
      templateVersion: 1,
      canonicalGraphHashes: [],
    },
  },
  {
    templateId: 'gemma_vision_object_analyser_api',
    name: 'Gemma Vision Analyser (Custom API)',
    description:
      'Image Studio → Fetcher → custom vision REST API → bounds extraction → canvas repositioning.',
    semanticAsset: gemmaVisionObjectAnalyserApiAsset as CanvasSemanticDocument,
    starterLineage: {
      starterKey: 'gemma_vision_object_analyser_api',
      templateVersion: 1,
      canonicalGraphHashes: [],
    },
  },
];

export const STARTER_WORKFLOW_REGISTRY: AiPathTemplateRegistryEntry[] = rawRegistryEntries.map(
  (entry: AiPathTemplateRegistryEntry): AiPathTemplateRegistryEntry => {
    const latestConfig = materializeSemanticAsset(entry.semanticAsset, {
      pathId: entry.seedPolicy?.defaultPathId ?? entry.semanticAsset.path.id,
      isActive: entry.seedPolicy?.isActive,
      isLocked: entry.seedPolicy?.isLocked,
    });
    const latestHash = computeStarterWorkflowGraphHash(latestConfig);
    return {
      ...entry,
      starterLineage: {
        ...entry.starterLineage,
        canonicalGraphHashes: Array.from(
          new Set([latestHash, ...entry.starterLineage.canonicalGraphHashes])
        ),
      },
    };
  }
);
