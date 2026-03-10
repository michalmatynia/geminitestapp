import { describe, expect, it } from 'vitest';

import {
  getStarterWorkflowTemplateById,
  materializeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';

describe('starter translation EN->PL workflow', () => {
  it('maps product snapshots from canonical English name fields for translation prompts', () => {
    const entry = getStarterWorkflowTemplateById('starter_translation_en_pl');
    if (!entry) throw new Error('Missing starter_translation_en_pl entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_starter_translation_en_pl_mapping',
    });
    const parserNode = config.nodes.find((node) => node.title === 'JSON Parser');

    expect(parserNode).toBeTruthy();

    const parserConfig = JSON.stringify(parserNode?.config ?? {});
    expect(parserConfig).toContain('$.name_en');
    expect(parserConfig).toContain('$.description_en');
    expect(parserConfig).not.toContain('$.title');
  });
});
