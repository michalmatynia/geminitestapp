import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { analyzeAccessibilityComponentPolicies } from './lib/check-accessibility-component-policies.mjs';

const tempRoots = [];

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'a11y-component-policies-'));
  tempRoots.push(root);
  return root;
};

const writeSource = (root, relativeFile, contents) => {
  const filePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
};

describe('analyzeAccessibilityComponentPolicies', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('fails DialogContent without a title or explicit label', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/features/example/ExampleDialog.tsx',
      'import { DialogContent } from \'@/shared/ui/dialog\';\nexport function ExampleDialog() {\n  return <DialogContent><div>Content</div></DialogContent>;\n}\n'
    );

    const report = analyzeAccessibilityComponentPolicies({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'dialog-content-missing-title',
          file: 'src/features/example/ExampleDialog.tsx',
        }),
      ])
    );
  });

  it('allows DialogContent with a DialogTitle', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/features/example/ExampleDialog.tsx',
      'import { DialogContent, DialogTitle } from \'@/shared/ui/dialog\';\nexport function ExampleDialog() {\n  return <DialogContent><DialogTitle className=\'sr-only\'>Example</DialogTitle><div>Content</div></DialogContent>;\n}\n'
    );

    const report = analyzeAccessibilityComponentPolicies({ root });

    expect(report.summary.errorCount).toBe(0);
    expect(report.summary.warningCount).toBe(0);
  });

  it('warns about unlabeled tablists', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/features/example/ExampleTabs.tsx',
      'import { TabsList } from \'@/shared/ui/tabs\';\nexport function ExampleTabs() {\n  return <TabsList className=\'w-full\' />;\n}\n'
    );

    const report = analyzeAccessibilityComponentPolicies({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'tabs-list-missing-label',
          severity: 'info',
        }),
      ])
    );
  });

  it('allows alert dialogs with aria-label', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/features/example/ExampleAlert.tsx',
      'import { AlertDialogContent } from \'@/shared/ui/alert-dialog\';\nexport function ExampleAlert() {\n  return <AlertDialogContent aria-label=\'Delete item\'><div>Danger</div></AlertDialogContent>;\n}\n'
    );

    const report = analyzeAccessibilityComponentPolicies({ root });

    expect(report.summary.errorCount).toBe(0);
  });

  it('warns when Tooltip wraps a non-focusable intrinsic trigger', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/features/example/ExampleTooltip.tsx',
      'import { Tooltip } from \'@/shared/ui/tooltip\';\nexport function ExampleTooltip() {\n  return <Tooltip content=\'Info\'><div>Hover me</div></Tooltip>;\n}\n'
    );

    const report = analyzeAccessibilityComponentPolicies({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'tooltip-trigger-not-focusable',
        }),
      ])
    );
  });

  it('allows Tooltip with a button trigger', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/features/example/ExampleTooltip.tsx',
      'import { Tooltip } from \'@/shared/ui/tooltip\';\nexport function ExampleTooltip() {\n  return <Tooltip content=\'Info\'><button type=\'button\'>Hover me</button></Tooltip>;\n}\n'
    );

    const report = analyzeAccessibilityComponentPolicies({ root });

    expect(report.summary.warningCount).toBe(0);
  });

  it('allows Tooltip wrappers that contain a focusable descendant', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/features/example/ExampleTooltip.tsx',
      'import { Tooltip } from \'@/shared/ui/tooltip\';\nexport function ExampleTooltip() {\n  return <Tooltip content=\'Info\'><span><button type=\'button\'>Hover me</button></span></Tooltip>;\n}\n'
    );

    const report = analyzeAccessibilityComponentPolicies({ root });

    expect(report.summary.warningCount).toBe(0);
  });
});
