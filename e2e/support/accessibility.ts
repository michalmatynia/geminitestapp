import axeCore from 'axe-core';

import type { Result, RunOptions } from 'axe-core';
import type { Page } from '@playwright/test';

type AxePageScanOptions = {
  contextSelector?: string;
  runOptions?: RunOptions;
};

const DEFAULT_PAGE_RULES: NonNullable<RunOptions['rules']> = {
  'color-contrast': { enabled: false },
};

const formatViolations = (violations: Result[]): string =>
  violations
    .map((violation: Result) => {
      const nodes = violation.nodes
        .map((node) => {
          const target = node.target.join(' > ') || '(unknown target)';
          const summary = node.failureSummary ?? 'No failure summary provided.';
          return `- ${target}\n${summary}`;
        })
        .join('\n');

      return [
        `[${violation.impact ?? 'unknown'}] ${violation.id}: ${violation.help}`,
        violation.description,
        nodes,
        violation.helpUrl,
      ].join('\n');
    })
    .join('\n\n');

const installAxe = async (page: Page): Promise<void> => {
  const hasAxe = await page.evaluate(() => typeof (window as Window & { axe?: unknown }).axe !== 'undefined');
  if (hasAxe) return;
  await page.addScriptTag({ content: axeCore.source });
};

export async function scanPageForAccessibility(
  page: Page,
  options: AxePageScanOptions = {}
): Promise<Result[]> {
  await installAxe(page);

  const results = await page.evaluate(
    async ({
      contextSelector,
      runOptions,
    }: {
      contextSelector?: string;
      runOptions: RunOptions;
    }) => {
      const axe = (window as unknown as Window & { axe?: { run: typeof axeCore.run } }).axe;
      if (!axe) {
        throw new Error('axe-core was not installed on the page');
      }

      const context = contextSelector
        ? document.querySelector(contextSelector) ?? document
        : document;
      const axeResults = await axe.run(context, runOptions);

      return axeResults.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.map((node) => ({
          html: node.html,
          target: node.target,
          failureSummary: node.failureSummary,
        })),
      }));
    },
    {
      contextSelector: options.contextSelector,
      runOptions: {
        ...(options.runOptions ?? {}),
        rules: {
          ...DEFAULT_PAGE_RULES,
          ...(options.runOptions?.rules ?? {}),
        },
      },
    }
  );

  return results as Result[];
}

export async function expectPageToHaveNoAxeViolations(
  page: Page,
  options: AxePageScanOptions = {}
): Promise<void> {
  const violations = await scanPageForAccessibility(page, options);
  if (violations.length === 0) return;

  throw new Error(`Accessibility violations detected:\n\n${formatViolations(violations)}`);
}
