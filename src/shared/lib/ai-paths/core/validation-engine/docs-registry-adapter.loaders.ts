import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { AI_PATHS_NODE_DOCS } from '../docs/node-docs';
import {
  CRITICAL_CONFIG_FIELD_PATTERN,
  DOC_ASSERTION_BLOCK_REGEX,
  DOCS_MANIFEST_PATH,
  DOCS_SNIPPET_REGISTRY,
  LEGACY_FALLBACK_MANIFEST,
  NODE_LABEL_TO_TYPE,
} from './docs-registry-adapter.constants';
import {
  coverageDimensionSeverity,
  hashText,
  inferEnumListFromDescription,
  normalizeCoverageDimension,
  normalizeLabel,
  parseCsvRecords,
  sanitizeFieldPathForId,
  shouldInferRequiredBooleanFromDefault,
  toModuleFromNodeType,
  uniqueStringList,
} from './docs-registry-adapter.helpers';
import {
  docAssertionSchema,
  docsManifestSchema,
  docsManifestSourceSchema,
  semanticNodeIndexRowSchema,
  tooltipCatalogEntrySchema,
  coverageMatrixRowSchema,
  type AiPathsDocAssertion,
  type AiPathsDocsManifest,
  type AiPathsDocsManifestSource,
  type CoverageMatrixRow,
  type AiPathsDocAssertionConditionInput,
} from './docs-registry-adapter.types';

export const parseSnippetWiringAssertions = (
  snippetName: string,
  snippetText: string,
  sourceHash: string
): AiPathsDocAssertion[] => {
  const sourcePath = `src/features/ai/ai-paths/components/ai-paths-settings/docs-snippets.ts#${snippetName}`;
  const snippetSlug = snippetName.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
  const parsed = snippetText
    .split('\n')
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => line.includes('\u2192') || line.includes('->'))
    .map((line: string): AiPathsDocAssertion[] | null => {
      const normalized = line.replace(/\s+/g, ' ').replace(/->/g, '\u2192');
      const [leftRaw, rightRaw] = normalized.split('\u2192').map((chunk) => chunk.trim());
      if (!leftRaw || !rightRaw) return null;
      const [fromLabelRaw, fromPortRaw] = leftRaw.split('.').map((chunk) => chunk.trim());
      const [toLabelRaw, toPortRaw] = rightRaw.split('.').map((chunk) => chunk.trim());
      if (!fromLabelRaw || !toLabelRaw || !fromPortRaw || !toPortRaw) return null;
      const fromType = NODE_LABEL_TO_TYPE[normalizeLabel(fromLabelRaw)];
      const toType = NODE_LABEL_TO_TYPE[normalizeLabel(toLabelRaw)];
      if (!fromType || !toType) return null;
      const id = `snippet_wire_${snippetSlug}_${fromType}_${fromPortRaw}_to_${toType}_${toPortRaw}`
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_');
      const forwardAssertion: AiPathsDocAssertion = {
        id,
        title: `${fromLabelRaw}.${fromPortRaw} connects to ${toLabelRaw}.${toPortRaw}`,
        module: toModuleFromNodeType(fromType),
        severity: 'info',
        description: `Wiring guideline from ${snippetName}: ${fromLabelRaw}.${fromPortRaw} -> ${toLabelRaw}.${toPortRaw}.`,
        recommendation: `Connect ${fromLabelRaw}.${fromPortRaw} output into ${toLabelRaw}.${toPortRaw} input where applicable.`,
        appliesToNodeTypes: [fromType],
        conditionMode: 'all',
        sequenceHint: 300,
        confidence: 0.6,
        sourcePath,
        sourceType: 'docs_snippet',
        sourceHash,
        docsBindings: [sourcePath],
        conditions: [
          {
            operator: 'wired_to',
            fromPort: fromPortRaw,
            toPort: toPortRaw,
            toNodeType: toType,
          },
        ],
      };
      const reverseId =
        `snippet_wire_rev_${snippetSlug}_${toType}_${toPortRaw}_from_${fromType}_${fromPortRaw}`
          .toLowerCase()
          .replace(/[^a-z0-9_]+/g, '_');
      const reverseAssertion: AiPathsDocAssertion = {
        id: reverseId,
        title: `${toLabelRaw}.${toPortRaw} expects ${fromLabelRaw}.${fromPortRaw}`,
        module: toModuleFromNodeType(toType),
        severity: 'info',
        description: `Reverse wiring guideline from ${snippetName}: ${toLabelRaw}.${toPortRaw} should be fed from ${fromLabelRaw}.${fromPortRaw}.`,
        recommendation: `Wire ${toLabelRaw}.${toPortRaw} from ${fromLabelRaw}.${fromPortRaw} where this branch is used.`,
        appliesToNodeTypes: [toType],
        conditionMode: 'all',
        sequenceHint: 302,
        confidence: 0.58,
        sourcePath,
        sourceType: 'docs_snippet',
        sourceHash,
        docsBindings: [sourcePath],
        conditions: [
          {
            operator: 'wired_from',
            fromPort: fromPortRaw,
            toPort: toPortRaw,
            fromNodeType: fromType,
          },
        ],
      };
      return [forwardAssertion, reverseAssertion];
    })
    .flatMap((entry: AiPathsDocAssertion[] | null): AiPathsDocAssertion[] =>
      Array.isArray(entry) ? entry : []
    );
  const seen = new Set<string>();
  return parsed.filter((assertion: AiPathsDocAssertion): boolean => {
    if (seen.has(assertion.id)) return false;
    seen.add(assertion.id);
    return true;
  });
};

export const extractAiPathsAssertionsFromMarkdown = (
  markdown: string,
  sourcePath: string,
  sourceHash: string
): { assertions: AiPathsDocAssertion[]; warnings: string[] } => {
  const assertions: AiPathsDocAssertion[] = [];
  const warnings: string[] = [];
  const matches = Array.from(markdown.matchAll(DOC_ASSERTION_BLOCK_REGEX));

  matches.forEach((match: RegExpMatchArray, index: number) => {
    const raw = (match[1] ?? '').trim();
    if (!raw) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      warnings.push(`${sourcePath}: assertion block ${index + 1} is invalid JSON.`);
      return;
    }
    const result = docAssertionSchema.safeParse(parsed);
    if (!result.success) {
      warnings.push(`${sourcePath}: assertion block ${index + 1} failed schema validation.`);
      return;
    }
    const value = result.data;
    assertions.push({
      id: value.id,
      title: value.title,
      module: value.module,
      severity: value.severity ?? 'warning',
      ...(value.description ? { description: value.description } : {}),
      ...(value.recommendation ? { recommendation: value.recommendation } : {}),
      ...(value.appliesToNodeTypes?.length ? { appliesToNodeTypes: value.appliesToNodeTypes } : {}),
      ...(value.sequenceHint !== undefined ? { sequenceHint: value.sequenceHint } : {}),
      ...(value.weight !== undefined ? { weight: value.weight } : {}),
      ...(value.forceProbabilityIfFailed !== undefined
        ? { forceProbabilityIfFailed: value.forceProbabilityIfFailed }
        : {}),
      ...(value.conditionMode ? { conditionMode: value.conditionMode } : {}),
      ...(value.docsBindings?.length ? { docsBindings: value.docsBindings } : {}),
      ...(value.version ? { version: value.version } : {}),
      ...(value.tags?.length ? { tags: value.tags } : {}),
      ...(value.deprecates?.length ? { deprecates: value.deprecates } : {}),
      sourcePath,
      sourceType: 'markdown_assertion',
      sourceHash,
      confidence: value.confidence ?? 0.9,
      conditions: value.conditions as AiPathsDocAssertionConditionInput[],
    });
  });

  return { assertions, warnings };
};

export const buildNodeDocsCatalogAssertions = (): AiPathsDocAssertion[] => {
  const sourcePath = 'src/features/ai/ai-paths/lib/core/docs/node-docs.ts';
  const sourceHash = hashText(JSON.stringify(AI_PATHS_NODE_DOCS));
  const assertions: AiPathsDocAssertion[] = [];
  const seenIds = new Set<string>();

  const pushAssertion = (assertion: AiPathsDocAssertion): void => {
    if (seenIds.has(assertion.id)) return;
    seenIds.add(assertion.id);
    assertions.push(assertion);
  };

  AI_PATHS_NODE_DOCS.forEach((doc) => {
    doc.config.forEach((field) => {
      const normalizedPath = field.path.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
      const conditionField = `config.${field.path}`;
      const isCritical = CRITICAL_CONFIG_FIELD_PATTERN.test(field.path);
      if (isCritical) {
        pushAssertion({
          id: `catalog.${doc.type}.${normalizedPath}.non_empty`,
          title: `${doc.title}: ${field.path} should be configured`,
          module: toModuleFromNodeType(doc.type),
          severity: /entityid|collection|modelid|event/i.test(field.path) ? 'error' : 'warning',
          description: field.description,
          recommendation: `Set ${conditionField} in ${doc.title} configuration.`,
          appliesToNodeTypes: [doc.type],
          sequenceHint: 260,
          confidence: 0.55,
          sourcePath,
          sourceType: 'node_docs_catalog',
          sourceHash,
          docsBindings: [sourcePath],
          conditions: [
            {
              operator: 'non_empty',
              field: conditionField,
            },
          ],
        });
      }

      const enumValues = inferEnumListFromDescription(
        field.path,
        field.description,
        field.defaultValue
      );
      if (enumValues.length >= 2) {
        pushAssertion({
          id: `catalog.${doc.type}.${normalizedPath}.allowed_values`,
          title: `${doc.title}: ${field.path} uses documented values`,
          module: toModuleFromNodeType(doc.type),
          severity:
            /(provider|event|operation|runtimeMode|failPolicy|actionCategory|action)$/i.test(
              field.path
            )
              ? 'error'
              : 'warning',
          description: `${field.description} Allowed values inferred from docs: ${enumValues.join(', ')}.`,
          recommendation: `Set ${conditionField} to one of: ${enumValues.join(', ')}.`,
          appliesToNodeTypes: [doc.type],
          sequenceHint: 262,
          confidence: 0.5,
          sourcePath,
          sourceType: 'node_docs_catalog',
          sourceHash,
          docsBindings: [sourcePath],
          conditions: [
            {
              operator: 'in',
              field: conditionField,
              list: enumValues,
            },
          ],
        });
      }

      if (shouldInferRequiredBooleanFromDefault(field.path, field.defaultValue)) {
        pushAssertion({
          id: `catalog.${doc.type}.${normalizedPath}.exists`,
          title: `${doc.title}: ${field.path} flag explicitly set`,
          module: toModuleFromNodeType(doc.type),
          severity: 'info',
          description: `${field.description} Documentation indicates this flag should be explicit for predictable runtime behavior.`,
          recommendation: `Set ${conditionField} explicitly (true/false).`,
          appliesToNodeTypes: [doc.type],
          sequenceHint: 264,
          confidence: 0.45,
          sourcePath,
          sourceType: 'node_docs_catalog',
          sourceHash,
          docsBindings: [sourcePath],
          conditions: [
            {
              operator: 'exists',
              field: conditionField,
            },
          ],
        });
      }
    });
  });
  return assertions;
};

export const normalizeManifestSource = (
  source: z.infer<typeof docsManifestSourceSchema>
): AiPathsDocsManifestSource => ({
  id: source.id.trim(),
  type: source.type,
  path: source.path.trim(),
  enabled: source.enabled !== false,
  priority:
    typeof source.priority === 'number' && Number.isFinite(source.priority)
      ? Math.max(0, Math.trunc(source.priority))
      : 100,
  tags: uniqueStringList(source.tags ?? []),
  ...(source.snippetNames?.length ? { snippetNames: uniqueStringList(source.snippetNames) } : {}),
});

export const normalizeManifest = (
  raw: z.infer<typeof docsManifestSchema>,
  warnings: string[]
): AiPathsDocsManifest => {
  const seenIds = new Set<string>();
  const sources: AiPathsDocsManifestSource[] = [];
  raw.sources.forEach((source) => {
    const normalized = normalizeManifestSource(source);
    if (seenIds.has(normalized.id)) {
      warnings.push(
        `Manifest source id "${normalized.id}" is duplicated and later entries are ignored.`
      );
      return;
    }
    seenIds.add(normalized.id);
    sources.push(normalized);
  });
  return {
    version: raw.version?.trim() || '1.0.0',
    sources,
  };
};

export const readAiPathsDocsManifest = async (warnings: string[]): Promise<AiPathsDocsManifest> => {
  const absolutePath = path.resolve(process.cwd(), DOCS_MANIFEST_PATH);
  try {
    const manifestText = await readFile(absolutePath, 'utf8');
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(manifestText);
    } catch {
      warnings.push(`${DOCS_MANIFEST_PATH}: invalid JSON. Falling back to built-in sources.`);
      return LEGACY_FALLBACK_MANIFEST;
    }
    const result = docsManifestSchema.safeParse(parsed);
    if (!result.success) {
      warnings.push(
        `${DOCS_MANIFEST_PATH}: schema validation failed. Falling back to built-in sources.`
      );
      return LEGACY_FALLBACK_MANIFEST;
    }
    const normalized = normalizeManifest(result.data, warnings);
    if (normalized.sources.length === 0) {
      warnings.push(
        `${DOCS_MANIFEST_PATH}: no valid sources enabled. Falling back to built-in sources.`
      );
      return LEGACY_FALLBACK_MANIFEST;
    }
    return normalized;
  } catch (error) {
    warnings.push(
      `${DOCS_MANIFEST_PATH}: failed to read manifest (${error instanceof Error ? error.message : 'unknown error'}). Falling back to built-in sources.`
    );
    return LEGACY_FALLBACK_MANIFEST;
  }
};

export const buildMarkdownSourcePayload = async (args: {
  source: AiPathsDocsManifestSource;
  warnings: string[];
}): Promise<{ hash: string; assertions: AiPathsDocAssertion[] }> => {
  const { source, warnings } = args;
  const absolutePath = path.resolve(process.cwd(), source.path);
  try {
    const content = await readFile(absolutePath, 'utf8');
    const hash = hashText(content);
    const extracted = extractAiPathsAssertionsFromMarkdown(content, source.path, hash);
    extracted.warnings.forEach((warning) => warnings.push(warning));
    return {
      hash,
      assertions: extracted.assertions,
    };
  } catch (error) {
    warnings.push(
      `${source.path}: failed to read markdown source (${error instanceof Error ? error.message : 'unknown error'}).`
    );
    return {
      hash: hashText(`read_error:${source.path}`),
      assertions: [],
    };
  }
};

export const buildNodeCatalogSourcePayload = (
  source: AiPathsDocsManifestSource
): { hash: string; assertions: AiPathsDocAssertion[] } => {
  const sourceHash = hashText(JSON.stringify(AI_PATHS_NODE_DOCS));
  const assertions = buildNodeDocsCatalogAssertions().map(
    (assertion: AiPathsDocAssertion): AiPathsDocAssertion => ({
      ...assertion,
      sourcePath: source.path,
      sourceHash,
      sourceType: 'node_docs_catalog',
    })
  );
  return {
    hash: sourceHash,
    assertions,
  };
};

export const buildSnippetSourcePayload = (args: {
  source: AiPathsDocsManifestSource;
  warnings: string[];
}): { hash: string; assertions: AiPathsDocAssertion[]; snippetNames: string[] } => {
  const { source, warnings } = args;
  const snippetNames = uniqueStringList(
    source.snippetNames?.length ? source.snippetNames : Object.keys(DOCS_SNIPPET_REGISTRY)
  );
  const validSnippetNames = snippetNames.filter((snippetName: string): boolean => {
    const exists = Boolean(DOCS_SNIPPET_REGISTRY[snippetName]);
    if (!exists) {
      warnings.push(`Snippet source "${source.id}" references unknown snippet "${snippetName}".`);
    }
    return exists;
  });
  const snippetsRaw = validSnippetNames
    .map((snippetName: string) => `${snippetName}\n${DOCS_SNIPPET_REGISTRY[snippetName] || ''}`)
    .join('\n');
  const hash = hashText(snippetsRaw);
  const assertions = validSnippetNames.flatMap((snippetName: string) =>
    parseSnippetWiringAssertions(snippetName, DOCS_SNIPPET_REGISTRY[snippetName] || '', hash).map(
      (assertion: AiPathsDocAssertion): AiPathsDocAssertion => ({
        ...assertion,
        sourcePath: source.path,
        sourceType: 'docs_snippet',
        sourceHash: hash,
      })
    )
  );
  return {
    hash,
    assertions,
    snippetNames: validSnippetNames,
  };
};

export const buildSemanticNodesCatalogSourcePayload = async (args: {
  source: AiPathsDocsManifestSource;
  warnings: string[];
}): Promise<{ hash: string; assertions: AiPathsDocAssertion[] }> => {
  const { source, warnings } = args;
  const absolutePath = path.resolve(process.cwd(), source.path);
  try {
    const content = await readFile(absolutePath, 'utf8');
    const parsed = JSON.parse(content) as unknown;
    const result = z.array(semanticNodeIndexRowSchema).safeParse(parsed);
    if (!result.success) {
      warnings.push(`${source.path}: semantic nodes catalog schema validation failed.`);
      return {
        hash: hashText(`parse_error:${source.path}`),
        assertions: [],
      };
    }

    const rows = result.data;
    const allowedNodeTypes = uniqueStringList(rows.map((row) => row.nodeType));
    const nodeHashSet = new Set<string>();
    const nodeTypesByHash = new Map<string, string>();
    rows.forEach((row) => {
      nodeHashSet.add(row.nodeHash);
      const existingType = nodeTypesByHash.get(row.nodeHash);
      if (existingType && existingType !== row.nodeType) {
        warnings.push(
          `${source.path}: semantic node hash collision between "${existingType}" and "${row.nodeType}".`
        );
        return;
      }
      nodeTypesByHash.set(row.nodeHash, row.nodeType);
    });
    const hash = hashText(JSON.stringify(rows));
    const docsBinding = source.path;

    const assertions: AiPathsDocAssertion[] = [
      {
        id: 'semantic.catalog.node_types_known',
        title: 'Node types are known in semantic catalog',
        module: 'graph',
        severity: 'error',
        description: `All node types in graph should resolve to known semantic catalog node definitions (catalog node hashes: ${nodeHashSet.size}).`,
        recommendation:
          'Replace unknown node types with supported node types listed in semantic grammar docs.',
        sequenceHint: 15,
        weight: 56,
        forceProbabilityIfFailed: 0,
        confidence: 0.88,
        sourcePath: source.path,
        sourceType: 'semantic_nodes_catalog',
        sourceHash: hash,
        docsBindings: [docsBinding],
        tags: ['semantic-grammar', 'catalog', 'node-types'],
        conditions: [
          {
            operator: 'node_types_known',
            list: allowedNodeTypes,
          },
        ],
      },
      {
        id: 'semantic.catalog.node_ids_unique',
        title: 'Node IDs are unique',
        module: 'graph',
        severity: 'error',
        description: 'Semantic graph nodes should have unique IDs to avoid wiring collisions.',
        recommendation: 'Regenerate or rename duplicated node IDs.',
        sequenceHint: 16,
        weight: 54,
        forceProbabilityIfFailed: 0,
        confidence: 0.86,
        sourcePath: source.path,
        sourceType: 'semantic_nodes_catalog',
        sourceHash: hash,
        docsBindings: [docsBinding],
        tags: ['semantic-grammar', 'catalog', 'node-ids'],
        conditions: [
          {
            operator: 'node_ids_unique',
          },
        ],
      },
      {
        id: 'semantic.catalog.edge_ids_unique',
        title: 'Edge IDs are unique',
        module: 'graph',
        severity: 'error',
        description: 'Semantic graph edges should have unique IDs for deterministic graph updates.',
        recommendation: 'Regenerate duplicated edge IDs or rebuild duplicated edges.',
        sequenceHint: 17,
        weight: 50,
        forceProbabilityIfFailed: 0,
        confidence: 0.84,
        sourcePath: source.path,
        sourceType: 'semantic_nodes_catalog',
        sourceHash: hash,
        docsBindings: [docsBinding],
        tags: ['semantic-grammar', 'catalog', 'edge-ids'],
        conditions: [
          {
            operator: 'edge_ids_unique',
          },
        ],
      },
      {
        id: 'semantic.catalog.node_positions_finite',
        title: 'Node positions are finite',
        module: 'graph',
        severity: 'warning',
        description:
          'Node positions should be finite numbers for reliable canvas rendering and export.',
        recommendation: 'Reset invalid node positions and re-save the path.',
        sequenceHint: 18,
        weight: 18,
        confidence: 0.72,
        sourcePath: source.path,
        sourceType: 'semantic_nodes_catalog',
        sourceHash: hash,
        docsBindings: [docsBinding],
        tags: ['semantic-grammar', 'catalog', 'canvas'],
        conditions: [
          {
            operator: 'node_positions_finite',
          },
        ],
      },
    ];

    return { hash, assertions };
  } catch (error) {
    warnings.push(
      `${source.path}: failed to read semantic nodes catalog (${error instanceof Error ? error.message : 'unknown error'}).`
    );
    return {
      hash: hashText(`read_error:${source.path}`),
      assertions: [],
    };
  }
};

export const buildTooltipDocsCatalogSourcePayload = async (args: {
  source: AiPathsDocsManifestSource;
  warnings: string[];
}): Promise<{ hash: string; assertions: AiPathsDocAssertion[] }> => {
  const { source, warnings } = args;
  const absolutePath = path.resolve(process.cwd(), source.path);
  try {
    const content = await readFile(absolutePath, 'utf8');
    const parsed = JSON.parse(content) as unknown;
    const result = z.array(tooltipCatalogEntrySchema).safeParse(parsed);
    if (!result.success) {
      warnings.push(`${source.path}: tooltip catalog schema validation failed.`);
      return {
        hash: hashText(`parse_error:${source.path}`),
        assertions: [],
      };
    }
    const entries = result.data;
    const hash = hashText(JSON.stringify(entries));
    const docsBinding = source.path;
    const hasRegexTooltipBundle = [
      'regex_placeholder_text',
      'regex_placeholder_lines',
      'regex_placeholder_value',
    ].every((id) => entries.some((entry) => entry.id === id));
    if (!hasRegexTooltipBundle) {
      return { hash, assertions: [] };
    }
    return {
      hash,
      assertions: [
        {
          id: 'tooltip.regex.ai_prompt_supported_placeholders',
          title: 'Regex AI prompt uses supported placeholders',
          module: 'parser',
          severity: 'warning',
          appliesToNodeTypes: ['regex'],
          description:
            'Regex AI prompt templates should use documented placeholders: {{text}}, {{lines}}, or {{value}}.',
          recommendation:
            'Include at least one supported placeholder in regex.aiPrompt or leave aiPrompt empty.',
          sequenceHint: 266,
          weight: 14,
          confidence: 0.74,
          sourcePath: source.path,
          sourceType: 'tooltip_docs_catalog',
          sourceHash: hash,
          docsBindings: [docsBinding],
          tags: ['tooltip', 'regex', 'prompt-template'],
          conditionMode: 'any',
          conditions: [
            {
              operator: 'non_empty',
              field: 'config.regex.aiPrompt',
              negate: true,
            },
            {
              operator: 'matches_regex',
              field: 'config.regex.aiPrompt',
              expected: '\\{\\{(text|lines|value)\\}\\}',
            },
          ],
        },
      ],
    };
  } catch (error) {
    warnings.push(
      `${source.path}: failed to read tooltip catalog (${error instanceof Error ? error.message : 'unknown error'}).`
    );
    return {
      hash: hashText(`read_error:${source.path}`),
      assertions: [],
    };
  }
};

export const buildCoverageMatrixSourcePayload = async (args: {
  source: AiPathsDocsManifestSource;
  warnings: string[];
}): Promise<{ hash: string; assertions: AiPathsDocAssertion[] }> => {
  const { source, warnings } = args;
  const absolutePath = path.resolve(process.cwd(), source.path);
  try {
    const content = await readFile(absolutePath, 'utf8');
    const parsedRows = parseCsvRecords(content);
    const rows = parsedRows
      .map((row: Record<string, string>, index: number): CoverageMatrixRow | null => {
        const result = coverageMatrixRowSchema.safeParse(row);
        if (!result.success) {
          warnings.push(
            `${source.path}: coverage row ${index + 2} failed schema validation and was ignored.`
          );
          return null;
        }
        return result.data;
      })
      .filter((row: CoverageMatrixRow | null): row is CoverageMatrixRow => row !== null);
    const hash = hashText(JSON.stringify(rows));
    const docsBinding = source.path;
    const assertions: AiPathsDocAssertion[] = [];
    const seen = new Set<string>();
    const nodeDocsByType = new Map(AI_PATHS_NODE_DOCS.map((doc) => [doc.type as string, doc]));

    const pushAssertion = (assertion: AiPathsDocAssertion): void => {
      if (seen.has(assertion.id)) return;
      seen.add(assertion.id);
      assertions.push(assertion);
    };

    rows.forEach((row: CoverageMatrixRow) => {
      const nodeType = row.node_type.trim();
      if (!nodeType) return;
      const normalizedCoverage = normalizeCoverageDimension(row.coverage_status);
      if (nodeType === 'cross_graph_invariants') {
        pushAssertion({
          id: 'coverage.cross_graph.integrity_bundle',
          title: 'Cross-graph integrity bundle',
          module: 'graph',
          severity: 'warning',
          description:
            'Coverage matrix requires cross-graph invariants: unique IDs and resolvable, declared edge endpoints.',
          recommendation:
            'Fix duplicated node/edge IDs and reconnect dangling or invalid-port edges.',
          sequenceHint: 29,
          weight: 26,
          confidence: 0.8,
          sourcePath: source.path,
          sourceType: 'coverage_matrix_csv',
          sourceHash: hash,
          docsBindings: [docsBinding],
          tags: ['coverage-matrix', 'cross-graph', normalizedCoverage],
          conditionMode: 'all',
          conditions: [
            { operator: 'node_ids_unique' },
            { operator: 'edge_ids_unique' },
            { operator: 'edge_endpoints_resolve' },
            { operator: 'edge_ports_declared' },
          ],
        });
        return;
      }

      const nodeDoc = nodeDocsByType.get(nodeType);
      if (!nodeDoc) {
        warnings.push(
          `${source.path}: coverage row "${nodeType}" has no matching node docs entry.`
        );
        return;
      }
      const module = toModuleFromNodeType(nodeType);
      const baseTags = ['coverage-matrix', nodeType, normalizedCoverage];
      const noteText = row.notes?.trim();
      const wiringState = normalizeCoverageDimension(row.wiring_integrity);
      const configState = normalizeCoverageDimension(row.config_completeness);
      const runtimeState = normalizeCoverageDimension(row.runtime_safety);
      const asyncState = normalizeCoverageDimension(row.async_correctness);
      const persistenceState = normalizeCoverageDimension(row.persistence_safety);

      if ((configState === 'yes' || configState === 'partial') && nodeDoc.config.length > 0) {
        pushAssertion({
          id: `coverage.${nodeType}.config.object_non_empty`,
          title: `${nodeDoc.title}: config object should not be empty`,
          module,
          severity: coverageDimensionSeverity(configState, normalizedCoverage),
          description:
            noteText && noteText.length > 0
              ? `Coverage matrix config-completeness signal for ${nodeDoc.title}. ${noteText}`
              : `Coverage matrix marks ${nodeDoc.title} for config completeness checks.`,
          recommendation: 'Set required config fields for this node type before runtime execution.',
          appliesToNodeTypes: [nodeType],
          sequenceHint: 270,
          confidence: configState === 'yes' ? 0.62 : 0.5,
          sourcePath: source.path,
          sourceType: 'coverage_matrix_csv',
          sourceHash: hash,
          docsBindings: [docsBinding],
          tags: [...baseTags, 'config-completeness'],
          conditions: [
            {
              operator: 'non_empty',
              field: 'config',
            },
          ],
        });
      }

      if (
        (wiringState === 'yes' || wiringState === 'partial') &&
        nodeDoc.inputs.length > 0 &&
        nodeType !== 'trigger' &&
        nodeType !== 'simulation'
      ) {
        pushAssertion({
          id: `coverage.${nodeType}.wiring.has_incoming`,
          title: `${nodeDoc.title}: receives upstream data`,
          module,
          severity: coverageDimensionSeverity(wiringState, normalizedCoverage),
          description:
            noteText && noteText.length > 0
              ? `Coverage matrix wiring signal for ${nodeDoc.title}. ${noteText}`
              : `Coverage matrix marks ${nodeDoc.title} for wiring integrity checks.`,
          recommendation: 'Connect at least one upstream edge into this node type.',
          appliesToNodeTypes: [nodeType],
          sequenceHint: 272,
          confidence: wiringState === 'yes' ? 0.57 : 0.46,
          sourcePath: source.path,
          sourceType: 'coverage_matrix_csv',
          sourceHash: hash,
          docsBindings: [docsBinding],
          tags: [...baseTags, 'wiring-integrity', 'incoming'],
          conditions: [
            {
              operator: 'has_incoming_port',
            },
          ],
        });
      }

      if (
        (wiringState === 'yes' || wiringState === 'partial') &&
        nodeDoc.outputs.length > 0 &&
        nodeType !== 'viewer'
      ) {
        pushAssertion({
          id: `coverage.${nodeType}.wiring.has_outgoing`,
          title: `${nodeDoc.title}: emits downstream data`,
          module,
          severity: 'info',
          description:
            noteText && noteText.length > 0
              ? `Coverage matrix downstream wiring signal for ${nodeDoc.title}. ${noteText}`
              : `Coverage matrix marks ${nodeDoc.title} for downstream wiring checks.`,
          recommendation: 'Connect at least one outgoing edge from this node type.',
          appliesToNodeTypes: [nodeType],
          sequenceHint: 273,
          confidence: wiringState === 'yes' ? 0.53 : 0.44,
          sourcePath: source.path,
          sourceType: 'coverage_matrix_csv',
          sourceHash: hash,
          docsBindings: [docsBinding],
          tags: [...baseTags, 'wiring-integrity', 'outgoing'],
          conditions: [
            {
              operator: 'has_outgoing_port',
            },
          ],
        });
      }

      const runtimeWaitField = nodeDoc.config.find(
        (field) => field.path === 'runtime.waitForInputs'
      );
      if ((runtimeState === 'yes' || runtimeState === 'partial') && runtimeWaitField) {
        pushAssertion({
          id: `coverage.${nodeType}.runtime.wait_for_inputs_explicit`,
          title: `${nodeDoc.title}: runtime wait-for-inputs is explicit`,
          module,
          severity: coverageDimensionSeverity(runtimeState, normalizedCoverage),
          description:
            'Coverage matrix runtime-safety signal requires explicit wait-for-inputs behavior for deterministic execution.',
          recommendation: 'Set `config.runtime.waitForInputs` explicitly to true or false.',
          appliesToNodeTypes: [nodeType],
          sequenceHint: 274,
          confidence: runtimeState === 'yes' ? 0.56 : 0.45,
          sourcePath: source.path,
          sourceType: 'coverage_matrix_csv',
          sourceHash: hash,
          docsBindings: [docsBinding],
          tags: [...baseTags, 'runtime-safety'],
          conditions: [
            {
              operator: 'exists',
              field: 'config.runtime.waitForInputs',
            },
          ],
        });
      }

      if (asyncState === 'yes' || asyncState === 'partial') {
        const asyncField = nodeDoc.config.find((field) =>
          /(interval|maxattempts|maxsteps|timeout|waitforinputs)/i.test(field.path)
        );
        if (asyncField) {
          pushAssertion({
            id: `coverage.${nodeType}.${sanitizeFieldPathForId(asyncField.path)}.async_non_empty`,
            title: `${nodeDoc.title}: async control field is configured`,
            module,
            severity: coverageDimensionSeverity(asyncState, normalizedCoverage),
            description:
              'Coverage matrix async-correctness signal requires explicit async control configuration.',
            recommendation: `Set config.${asyncField.path} to a deterministic value.`,
            appliesToNodeTypes: [nodeType],
            sequenceHint: 276,
            confidence: asyncState === 'yes' ? 0.55 : 0.44,
            sourcePath: source.path,
            sourceType: 'coverage_matrix_csv',
            sourceHash: hash,
            docsBindings: [docsBinding],
            tags: [...baseTags, 'async-correctness'],
            conditions: [
              {
                operator: 'non_empty',
                field: `config.${asyncField.path}`,
              },
            ],
          });
        }
      }

      if (persistenceState === 'yes' || persistenceState === 'partial') {
        const persistenceFields = nodeDoc.config
          .filter((field) =>
            /(dryrun|skipempty|trimstrings|updatetemplate|writesource)/i.test(field.path)
          )
          .slice(0, 2);
        persistenceFields.forEach((field, index) => {
          pushAssertion({
            id: `coverage.${nodeType}.${sanitizeFieldPathForId(field.path)}.persistence_exists`,
            title: `${nodeDoc.title}: persistence safety field is explicit`,
            module,
            severity: 'info',
            description:
              'Coverage matrix persistence-safety signal requires explicit persistence behavior fields.',
            recommendation: `Set config.${field.path} explicitly for predictable writes.`,
            appliesToNodeTypes: [nodeType],
            sequenceHint: 277 + index,
            confidence: persistenceState === 'yes' ? 0.52 : 0.42,
            sourcePath: source.path,
            sourceType: 'coverage_matrix_csv',
            sourceHash: hash,
            docsBindings: [docsBinding],
            tags: [...baseTags, 'persistence-safety'],
            conditions: [
              {
                operator: 'exists',
                field: `config.${field.path}`,
              },
            ],
          });
        });
      }
    });
    return { hash, assertions };
  } catch (error) {
    warnings.push(
      `${source.path}: failed to read coverage matrix (${error instanceof Error ? error.message : 'unknown error'}).`
    );
    return {
      hash: hashText(`read_error:${source.path}`),
      assertions: [],
    };
  }
};
