import { describe, expect, it } from 'vitest';

import {
  getStarterWorkflowTemplateById,
  materializeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';

describe('starter parameter inference workflow', () => {
  it('maps product modal snapshots from canonical product name and description fields', () => {
    const entry = getStarterWorkflowTemplateById('starter_parameter_inference');
    if (!entry) throw new Error('Missing starter_parameter_inference entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_starter_parameter_inference_mapping',
    });
    const parserNode = config.nodes.find((node) => node.title === 'JSON Parser');

    expect(parserNode).toBeTruthy();

    const parserConfig = JSON.stringify(parserNode?.config ?? {});
    expect(parserConfig).toContain('$.name_en');
    expect(parserConfig).toContain('$.description_en');
    expect(parserConfig).toContain('$.catalogs[0].catalogId');
  });
});
