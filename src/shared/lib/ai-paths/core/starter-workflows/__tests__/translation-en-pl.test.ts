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

  it('keeps the translation database node on the runtime merge-compatible parameter contract', () => {
    const entry = getStarterWorkflowTemplateById('starter_translation_en_pl');
    if (!entry) throw new Error('Missing starter_translation_en_pl entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_starter_translation_en_pl_db_contract',
    });
    const databaseNode = config.nodes.find(
      (node) => node.type === 'database' && node.config?.database?.operation === 'update'
    );

    expect(databaseNode).toBeTruthy();
    expect(databaseNode?.config?.database).toEqual(
      expect.objectContaining({
        updatePayloadMode: 'custom',
        updateTemplate: expect.stringContaining('{{result.parameters}}'),
        mappings: expect.arrayContaining([
          expect.objectContaining({
            targetPath: 'description_pl',
            sourcePort: 'value',
            sourcePath: 'description_pl',
          }),
          expect.objectContaining({
            targetPath: 'parameters',
            sourcePort: 'result',
            sourcePath: 'parameters',
          }),
        ]),
      })
    );
  });
});
