import fs from 'node:fs';
import path from 'node:path';

type InferenceReport = {
  families: Array<{
    family: string;
    catalogId: string;
    candidateCategoryId: string | null;
    candidateCategoryCount?: number;
    slotInference: Array<{
      slotId: string;
      slotLabel: string;
      rankedCandidates: Array<{
        parameterId: string;
        overlapCount: number;
        shapeScore: number;
        observedValueCount: number;
        observedValuesSample: string[];
      }>;
    }>;
    notes?: string[];
  }>;
};

type MappingPack = {
  family: string;
  catalogId: string;
  slotMappings: Array<{
    slotId: string;
    slotLabel: string;
    suggestedFinalParameterId: string | null;
    suggestedDisplayName: string | null;
    occurrenceCount: number;
    uniqueValuesByLanguage: Record<string, string[]>;
    notes?: string[];
    candidateCategoryId?: string | null;
    candidateCategoryCount?: number | null;
    rankedCandidates?: Array<{
      parameterId: string;
      overlapCount: number;
      shapeScore: number;
      observedValueCount: number;
      observedValuesSample: string[];
    }>;
  }>;
};

type FamilyKey = `${string}::${string}`;

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function toFamilyKey(family: string, catalogId: string): FamilyKey {
  return `${family}::${catalogId}`;
}

function parseArgs(argv: string[]) {
  const [reportPath, ...packPaths] = argv;
  if (!reportPath || packPaths.length === 0) {
    throw new Error(
      'Usage: node --import tsx scripts/db/merge-product-parameter-slot-inference-into-family-packs.ts <inference-report.json> <pack.json> [...pack.json]',
    );
  }
  return {
    reportPath: path.resolve(reportPath),
    packPaths: packPaths.map((packPath) => path.resolve(packPath)),
  };
}

function main(): void {
  const { reportPath, packPaths } = parseArgs(process.argv.slice(2));
  const report = readJson<InferenceReport>(reportPath);

  const byFamily = new Map(
    report.families.map((family) => [toFamilyKey(family.family, family.catalogId), family] as const),
  );

  for (const packPath of packPaths) {
    const pack = readJson<MappingPack>(packPath);
    const familyKey = toFamilyKey(pack.family, pack.catalogId);
    const inference = byFamily.get(familyKey);
    if (!inference) {
      continue;
    }
    const inferenceBySlot = new Map(
      inference.slotInference.map((slot) => [slot.slotId, slot] as const),
    );

    pack.slotMappings = pack.slotMappings.map((slot) => {
      const slotInference = inferenceBySlot.get(slot.slotId);
      const notes = [...(slot.notes ?? [])];
      if (inference.candidateCategoryId) {
        notes.push(
          `Top sibling category candidate: ${inference.candidateCategoryId} (${inference.candidateCategoryCount ?? 0} matching products).`,
        );
      } else {
        notes.push('No sibling category candidate was found for this family.');
      }
      if (slotInference && slotInference.rankedCandidates.length > 0) {
        notes.push('Ranked candidates were inferred from live sibling product values.');
      }
      return {
        ...slot,
        notes,
        candidateCategoryId: inference.candidateCategoryId,
        candidateCategoryCount: inference.candidateCategoryCount ?? null,
        rankedCandidates: slotInference?.rankedCandidates ?? [],
      };
    });

    fs.writeFileSync(packPath, JSON.stringify(pack, null, 2) + '\n');
    process.stdout.write(`${packPath}\n`);
  }
}

main();
