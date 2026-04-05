import fs from 'node:fs';
import path from 'node:path';

const SRC_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.ts');
const TYPES_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.types.ts');

const content = fs.readFileSync(SRC_FILE, 'utf8');

// Extract types
const typeStartMarker = `export type PlaywrightNodeRunArtifact =`;
const typeEndMarker = `export type PlaywrightNodeArtifactReadResult = {\n  artifact: PlaywrightNodeRunArtifact;\n  content: Buffer;\n};\n`;

const typeStartIndex = content.indexOf(typeStartMarker);
const typeEndIndex = content.indexOf(typeEndMarker) + typeEndMarker.length;

if (typeStartIndex === -1 || typeEndIndex === -1) {
  console.error("Markers not found");
  process.exit(1);
}

const extractedTypes = content.substring(typeStartIndex, typeEndIndex);

const typesContent = `import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { ImageStudioRunStatus } from '@/shared/contracts/image-studio';

${extractedTypes}
`;

fs.writeFileSync(TYPES_FILE, typesContent);

let newContent = content.substring(0, typeStartIndex) + content.substring(typeEndIndex);

// Replace imports in source
newContent = newContent.replace(
  `import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';\n`,
  ``
);
newContent = newContent.replace(
  `import type { ImageStudioRunStatus } from '@/shared/contracts/image-studio';\n`,
  ``
);

// Add the re-export and local import
newContent = newContent.replace(
  `export const isPlaywrightNodeRunnerAvailable`,
  `export * from './playwright-node-runner.types';\nimport type {\n  PlaywrightNodeRunArtifact,\n  PlaywrightNodeRunRecord,\n  PlaywrightNodeRunRequest,\n} from './playwright-node-runner.types';\n\nexport const isPlaywrightNodeRunnerAvailable`
);

// Alternatively, just inject at the very top of the exports
if (!newContent.includes('export * from')) {
  const marker = `export const`;
  newContent = newContent.replace(marker, `export * from './playwright-node-runner.types';\nimport type {\n  PlaywrightNodeRunArtifact,\n  PlaywrightNodeRunRecord,\n  PlaywrightNodeRunRequest,\n} from './playwright-node-runner.types';\n\n${marker}`);
}

fs.writeFileSync(SRC_FILE, newContent);
console.log('playwright-node-runner types extracted successfully!');
