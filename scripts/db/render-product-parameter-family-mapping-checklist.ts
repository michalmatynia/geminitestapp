import fs from 'node:fs';
import path from 'node:path';

type MappingIndex = {
  generatedAt: string;
  packCount: number;
  sourcePackPaths: string[];
  families: Array<{
    family: string;
    catalogId: string;
    entryCount: number;
    sourceBatchPath: string;
    sourcePackPath: string;
    slots: Array<{
      slotId: string;
      slotLabel: string;
      suggestedFinalParameterId: string | null;
      suggestedDisplayName: string | null;
      occurrenceCount: number;
      uniqueValuesByLanguage: Record<string, string[]>;
      notes?: string[];
    }>;
  }>;
};

const DEFAULT_INDEX_PATH = '/tmp/product-parameter-source-recovery-batches/family-mapping-index.json';

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function parseArgs(argv: string[]) {
  const [indexPath = DEFAULT_INDEX_PATH, maybeOutFlag, maybeOutPath] = argv;

  let outputPath = '';
  if (maybeOutFlag === '--out' && maybeOutPath) {
    outputPath = maybeOutPath;
  }

  return { indexPath, outputPath };
}

function defaultOutputPath(indexPath: string): string {
  const parsed = path.parse(indexPath);
  return path.join(parsed.dir, `${parsed.name}-checklist.md`);
}

function render(index: MappingIndex): string {
  const lines: string[] = [];

  lines.push('# Product parameter family mapping checklist');
  lines.push('');
  lines.push(`Generated: ${index.generatedAt}`);
  lines.push(`Pack count: ${index.packCount}`);
  lines.push('');
  lines.push('Fill `suggestedFinalParameterId` for each slot in the family mapping packs, then build curated overrides from those packs.');
  lines.push('');

  for (const family of index.families) {
    lines.push(`## ${family.family} (${family.catalogId})`);
    lines.push('');
    lines.push(`- Entries: ${family.entryCount}`);
    lines.push(`- Source batch: \`${family.sourceBatchPath}\``);
    lines.push(`- Source pack: \`${family.sourcePackPath}\``);
    lines.push('');

    for (const slot of family.slots) {
      lines.push(`### ${slot.slotLabel} \`${slot.slotId}\``);
      lines.push('');
      lines.push(`- Occurrences: ${slot.occurrenceCount}`);
      lines.push(`- Suggested final parameter id: ${slot.suggestedFinalParameterId ?? '(fill me)'}`);
      lines.push(`- Suggested display name: ${slot.suggestedDisplayName ?? '(fill me)'}`);
      for (const [language, values] of Object.entries(slot.uniqueValuesByLanguage).sort(([left], [right]) =>
        left.localeCompare(right),
      )) {
        lines.push(`- Values (${language}): ${values.join(', ')}`);
      }
      for (const note of slot.notes ?? []) {
        lines.push(`- Note: ${note}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

function main(): void {
  const { indexPath, outputPath } = parseArgs(process.argv.slice(2));
  const absoluteIndexPath = path.resolve(indexPath);
  const index = readJson<MappingIndex>(absoluteIndexPath);
  const rendered = render(index);
  const resolvedOutputPath = outputPath
    ? path.resolve(outputPath)
    : defaultOutputPath(absoluteIndexPath);
  fs.writeFileSync(resolvedOutputPath, rendered);
  process.stdout.write(`${resolvedOutputPath}\n`);
}

main();
