import { AI_PATHS_NODE_DOCS } from '@/shared/lib/ai-paths/core/docs/node-docs';
import { AI_PATHS_TOOLTIP_CATALOG } from '../../docs/ai-paths/tooltip-catalog';
import {
  buildStaticCheckFilters,
  parseCommonCheckArgs,
  writeSummaryJson,
} from '../lib/check-cli.mjs';

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

const unique = <T>(items: T[]): T[] => Array.from(new Set(items));

type TooltipCoverageResult = {
  duplicateIds: string[];
  missingRequired: string[];
  missingNodePaletteEntries: string[];
  missingNodeConfigEntries: string[];
  malformedEntries: string[];
};

const analyzeTooltipCoverage = (): TooltipCoverageResult => {
  const byId = new Map<string, (typeof AI_PATHS_TOOLTIP_CATALOG)[number]>();
  const duplicateIds: string[] = [];

  for (const entry of AI_PATHS_TOOLTIP_CATALOG) {
    if (byId.has(entry.id)) {
      duplicateIds.push(entry.id);
      continue;
    }
    byId.set(entry.id, entry);
  }

  const missingRequired = REQUIRED_TOOLTIP_IDS.filter((id) => !byId.has(id));
  const missingNodePaletteEntries = AI_PATHS_NODE_DOCS.map((doc) => `node_palette_${doc.type}`).filter(
    (id) => !byId.has(id)
  );
  const missingNodeConfigEntries = AI_PATHS_NODE_DOCS.map((doc) => `node_config_${doc.type}`).filter(
    (id) => !byId.has(id)
  );
  const malformedEntries = AI_PATHS_TOOLTIP_CATALOG.filter((entry) => {
    if (!entry.title.trim() || !entry.summary.trim() || !entry.section.trim()) return true;
    if (!entry.docPath.trim().startsWith('/')) return true;
    return false;
  }).map((entry) => entry.id);

  return {
    duplicateIds: unique(duplicateIds),
    missingRequired,
    missingNodePaletteEntries,
    missingNodeConfigEntries,
    malformedEntries,
  };
};

const logFailures = ({
  duplicateIds,
  missingRequired,
  missingNodePaletteEntries,
  missingNodeConfigEntries,
  malformedEntries,
}: TooltipCoverageResult): void => {
  if (duplicateIds.length > 0) {
    console.error(`Duplicate AI-Paths tooltip ids: ${duplicateIds.join(', ')}`);
  }
  if (missingRequired.length > 0) {
    console.error(`Missing required AI-Paths tooltip ids: ${missingRequired.join(', ')}`);
  }
  if (missingNodePaletteEntries.length > 0) {
    console.error(
      `Missing node palette tooltip ids for node types: ${missingNodePaletteEntries.join(', ')}`
    );
  }
  if (missingNodeConfigEntries.length > 0) {
    console.error(
      `Missing node config tooltip ids for node types: ${missingNodeConfigEntries.join(', ')}`
    );
  }
  if (malformedEntries.length > 0) {
    console.error(`Malformed AI-Paths tooltip entries: ${malformedEntries.join(', ')}`);
  }
};

const main = (): void => {
  const { summaryJson, strictMode, failOnWarnings } = parseCommonCheckArgs();
  const generatedAt = new Date().toISOString();
  const result = analyzeTooltipCoverage();
  const issueCount =
    result.duplicateIds.length +
    result.missingRequired.length +
    result.missingNodePaletteEntries.length +
    result.missingNodeConfigEntries.length +
    result.malformedEntries.length;

  if (summaryJson) {
    writeSummaryJson({
      scannerName: 'docs-ai-paths-tooltip-coverage',
      generatedAt,
      status: issueCount === 0 ? 'ok' : 'failed',
      summary: {
        entryCount: AI_PATHS_TOOLTIP_CATALOG.length,
        nodeDocCount: AI_PATHS_NODE_DOCS.length,
        requiredTooltipCount: REQUIRED_TOOLTIP_IDS.length,
        issueCount,
      },
      details: result,
      filters: buildStaticCheckFilters({ strictMode, failOnWarnings }),
      notes: ['ai-paths tooltip coverage check result'],
    });
    if (issueCount > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (issueCount > 0) {
    logFailures(result);
    process.exitCode = 1;
    return;
  }

  console.log(
    `AI-Paths tooltip coverage check passed. Entries: ${AI_PATHS_TOOLTIP_CATALOG.length}, nodes: ${AI_PATHS_NODE_DOCS.length}.`
  );
};

main();
