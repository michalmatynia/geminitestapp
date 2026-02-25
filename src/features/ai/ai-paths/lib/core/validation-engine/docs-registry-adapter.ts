import 'server-only';

import {
  addAssertionsWithDedup,
  hashText,
} from './docs-registry-adapter.helpers';
import {
  buildCoverageMatrixSourcePayload,
  buildMarkdownSourcePayload,
  buildNodeCatalogSourcePayload,
  buildSemanticNodesCatalogSourcePayload,
  buildSnippetSourcePayload,
  buildTooltipDocsCatalogSourcePayload,
  readAiPathsDocsManifest,
} from './docs-registry-adapter.loaders';
import {
  type AiPathsDocAssertion,
  type AiPathsDocAssertionConditionInput,
  type AiPathsDocsManifestSource,
  type AiPathsDocsSnapshot,
  type AiPathsDocsSnapshotSource,
} from './docs-registry-adapter.types';

export const buildAiPathsValidationDocsSnapshot = async (): Promise<AiPathsDocsSnapshot> => {
  const warnings: string[] = [];
  const sources: AiPathsDocsSnapshotSource[] = [];
  const assertionById = new Map<string, AiPathsDocAssertion>();
  const manifest = await readAiPathsDocsManifest(warnings);
  
  const enabledSources = manifest.sources
    .filter((source: AiPathsDocsManifestSource): boolean => source.enabled)
    .sort((left, right) => {
      if (left.priority !== right.priority) return left.priority - right.priority;
      return left.id.localeCompare(right.id);
    });

  for (const source of enabledSources) {
    if (source.type === 'markdown_assertion') {
      const markdownPayload = await buildMarkdownSourcePayload({ source, warnings });
      addAssertionsWithDedup({
        source,
        assertions: markdownPayload.assertions,
        assertionById,
        warnings,
      });
      sources.push({
        id: source.id,
        path: source.path,
        type: source.type,
        hash: markdownPayload.hash,
        assertionCount: markdownPayload.assertions.length,
        enabled: true,
        priority: source.priority,
        ...(source.tags.length > 0 ? { tags: source.tags } : {}),
      });
      continue;
    }

    if (source.type === 'node_docs_catalog') {
      const catalogPayload = buildNodeCatalogSourcePayload(source);
      addAssertionsWithDedup({
        source,
        assertions: catalogPayload.assertions,
        assertionById,
        warnings,
      });
      sources.push({
        id: source.id,
        path: source.path,
        type: source.type,
        hash: catalogPayload.hash,
        assertionCount: catalogPayload.assertions.length,
        enabled: true,
        priority: source.priority,
        ...(source.tags.length > 0 ? { tags: source.tags } : {}),
      });
      continue;
    }

    if (source.type === 'docs_snippet') {
      const snippetPayload = buildSnippetSourcePayload({ source, warnings });
      addAssertionsWithDedup({
        source,
        assertions: snippetPayload.assertions,
        assertionById,
        warnings,
      });
      sources.push({
        id: source.id,
        path: source.path,
        type: source.type,
        hash: snippetPayload.hash,
        assertionCount: snippetPayload.assertions.length,
        enabled: true,
        priority: source.priority,
        ...(source.tags.length > 0 ? { tags: source.tags } : {}),
        ...(snippetPayload.snippetNames.length > 0
          ? { snippetNames: snippetPayload.snippetNames }
          : {}),
      });
      continue;
    }

    if (source.type === 'semantic_nodes_catalog') {
      const semanticPayload = await buildSemanticNodesCatalogSourcePayload({
        source,
        warnings,
      });
      addAssertionsWithDedup({
        source,
        assertions: semanticPayload.assertions,
        assertionById,
        warnings,
      });
      sources.push({
        id: source.id,
        path: source.path,
        type: source.type,
        hash: semanticPayload.hash,
        assertionCount: semanticPayload.assertions.length,
        enabled: true,
        priority: source.priority,
        ...(source.tags.length > 0 ? { tags: source.tags } : {}),
      });
      continue;
    }

    if (source.type === 'tooltip_docs_catalog') {
      const tooltipPayload = await buildTooltipDocsCatalogSourcePayload({
        source,
        warnings,
      });
      addAssertionsWithDedup({
        source,
        assertions: tooltipPayload.assertions,
        assertionById,
        warnings,
      });
      sources.push({
        id: source.id,
        path: source.path,
        type: source.type,
        hash: tooltipPayload.hash,
        assertionCount: tooltipPayload.assertions.length,
        enabled: true,
        priority: source.priority,
        ...(source.tags.length > 0 ? { tags: source.tags } : {}),
      });
      continue;
    }

    if (source.type === 'coverage_matrix_csv') {
      const coveragePayload = await buildCoverageMatrixSourcePayload({
        source,
        warnings,
      });
      addAssertionsWithDedup({
        source,
        assertions: coveragePayload.assertions,
        assertionById,
        warnings,
      });
      sources.push({
        id: source.id,
        path: source.path,
        type: source.type,
        hash: coveragePayload.hash,
        assertionCount: coveragePayload.assertions.length,
        enabled: true,
        priority: source.priority,
        ...(source.tags.length > 0 ? { tags: source.tags } : {}),
      });
    }
  }

  const assertions = Array.from(assertionById.values()).sort((left, right) => {
    const leftSequence =
      typeof left.sequenceHint === 'number' && Number.isFinite(left.sequenceHint)
        ? left.sequenceHint
        : Number.MAX_SAFE_INTEGER;
    const rightSequence =
      typeof right.sequenceHint === 'number' && Number.isFinite(right.sequenceHint)
        ? right.sequenceHint
        : Number.MAX_SAFE_INTEGER;
    if (leftSequence !== rightSequence) return leftSequence - rightSequence;
    return left.id.localeCompare(right.id);
  });

  const generatedAt = new Date().toISOString();
  const snapshotHash = hashText(
    JSON.stringify({
      manifestVersion: manifest.version,
      sources: sources.map((source) => ({
        id: source.id,
        hash: source.hash,
        priority: source.priority,
      })),
      warnings,
      assertions: assertions.map((assertion) => ({
        id: assertion.id,
        sourceId: assertion.sourceId,
        sourcePath: assertion.sourcePath,
        sourceHash: assertion.sourceHash,
      })),
    }),
  );

  return {
    generatedAt,
    snapshotHash,
    sources,
    warnings,
    assertions,
  };
};

export type {
  AiPathsDocAssertion,
  AiPathsDocsSnapshot,
  AiPathsDocsSnapshotSource,
  AiPathsDocAssertionConditionInput,
};
