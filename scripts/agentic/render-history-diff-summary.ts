import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { agenticRepoRoot } from './domain-manifests';
import type { AgenticHistoryDiff } from './diff-history';

const appendSummaryHeading = (lines: string[], heading: string): void => {
  lines.push('');
  lines.push(heading);
};

const appendBulletLines = (lines: string[], entries: string[]): void => {
  entries.forEach((entry) => {
    lines.push(entry);
  });
};

const appendSummarySection = (
  lines: string[],
  heading: string,
  entries: string[]
): void => {
  if (entries.length === 0) {
    return;
  }
  appendSummaryHeading(lines, heading);
  appendBulletLines(lines, entries);
};

const hasAgenticHistoryDiffDrift = (diff: AgenticHistoryDiff): boolean =>
  diff.newlyAttemptedHighRiskSuppressions.length > 0 ||
  diff.newlyHighRiskBundles.length > 0 ||
  diff.riskEscalations.length > 0 ||
  diff.addedBundles.length > 0 ||
  diff.removedBundles.length > 0 ||
  diff.validationDecisionChanged.changed ||
  diff.selectionChanges.length > 0;

export function renderAgenticHistoryDiffSummary(diff: AgenticHistoryDiff): string {
  const lines: string[] = ['## Agentic history diff'];
  appendSummarySection(
    lines,
    '### Warning: attempted suppression prevented for high-risk bundles',
    diff.newlyAttemptedHighRiskSuppressions.map((bundle) => `- \`${bundle}\``)
  );
  appendSummarySection(
    lines,
    '### Newly introduced high-risk bundles',
    diff.newlyHighRiskBundles.map((bundle) => `- \`${bundle}\``)
  );
  appendSummarySection(
    lines,
    '### Risk escalations',
    diff.riskEscalations.map(
      (escalation) =>
        `- \`${escalation.bundle}\`: \`${escalation.previousPriority}\` -> \`${escalation.currentPriority}\``
    )
  );
  appendSummarySection(
    lines,
    '### Bundle set changes',
    [
      diff.addedBundles.length > 0
        ? `- Added: ${diff.addedBundles.map((bundle) => `\`${bundle}\``).join(', ')}`
        : '',
      diff.removedBundles.length > 0
        ? `- Removed: ${diff.removedBundles.map((bundle) => `\`${bundle}\``).join(', ')}`
        : '',
    ].filter(Boolean)
  );
  appendSummarySection(
    lines,
    '### Validation decision change',
    diff.validationDecisionChanged.changed
      ? [
          `- \`${diff.validationDecisionChanged.previous ?? 'none'}\` -> \`${diff.validationDecisionChanged.current ?? 'none'}\``,
        ]
      : []
  );
  appendSummarySection(
    lines,
    '### Bundle selection drift',
    diff.selectionChanges.map(
      (change) => `- \`${change.bundle}\`: \`${change.previousState}\` -> \`${change.currentState}\``
    )
  );

  if (!hasAgenticHistoryDiffDrift(diff)) {
    lines.push('');
    lines.push('- No bundle-set or risk-level drift detected.');
  }

  return `${lines.join('\n')}\n`;
}

function parseArguments(argv: readonly string[]): {
  inputPath: string;
} {
  let inputPath = 'artifacts/agent-history/diff.json';

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--input') {
      inputPath = argv[index + 1] ?? inputPath;
      index += 1;
    }
  }

  return { inputPath };
}

async function main(): Promise<void> {
  const { inputPath } = parseArguments(process.argv.slice(2));
  const rawDiff = await fs.readFile(path.join(agenticRepoRoot, inputPath), 'utf8');
  const diff = JSON.parse(rawDiff) as AgenticHistoryDiff;

  process.stdout.write(renderAgenticHistoryDiffSummary(diff));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
