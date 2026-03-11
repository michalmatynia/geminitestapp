import fs from "node:fs";
import path from "node:path";

type CuratedOverrideFile = {
  generatedAt: string;
  sourceBatchPath?: string;
  sourcePackPath?: string;
  family?: string;
  catalogId?: string;
  entryCount: number;
  overrides: Array<{
    sku: string;
    productId: string;
    classification: string;
    recommendedAction?: string;
    currentNames?: Record<string, unknown>;
    currentParameters?: unknown[];
    proposedParameters: Array<{
      parameterId: string;
      value?: string | null;
      valuesByLanguage?: Record<string, string>;
    }>;
    notes?: string[];
  }>;
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function parseArgs(argv: string[]) {
  const files: string[] = [];
  let outputPath = "";

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    if (typeof token !== "string") {
      continue;
    }

    if (token === "--out" && typeof next === "string") {
      outputPath = next;
      index += 1;
      continue;
    }

    files.push(token);
  }

  if (files.length === 0) {
    throw new Error(
      "Usage: node --import tsx scripts/db/merge-product-parameter-curated-override-files.ts <curated.json> [...curated.json] [--out <merged.json>]",
    );
  }

  return {
    files: files.map((file) => path.resolve(file)),
    outputPath: outputPath ? path.resolve(outputPath) : "",
  };
}

function defaultOutputPath(firstFile: string): string {
  return path.join(path.dirname(firstFile), `merged-curated-overrides-${Date.now()}.json`);
}

function main(): void {
  const { files, outputPath } = parseArgs(process.argv.slice(2));
  const parsed = files.map((file) => ({ file, data: readJson<CuratedOverrideFile>(file) }));
  const firstFile = files[0];

  if (!firstFile) {
    throw new Error("Expected at least one curated override file.");
  }

  const mergedOverrides = parsed.flatMap(({ data }) => data.overrides);
  const merged = {
    generatedAt: new Date().toISOString(),
    sourceFiles: files,
    entryCount: mergedOverrides.length,
    overrides: mergedOverrides,
  };

  const resolvedOutputPath = outputPath || defaultOutputPath(firstFile);
  fs.writeFileSync(resolvedOutputPath, JSON.stringify(merged, null, 2) + "\n");
  process.stdout.write(`${resolvedOutputPath}\n`);
}

main();
