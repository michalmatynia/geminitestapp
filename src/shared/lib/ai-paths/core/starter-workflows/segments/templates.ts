/* eslint-disable max-lines */

import type { CanvasSemanticDocument } from '@/shared/contracts/ai-paths-semantic-grammar';
import {
  JOB_APPLICATION_COVER_LETTER_PATH_ID,
  JOB_APPLICATION_COVER_LETTER_STARTER_TEMPLATE_ID,
  JOB_APPLICATION_COVER_LETTER_TRIGGER_BUTTON_ID,
  JOB_APPLICATION_COVER_LETTER_TRIGGER_NAME,
  JOB_APPLICATION_COVER_LETTER_TRIGGER_SORT_INDEX,
  JOB_APPLICATION_MATCH_ANALYSIS_MODEL_ID,
  JOB_APPLICATION_MATCH_ANALYSIS_PATH_ID,
  JOB_APPLICATION_MATCH_ANALYSIS_STARTER_TEMPLATE_ID,
  JOB_APPLICATION_MATCH_ANALYSIS_TRIGGER_BUTTON_ID,
  JOB_APPLICATION_MATCH_ANALYSIS_TRIGGER_LOCATION,
  JOB_APPLICATION_MATCH_ANALYSIS_TRIGGER_NAME,
  JOB_APPLICATION_MATCH_ANALYSIS_TRIGGER_SORT_INDEX,
  JOB_APPLICATION_PREPARE_TRIGGER_LOCATION,
  JOB_APPLICATION_TAILORED_CV_PATH_ID,
  JOB_APPLICATION_TAILORED_CV_STARTER_TEMPLATE_ID,
  JOB_APPLICATION_TAILORED_CV_TRIGGER_BUTTON_ID,
  JOB_APPLICATION_TAILORED_CV_TRIGGER_NAME,
  JOB_APPLICATION_TAILORED_CV_TRIGGER_SORT_INDEX,
  JOB_APPLICATION_TAILORED_EMAIL_PATH_ID,
  JOB_APPLICATION_TAILORED_EMAIL_STARTER_TEMPLATE_ID,
  JOB_APPLICATION_TAILORED_EMAIL_TRIGGER_BUTTON_ID,
  JOB_APPLICATION_TAILORED_EMAIL_TRIGGER_NAME,
  JOB_APPLICATION_TAILORED_EMAIL_TRIGGER_SORT_INDEX,
} from '@/shared/lib/ai-paths/job-application-prepare';
import {
  JOB_BOARD_LEXICON_CLASSIFICATION_PATH_ID,
  JOB_BOARD_LEXICON_CLASSIFICATION_STARTER_TEMPLATE_ID,
  JOB_BOARD_LEXICON_CLASSIFICATION_TRIGGER_BUTTON_ID,
  JOB_BOARD_LEXICON_CLASSIFICATION_TRIGGER_LOCATION,
  JOB_BOARD_LEXICON_CLASSIFICATION_TRIGGER_NAME,
  JOB_BOARD_LEXICON_CLASSIFICATION_TRIGGER_SORT_INDEX,
} from '@/shared/lib/ai-paths/job-board-lexicon-classification';
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
import {
  SOCIAL_ARTICLE_AGGREGATION_PATH_ID,
  SOCIAL_ARTICLE_AGGREGATION_STARTER_SORT_INDEX,
  SOCIAL_ARTICLE_AGGREGATION_STARTER_TEMPLATE_ID,
} from '@/shared/lib/ai-paths/social-article-aggregation';
import descriptionInferenceLiteAsset from '../assets/description-inference-lite.canvas.json';
import gemmaVisionObjectAnalyserApiAsset from '../assets/gemma-vision-object-analyser-api.canvas.json';
import gemmaVisionObjectAnalyserModelAsset from '../assets/gemma-vision-object-analyser-model.canvas.json';
import jobApplicationCoverLetterAsset from '../assets/job-application-cover-letter.canvas.json';
import jobApplicationMatchAnalysisAsset from '../assets/job-application-match-analysis.canvas.json';
import jobApplicationTailoredCvAsset from '../assets/job-application-tailored-cv.canvas.json';
import jobApplicationTailoredEmailAsset from '../assets/job-application-tailored-email.canvas.json';
import jobBoardLexiconClassificationAsset from '../assets/job-board-lexicon-classification.canvas.json';
import marketplaceCopyDebrandAsset from '../assets/marketplace-copy-debrand.canvas.json';
import parameterInferenceAsset from '../assets/parameter-inference.canvas.json';
import parameterValueInferenceAsset from '../assets/parameter-value-inference.canvas.json';
import productNameNormalizeAsset from '../assets/product-name-normalize.canvas.json';
import socialArticleAggregationAsset from '../assets/social-article-aggregation.canvas.json';
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
      templateVersion: 18,
      canonicalGraphHashes: PARAMETER_INFERENCE_ADDITIONAL_GRAPH_HASHES,
    },
    upgradePolicy: {
      versionedOverlayScope: 'any_provenance_path',
      lowOverlapReplacementMode: 'any_resolved',
      lowOverlapStructuralMatcher: hasParameterInferencePromptStructure,
    },
  },
  {
    templateId: JOB_APPLICATION_TAILORED_CV_STARTER_TEMPLATE_ID,
    name: 'Create Tailored CV',
    description:
      'Create a tailored CV from a Persons profile, job listing, organisation profile, and lexicon terms.',
    semanticAsset: jobApplicationTailoredCvAsset as CanvasSemanticDocument,
    seedPolicy: {
      autoSeed: true,
      defaultPathId: JOB_APPLICATION_TAILORED_CV_PATH_ID,
      isActive: true,
      isLocked: false,
      sortOrder: JOB_APPLICATION_TAILORED_CV_TRIGGER_SORT_INDEX,
      includeInCanonicalSeed: true,
    },
    triggerButtonPresets: [
      {
        id: JOB_APPLICATION_TAILORED_CV_TRIGGER_BUTTON_ID,
        name: JOB_APPLICATION_TAILORED_CV_TRIGGER_NAME,
        pathId: JOB_APPLICATION_TAILORED_CV_PATH_ID,
        locations: [JOB_APPLICATION_PREPARE_TRIGGER_LOCATION],
        display: buildTriggerDisplay(JOB_APPLICATION_TAILORED_CV_TRIGGER_NAME),
        contextTemplate: {
          jobApplicationArtifactKind: 'tailored_cv',
          applicationContext: {
            generationRequest: {
              artifact: 'tailored_cv',
              artifacts: ['tailored_cv', 'cv_pdf_preview'],
              language: 'match_job_listing',
              runtime: 'redis',
              promptGoal:
                'Prepare a tailored CV and previewable CV PDF source for this person, job listing, and organisation.',
            },
            outputContract: {
              tailoredCv: {
                title: 'string',
                professionalSummary: 'string',
                coreStrengths: 'string[]; tailored lightly from the base Core Strengths section only',
                selectedTechnicalEnvironment:
                  'string[]; lightly tailored from the base Selected Technical Environment section; do not overfit or invent tools',
                experienceHighlightPatches:
                  '{experienceId:string, experienceTitle:string, highlights:string[]}[]; patch bullets for existing experience entries only',
                tailoringScope:
                  '{lockedFieldsPreserved:boolean, allowedSections:string[], canonicalPatchField:string, renderedBodyMode:string}; allowed sections are Professional Summary, Core Strengths, Selected Technical Environment, and Experience Highlights',
                tailoringPatch:
                  '{professionalSummary:string, coreStrengths:string[], selectedTechnicalEnvironment:string[], experienceHighlightPatches:{experienceId:string, experienceTitle:string, highlights:string[]}[]}; canonical limited patch object',
                sourceCvRecordId: 'string; copy from personContext.cvsSummary.preferredSourceCvRecordId',
                sourceCvTitle: 'string; copy from personContext.cvsSummary.preferredSourceCvTitle',
                bodyText: 'string',
                bodyMarkdown: 'string',
                language: 'string; BCP-47 tag matching the job listing language',
                experienceHighlights: 'string[]',
                educationHighlights: 'string[]',
                skills: 'string[]',
                preferencesMatch: 'string[]',
                bodyBlocks:
                  'CvBlock[]; include a techStack block only for technologies explicitly mentioned in the generated CV or job listing; linked items carry label, iconUrl, and lexiconTermId from jobContext.lexicon.selectedTechnologyTerms',
              },
              applicationNotes: 'string[]',
              missingInformation: 'string[]',
              confidence: 'number',
            },
          },
        },
        enabled: true,
        mode: 'click',
        sortIndex: JOB_APPLICATION_TAILORED_CV_TRIGGER_SORT_INDEX,
      },
    ],
    starterLineage: {
      starterKey: 'job_application_tailored_cv',
      templateVersion: 28,
      canonicalGraphHashes: [],
    },
    upgradePolicy: {
      versionedOverlayScope: 'any_provenance_path',
    },
  },
  {
    templateId: JOB_APPLICATION_TAILORED_EMAIL_STARTER_TEMPLATE_ID,
    name: 'Create Application Email',
    description:
      'Create a tailored application email from a Persons profile, job listing, and organisation profile.',
    semanticAsset: jobApplicationTailoredEmailAsset as CanvasSemanticDocument,
    seedPolicy: {
      autoSeed: true,
      defaultPathId: JOB_APPLICATION_TAILORED_EMAIL_PATH_ID,
      isActive: true,
      isLocked: false,
      sortOrder: JOB_APPLICATION_TAILORED_EMAIL_TRIGGER_SORT_INDEX,
      includeInCanonicalSeed: true,
    },
    triggerButtonPresets: [
      {
        id: JOB_APPLICATION_TAILORED_EMAIL_TRIGGER_BUTTON_ID,
        name: JOB_APPLICATION_TAILORED_EMAIL_TRIGGER_NAME,
        pathId: JOB_APPLICATION_TAILORED_EMAIL_PATH_ID,
        locations: [JOB_APPLICATION_PREPARE_TRIGGER_LOCATION],
        display: buildTriggerDisplay(JOB_APPLICATION_TAILORED_EMAIL_TRIGGER_NAME),
        contextTemplate: {
          jobApplicationArtifactKind: 'application_email',
          applicationContext: {
            generationRequest: {
              artifact: 'application_email',
              artifacts: ['application_email'],
              language: 'match_job_listing',
              runtime: 'redis',
              promptGoal:
                'Prepare a tailored application email for this person, job listing, and organisation.',
            },
            outputContract: {
              applicationEmail: {
                subject: 'string',
                bodyMarkdown: 'string',
                bodyText: 'string',
                language: 'string; BCP-47 tag matching the job listing language',
              },
              applicationNotes: 'string[]',
              missingInformation: 'string[]',
              confidence: 'number',
            },
          },
        },
        enabled: true,
        mode: 'click',
        sortIndex: JOB_APPLICATION_TAILORED_EMAIL_TRIGGER_SORT_INDEX,
      },
    ],
    starterLineage: {
      starterKey: 'job_application_tailored_email',
      templateVersion: 15,
      canonicalGraphHashes: [],
    },
    upgradePolicy: {
      versionedOverlayScope: 'any_provenance_path',
    },
  },
  {
    templateId: JOB_APPLICATION_COVER_LETTER_STARTER_TEMPLATE_ID,
    name: 'Create Cover Letter',
    description:
      'Create a tailored cover letter from a Persons profile, job listing, and organisation profile.',
    semanticAsset: jobApplicationCoverLetterAsset as CanvasSemanticDocument,
    seedPolicy: {
      autoSeed: true,
      defaultPathId: JOB_APPLICATION_COVER_LETTER_PATH_ID,
      isActive: true,
      isLocked: false,
      sortOrder: JOB_APPLICATION_COVER_LETTER_TRIGGER_SORT_INDEX,
      includeInCanonicalSeed: true,
    },
    triggerButtonPresets: [
      {
        id: JOB_APPLICATION_COVER_LETTER_TRIGGER_BUTTON_ID,
        name: JOB_APPLICATION_COVER_LETTER_TRIGGER_NAME,
        pathId: JOB_APPLICATION_COVER_LETTER_PATH_ID,
        locations: [JOB_APPLICATION_PREPARE_TRIGGER_LOCATION],
        display: buildTriggerDisplay(JOB_APPLICATION_COVER_LETTER_TRIGGER_NAME),
        contextTemplate: {
          jobApplicationArtifactKind: 'cover_letter',
          applicationContext: {
            generationRequest: {
              artifact: 'cover_letter',
              artifacts: ['cover_letter'],
              language: 'match_job_listing',
              runtime: 'redis',
              promptGoal:
                'Prepare a tailored cover letter for this person, job listing, and organisation.',
            },
            outputContract: {
              coverLetter: {
                subject: 'string',
                bodyMarkdown: 'string',
                bodyText: 'string',
                language: 'string; BCP-47 tag matching the job listing language',
              },
              applicationNotes: 'string[]',
              missingInformation: 'string[]',
              confidence: 'number',
            },
          },
        },
        enabled: true,
        mode: 'click',
        sortIndex: JOB_APPLICATION_COVER_LETTER_TRIGGER_SORT_INDEX,
      },
    ],
    starterLineage: {
      starterKey: 'job_application_cover_letter',
      templateVersion: 14,
      canonicalGraphHashes: [],
    },
    upgradePolicy: {
      versionedOverlayScope: 'any_provenance_path',
    },
  },
  {
    templateId: JOB_APPLICATION_MATCH_ANALYSIS_STARTER_TEMPLATE_ID,
    name: 'Analyze Application Match',
    description:
      'Analyze how well a prepared application matches the job listing using the current Person profile, CV records, and education.',
    semanticAsset: jobApplicationMatchAnalysisAsset as CanvasSemanticDocument,
    seedPolicy: {
      autoSeed: true,
      defaultPathId: JOB_APPLICATION_MATCH_ANALYSIS_PATH_ID,
      isActive: true,
      isLocked: false,
      sortOrder: JOB_APPLICATION_MATCH_ANALYSIS_TRIGGER_SORT_INDEX,
      includeInCanonicalSeed: true,
    },
    triggerButtonPresets: [
      {
        id: JOB_APPLICATION_MATCH_ANALYSIS_TRIGGER_BUTTON_ID,
        name: JOB_APPLICATION_MATCH_ANALYSIS_TRIGGER_NAME,
        pathId: JOB_APPLICATION_MATCH_ANALYSIS_PATH_ID,
        locations: [JOB_APPLICATION_MATCH_ANALYSIS_TRIGGER_LOCATION],
        display: buildTriggerDisplay(JOB_APPLICATION_MATCH_ANALYSIS_TRIGGER_NAME),
        contextTemplate: {
          applicationContext: {
            analysisRequest: {
              artifact: 'match_analysis',
              modelId: JOB_APPLICATION_MATCH_ANALYSIS_MODEL_ID,
              promptGoal:
                'Analyze how good a match this Person is for the selected job and identify areas needing attention before applying.',
              traceability:
                'Use applicationRecord.updatedAt as the prepared-application snapshot timestamp for this analysis.',
            },
            outputContract: {
              matchAnalysis: {
                score: 'number 0..100',
                scoreLabel: 'weak | partial | solid | strong | excellent',
                summary: 'string',
                changeSincePrevious: 'string',
                recommendedDecision:
                  'Apply now | Prepare before applying | Deprioritise or rebuild evidence',
                recommendedDecisionReason: 'string',
                strongMatches: 'string[]',
                gaps: 'string[]',
                attentionAreas:
                  '{area:string, whyItMatters:string, recommendedAction:string, evidence:string}[]',
                cvEvidence: 'string[]',
                jobEvidence: 'string[]',
                riskFlags: 'string[]',
                interviewTalkingPoints: 'string[]',
                learningPlan: 'string[]',
              },
            },
          },
        },
        enabled: true,
        mode: 'click',
        sortIndex: JOB_APPLICATION_MATCH_ANALYSIS_TRIGGER_SORT_INDEX,
      },
    ],
    starterLineage: {
      starterKey: 'job_application_match_analysis',
      templateVersion: 3,
      canonicalGraphHashes: [],
    },
    upgradePolicy: {
      versionedOverlayScope: 'any_provenance_path',
    },
  },
  {
    templateId: JOB_BOARD_LEXICON_CLASSIFICATION_STARTER_TEMPLATE_ID,
    name: 'Job Board Lexicon Classification',
    description:
      'Classify unclassified scraped job-board pills into FileMaker lexicon types.',
    semanticAsset: jobBoardLexiconClassificationAsset as CanvasSemanticDocument,
    seedPolicy: {
      autoSeed: true,
      defaultPathId: JOB_BOARD_LEXICON_CLASSIFICATION_PATH_ID,
      isActive: true,
      isLocked: false,
      sortOrder: JOB_BOARD_LEXICON_CLASSIFICATION_TRIGGER_SORT_INDEX,
      includeInCanonicalSeed: true,
    },
    triggerButtonPresets: [
      {
        id: JOB_BOARD_LEXICON_CLASSIFICATION_TRIGGER_BUTTON_ID,
        name: JOB_BOARD_LEXICON_CLASSIFICATION_TRIGGER_NAME,
        pathId: JOB_BOARD_LEXICON_CLASSIFICATION_PATH_ID,
        locations: [JOB_BOARD_LEXICON_CLASSIFICATION_TRIGGER_LOCATION],
        display: buildTriggerDisplay(JOB_BOARD_LEXICON_CLASSIFICATION_TRIGGER_NAME),
        enabled: true,
        mode: 'click',
        sortIndex: JOB_BOARD_LEXICON_CLASSIFICATION_TRIGGER_SORT_INDEX,
      },
    ],
    starterLineage: {
      starterKey: 'job_board_lexicon_classification',
      templateVersion: 1,
      canonicalGraphHashes: [],
    },
    upgradePolicy: {
      versionedOverlayScope: 'any_provenance_path',
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
    templateId: SOCIAL_ARTICLE_AGGREGATION_STARTER_TEMPLATE_ID,
    name: 'Social Article Aggregation',
    description:
      'Create an English social post draft from scraped article context and a custom aggregation prompt.',
    semanticAsset: socialArticleAggregationAsset as CanvasSemanticDocument,
    seedPolicy: {
      autoSeed: true,
      defaultPathId: SOCIAL_ARTICLE_AGGREGATION_PATH_ID,
      isActive: true,
      isLocked: false,
      sortOrder: SOCIAL_ARTICLE_AGGREGATION_STARTER_SORT_INDEX,
      includeInCanonicalSeed: true,
    },
    starterLineage: {
      starterKey: 'social_article_aggregation',
      templateVersion: 1,
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
