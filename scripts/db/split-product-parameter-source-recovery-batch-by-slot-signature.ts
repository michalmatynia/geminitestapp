import fs from "node:fs";
import path from "node:path";

type ProposedParameter = {
  parameterId?: string | null;
  value?: string | null;
  valuesByLanguage?: Record<string, string> | null;
};

type BatchOverride = {
  sku: string;
  productId: string;
  classification: string;
  recommendedAction?: string;
  currentNames?: Record<string, unknown>;
  catalogId?: string;
  currentParameters?: unknown[];
  proposedParameters?: ProposedParameter[];
  notes?: string[];
};

type RecoveryBatch = {
  generatedAt: string;
  sourceTemplatePath?: string;
  family: string;
  catalogId: string;
  entryCount: number;
  overrides: BatchOverride[];
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeSignature(signature: string): string {
  return signature
    .replace(/source-recovery:/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function getSignature(override: BatchOverride): string {
  const slotIds = (override.proposedParameters ?? [])
    .map((parameter) => normalizeString(parameter.parameterId))
    .filter(Boolean);
  return slotIds.join("__");
}

function main(): void {
  const batchPathArg = process.argv[2];
  if (!batchPathArg) {
    throw new Error(
      "Usage: node --import tsx scripts/db/split-product-parameter-source-recovery-batch-by-slot-signature.ts <batch.json>",
    );
  }

  const batchPath = path.resolve(batchPathArg);
  const batch = readJson<RecoveryBatch>(batchPath);
  const parsed = path.parse(batchPath);
  const groups = new Map<string, BatchOverride[]>();

  for (const override of batch.overrides) {
    const signature = getSignature(override);
    if (!groups.has(signature)) {
      groups.set(signature, []);
    }
    groups.get(signature)!.push(override);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceBatchPath: batchPath,
    family: batch.family,
    catalogId: batch.catalogId,
    variantCount: groups.size,
    variants: [] as Array<{
      signature: string;
      signatureLabel: string;
      entryCount: number;
      outputPath: string;
    }>,
  };

  let variantIndex = 1;
  for (const [signature, overrides] of Array.from(groups.entries()).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const signatureLabel = sanitizeSignature(signature) || `variant_${variantIndex}`;
    const outputPath = path.join(
      parsed.dir,
      `${parsed.name}--variant-${String(variantIndex).padStart(2, "0")}--${signatureLabel}.json`,
    );
    const variantBatch: RecoveryBatch = {
      ...batch,
      generatedAt: new Date().toISOString(),
      entryCount: overrides.length,
      overrides,
    };
    fs.writeFileSync(outputPath, JSON.stringify(variantBatch, null, 2) + "\n");
    manifest.variants.push({
      signature,
      signatureLabel,
      entryCount: overrides.length,
      outputPath,
    });
    variantIndex += 1;
  }

  const manifestPath = path.join(parsed.dir, `${parsed.name}--slot-signature-manifest.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  process.stdout.write(`${manifestPath}\n`);
}

main();
