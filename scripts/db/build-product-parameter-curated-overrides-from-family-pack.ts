import fs from 'node:fs';
import path from 'node:path';

type LocalizedValues = Record<string, string>;

type ProposedParameter = {
  parameterId: string;
  value?: string | null;
  valuesByLanguage?: LocalizedValues | null;
};

type BatchOverride = {
  sku: string;
  productId: string;
  classification: string;
  recommendedAction?: string;
  currentNames?: Record<string, unknown>;
  currentParameters?: unknown[];
  proposedParameters?: ProposedParameter[];
  notes?: string[];
};

type RecoveryBatch = {
  family: string;
  catalogId: string;
  entryCount: number;
  overrides: BatchOverride[];
};

type MappingPack = {
  family: string;
  catalogId: string;
  slotMappings: Array<{
    slotId: string;
    suggestedFinalParameterId: string | null;
  }>;
};

const OMIT_PARAMETER_ID = '__omit__';

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseArgs(argv: string[]) {
  let batchPath = '';
  let packPath = '';
  let outputPath = '';

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    if (token === '--batch' && next) {
      batchPath = next;
      index += 1;
      continue;
    }
    if (token === '--pack' && next) {
      packPath = next;
      index += 1;
      continue;
    }
    if (token === '--out' && next) {
      outputPath = next;
      index += 1;
    }
  }

  if (!batchPath || !packPath) {
    throw new Error(
      'Usage: node --import tsx scripts/db/build-product-parameter-curated-overrides-from-family-pack.ts --batch <batch.json> --pack <pack.json> [--out <curated.json>]',
    );
  }

  return { batchPath, packPath, outputPath };
}

function defaultOutputPath(packPath: string): string {
  const parsed = path.parse(packPath);
  return path.join(parsed.dir, `${parsed.name.replace(/-mapping-pack$/, '')}-curated-overrides.json`);
}

function main(): void {
  const { batchPath, packPath, outputPath } = parseArgs(process.argv.slice(2));
  const absoluteBatchPath = path.resolve(batchPath);
  const absolutePackPath = path.resolve(packPath);
  const batch = readJson<RecoveryBatch>(absoluteBatchPath);
  const pack = readJson<MappingPack>(absolutePackPath);

  const mappingBySlot = new Map<string, string>();
  for (const mapping of pack.slotMappings) {
    const slotId = normalizeString(mapping.slotId);
    const finalParameterId = normalizeString(mapping.suggestedFinalParameterId);
    if (slotId && finalParameterId) {
      mappingBySlot.set(slotId, finalParameterId);
    }
  }

  const unresolvedSlots = new Set<string>();
  for (const override of batch.overrides) {
    for (const proposed of override.proposedParameters ?? []) {
      const slotId = normalizeString(proposed.parameterId);
      if (slotId && !mappingBySlot.has(slotId)) {
        unresolvedSlots.add(slotId);
      }
    }
  }

  if (unresolvedSlots.size > 0) {
    throw new Error(
      `Cannot build curated overrides. Missing suggestedFinalParameterId for slots: ${Array.from(unresolvedSlots).sort().join(', ')}`,
    );
  }

  const curated = {
    generatedAt: new Date().toISOString(),
    sourceBatchPath: absoluteBatchPath,
    sourcePackPath: absolutePackPath,
    family: batch.family,
    catalogId: batch.catalogId,
    entryCount: batch.entryCount,
    overrides: batch.overrides.map((override) => ({
      sku: override.sku,
      productId: override.productId,
      classification: override.classification,
      recommendedAction:
        override.recommendedAction ??
        'Apply curated category-backed parameter ids generated from the family mapping pack.',
      currentNames: override.currentNames ?? {},
      currentParameters: override.currentParameters ?? [],
      proposedParameters: (override.proposedParameters ?? [])
        .map((proposed) => ({
          mappedParameterId: mappingBySlot.get(normalizeString(proposed.parameterId))!,
          value: normalizeString(proposed.value),
          valuesByLanguage: proposed.valuesByLanguage ?? {},
        }))
        .filter((proposed) => proposed.mappedParameterId !== OMIT_PARAMETER_ID)
        .map((proposed) => ({
          parameterId: proposed.mappedParameterId,
          value: proposed.value,
          valuesByLanguage: proposed.valuesByLanguage,
        })),
      notes: [
        ...(override.notes ?? []),
        `Mapped from family pack ${path.basename(absolutePackPath)}.`,
      ],
    })),
  };

  const resolvedOutputPath = outputPath
    ? path.resolve(outputPath)
    : defaultOutputPath(absolutePackPath);
  fs.writeFileSync(resolvedOutputPath, JSON.stringify(curated, null, 2) + '\n');
  process.stdout.write(`${resolvedOutputPath}\n`);
}

main();
