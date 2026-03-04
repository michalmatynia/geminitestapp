import { readFileSync } from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const centerUtilsPath = path.join(projectRoot, 'src/features/ai/image-studio/server/center-utils.ts');
const autoScalerUtilsPath = path.join(
  projectRoot,
  'src/features/ai/image-studio/server/auto-scaler-utils.ts'
);

describe('image studio runtime fingerprint legacy prune guard', () => {
  it('keeps legacy _v1 fingerprint mode markers out of runtime utilities', () => {
    const centerContent = readFileSync(centerUtilsPath, 'utf8');
    const autoScalerContent = readFileSync(autoScalerUtilsPath, 'utf8');

    expect(centerContent).not.toContain('object_layout_v1');
    expect(autoScalerContent).not.toContain('auto_scaler_v1');
  });
});
