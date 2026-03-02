import type {
  AiPathsDocsManifestSourceType,
  AiPathsDocAssertionConditionInput,
  AiPathsDocAssertion,
  AiPathsDocsSnapshotSource,
  AiPathsDocsSnapshot,
  AiPathsDocsManifestSource,
  AiPathsDocsManifest,
  CoverageMatrixDimensionValue,
  CoverageMatrixRow,
} from '@/shared/contracts/ai-paths';

export type {
  AiPathsDocsManifestSourceType,
  AiPathsDocAssertionConditionInput,
  AiPathsDocAssertion,
  AiPathsDocsSnapshotSource,
  AiPathsDocsSnapshot,
  AiPathsDocsManifestSource,
  AiPathsDocsManifest,
  CoverageMatrixDimensionValue,
  CoverageMatrixRow,
};

export {
  docAssertionConditionSchema,
  docAssertionSchema,
  docsManifestSourceTypeSchema,
  docsManifestSourceSchema,
  docsManifestSchema,
  semanticNodeIndexRowSchema,
  tooltipCatalogEntrySchema,
  coverageMatrixRowSchema,
} from '@/shared/contracts/ai-paths';
