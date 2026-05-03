import {
  FAMILY_WEIGHTS,
  METHOD_WEIGHTS,
  GENERIC_FILE_NAMES,
  NON_CONSOLIDATION_NAME_RE,
} from './constants.mjs';
import { isClusterEligible } from './parser.mjs';

export const intersectionCount = (left, right) => {
  const [small, large] = left.size <= right.size ? [left, right] : [right, left];
  let count = 0;
  for (const value of small) {
    if (large.has(value)) count += 1;
  }
  return count;
};

export const jaccard = (left, right) => {
  if (left.size === 0 && right.size === 0) return 1;
  const intersection = intersectionCount(left, right);
  const union = left.size + right.size - intersection;
  if (union === 0) return 0;
  return intersection / union;
};

export class UnionFind {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_x, index) => index);
    this.rank = Array.from({ length: size }, () => 0);
  }

  find(index) {
    if (this.parent[index] !== index) {
      this.parent[index] = this.find(this.parent[index]);
    }
    return this.parent[index];
  }

  union(left, right) {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot === rightRoot) return;
    if (this.rank[leftRoot] < this.rank[rightRoot]) {
      this.parent[leftRoot] = rightRoot;
      return;
    }
    if (this.rank[leftRoot] > this.rank[rightRoot]) {
      this.parent[rightRoot] = leftRoot;
      return;
    }
    this.parent[rightRoot] = leftRoot;
    this.rank[leftRoot] += 1;
  }
}

export const recommendationForFamily = (family) => {
  if (family === 'Modal' || family === 'Dialog' || family === 'Drawer') {
    return 'migrate-to-shared-modal-template';
  }
  if (family === 'Panel') return 'migrate-to-panel-template';
  if (family === 'Filter') return 'migrate-to-filter-panel';
  if (family === 'Picker') return 'migrate-to-generic-picker';
  if (family === 'Table' || family === 'List') return 'migrate-to-standard-data-table-panel';
  if (family === 'Form') return 'extract-shared-form-template';
  if (family === 'Toolbar' || family === 'Header' || family === 'Sidebar' || family === 'Tabs') {
    return 'extract-shared-layout-fragment';
  }
  return 'review-for-extraction';
};

export const riskForCluster = ({ fileCount, maxLines, featureCount }) => {
  if (maxLines >= 350 || fileCount >= 8 || featureCount >= 5) return 'high';
  if (maxLines >= 180 || fileCount >= 5 || featureCount >= 3) return 'medium';
  return 'low';
};

export const scoreCluster = ({ family, method, totalLines, fileCount, featureCount, templateUsers }) => {
  const familyWeight = FAMILY_WEIGHTS[family] ?? FAMILY_WEIGHTS.Unknown;
  const methodWeight = METHOD_WEIGHTS[method] ?? 1;
  const crossFeatureWeight = featureCount > 1 ? 1.25 : 1;
  const templateGapWeight = 1 + ((fileCount - templateUsers) / Math.max(fileCount, 1)) * 0.4;
  const base = Math.max(fileCount - 1, 1) * totalLines;
  return Math.round(base * familyWeight * methodWeight * crossFeatureWeight * templateGapWeight);
};

export const toClusterDiagnostics = (clusters) =>
  clusters
    .map((cluster) => {
      const files = cluster.files
        .map((entry) => ({
          path: entry.path,
          lines: entry.lines,
          scope: entry.scope,
        }))
        .sort((left, right) => right.lines - left.lines);
      const scopes = [...new Set(files.map((file) => file.scope))].sort();
      const totalLines = files.reduce((sum, file) => sum + file.lines, 0);
      return {
        method: cluster.method,
        family: cluster.family,
        clusterKey: cluster.clusterKey,
        fileCount: files.length,
        totalLines,
        scopes,
        similarity: cluster.similarity,
        files,
      };
    })
    .sort((left, right) => {
      if (right.fileCount !== left.fileCount) return right.fileCount - left.fileCount;
      if (right.totalLines !== left.totalLines) return right.totalLines - left.totalLines;
      return left.clusterKey.localeCompare(right.clusterKey);
    });

export const analyzeCandidates = (candidates) => {
  const clusterCandidates = candidates.filter((candidate) => isClusterEligible(candidate));

  const byName = new Map();
  for (const candidate of clusterCandidates) {
    if (GENERIC_FILE_NAMES.has(candidate.basename)) continue;
    if (NON_CONSOLIDATION_NAME_RE.test(candidate.basename)) continue;
    const group = byName.get(candidate.basename) ?? [];
    group.push(candidate);
    byName.set(candidate.basename, group);
  }

  const duplicateNameClusters = [...byName.entries()]
    .filter(([, group]) => group.length >= 2)
    .map(([name, group]) => ({
      method: 'duplicate_name',
      clusterKey: `name:${name}`,
      family: group[0].family,
      files: group,
      similarity: null,
    }));

  const propByKey = new Map();
  for (const candidate of clusterCandidates) {
    if (!candidate.propsSignature) continue;
    const key = `${candidate.family}|${candidate.propsSignature}`;
    const group = propByKey.get(key) ?? [];
    group.push(candidate);
    propByKey.set(key, group);
  }

  const propSignatureClusters = [...propByKey.entries()]
    .filter(([, group]) => group.length >= 2)
    .map(([key, group]) => {
      const [family] = key.split('|');
      return {
        method: 'prop_signature',
        clusterKey: `props:${key}`,
        family: family || 'Unknown',
        files: group,
        similarity: null,
      };
    });

  const familyBuckets = new Map();
  for (const candidate of clusterCandidates) {
    const bucket = familyBuckets.get(candidate.family) ?? [];
    bucket.push(candidate);
    familyBuckets.set(candidate.family, bucket);
  }

  const tokenClusters = [];
  for (const [family, group] of familyBuckets) {
    if (group.length < 2) continue;
    if (group.length > 160) continue;

    const uf = new UnionFind(group.length);
    const similarities = [];

    const threshold = family === 'Modal' || family === 'Panel' || family === 'Form' ? 0.56 : 0.62;
    for (let left = 0; left < group.length; left += 1) {
      for (let right = left + 1; right < group.length; right += 1) {
        const leftRecord = group[left];
        const rightRecord = group[right];
        const maxLines = Math.max(leftRecord.lines, rightRecord.lines);
        const minLines = Math.min(leftRecord.lines, rightRecord.lines);
        if (maxLines > minLines * 2.4) continue;

        const sim = jaccard(leftRecord.tokenSet, rightRecord.tokenSet);
        if (sim < threshold) continue;
        const overlap = intersectionCount(leftRecord.tokenSet, rightRecord.tokenSet);
        if (overlap < 18) continue;

        uf.union(left, right);
        similarities.push(sim);
      }
    }

    const clusterMap = new Map();
    for (let index = 0; index < group.length; index += 1) {
      const rootIndex = uf.find(index);
      const cluster = clusterMap.get(rootIndex) ?? [];
      cluster.push(group[index]);
      clusterMap.set(rootIndex, cluster);
    }

    for (const clusterGroup of clusterMap.values()) {
      if (clusterGroup.length < 2) continue;
      const localPairSimilarities = [];
      for (let left = 0; left < clusterGroup.length; left += 1) {
        for (let right = left + 1; right < clusterGroup.length; right += 1) {
          localPairSimilarities.push(jaccard(clusterGroup[left].tokenSet, clusterGroup[right].tokenSet));
        }
      }
      const averageSimilarity =
        localPairSimilarities.length > 0
          ? Number(
              (
                localPairSimilarities.reduce((sum, value) => sum + value, 0) /
                localPairSimilarities.length
              ).toFixed(3)
            )
          : null;

      tokenClusters.push({
        method: 'token_similarity',
        clusterKey: `tokens:${family}:${clusterGroup.map((entry) => entry.path).sort().join('|')}`,
        family,
        files: clusterGroup,
        similarity: averageSimilarity,
      });
    }
  }

  const allRawClusters = [...duplicateNameClusters, ...propSignatureClusters, ...tokenClusters];

  const dedupedMap = new Map();
  for (const cluster of allRawClusters) {
    const filePaths = [...new Set(cluster.files.map((entry) => entry.path))].sort();
    if (filePaths.length < 2) continue;
    const key = `${cluster.method}|${cluster.family}|${filePaths.join('|')}`;
    dedupedMap.set(key, { ...cluster, filePaths });
  }

  const opportunities = [...dedupedMap.values()]
    .map((cluster) => {
      const fileCount = cluster.files.length;
      const totalLines = cluster.files.reduce((sum, entry) => sum + entry.lines, 0);
      const maxLines = Math.max(...cluster.files.map((entry) => entry.lines));
      const scopes = [...new Set(cluster.files.map((entry) => entry.scope))].sort();
      const templateUsers = cluster.files.filter((entry) => entry.templateImports > 0).length;
      const featureCount = scopes.length;
      const score = scoreCluster({
        family: cluster.family,
        method: cluster.method,
        totalLines,
        fileCount,
        featureCount,
        templateUsers,
      });

      return {
        method: cluster.method,
        family: cluster.family,
        score,
        fileCount,
        totalLines,
        maxLines,
        featureCount,
        scopes,
        templateUsers,
        templateCoverage: Number((templateUsers / fileCount).toFixed(2)),
        recommendation: recommendationForFamily(cluster.family),
        risk: riskForCluster({ fileCount, maxLines, featureCount }),
        similarity: cluster.similarity,
        files: cluster.files
          .sort((left, right) => right.lines - left.lines)
          .map((entry) => ({
            path: entry.path,
            lines: entry.lines,
            scope: entry.scope,
            family: entry.family,
            templateImports: entry.templateImports,
            useClient: entry.useClient,
          })),
      };
    })
    .filter((entry) => {
      const meaningfulFiles = entry.files.filter((file) => file.lines >= 30).length;
      if (meaningfulFiles >= 2) return true;
      if (entry.fileCount >= 3 && entry.totalLines >= 220) return true;
      return false;
    });

  opportunities.sort((left, right) => right.score - left.score);

  const familyCounts = new Map();
  const domainCounts = new Map();
  for (const candidate of candidates) {
    familyCounts.set(candidate.family, (familyCounts.get(candidate.family) ?? 0) + 1);
    domainCounts.set(candidate.domain, (domainCounts.get(candidate.domain) ?? 0) + 1);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    scannedFileCount: candidates.length,
    duplicateNameClusterCount: duplicateNameClusters.length,
    propSignatureClusterCount: propSignatureClusters.length,
    tokenSimilarityClusterCount: tokenClusters.length,
    thinReExportWrapperCount: candidates.filter((entry) => entry.thinReExportWrapper).length,
    totalOpportunities: opportunities.length,
    highPriorityCount: opportunities.filter((entry) => entry.score >= 2000).length,
    familyCounts: [...familyCounts.entries()]
      .map(([family, count]) => ({ family, count }))
      .sort((left, right) => right.count - left.count),
    domainCounts: [...domainCounts.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((left, right) => right.count - left.count),
  };

  const clusterDiagnostics = {
    duplicateName: toClusterDiagnostics(duplicateNameClusters),
    propSignature: toClusterDiagnostics(propSignatureClusters),
    tokenSimilarity: toClusterDiagnostics(tokenClusters),
  };

  return { summary, opportunities, clusterDiagnostics };
};