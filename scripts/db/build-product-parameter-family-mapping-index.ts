import fs from 'node:fs';
import path from 'node:path';

type MappingPack = {
  generatedAt: string;
  sourceBatchPath: string;
  family: string;
  catalogId: string;
  entryCount: number;
  slotMappings: Array<{
    slotId: string;
    slotLabel: string;
    suggestedFinalParameterId: string | null;
    suggestedDisplayName: string | null;
    occurrenceCount: number;
    uniqueValuesByLanguage: Record<string, string[]>;
    notes?: string[];
  }>;
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function parseArgs(argv: string[]) {
  const packPaths: string[] = [];
  let outputPath = '';

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    if (typeof token !== 'string') {
      continue;
    }
    if (token === '--out' && next) {
      outputPath = next;
      index += 1;
      continue;
    }
    packPaths.push(token);
  }

  if (packPaths.length === 0) {
    throw new Error(
      'Usage: node --import tsx scripts/db/build-product-parameter-family-mapping-index.ts <pack.json> [...pack.json] [--out <index.json>]',
    );
  }

  return { packPaths, outputPath };
}

function defaultOutputPath(firstPackPath: string): string {
  return path.join(path.dirname(firstPackPath), 'family-mapping-index.json');
}

function main(): void {
  const { packPaths, outputPath } = parseArgs(process.argv.slice(2));
  const absolutePackPaths = packPaths.map((packPath) => path.resolve(packPath));
  const packs = absolutePackPaths.map((packPath) => ({
    packPath,
    pack: readJson<MappingPack>(packPath),
  }));

  const byFamily = packs
    .map(({ packPath, pack }) => ({
      family: pack.family,
      catalogId: pack.catalogId,
      entryCount: pack.entryCount,
      sourceBatchPath: pack.sourceBatchPath,
      sourcePackPath: packPath,
      slots: pack.slotMappings.map((slot) => ({
        slotId: slot.slotId,
        slotLabel: slot.slotLabel,
        suggestedFinalParameterId: slot.suggestedFinalParameterId,
        suggestedDisplayName: slot.suggestedDisplayName,
        occurrenceCount: slot.occurrenceCount,
        uniqueValuesByLanguage: slot.uniqueValuesByLanguage,
        notes: slot.notes ?? [],
      })),
    }))
    .sort((left, right) => {
      const familyOrder = left.family.localeCompare(right.family);
      return familyOrder !== 0 ? familyOrder : left.catalogId.localeCompare(right.catalogId);
    });

  const bySlot = new Map<
    string,
    {
      slotId: string;
      families: Array<{
        family: string;
        catalogId: string;
        entryCount: number;
        occurrenceCount: number;
        uniqueValuesByLanguage: Record<string, string[]>;
      }>;
    }
  >();

  for (const family of byFamily) {
    for (const slot of family.slots) {
      if (!bySlot.has(slot.slotId)) {
        bySlot.set(slot.slotId, {
          slotId: slot.slotId,
          families: [],
        });
      }
      bySlot.get(slot.slotId)!.families.push({
        family: family.family,
        catalogId: family.catalogId,
        entryCount: family.entryCount,
        occurrenceCount: slot.occurrenceCount,
        uniqueValuesByLanguage: slot.uniqueValuesByLanguage,
      });
    }
  }

  const index = {
    generatedAt: new Date().toISOString(),
    packCount: packs.length,
    sourcePackPaths: absolutePackPaths,
    families: byFamily,
    slots: Array.from(bySlot.values())
      .sort((left, right) => left.slotId.localeCompare(right.slotId))
      .map((slot) => ({
        slotId: slot.slotId,
        familyCount: slot.families.length,
        families: slot.families.sort((left, right) => {
          const familyOrder = left.family.localeCompare(right.family);
          return familyOrder !== 0 ? familyOrder : left.catalogId.localeCompare(right.catalogId);
        }),
      })),
  };

  const firstPackPath = absolutePackPaths[0];
  if (typeof firstPackPath !== 'string') {
    throw new Error('Expected at least one mapping pack path.');
  }

  const resolvedOutputPath = outputPath
    ? path.resolve(outputPath)
    : defaultOutputPath(firstPackPath);
  fs.writeFileSync(resolvedOutputPath, JSON.stringify(index, null, 2) + '\n');
  process.stdout.write(`${resolvedOutputPath}\n`);
}

main();
