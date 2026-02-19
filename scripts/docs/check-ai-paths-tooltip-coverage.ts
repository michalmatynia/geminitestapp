import { AI_PATHS_NODE_DOCS } from '../../src/features/ai/ai-paths/lib/core/docs/node-docs';
import { AI_PATHS_TOOLTIP_CATALOG } from '../../docs/ai-paths/tooltip-catalog';

const REQUIRED_TOOLTIP_IDS = [
  'workflow_overview',
  'docs_tooltips_toggle',
  'canvas_save_path',
  'canvas_paths_settings',
  'canvas_enable_node_validation',
  'canvas_validate_nodes',
  'canvas_open_node_validator',
  'palette_toggle',
  'palette_mode_data',
  'palette_mode_sound',
  'palette_search',
  'node_config_update',
  'node_config_close',
  'node_config_copy_id',
  'regex_placeholder_text',
  'regex_placeholder_lines',
  'regex_placeholder_value',
] as const;

const unique = <T,>(items: T[]): T[] => Array.from(new Set(items));

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const byId = new Map<string, (typeof AI_PATHS_TOOLTIP_CATALOG)[number]>();
const duplicateIds: string[] = [];

for (const entry of AI_PATHS_TOOLTIP_CATALOG) {
  if (byId.has(entry.id)) {
    duplicateIds.push(entry.id);
    continue;
  }
  byId.set(entry.id, entry);
}

if (duplicateIds.length > 0) {
  fail(`Duplicate AI-Paths tooltip ids: ${unique(duplicateIds).join(', ')}`);
}

const missingRequired = REQUIRED_TOOLTIP_IDS.filter((id) => !byId.has(id));
if (missingRequired.length > 0) {
  fail(`Missing required AI-Paths tooltip ids: ${missingRequired.join(', ')}`);
}

const missingNodePaletteEntries = AI_PATHS_NODE_DOCS.map((doc) => `node_palette_${doc.type}`).filter(
  (id) => !byId.has(id),
);
if (missingNodePaletteEntries.length > 0) {
  fail(
    `Missing node palette tooltip ids for node types: ${missingNodePaletteEntries.join(', ')}`,
  );
}

const missingNodeConfigEntries = AI_PATHS_NODE_DOCS.map((doc) => `node_config_${doc.type}`).filter(
  (id) => !byId.has(id),
);
if (missingNodeConfigEntries.length > 0) {
  fail(
    `Missing node config tooltip ids for node types: ${missingNodeConfigEntries.join(', ')}`,
  );
}

const malformedEntries = AI_PATHS_TOOLTIP_CATALOG.filter((entry) => {
  if (!entry.title.trim() || !entry.summary.trim() || !entry.section.trim()) return true;
  if (!entry.docPath.trim().startsWith('/')) return true;
  return false;
});
if (malformedEntries.length > 0) {
  fail(
    `Malformed AI-Paths tooltip entries: ${malformedEntries
      .map((entry) => entry.id)
      .join(', ')}`,
  );
}

console.log(
  `AI-Paths tooltip coverage check passed. Entries: ${AI_PATHS_TOOLTIP_CATALOG.length}, nodes: ${AI_PATHS_NODE_DOCS.length}.`,
);
