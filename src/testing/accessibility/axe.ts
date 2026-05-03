import * as axe from 'axe-core';

type AxeNode = {
  target: string[];
  failureSummary?: string | null;
};

type AxeViolation = {
  impact?: string | null;
  id: string;
  help: string;
  description: string;
  helpUrl: string;
  nodes: AxeNode[];
};

type AxeResultsLike = {
  violations: AxeViolation[];
};

type AxeRunOptions = Record<string, unknown> & {
  rules?: Record<string, unknown>;
};

type AxeApi = {
  run: (context: Element | Document, options?: AxeRunOptions) => Promise<AxeResultsLike>;
};

const isAxeApi = (value: unknown): value is AxeApi => {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { run?: unknown };
  return typeof candidate.run === 'function';
};

if (!isAxeApi(axe)) {
  throw new Error('axe-core API is missing run()');
}

const axeApi: AxeApi = axe;

const DEFAULT_COMPONENT_RULES: NonNullable<AxeRunOptions['rules']> = {
  'color-contrast': { enabled: false },
  bypass: { enabled: false },
  region: { enabled: false },
  'landmark-one-main': { enabled: false },
  'page-has-heading-one': { enabled: false },
};

const formatAxeViolations = (violations: AxeViolation[]): string =>
  violations
    .map((violation: AxeViolation) => {
      const nodes = violation.nodes
        .map((node: AxeNode) => {
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
  options: AxeRunOptions = {}
): Promise<AxeResultsLike> {
  return axeApi.run(context, {
    ...options,
    rules: {
      ...DEFAULT_COMPONENT_RULES,
      ...(options.rules ?? {}),
    },
  });
}

export async function expectNoAxeViolations(
  context: Element | Document = document.body,
  options: AxeRunOptions = {}
): Promise<void> {
  const results = await runAxe(context, options);
  if (results.violations.length === 0) return;

  throw new Error(`Accessibility violations detected:\n\n${formatAxeViolations(results.violations)}`);
}
