import fs from "node:fs";
import path from "node:path";

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
  currentNames?: Record<string, unknown>;
  proposedParameters?: ProposedParameter[];
  notes?: string[];
};

type RecoveryBatch = {
  family: string;
  catalogId: string;
  entryCount: number;
  overrides: BatchOverride[];
};

type SlotAccumulator = {
  slotId: string;
  occurrenceCount: number;
  valuesByLanguage: Map<string, Set<string>>;
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function ensureArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function addLocalizedValue(
  valuesByLanguage: Map<string, Set<string>>,
  language: string,
  value: unknown,
): void {
  const normalized = normalizeString(value);
  if (!normalized) {
    return;
  }
  if (!valuesByLanguage.has(language)) {
    valuesByLanguage.set(language, new Set<string>());
  }
  valuesByLanguage.get(language)?.add(normalized);
}

function buildPack(batchPath: string, batch: RecoveryBatch) {
  const slotAccumulators = new Map<string, SlotAccumulator>();

  for (const override of ensureArray(batch.overrides)) {
    for (const proposed of ensureArray(override.proposedParameters)) {
      const slotId = normalizeString(proposed.parameterId);
      if (!slotId) {
        continue;
      }
      if (!slotAccumulators.has(slotId)) {
        slotAccumulators.set(slotId, {
          slotId,
          occurrenceCount: 0,
          valuesByLanguage: new Map<string, Set<string>>(),
        });
      }
      const slot = slotAccumulators.get(slotId)!;
      slot.occurrenceCount += 1;

      const localized = proposed.valuesByLanguage ?? {};
      const localizedEntries = Object.entries(localized);
      if (localizedEntries.length > 0) {
        for (const [language, value] of localizedEntries) {
          addLocalizedValue(slot.valuesByLanguage, language, value);
        }
      } else {
        addLocalizedValue(slot.valuesByLanguage, "en", proposed.value);
      }
    }
  }

  const slotMappings = Array.from(slotAccumulators.values())
    .sort((left, right) => left.slotId.localeCompare(right.slotId))
    .map((slot) => ({
      slotId: slot.slotId,
      slotLabel: slot.slotId.startsWith("source-recovery:")
        ? slot.slotId.slice("source-recovery:".length)
        : slot.slotId,
      suggestedFinalParameterId: null as string | null,
      suggestedDisplayName: null as string | null,
      occurrenceCount: slot.occurrenceCount,
      uniqueValuesByLanguage: Object.fromEntries(
        Array.from(slot.valuesByLanguage.entries())
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([language, values]) => [language, Array.from(values).sort()]),
      ),
      notes: [
        "Fill suggestedFinalParameterId with a real category-backed parameter id before generating curated overrides.",
      ],
    }));

  return {
    generatedAt: new Date().toISOString(),
    sourceBatchPath: batchPath,
    family: batch.family,
    catalogId: batch.catalogId,
    entryCount: batch.entryCount,
    slotMappings,
    entryOverrides: ensureArray(batch.overrides).map((override) => ({
      sku: override.sku,
      productId: override.productId,
      classification: override.classification,
      currentNames: override.currentNames ?? {},
      slots: ensureArray(override.proposedParameters).map((proposed) => ({
        slotId: normalizeString(proposed.parameterId),
        value: normalizeString(proposed.value),
        valuesByLanguage: proposed.valuesByLanguage ?? {},
      })),
      notes: ensureArray(override.notes),
    })),
  };
}

function getOutputPath(batchPath: string): string {
  const parsed = path.parse(batchPath);
  return path.join(parsed.dir, `${parsed.name}-mapping-pack.json`);
}

function main(): void {
  const batchPaths = process.argv.slice(2);
  if (batchPaths.length === 0) {
    throw new Error("Usage: node --import tsx scripts/db/generate-product-parameter-family-mapping-pack.ts <batch.json> [...batch.json]");
  }

  for (const batchPath of batchPaths) {
    const absoluteBatchPath = path.resolve(batchPath);
    const batch = readJson<RecoveryBatch>(absoluteBatchPath);
    const pack = buildPack(absoluteBatchPath, batch);
    const outputPath = getOutputPath(absoluteBatchPath);
    fs.writeFileSync(outputPath, JSON.stringify(pack, null, 2) + "\n");
    process.stdout.write(`${outputPath}\n`);
  }
}

main();
