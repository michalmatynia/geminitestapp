import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));

const readTutorSource = (fileName: string) =>
  readFileSync(join(currentDir, 'ai-tutor-widget', fileName), 'utf8');

const readComponentSource = (fileName: string) =>
  readFileSync(join(currentDir, fileName), 'utf8');

const readTutorPlaywrightSource = (fileName: string) =>
  readFileSync(join(currentDir, '../../../../../e2e/features/kangur', fileName), 'utf8');

describe('Kangur AI Tutor surface contract', () => {
  it('does not allow the deprecated regular panel surface back into the coordinator or portal view', () => {
    const coordinatorSource = readTutorSource('KangurAiTutorWidget.coordinator.ts');
    const portalViewSource = readTutorSource('KangurAiTutorWidget.portal-view.ts');

    expect(coordinatorSource).not.toContain('\'regular_panel\'');
    expect(coordinatorSource).not.toContain('\'selection_panel\'');
    expect(coordinatorSource).not.toContain('\'section_panel\'');
    expect(portalViewSource).not.toContain('\'regular_panel\'');
    expect(portalViewSource).not.toContain('\'selection_panel\'');
    expect(portalViewSource).not.toContain('\'section_panel\'');
    expect(portalViewSource).not.toContain('isRegularMinimalPanelMode');
  });

  it('does not allow avatar clicks to branch by auth state into a non-minimal surface', () => {
    const avatarShellSource = readTutorSource('KangurAiTutorWidget.avatar-shell.ts');
    const portalViewSource = readTutorSource('KangurAiTutorWidget.portal-view.ts');

    expect(avatarShellSource).not.toContain('handleOpenChat(\'toggle\'');
    expect(portalViewSource).not.toContain('tutorSurfaceMode === \'onboarding\' &&\n    input.isAnonymousVisitor');
  });

  it('does not allow the legacy avatar-to-panel Playwright helper back into the tutor browser contract', () => {
    const browserSpecSource = readTutorPlaywrightSource('kangur-ai-tutor.spec.ts');

    expect(browserSpecSource).not.toContain('openLegacyTutorPanelAfterAcceptingMinimalModal');
  });

  it('keeps the minimalist contextual panel renderable while guided avatar mode is still active', () => {
    const panelChromeSource = readComponentSource('KangurAiTutorPanelChrome.shared.ts');

    expect(panelChromeSource).toContain('(!isGuidedTutorMode || isMinimalPanelMode) &&');
  });
});
