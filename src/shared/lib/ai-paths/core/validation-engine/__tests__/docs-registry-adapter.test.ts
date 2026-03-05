import { describe, expect, it } from 'vitest';

import {
  DOCS_SNIPPETS_SOURCE_PATH,
  NODE_DOCS_CATALOG_SOURCE_PATH,
} from '../docs-registry-adapter.constants';
import {
  buildAiPathsValidationDocsSnapshot,
  extractAiPathsAssertionsFromMarkdown,
} from '../docs-registry-adapter';

describe('docs registry adapter', () => {
  it('parses schema-v2 assertion metadata from markdown blocks', () => {
    const sourcePath = 'docs/ai-paths/test-patterns.md';
    const sourceHash = 'hash-1';
    const markdown = [
      '```ai-paths-assertion',
      '{',
      '  "id": "test.schema_v2.metadata",',
      '  "title": "Schema v2 metadata",',
      '  "module": "database",',
      '  "severity": "warning",',
      '  "version": "2.0.0",',
      '  "tags": ["database", "metadata"],',
      '  "deprecates": ["legacy.rule.id"],',
      '  "conditions": [{ "operator": "non_empty", "field": "config.database.operation" }]',
      '}',
      '```',
    ].join('\n');
    const extracted = extractAiPathsAssertionsFromMarkdown(markdown, sourcePath, sourceHash);
    expect(extracted.warnings).toEqual([]);
    expect(extracted.assertions).toHaveLength(1);
    expect(extracted.assertions[0]?.id).toBe('test.schema_v2.metadata');
    expect(extracted.assertions[0]?.version).toBe('2.0.0');
    expect(extracted.assertions[0]?.tags).toEqual(['database', 'metadata']);
    expect(extracted.assertions[0]?.deprecates).toEqual(['legacy.rule.id']);
  });

  it('builds snapshot from manifest-driven sources with deterministic ids', async () => {
    const snapshot = await buildAiPathsValidationDocsSnapshot();
    expect(snapshot.warnings).toEqual([]);
    const sourceIds = snapshot.sources.map((source) => source.id);
    expect(sourceIds).toContain('core-patterns');
    expect(sourceIds).toContain('simulation-patterns');
    expect(sourceIds).toContain('database-patterns');
    expect(sourceIds).toContain('runtime-patterns');
    expect(sourceIds).toContain('wiring-patterns');
    expect(sourceIds).toContain('advanced-patterns');
    expect(sourceIds).toContain('semantic-grammar-patterns');
    expect(sourceIds).toContain('node-docs-catalog');
    expect(sourceIds).toContain('docs-snippets');
    expect(sourceIds).toContain('semantic-nodes-catalog');
    expect(sourceIds).toContain('tooltip-docs-catalog');
    expect(sourceIds).toContain('coverage-matrix');
    const nodeDocsCatalogSource = snapshot.sources.find(
      (source) => source.id === 'node-docs-catalog'
    );
    expect(nodeDocsCatalogSource?.path).toBe(NODE_DOCS_CATALOG_SOURCE_PATH);
    const docsSnippetsSource = snapshot.sources.find((source) => source.id === 'docs-snippets');
    expect(docsSnippetsSource?.path).toBe(DOCS_SNIPPETS_SOURCE_PATH);

    const uniqueAssertionIds = new Set(snapshot.assertions.map((assertion) => assertion.id));
    expect(uniqueAssertionIds.size).toBe(snapshot.assertions.length);
    expect(
      snapshot.assertions.some(
        (assertion) =>
          assertion.id === 'core.graph.trigger_exists' && assertion.sourceId === 'core-patterns'
      )
    ).toBe(true);
    expect(
      snapshot.assertions.some(
        (assertion) =>
          assertion.id === 'catalog.database.database_query_provider.allowed_values' &&
          assertion.sourceId === 'node-docs-catalog'
      )
    ).toBe(true);
    expect(
      snapshot.assertions.some(
        (assertion) =>
          assertion.id ===
            'snippet_wire_rev_docs_wiring_snippet_fetcher_trigger_from_trigger_trigger' &&
          assertion.sourceId === 'docs-snippets'
      )
    ).toBe(true);
    expect(
      snapshot.assertions.some(
        (assertion) =>
          assertion.id === 'semantic.catalog.node_ids_unique' &&
          assertion.sourceId === 'semantic-nodes-catalog'
      )
    ).toBe(true);
    expect(
      snapshot.assertions.some(
        (assertion) =>
          assertion.id === 'tooltip.regex.ai_prompt_supported_placeholders' &&
          assertion.sourceId === 'tooltip-docs-catalog'
      )
    ).toBe(true);
    expect(
      snapshot.assertions.some(
        (assertion) =>
          assertion.id === 'coverage.database.config.object_non_empty' &&
          assertion.sourceId === 'coverage-matrix'
      )
    ).toBe(true);
  });
});
