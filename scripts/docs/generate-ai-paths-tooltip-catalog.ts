import fs from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

import { AI_PATHS_NODE_DOCS } from '@/shared/lib/ai-paths/core/docs/node-docs';
import {
  DOCS_DESCRIPTION_SNIPPET,
  DOCS_JOBS_SNIPPET,
  DOCS_OVERVIEW_SNIPPET,
  DOCS_WIRING_SNIPPET,
} from '../../src/features/ai/ai-paths/components/ai-paths-settings/docs-snippets';

type TooltipCatalogEntry = {
  id: string;
  title: string;
  summary: string;
  section: string;
  aliases: string[];
  docPath: string;
  tags?: string[] | undefined;
  uiTargets?: string[] | undefined;
};

type TooltipManifestSource = {
  id: string;
  type: 'manual_overrides' | 'node_docs_catalog' | 'semantic_nodes_index' | 'docs_snippet';
  path: string;
  enabled: boolean;
  priority: number;
  tags: string[];
  snippetNames?: string[];
};

const workspaceRoot = process.cwd();
const manifestPath = path.join(workspaceRoot, 'docs/ai-paths/tooltip-central-manifest.json');
const outputTsPath = path.join(workspaceRoot, 'docs/ai-paths/tooltip-catalog.ts');
const outputJsonPath = path.join(workspaceRoot, 'docs/ai-paths/tooltip-catalog.json');

const tooltipEntrySchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  section: z.string().trim().min(1),
  aliases: z.array(z.string().trim()).default([]),
  docPath: z.string().trim().min(1),
  tags: z.array(z.string().trim()).optional(),
  uiTargets: z.array(z.string().trim()).optional(),
});

const semanticNodeIndexRowSchema = z.object({
  nodeType: z.string().trim().min(1),
  title: z.string().trim().min(1),
  file: z.string().trim().min(1),
});

const manifestSourceSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum(['manual_overrides', 'node_docs_catalog', 'semantic_nodes_index', 'docs_snippet']),
  path: z.string().trim().min(1),
  enabled: z.boolean().optional(),
  priority: z.number().int().optional(),
  tags: z.array(z.string().trim()).optional(),
  snippetNames: z.array(z.string().trim()).optional(),
});

const manifestSchema = z.object({
  version: z.string().trim().min(1),
  sources: z.array(manifestSourceSchema).min(1),
});

const SNIPPET_REGISTRY: Record<string, string> = {
  DOCS_OVERVIEW_SNIPPET,
  DOCS_WIRING_SNIPPET,
  DOCS_DESCRIPTION_SNIPPET,
  DOCS_JOBS_SNIPPET,
};

const SNIPPET_TITLES: Record<string, string> = {
  DOCS_OVERVIEW_SNIPPET: 'Docs Overview Snippet',
  DOCS_WIRING_SNIPPET: 'Docs Wiring Snippet',
  DOCS_DESCRIPTION_SNIPPET: 'Docs Description Snippet',
  DOCS_JOBS_SNIPPET: 'Docs Jobs Snippet',
};

const CORE_UI_DOC_PATH = '/docs/ai-paths/semantic-grammar/README.md';

const normalizeDocPath = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return CORE_UI_DOC_PATH;
  if (trimmed.startsWith('/')) return trimmed;
  return `/${trimmed}`;
};

const normalizeSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const uniqueStrings = (values: string[]): string[] =>
  Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );

const readJson = (filePath: string): unknown => {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
};

const formatEntry = (entry: TooltipCatalogEntry): TooltipCatalogEntry => ({
  id: entry.id,
  title: entry.title,
  summary: entry.summary,
  section: entry.section,
  aliases: uniqueStrings(entry.aliases),
  docPath: normalizeDocPath(entry.docPath),
  ...(entry.tags && entry.tags.length > 0 ? { tags: uniqueStrings(entry.tags) } : {}),
  ...(entry.uiTargets && entry.uiTargets.length > 0 ? { uiTargets: uniqueStrings(entry.uiTargets) } : {}),
});

const buildManualOverrideEntries = (source: TooltipManifestSource): TooltipCatalogEntry[] => {
  const absolutePath = path.join(workspaceRoot, source.path);
  const parsed = readJson(absolutePath);
  const result = z.array(tooltipEntrySchema).safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid tooltip overrides: ${source.path}`);
  }

  return result.data.map((entry) =>
    formatEntry({
      id: entry.id,
      title: entry.title,
      summary: entry.summary,
      section: entry.section,
      aliases: entry.aliases,
      docPath: entry.docPath,
      tags: uniqueStrings([...(source.tags ?? []), ...(entry.tags ?? [])]),
      uiTargets: entry.uiTargets ?? [],
    }),
  );
};

const buildNodeDocsEntries = (source: TooltipManifestSource): TooltipCatalogEntry[] => {
  const entries: TooltipCatalogEntry[] = [];

  for (const doc of AI_PATHS_NODE_DOCS) {
    const semanticNodePath = `/docs/ai-paths/semantic-grammar/nodes/${doc.type}.json`;
    const nodeLabel = doc.title.trim() || doc.type;

    entries.push(
      formatEntry({
        id: `node_palette_${doc.type}`,
        title: `${nodeLabel} (Palette)` ,
        summary: doc.purpose,
        section: 'Node Palette',
        aliases: [doc.type, nodeLabel, `palette ${doc.type}`],
        docPath: semanticNodePath,
        tags: [...source.tags, 'node', 'palette'],
        uiTargets: [`palette.node.${doc.type}`],
      }),
    );

    entries.push(
      formatEntry({
        id: `node_config_${doc.type}`,
        title: `${nodeLabel} (Configuration)`,
        summary: `Configuration reference for ${nodeLabel}.`,
        section: 'Node Config',
        aliases: [doc.type, nodeLabel, `${doc.type} config`],
        docPath: semanticNodePath,
        tags: [...source.tags, 'node', 'config'],
        uiTargets: [`node-config.${doc.type}`],
      }),
    );

    for (const field of doc.config) {
      const fieldSlug = normalizeSlug(field.path);
      if (!fieldSlug) continue;
      entries.push(
        formatEntry({
          id: `node_config_field_${doc.type}_${fieldSlug}`,
          title: `${nodeLabel}: ${field.path}`,
          summary: field.description,
          section: `Node Config - ${nodeLabel}`,
          aliases: [doc.type, field.path, `${doc.type}.${field.path}`],
          docPath: semanticNodePath,
          tags: [...source.tags, 'node', 'config-field'],
          uiTargets: [`node-config.${doc.type}.${field.path}`],
        }),
      );
    }
  }

  return entries;
};

const buildSemanticIndexEntries = (source: TooltipManifestSource): TooltipCatalogEntry[] => {
  const absolutePath = path.join(workspaceRoot, source.path);
  const parsed = readJson(absolutePath);
  const result = z.array(semanticNodeIndexRowSchema).safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid semantic node index: ${source.path}`);
  }

  return result.data.map((row) =>
    formatEntry({
      id: `semantic_node_${row.nodeType}`,
      title: `Semantic Node JSON: ${row.title}`,
      summary: `JSON semantic scaffold and contract for ${row.nodeType}.`,
      section: 'Semantic Grammar',
      aliases: [row.nodeType, row.title, 'semantic grammar'],
      docPath: normalizeDocPath(row.file),
      tags: [...source.tags, 'semantic-node'],
      uiTargets: [`docs.semantic.${row.nodeType}`],
    }),
  );
};

const buildSnippetEntries = (source: TooltipManifestSource): TooltipCatalogEntry[] => {
  const snippetNames =
    source.snippetNames && source.snippetNames.length > 0
      ? source.snippetNames
      : Object.keys(SNIPPET_REGISTRY);

  const entries: TooltipCatalogEntry[] = [];

  for (const snippetName of snippetNames) {
    const snippetBody = SNIPPET_REGISTRY[snippetName];
    if (!snippetBody) {
      throw new Error(`Unknown docs snippet in manifest: ${snippetName}`);
    }
    const firstLine =
      snippetBody
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.length > 0) ?? 'AI-Paths documentation snippet.';
    const normalizedFirstLine = firstLine.replace(/\u2192/g, '->');

    entries.push(
      formatEntry({
        id: `docs_snippet_${normalizeSlug(snippetName)}`,
        title: SNIPPET_TITLES[snippetName] ?? `Docs Snippet: ${snippetName}`,
        summary: `Snippet source for docs panel content. First line: ${normalizedFirstLine}`,
        section: 'Docs Snippets',
        aliases: [snippetName, 'docs snippet', normalizedFirstLine],
        docPath: '/docs/ai-paths/semantic-grammar/README.md',
        tags: [...source.tags, 'docs-snippet'],
        uiTargets: [`docs.snippet.${normalizeSlug(snippetName)}`],
      }),
    );
  }

  return entries;
};

const buildSourceEntries = (source: TooltipManifestSource): TooltipCatalogEntry[] => {
  if (source.type === 'manual_overrides') {
    return buildManualOverrideEntries(source);
  }
  if (source.type === 'node_docs_catalog') {
    return buildNodeDocsEntries(source);
  }
  if (source.type === 'semantic_nodes_index') {
    return buildSemanticIndexEntries(source);
  }
  if (source.type === 'docs_snippet') {
    return buildSnippetEntries(source);
  }
  return [];
};

const serializeCatalogTs = (entries: TooltipCatalogEntry[]): string => {
  const header = [
    'export type AiPathsTooltipDocEntry = {',
    '  id: string;',
    '  title: string;',
    '  summary: string;',
    '  section: string;',
    '  aliases: string[];',
    '  docPath: string;',
    '  tags?: string[];',
    '  uiTargets?: string[];',
    '};',
    '',
    'export const AI_PATHS_TOOLTIP_CATALOG: AiPathsTooltipDocEntry[] = ',
  ].join('\n');

  return `${header}${JSON.stringify(entries, null, 2)};\n`;
};

const normalizeManifestSource = (source: z.infer<typeof manifestSourceSchema>): TooltipManifestSource => ({
  id: source.id,
  type: source.type,
  path: source.path,
  enabled: source.enabled !== false,
  priority:
    typeof source.priority === 'number' && Number.isFinite(source.priority)
      ? source.priority
      : 100,
  tags: uniqueStrings(source.tags ?? []),
  ...(source.snippetNames ? { snippetNames: uniqueStrings(source.snippetNames) } : {}),
});

const main = (): void => {
  const parsedManifest = manifestSchema.parse(readJson(manifestPath));
  const normalizedSources = parsedManifest.sources
    .map((source) => normalizeManifestSource(source))
    .filter((source) => source.enabled)
    .sort((left, right) => {
      if (left.priority !== right.priority) return left.priority - right.priority;
      return left.id.localeCompare(right.id);
    });

  const entriesById = new Map<string, TooltipCatalogEntry>();
  const duplicateIds: Array<{ id: string; sourceId: string }> = [];

      for (const source of normalizedSources) {
        const sourceEntries = buildSourceEntries(source);
        for (const entry of sourceEntries) {
          const valid = tooltipEntrySchema.parse(entry) as TooltipCatalogEntry;
          const normalized = formatEntry(valid);
          if (entriesById.has(normalized.id)) {        duplicateIds.push({ id: normalized.id, sourceId: source.id });
        continue;
      }
      entriesById.set(normalized.id, normalized);
    }
  }

  if (duplicateIds.length > 0) {
    const collisions = duplicateIds
      .map((item) => `${item.id} (source: ${item.sourceId})`)
      .join(', ');
    throw new Error(`Duplicate tooltip ids detected: ${collisions}`);
  }

  const entries = Array.from(entriesById.values()).sort((left, right) =>
    left.id.localeCompare(right.id),
  );

  fs.writeFileSync(outputJsonPath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outputTsPath, serializeCatalogTs(entries), 'utf8');

  console.log(`Generated AI-Paths tooltip catalog with ${entries.length} entries.`);
};

main();
