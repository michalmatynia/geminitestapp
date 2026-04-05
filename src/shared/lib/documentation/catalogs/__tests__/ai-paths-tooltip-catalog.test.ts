import { describe, expect, it } from 'vitest';

import { AI_PATHS_NODE_DOCS } from '@/shared/lib/ai-paths/core/docs/node-docs';
import { getDocumentationEntry } from '@/shared/lib/documentation/registry';
import { DOCUMENTATION_MODULE_IDS } from '@/shared/contracts/documentation';

import { AI_PATHS_DOC_CATALOG } from '../ai-paths';

describe('AI-Paths tooltip catalog', () => {
  it('resolves required AI-Paths tooltip entries from central docs catalog', () => {
    const requiredIds = [
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
    ];

    for (const id of requiredIds) {
      expect(getDocumentationEntry(DOCUMENTATION_MODULE_IDS.aiPaths, id)).not.toBeNull();
    }
  });

  it('covers every AI-Paths node type with palette and node-config entries', () => {
    for (const doc of AI_PATHS_NODE_DOCS) {
      const paletteId = `node_palette_${doc.type}`;
      const nodeConfigId = `node_config_${doc.type}`;
      expect(getDocumentationEntry(DOCUMENTATION_MODULE_IDS.aiPaths, paletteId)).not.toBeNull();
      expect(getDocumentationEntry(DOCUMENTATION_MODULE_IDS.aiPaths, nodeConfigId)).not.toBeNull();
    }
  });

  it('does not contain duplicate IDs in AI-Paths catalog source', () => {
    const ids = AI_PATHS_DOC_CATALOG.map((entry) => entry.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
