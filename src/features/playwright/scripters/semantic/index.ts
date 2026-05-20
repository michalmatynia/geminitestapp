// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  SemanticOutputKind,
  SemanticTargetField,
  SemanticScripterDefinition,
  SemanticMappedRecord,
  SemanticFieldIssueSeverity,
  SemanticFieldMapIssue,
  SemanticExtractedRecord,
  SemanticRunSummary,
  SemanticRunResult,
  SemanticProductRecord,
  SemanticArticleRecord,
  SemanticJobRecord,
} from './types';

// ── Schemas ───────────────────────────────────────────────────────────────────
export {
  semanticOutputKindSchema,
  semanticTargetFieldSchema,
  semanticFieldMapSchema,
  semanticScripterDefinitionSchema,
} from './schema';

// ── Field map ─────────────────────────────────────────────────────────────────
export {
  SEMANTIC_EMPTY_RECORD,
  evaluateSemanticFieldMap,
} from './field-map';
export type { SemanticFieldMapEvaluation } from './field-map';

// ── Engine ────────────────────────────────────────────────────────────────────
export {
  loadSemanticScripter,
  loadSemanticScripterFromJson,
  upgradeToSemanticDefinition,
  runSemanticScripter,
  getCleanRecords,
  getMapped,
} from './engine';
export type { LoadSemanticScripterResult, SemanticRunOptions } from './engine';

// ── Adapters ──────────────────────────────────────────────────────────────────
export {
  toSemanticProductRecord,
  toSemanticProductRecords,
} from './adapters/product';

export {
  toSemanticArticleResult,
  toSemanticArticleRecords,
} from './adapters/article';
export type { ArticleAdapterContext, ArticleAdapterResult } from './adapters/article';

export {
  toSemanticJobRecord,
  toSemanticJobRecords,
} from './adapters/job';
export type { JobAdapterContext } from './adapters/job';
