import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type BazelTarget = `//${string}`;
export type RiskLevel = 'low' | 'medium' | 'high';
export type ImpactBundle = string;

export interface DomainManifest {
  id: string;
  label: string;
  riskLevel: RiskLevel;
  impactBundles: ImpactBundle[];
  sourceRoots: string[];
  ownedDocs: string[];
  generatedArtifacts: string[];
  generatedOnlyPaths: string[];
  manualOnlyPaths: string[];
  docGenerators: BazelTarget[];
  scannerTargets: BazelTarget[];
  validationTargets: BazelTarget[];
}

export interface LoadedDomainManifest extends DomainManifest {
  manifestPath: string;
}

export interface ClassifiedDomain {
  id: string;
  label: string;
  manifestPath: string;
  riskLevel: RiskLevel;
  impactBundles: ImpactBundle[];
  reasons: string[];
}

export interface ChangeClassification {
  kind: 'agentic-change-classification';
  generatedAt: string;
  changedFiles: string[];
  impactedDomains: ClassifiedDomain[];
  highestRiskLevel: RiskLevel;
  requiredImpactBundles: ImpactBundle[];
  bundlePriorityByBundle: Record<ImpactBundle, RiskLevel>;
  recommendedBundleOrder: ImpactBundle[];
  recommendedValidationByBundle: Record<ImpactBundle, BazelTarget[]>;
  requiredDocs: string[];
  requiredGeneratedArtifacts: string[];
  generatedOnlyPaths: string[];
  manualOnlyPaths: string[];
  requiredDocGenerators: BazelTarget[];
  requiredScannerTargets: BazelTarget[];
  requiredValidationTargets: BazelTarget[];
}

export const agenticRepoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

const domainsDirectory = path.join(agenticRepoRoot, 'config', 'agentic', 'domains');
const riskOrder: Record<RiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

function normalizeRepoPath(input: string): string {
  if (!input) {
    return '';
  }

  if (path.isAbsolute(input)) {
    return path.relative(agenticRepoRoot, input).replace(/\\/g, '/');
  }

  return input.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

function dedupeSorted<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function matchesPathPrefix(filePath: string, candidate: string): boolean {
  const normalizedFilePath = normalizeRepoPath(filePath);
  const normalizedCandidate = normalizeRepoPath(candidate);
  return (
    normalizedFilePath === normalizedCandidate ||
    normalizedFilePath.startsWith(`${normalizedCandidate}/`)
  );
}

export function detectManifestPathPolicyViolations(
  manifest: Pick<
    DomainManifest,
    'id' | 'ownedDocs' | 'generatedOnlyPaths' | 'manualOnlyPaths'
  >,
): string[] {
  const violations: string[] = [];

  for (const generatedOnlyPath of manifest.generatedOnlyPaths) {
    for (const manualOnlyPath of manifest.manualOnlyPaths) {
      if (
        matchesPathPrefix(generatedOnlyPath, manualOnlyPath) ||
        matchesPathPrefix(manualOnlyPath, generatedOnlyPath)
      ) {
        violations.push(
          `Manifest ${manifest.id} has overlapping generated/manual path policies: ${generatedOnlyPath} <-> ${manualOnlyPath}.`,
        );
      }
    }
  }

  for (const ownedDoc of manifest.ownedDocs) {
    for (const generatedOnlyPath of manifest.generatedOnlyPaths) {
      if (matchesPathPrefix(ownedDoc, generatedOnlyPath)) {
        violations.push(
          `Manifest ${manifest.id} declares owned doc ${ownedDoc} inside generated-only path ${generatedOnlyPath}.`,
        );
      }
    }
  }

  return violations;
}

function getManifestById(
  manifests: readonly LoadedDomainManifest[],
  manifestId: string,
): LoadedDomainManifest | undefined {
  return manifests.find((manifest) => manifest.id === manifestId);
}

function getHighestRiskLevel(riskLevels: readonly RiskLevel[]): RiskLevel {
  return riskLevels.reduce<RiskLevel>(
    (highestRisk, riskLevel) =>
      riskOrder[riskLevel] > riskOrder[highestRisk] ? riskLevel : highestRisk,
    'low',
  );
}

function buildRecommendedValidationByBundle(
  impactedDomains: readonly ClassifiedDomain[],
  manifests: readonly LoadedDomainManifest[],
): Record<ImpactBundle, BazelTarget[]> {
  const bundleTargets = new Map<ImpactBundle, Set<BazelTarget>>();

  for (const domain of impactedDomains) {
    const manifest = getManifestById(manifests, domain.id);
    if (!manifest) {
      continue;
    }

    for (const impactBundle of manifest.impactBundles) {
      const targets = bundleTargets.get(impactBundle) ?? new Set<BazelTarget>();
      for (const validationTarget of manifest.validationTargets) {
        targets.add(validationTarget);
      }
      bundleTargets.set(impactBundle, targets);
    }
  }

  return Object.fromEntries(
    [...bundleTargets.entries()]
      .sort(([leftBundle], [rightBundle]) => leftBundle.localeCompare(rightBundle))
      .map(([impactBundle, validationTargets]) => [
        impactBundle,
        dedupeSorted([...validationTargets]),
      ]),
  ) as Record<ImpactBundle, BazelTarget[]>;
}

function buildBundlePriorityByBundle(
  impactedDomains: readonly ClassifiedDomain[],
): Record<ImpactBundle, RiskLevel> {
  const bundleRisk = new Map<ImpactBundle, RiskLevel>();

  for (const domain of impactedDomains) {
    for (const impactBundle of domain.impactBundles) {
      const existingRiskLevel = bundleRisk.get(impactBundle);
      if (
        !existingRiskLevel ||
        riskOrder[domain.riskLevel] > riskOrder[existingRiskLevel]
      ) {
        bundleRisk.set(impactBundle, domain.riskLevel);
      }
    }
  }

  return Object.fromEntries(
    [...bundleRisk.entries()].sort(([leftBundle], [rightBundle]) =>
      leftBundle.localeCompare(rightBundle),
    ),
  ) as Record<ImpactBundle, RiskLevel>;
}

function buildRecommendedBundleOrder(
  bundlePriorityByBundle: Record<ImpactBundle, RiskLevel>,
): ImpactBundle[] {
  return Object.entries(bundlePriorityByBundle)
    .sort(([leftBundle, leftRisk], [rightBundle, rightRisk]) => {
      const riskDifference = riskOrder[rightRisk] - riskOrder[leftRisk];
      if (riskDifference !== 0) {
        return riskDifference;
      }
      return leftBundle.localeCompare(rightBundle);
    })
    .map(([impactBundle]) => impactBundle);
}

export async function loadDomainManifests(): Promise<LoadedDomainManifest[]> {
  const manifestEntries = (await fs.readdir(domainsDirectory))
    .filter((entry) => entry.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right));

  const manifests = await Promise.all(
    manifestEntries.map(async (entry) => {
      const manifestPath = path.join(domainsDirectory, entry);
      const rawManifest = await fs.readFile(manifestPath, 'utf8');
      const parsedManifest = JSON.parse(rawManifest) as DomainManifest;
      return {
        ...parsedManifest,
        manifestPath: normalizeRepoPath(manifestPath),
      } satisfies LoadedDomainManifest;
    }),
  );

  return manifests.sort((left, right) => left.id.localeCompare(right.id));
}

export function classifyChangedFiles(
  changedFiles: readonly string[],
  manifests: readonly LoadedDomainManifest[],
): ChangeClassification {
  const normalizedChangedFiles = dedupeSorted(
    changedFiles.map((changedFile) => normalizeRepoPath(changedFile)),
  );

  const impactedDomains = manifests.flatMap((manifest) => {
    const reasons = normalizedChangedFiles.flatMap((changedFile) => {
      const changeReasons: string[] = [];

      if (matchesPathPrefix(changedFile, manifest.manifestPath)) {
        changeReasons.push(`${changedFile} -> manifest`);
      }

      if (
        manifest.sourceRoots.some((sourceRoot) =>
          matchesPathPrefix(changedFile, sourceRoot),
        )
      ) {
        changeReasons.push(`${changedFile} -> source`);
      }

      if (
        manifest.ownedDocs.some((ownedDoc) =>
          matchesPathPrefix(changedFile, ownedDoc),
        )
      ) {
        changeReasons.push(`${changedFile} -> docs`);
      }

      if (
        manifest.generatedArtifacts.some((generatedArtifact) =>
          matchesPathPrefix(changedFile, generatedArtifact),
        )
      ) {
        changeReasons.push(`${changedFile} -> generated-artifact`);
      }

      return changeReasons;
    });

    if (reasons.length === 0) {
      return [];
    }

    return [
      {
        id: manifest.id,
        label: manifest.label,
        manifestPath: manifest.manifestPath,
        riskLevel: manifest.riskLevel,
        impactBundles: dedupeSorted(manifest.impactBundles),
        reasons: dedupeSorted(reasons),
      } satisfies ClassifiedDomain,
    ];
  });

  return {
    kind: 'agentic-change-classification',
    generatedAt: new Date().toISOString(),
    changedFiles: normalizedChangedFiles,
    impactedDomains,
    highestRiskLevel: getHighestRiskLevel(
      impactedDomains.map((domain) => domain.riskLevel),
    ),
    requiredImpactBundles: dedupeSorted(
      impactedDomains.flatMap((domain) => domain.impactBundles),
    ),
    bundlePriorityByBundle: buildBundlePriorityByBundle(impactedDomains),
    recommendedBundleOrder: buildRecommendedBundleOrder(
      buildBundlePriorityByBundle(impactedDomains),
    ),
    recommendedValidationByBundle: buildRecommendedValidationByBundle(
      impactedDomains,
      manifests,
    ),
    requiredDocs: dedupeSorted(
      impactedDomains.flatMap((domain) =>
        getManifestById(manifests, domain.id)?.ownedDocs ?? [],
      ),
    ),
    requiredGeneratedArtifacts: dedupeSorted(
      impactedDomains.flatMap((domain) =>
        getManifestById(manifests, domain.id)?.generatedArtifacts ?? [],
      ),
    ),
    generatedOnlyPaths: dedupeSorted(
      impactedDomains.flatMap((domain) =>
        getManifestById(manifests, domain.id)?.generatedOnlyPaths ?? [],
      ),
    ),
    manualOnlyPaths: dedupeSorted(
      impactedDomains.flatMap((domain) =>
        getManifestById(manifests, domain.id)?.manualOnlyPaths ?? [],
      ),
    ),
    requiredDocGenerators: dedupeSorted(
      impactedDomains.flatMap((domain) =>
        getManifestById(manifests, domain.id)?.docGenerators ?? [],
      ),
    ) as BazelTarget[],
    requiredScannerTargets: dedupeSorted(
      impactedDomains.flatMap((domain) =>
        getManifestById(manifests, domain.id)?.scannerTargets ?? [],
      ),
    ) as BazelTarget[],
    requiredValidationTargets: dedupeSorted(
      impactedDomains.flatMap((domain) =>
        getManifestById(manifests, domain.id)?.validationTargets ?? [],
      ),
    ) as BazelTarget[],
  } satisfies ChangeClassification;
}
