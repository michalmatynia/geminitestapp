import { collectMetrics } from './lib-metrics.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

async function run() {
  const root = process.cwd();
  const baselinePath = path.join(root, 'scripts', 'architecture', 'guardrails-baseline.json');
  
  const metrics = await collectMetrics({ root });
  const currentEdges = new Set(metrics.architecture.topCrossFeatureEdges.map(e => e.edge));
  
  // Note: collectMetrics only returns top 25 in topCrossFeatureEdges, 
  // but crossFeatureEdgePairs is the total count.
  // Let's modify collectMetrics locally or just re-implement the logic here to see ALL edges.
  
  const featureRecords = metrics.source.totalFiles; // This is not what we want.
  
  // Re-implementing the logic from lib-metrics.mjs to get ALL edges
  const srcFiles = [];
  const walk = async (dir) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(fullPath);
      else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) srcFiles.push(fullPath);
    }
  };
  await walk(path.join(root, 'src', 'features'));
  
  const crossFeatureEdgeMap = new Map();
  for (const file of srcFiles) {
    const content = await fs.readFile(file, 'utf8');
    const relativePath = path.relative(root, file);
    const [, , featureName] = relativePath.split(path.sep);
    if (!featureName) continue;
    
    const importPatterns = [
      /from\s+['"]@\/features\/([^/'"\n]+)/g,
      /import\(\s*['"]@\/features\/([^/'"\n]+)/g,
    ];

    for (const pattern of importPatterns) {
      for (const match of content.matchAll(pattern)) {
        const toFeature = match[1];
        if (!toFeature || toFeature === featureName) continue;
        const edgeKey = `${featureName} -> ${toFeature}`;
        crossFeatureEdgeMap.set(edgeKey, (crossFeatureEdgeMap.get(edgeKey) ?? 0) + 1);
      }
    }
  }
  
  const allCurrentEdges = Array.from(crossFeatureEdgeMap.keys()).sort();
  console.log(`Total current edges: ${allCurrentEdges.length}`);
  allCurrentEdges.forEach(e => console.log(`  ${e}`));
}

run();
