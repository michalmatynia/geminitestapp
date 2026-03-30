import 'server-only';

import { z } from 'zod';
import {
  DOCS_SNIPPET_REGISTRY,
} from '../docs-registry-adapter.constants';
import { readDocsSourceText } from '../docs-registry-adapter.file-access';
import {
  hashText,
  normalizeCoverageDimension,
  parseCsvRecords,
  toModuleFromNodeType,
  uniqueStringList,
} from '../docs-registry-adapter.helpers';
import {
  semanticNodeIndexRowSchema,
  tooltipCatalogEntrySchema,
  coverageMatrixRowSchema,
  type AiPathsDocAssertion,
  type AiPathsDocsManifestSource,
  type CoverageMatrixRow,
} from '../docs-registry-adapter.types';
import { AI_PATHS_NODE_DOCS } from '../../docs/node-docs';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { buildNodeDocsCatalogAssertions } from './assertion-catalog';
import { parseSnippetWiringAssertions } from './assertion-snippets';

const shouldEmitCoverageAssertion = (
  value: CoverageMatrixRow['config_completeness']
): boolean => {
  const normalized = normalizeCoverageDimension(value);
  return normalized === 'yes' || normalized === 'partial';
};

const getCoverageConfidence = (value: CoverageMatrixRow['config_completeness']): number =>
  normalizeCoverageDimension(value) === 'yes' ? 0.82 : 0.68;

const buildCoverageMatrixAssertions = (
  row: CoverageMatrixRow,
  source: AiPathsDocsManifestSource,
  hash: string,
  index: number
): AiPathsDocAssertion[] => {
  const assertions: AiPathsDocAssertion[] = [];
  const docsBindings = [source.path];
  const module = toModuleFromNodeType(row.node_type);
  const notesSuffix = row.notes ? ` ${row.notes}` : '';

  if (shouldEmitCoverageAssertion(row.config_completeness)) {
    assertions.push({
      id: `coverage.${row.node_type}.config.object_non_empty`,
      title: `${row.node_type} config object is non-empty`,
      module,
      severity: normalizeCoverageDimension(row.config_completeness) === 'yes' ? 'warning' : 'info',
      description: `Coverage matrix flags config completeness for ${row.node_type} as ${row.config_completeness}.${notesSuffix}`.trim(),
      recommendation: `Verify that ${row.node_type} nodes declare a non-empty config object for documented validator coverage.`,
      sequenceHint: 300 + index * 3,
      confidence: getCoverageConfidence(row.config_completeness),
      sourcePath: source.path,
      sourceType: 'coverage_matrix_csv',
      sourceHash: hash,
      docsBindings,
      tags: ['coverage-matrix', row.node_type, 'config'],
      conditions: [
        {
          operator: 'non_empty',
          field: 'config',
        },
      ],
    });
  }

  if (
    row.node_type === 'cross_graph_invariants' &&
    shouldEmitCoverageAssertion(row.wiring_integrity)
  ) {
    assertions.push(
      {
        id: 'coverage.cross_graph_invariants.edge_endpoints_resolve',
        title: 'Cross-graph edge endpoints resolve',
        module: 'graph',
        severity: 'warning',
        description: `Coverage matrix marks cross-graph wiring integrity as ${row.wiring_integrity}.${notesSuffix}`.trim(),
        recommendation: 'Verify that every edge references existing source and target nodes.',
        sequenceHint: 301 + index * 3,
        confidence: getCoverageConfidence(row.wiring_integrity),
        sourcePath: source.path,
        sourceType: 'coverage_matrix_csv',
        sourceHash: hash,
        docsBindings,
        tags: ['coverage-matrix', 'graph', 'wiring'],
        conditions: [
          {
            operator: 'edge_endpoints_resolve',
          },
        ],
      },
      {
        id: 'coverage.cross_graph_invariants.edge_ports_declared',
        title: 'Cross-graph edge ports are declared',
        module: 'graph',
        severity: 'warning',
        description: `Coverage matrix marks cross-graph wiring integrity as ${row.wiring_integrity}.${notesSuffix}`.trim(),
        recommendation: 'Verify that every graph edge uses ports declared by the connected node types.',
        sequenceHint: 302 + index * 3,
        confidence: getCoverageConfidence(row.wiring_integrity),
        sourcePath: source.path,
        sourceType: 'coverage_matrix_csv',
        sourceHash: hash,
        docsBindings,
        tags: ['coverage-matrix', 'graph', 'ports'],
        conditions: [
          {
            operator: 'edge_ports_declared',
          },
        ],
      }
    );
  }

  return assertions;
};

const resolveTooltipAliasToken = (value: string): string | null => {
  const match = value.trim().match(/^\{\{([a-zA-Z0-9_]+)\}\}$/);
  return match?.[1]?.trim() ?? null;
};

const buildTooltipDocsCatalogDerivedAssertions = (
  rows: z.infer<typeof tooltipCatalogEntrySchema>[],
  source: AiPathsDocsManifestSource,
  hash: string
): AiPathsDocAssertion[] => {
  const docsBindings = [source.path];
  const regexAiPromptEntry = rows.find((row) => row.id === 'node_config_field_regex_regex_aiprompt');
  const placeholderTokens = uniqueStringList(
    rows
      .filter((row) => row.id.startsWith('regex_placeholder_'))
      .flatMap((row) => row.aliases ?? [])
      .map(resolveTooltipAliasToken)
      .filter((value): value is string => Boolean(value))
  );

  if (!regexAiPromptEntry || placeholderTokens.length === 0) {
    return [];
  }

  const placeholderPattern = `^(?:(?!\\{\\{(?!${placeholderTokens.join('|')})[^}]+\\}\\}).)*$`;
  const placeholderList = placeholderTokens.map((token) => `{{${token}}}`).join(', ');

  return [
    {
      id: 'tooltip.regex.ai_prompt_supported_placeholders',
      title: 'Regex aiPrompt uses documented placeholders',
      module: 'parser',
      severity: 'warning',
      description: `Regex aiPrompt should only use documented placeholders: ${placeholderList}.`,
      recommendation: 'Remove unsupported placeholders from regex.aiPrompt or document them in the tooltip catalog first.',
      sequenceHint: 240,
      confidence: 0.78,
      sourcePath: source.path,
      sourceType: 'tooltip_docs_catalog',
      sourceHash: hash,
      docsBindings,
      tags: ['tooltip-catalog', 'regex', 'placeholders'],
      conditions: [
        {
          operator: 'matches_regex',
          field: 'config.regex.aiPrompt',
          expected: placeholderPattern,
        },
      ],
    },
  ];
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
  try {
    const content = await readDocsSourceText(source.path);
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
    void ErrorSystem.captureException(error);
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
  try {
    const content = await readDocsSourceText(source.path);
    const parsed = JSON.parse(content) as unknown;
    const result = z.array(tooltipCatalogEntrySchema).safeParse(parsed);
    if (!result.success) {
      warnings.push(`${source.path}: tooltip catalog schema validation failed.`);
      return {
        hash: hashText(`parse_error:${source.path}`),
        assertions: [],
      };
    }

    const rows = result.data;
    const hash = hashText(JSON.stringify(rows));
    const docsBinding = source.path;

    const assertions: AiPathsDocAssertion[] = rows.map(
      (row): AiPathsDocAssertion => ({
        id: `tooltip.catalog.${row.id.replace(/[^a-z0-9]+/gi, '_')}`,
        title: `Tooltip configured: ${row.id}`,
        module: 'custom',
        severity: 'info',
        description: `Guideline: ${row.title}. Tooltip should be available for ${row.id}.`,
        recommendation: `Verify that ${row.id} has a correctly configured tooltip in the registry.`,
        sequenceHint: 200,
        confidence: 0.6,
        sourcePath: source.path,
        sourceType: 'tooltip_docs_catalog',
        sourceHash: hash,
        docsBindings: [docsBinding],
        conditions: [
          {
            operator: 'tooltip_exists',
            id: row.id,
          },
        ],
      })
    );

    assertions.push(...buildTooltipDocsCatalogDerivedAssertions(rows, source, hash));

    return { hash, assertions };
  } catch (error) {
    void ErrorSystem.captureException(error);
    warnings.push(
      `${source.path}: failed to read tooltip docs catalog (${error instanceof Error ? error.message : 'unknown error'}).`
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
}): Promise<{ hash: string; assertions: AiPathsDocAssertion[]; rows: CoverageMatrixRow[] }> => {
  const { source, warnings } = args;
  try {
    const content = await readDocsSourceText(source.path);
    const parsedRecords = parseCsvRecords(content);
    const rows = await z.array(coverageMatrixRowSchema).parseAsync(parsedRecords);
    const hash = hashText(content);
    const assertions = rows.flatMap((row, index) =>
      buildCoverageMatrixAssertions(row, source, hash, index)
    );
    return { hash, assertions, rows };
  } catch (error) {
    void ErrorSystem.captureException(error);
    warnings.push(
      `${source.path}: failed to read coverage matrix (${error instanceof Error ? error.message : 'unknown error'}).`
    );
    return { hash: hashText(`read_error:${source.path}`), assertions: [], rows: [] };
  }
};
