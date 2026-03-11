import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { agenticRepoRoot } from './domain-manifests';
import type { AgenticBundleSelection } from './select-bundles';

export function renderAgenticBundleSelectionSummary(
  selection: AgenticBundleSelection,
): string {
  const lines: string[] = ['## Agentic bundle selection'];

  if (selection.selectedBundles.length > 0) {
    lines.push('');
    lines.push('### Selected bundles');
    for (const bundle of selection.selectedBundles) {
      lines.push(`- \`${bundle}\``);
    }
  }

  if (selection.skippedBundles.length > 0) {
    lines.push('');
    lines.push('### Suppressed unchanged bundles');
    for (const bundle of selection.skippedBundles) {
      lines.push(`- \`${bundle.bundle}\` (${bundle.reason})`);
    }
  }

  if (selection.selectedBundles.length === 0 && selection.skippedBundles.length === 0) {
    lines.push('');
    lines.push('- No impact bundles were selected.');
  }

  return `${lines.join('\n')}\n`;
}

function parseArguments(argv: readonly string[]): {
  inputPath: string;
} {
  let inputPath = 'artifacts/agent-bundle-selection.json';

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
  const rawSelection = await fs.readFile(path.join(agenticRepoRoot, inputPath), 'utf8');
  const selection = JSON.parse(rawSelection) as AgenticBundleSelection;

  process.stdout.write(renderAgenticBundleSelectionSummary(selection));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
