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

type RecoveryBatchManifest = {
  outputDir: string;
  batches: Array<{
    family: string;
    catalogId: string;
    entryCount: number;
    outputPath: string;
  }>;
};

type MappingPack = {
  family: string;
  catalogId: string;
  slotMappings: Array<{
    slotId: string;
    suggestedFinalParameterId: string | null;
  }>;
};

type ReadyBatchReport = {
  family: string;
  catalogId: string;
  batchPath: string;
  mappingPackPath: string;
  entryCount: number;
  status: 'ready' | 'pending' | 'missing-pack';
  unresolvedSlots: string[];
  readyOverrideCount: number;
};

const DEFAULT_MANIFEST_PATH = '/tmp/product-parameter-source-recovery-batches/manifest.json';
const DEFAULT_OUTPUT_PATH = '/tmp/product-parameter-curated-overrides-latest.json';
const DEFAULT_REPORT_PATH = '/tmp/product-parameter-curated-build-latest.json';
const OMIT_PARAMETER_ID = '__omit__';

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseArgs(argv: string[]): {
  manifestPath: string;
  outputPath: string;
  reportPath: string;
} {
  let manifestPath = DEFAULT_MANIFEST_PATH;
  let outputPath = DEFAULT_OUTPUT_PATH;
  let reportPath = DEFAULT_REPORT_PATH;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === '--manifest' && next) {
      manifestPath = next;
      index += 1;
      continue;
    }

    if (token === '--out' && next) {
      outputPath = next;
      index += 1;
      continue;
    }

    if (token === '--report' && next) {
      reportPath = next;
      index += 1;
    }
  }

  return {
    manifestPath: path.resolve(manifestPath),
    outputPath: path.resolve(outputPath),
    reportPath: path.resolve(reportPath),
  };
}

function getMappingPackPath(batchPath: string): string {
  const parsed = path.parse(batchPath);
  return path.join(parsed.dir, `${parsed.name}-mapping-pack.json`);
}

function buildMappingBySlot(pack: MappingPack): Map<string, string> {
  const mappingBySlot = new Map<string, string>();
  for (const mapping of pack.slotMappings) {
    const slotId = normalizeString(mapping.slotId);
    const finalParameterId = normalizeString(mapping.suggestedFinalParameterId);
    if (slotId && finalParameterId) {
      mappingBySlot.set(slotId, finalParameterId);
    }
  }
  return mappingBySlot;
}

function buildCuratedOverrides(
  batch: RecoveryBatch,
  mappingBySlot: Map<string, string>,
): {
  unresolvedSlots: string[];
  overrides: Array<{
    sku: string;
    productId: string;
    classification: string;
    recommendedAction: string;
    currentNames: Record<string, unknown>;
    currentParameters: unknown[];
    proposedParameters: Array<{
      parameterId: string;
      value: string;
      valuesByLanguage: Record<string, string>;
    }>;
    notes: string[];
  }>;
} {
  const unresolvedSlots = new Set<string>();
  let hasMissingProposedParameters = false;

  for (const override of batch.overrides) {
    if ((override.proposedParameters ?? []).length === 0) {
      hasMissingProposedParameters = true;
      continue;
    }

    for (const proposed of override.proposedParameters ?? []) {
      const slotId = normalizeString(proposed.parameterId);
      if (slotId && !mappingBySlot.has(slotId)) {
        unresolvedSlots.add(slotId);
      }
    }
  }

  if (hasMissingProposedParameters) {
    unresolvedSlots.add('__manual_curation_required__');
  }

  if (unresolvedSlots.size > 0) {
    return {
      unresolvedSlots: Array.from(unresolvedSlots).sort(),
      overrides: [],
    };
  }

  return {
    unresolvedSlots: [],
    overrides: batch.overrides.map((override) => ({
      sku: override.sku,
      productId: override.productId,
      classification: override.classification,
      recommendedAction:
        override.recommendedAction ??
        'Apply curated category-backed parameter ids generated from the latest family mapping pack.',
      currentNames: override.currentNames ?? {},
      currentParameters: override.currentParameters ?? [],
      proposedParameters: (override.proposedParameters ?? [])
        .map((proposed) => ({
          mappedParameterId: mappingBySlot.get(normalizeString(proposed.parameterId)) ?? '',
          value: normalizeString(proposed.value),
          valuesByLanguage: proposed.valuesByLanguage ?? {},
        }))
        .filter((proposed) => proposed.mappedParameterId !== OMIT_PARAMETER_ID)
        .map((proposed) => ({
          parameterId: proposed.mappedParameterId,
          value: proposed.value,
          valuesByLanguage: proposed.valuesByLanguage,
        })),
      notes: override.notes ?? [],
    })),
  };
}

function main(): void {
  const { manifestPath, outputPath, reportPath } = parseArgs(process.argv.slice(2));
  const manifest = readJson<RecoveryBatchManifest>(manifestPath);
  const batchReports: ReadyBatchReport[] = [];
  const mergedOverrides: Array<{
    sku: string;
    productId: string;
    classification: string;
    recommendedAction: string;
    currentNames: Record<string, unknown>;
    currentParameters: unknown[];
    proposedParameters: Array<{
      parameterId: string;
      value: string;
      valuesByLanguage: Record<string, string>;
    }>;
    notes: string[];
  }> = [];

  for (const batchEntry of manifest.batches) {
    const batchPath = path.resolve(batchEntry.outputPath);
    const mappingPackPath = getMappingPackPath(batchPath);

    if (!fs.existsSync(mappingPackPath)) {
      batchReports.push({
        family: batchEntry.family,
        catalogId: batchEntry.catalogId,
        batchPath,
        mappingPackPath,
        entryCount: batchEntry.entryCount,
        status: 'missing-pack',
        unresolvedSlots: [],
        readyOverrideCount: 0,
      });
      continue;
    }

    const batch = readJson<RecoveryBatch>(batchPath);
    const pack = readJson<MappingPack>(mappingPackPath);
    const { unresolvedSlots, overrides } = buildCuratedOverrides(
      batch,
      buildMappingBySlot(pack),
    );

    const status: ReadyBatchReport['status'] =
      unresolvedSlots.length > 0 ? 'pending' : 'ready';

    batchReports.push({
      family: batchEntry.family,
      catalogId: batchEntry.catalogId,
      batchPath,
      mappingPackPath,
      entryCount: batchEntry.entryCount,
      status,
      unresolvedSlots,
      readyOverrideCount: overrides.length,
    });

    if (status === 'ready') {
      mergedOverrides.push(...overrides);
    }
  }

  const mergedFile = {
    generatedAt: new Date().toISOString(),
    sourceManifestPath: manifestPath,
    entryCount: mergedOverrides.length,
    overrideCount: mergedOverrides.length,
    overrides: mergedOverrides,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    manifestPath,
    outputPath,
    reportPath,
    batchCount: batchReports.length,
    readyBatchCount: batchReports.filter((batch) => batch.status === 'ready').length,
    pendingBatchCount: batchReports.filter((batch) => batch.status === 'pending').length,
    missingPackCount: batchReports.filter((batch) => batch.status === 'missing-pack').length,
    overrideCount: mergedOverrides.length,
    batches: batchReports,
  };

  fs.writeFileSync(outputPath, JSON.stringify(mergedFile, null, 2) + '\n');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
