import fs from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

const UI_ROOT = path.join(process.cwd(), 'src/features/kangur/ui');

const EXPECTED_DIALOG_SHELL_FILES = [
  'components/KangurChoiceDialog.tsx',
  'components/KangurLoginModal.tsx',
  'components/assignment-manager/KangurAssignmentManager.modals.tsx',
  'components/assignment-manager/KangurAssignmentManagerTimeLimitModal.tsx',
  'components/music/KangurMusicPianoRollControls.tsx',
  'components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx',
  'components/primary-navigation/KangurPrimaryNavigation.overlays.tsx',
  'pages/GamesLibraryGameModal.components.tsx',
] as const;

const EXPECTED_DIRECT_OVERLAY_SHELL_FILES = [
  'components/KangurConfirmModal.tsx',
  'components/KangurDialog.tsx',
] as const;

const isUiSourceFile = (entryPath: string): boolean =>
  entryPath.endsWith('.tsx') && !entryPath.endsWith('.test.tsx') && !entryPath.endsWith('.snap');

const collectUiSourceFiles = (dirPath: string): string[] => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const nestedFiles = entries.flatMap((entry) => {
    const resolvedPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return collectUiSourceFiles(resolvedPath);
    }
    return isUiSourceFile(resolvedPath) ? [resolvedPath] : [];
  });
  return nestedFiles;
};

const normalizeRelativePath = (filePath: string): string =>
  path.relative(UI_ROOT, filePath).split(path.sep).join('/');

describe('KangurDialog accessibility inventory', () => {
  it('keeps every active KangurDialog shell on the metadata allowlist', () => {
    const dialogShellFiles = collectUiSourceFiles(UI_ROOT)
      .filter((filePath) => normalizeRelativePath(filePath) !== 'components/KangurDialog.tsx')
      .filter((filePath) => fs.readFileSync(filePath, 'utf8').includes('<KangurDialog'));

    const relativeDialogShellFiles = dialogShellFiles
      .map((filePath) => normalizeRelativePath(filePath))
      .sort();

    expect(relativeDialogShellFiles).toEqual([...EXPECTED_DIALOG_SHELL_FILES].sort());
  });

  it('requires every active KangurDialog shell to provide hidden dialog title and description metadata', () => {
    EXPECTED_DIALOG_SHELL_FILES.forEach((relativePath) => {
      const source = fs.readFileSync(path.join(UI_ROOT, relativePath), 'utf8');

      expect(source).toContain('<KangurDialog');
      expect(source).toContain('KangurDialogMeta');
      expect(source).toContain('description=');
    });
  });

  it('keeps direct RadixOverlayContentShell consumers explicitly inventoried', () => {
    const directOverlayShellFiles = collectUiSourceFiles(UI_ROOT)
      .filter((filePath) => fs.readFileSync(filePath, 'utf8').includes('RadixOverlayContentShell'))
      .map((filePath) => normalizeRelativePath(filePath))
      .sort();

    expect(directOverlayShellFiles).toEqual([...EXPECTED_DIRECT_OVERLAY_SHELL_FILES].sort());
  });

  it('requires non-KangurDialog direct overlay shells to provide explicit title and description nodes', () => {
    const confirmModalSource = fs.readFileSync(
      path.join(UI_ROOT, 'components/KangurConfirmModal.tsx'),
      'utf8'
    );

    expect(confirmModalSource).toContain('AlertDialog.Title');
    expect(confirmModalSource).toContain('AlertDialog.Description');
  });
});
