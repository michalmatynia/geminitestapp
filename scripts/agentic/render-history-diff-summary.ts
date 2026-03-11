import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { agenticRepoRoot } from './domain-manifests';
import type { AgenticHistoryDiff } from './diff-history';

export function renderAgenticHistoryDiffSummary(diff: AgenticHistoryDiff): string {
  const lines: string[] = ['## Agentic history diff'];

  if (diff.newlyHighRiskBundles.length > 0) {
    lines.push('');
    lines.push('### Newly introduced high-risk bundles');
    for (const bundle of diff.newlyHighRiskBundles) {
      lines.push(`- \`${bundle}\``);
    }
  }

  if (diff.riskEscalations.length > 0) {
    lines.push('');
    lines.push('### Risk escalations');
    for (const escalation of diff.riskEscalations) {
      lines.push(
        `- \`${escalation.bundle}\`: \`${escalation.previousPriority}\` -> \`${escalation.currentPriority}\``,
      );
    }
  }

  if (diff.addedBundles.length > 0 || diff.removedBundles.length > 0) {
    lines.push('');
    lines.push('### Bundle set changes');
    if (diff.addedBundles.length > 0) {
      lines.push(`- Added: ${diff.addedBundles.map((bundle) => `\`${bundle}\``).join(', ')}`);
    }
    if (diff.removedBundles.length > 0) {
      lines.push(`- Removed: ${diff.removedBundles.map((bundle) => `\`${bundle}\``).join(', ')}`);
    }
  }

  if (diff.validationDecisionChanged.changed) {
    lines.push('');
    lines.push('### Validation decision change');
    lines.push(
      `- \`${diff.validationDecisionChanged.previous ?? 'none'}\` -> \`${diff.validationDecisionChanged.current ?? 'none'}\``,
    );
  }

  if (diff.selectionChanges.length > 0) {
    lines.push('');
    lines.push('### Bundle selection drift');
    for (const change of diff.selectionChanges) {
      lines.push(
        `- \`${change.bundle}\`: \`${change.previousState}\` -> \`${change.currentState}\``,
      );
    }
  }

  if (
    diff.newlyHighRiskBundles.length === 0 &&
    diff.riskEscalations.length === 0 &&
    diff.addedBundles.length === 0 &&
    diff.removedBundles.length === 0 &&
    !diff.validationDecisionChanged.changed &&
    diff.selectionChanges.length === 0
  ) {
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
