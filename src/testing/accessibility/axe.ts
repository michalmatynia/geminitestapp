import axe from 'axe-core';

import type { Result, RunOptions } from 'axe-core';

const DEFAULT_COMPONENT_RULES: NonNullable<RunOptions['rules']> = {
  'color-contrast': { enabled: false },
  bypass: { enabled: false },
  region: { enabled: false },
  'landmark-one-main': { enabled: false },
  'page-has-heading-one': { enabled: false },
};

const formatAxeViolations = (violations: Result[]): string =>
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

export async function runAxe(
  context: Element | Document = document.body,
  options: RunOptions = {}
): Promise<axe.AxeResults> {
  return axe.run(context, {
    ...options,
    rules: {
      ...DEFAULT_COMPONENT_RULES,
      ...(options.rules ?? {}),
    },
  });
}

export async function expectNoAxeViolations(
  context: Element | Document = document.body,
  options: RunOptions = {}
): Promise<void> {
  const results = await runAxe(context, options);
  if (results.violations.length === 0) return;

  throw new Error(`Accessibility violations detected:\n\n${formatAxeViolations(results.violations)}`);
}
