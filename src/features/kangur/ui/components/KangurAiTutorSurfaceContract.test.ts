import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));

const readTutorSource = (fileName: string) =>
  readFileSync(join(currentDir, fileName), 'utf8');

describe('Kangur AI Tutor surface contract', () => {
  it('does not allow the deprecated regular panel surface back into the coordinator or portal view', () => {
    const coordinatorSource = readTutorSource('KangurAiTutorWidget.coordinator.ts');
    const portalViewSource = readTutorSource('KangurAiTutorWidget.portal-view.ts');

    expect(coordinatorSource).not.toContain("'regular_panel'");
    expect(portalViewSource).not.toContain("'regular_panel'");
    expect(portalViewSource).not.toContain('isRegularMinimalPanelMode');
  });
});
