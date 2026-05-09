/**
 * @file job-board-lexicon-classification.ts
 * @description Constants for AI Path templates and trigger buttons related to
 * classifying scraped job offers using specific lexicons.
 */

/** Starter template ID for job board lexicon classification. */
export const JOB_BOARD_LEXICON_CLASSIFICATION_STARTER_TEMPLATE_ID =
  'starter_job_board_lexicon_classification';
/** Path ID for job board lexicon classification. */
export const JOB_BOARD_LEXICON_CLASSIFICATION_PATH_ID =
  'path_job_board_lexicon_classification_v1';
/** Preferred AI model ID for job board lexicon classification. */
export const JOB_BOARD_LEXICON_CLASSIFICATION_MODEL_ID = 'gpt-oss:120b-cloud';
/** Model node ID within the AI Path. */
export const JOB_BOARD_LEXICON_CLASSIFICATION_MODEL_NODE_ID =
  'node-model-job-board-lexicon-classification';
/** Display title for the classification model. */
export const JOB_BOARD_LEXICON_CLASSIFICATION_MODEL_TITLE =
  'gpt-oss:120b-cloud Classification Model';
/** Trigger button ID for lexicon classification. */
export const JOB_BOARD_LEXICON_CLASSIFICATION_TRIGGER_BUTTON_ID =
  '8e7a7cb6-8973-4aa4-b2ee-b7c8e5b93e78';
/** Location where the "Classify" button appears. */
export const JOB_BOARD_LEXICON_CLASSIFICATION_TRIGGER_LOCATION =
  'filemaker_job_board_scraped_offer';
/** Label for the classification trigger button. */
export const JOB_BOARD_LEXICON_CLASSIFICATION_TRIGGER_NAME = 'Classify';
/** Sort order for the classification trigger button. */
export const JOB_BOARD_LEXICON_CLASSIFICATION_TRIGGER_SORT_INDEX = 42;
