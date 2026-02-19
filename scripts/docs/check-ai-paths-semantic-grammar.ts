import fs from 'node:fs';
import path from 'node:path';

import { AI_PATHS_NODE_DOCS } from '../../src/features/ai/ai-paths/lib/core/docs/node-docs';

const workspaceRoot = process.cwd();
const nodesDir = path.join(
  workspaceRoot,
  'docs/ai-paths/semantic-grammar/nodes',
);

const expectedTypes = new Set<string>(AI_PATHS_NODE_DOCS.map((doc) => doc.type));
const expectedFiles = Array.from(expectedTypes).map((nodeType) =>
  path.join(nodesDir, `${nodeType}.json`),
);

const missingFiles = expectedFiles.filter((filePath) => !fs.existsSync(filePath));
const indexPath = path.join(nodesDir, 'index.json');

let missingFromIndex: string[] = [];
if (!fs.existsSync(indexPath)) {
  missingFromIndex = Array.from(expectedTypes);
} else {
  try {
    const raw = fs.readFileSync(indexPath, 'utf8');
    const parsed = JSON.parse(raw) as Array<{ nodeType?: unknown }>;
    const indexTypes = new Set<string>(
      Array.isArray(parsed)
        ? parsed
          .map((row) => (typeof row?.nodeType === 'string' ? row.nodeType : ''))
          .filter((value) => value.length > 0)
        : [],
    );
    missingFromIndex = Array.from(expectedTypes).filter(
      (nodeType) => !indexTypes.has(nodeType),
    );
  } catch (error) {
    console.error(`Failed to parse ${indexPath}:`, error);
    process.exit(1);
  }
}

if (missingFiles.length > 0 || missingFromIndex.length > 0) {
  if (missingFiles.length > 0) {
    console.error('Missing semantic node JSON files:');
    for (const filePath of missingFiles) {
      console.error(`- ${path.relative(workspaceRoot, filePath)}`);
    }
  }
  if (missingFromIndex.length > 0) {
    console.error('Node types missing in semantic grammar nodes/index.json:');
    for (const nodeType of missingFromIndex) {
      console.error(`- ${nodeType}`);
    }
  }
  process.exit(1);
}

console.log(`Semantic grammar docs coverage check passed for ${expectedTypes.size} node types.`);
