import fs from 'node:fs';
import path from 'node:path';

const SRC_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.ts');
const TYPES_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.types.ts');

const content = fs.readFileSync(SRC_FILE, 'utf8');

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

const topHalf = content.substring(0, typeStartIndex);
const bottomHalf = content.substring(typeEndIndex);

let newTopHalf = topHalf
  .replace(`import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';\n`, '')
  .replace(`import type { ImageStudioRunStatus } from '@/shared/contracts/image-studio';\n`, '');

// Now we need to inject the local imports somewhere near the top imports
// We'll insert it right before the Playwright imports at line 26
const insertionPoint = `import type {\n  Browser,`;
const importsToInject = `export * from './playwright-node-runner.types';\nimport type {\n  PlaywrightNodeRunArtifact,\n  PlaywrightNodeRunRecord,\n  PlaywrightNodeRunRequest,\n  PlaywrightNodeArtifactReadResult,\n} from './playwright-node-runner.types';\n\n`;

newTopHalf = newTopHalf.replace(insertionPoint, importsToInject + insertionPoint);

const finalContent = newTopHalf + bottomHalf;

fs.writeFileSync(SRC_FILE, finalContent);
console.log('playwright-node-runner types securely extracted!');
