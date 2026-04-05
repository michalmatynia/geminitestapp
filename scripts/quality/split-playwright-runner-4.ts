import fs from 'node:fs';
import path from 'node:path';

const SRC_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.ts');
const EXT_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.artifacts.ts');

const content = fs.readFileSync(SRC_FILE, 'utf8');

const markerStart = `const resolveRelativeArtifactPath = (artifactPath: string): string =>`;
const markerEnd = `const executePlaywrightNodeRun = async (`

const startIndex = content.indexOf(markerStart);
const endIndex = content.indexOf(markerEnd);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found");
  process.exit(1);
}

const extractedBlock = content.substring(startIndex, endIndex);

const extractedCode = `import path from 'path';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { getFsPromises } from '@/shared/lib/files/runtime-fs';
import type { BrowserContext, Page } from 'playwright';
import type {
  PlaywrightNodeRunArtifact,
  PlaywrightNodeRunRecord,
  PlaywrightNodeRunRequest,
} from './playwright-node-runner.types';
import type { ImageStudioRunStatus } from '@/shared/contracts/image-studio';

const nodeFs = getFsPromises();

// Export the extracted functions so they can be imported back
${extractedBlock.replace(/const /g, 'export const ')}
`;

fs.writeFileSync(EXT_FILE, extractedCode);

let newSrcContent = content.substring(0, startIndex) + content.substring(endIndex);

const importsToInject = `import {
  resolveRelativeArtifactPath,
  saveFileArtifact,
  createLiveRunStateCoordinator,
  captureFinalRunArtifacts,
  buildCompletedRunState,
  captureFailureArtifacts,
  buildFailedRunState,
  persistVideoArtifact
} from './playwright-node-runner.artifacts';\n\n`;

newSrcContent = newSrcContent.replace(`const resolveRunStatePath = `, importsToInject + `const resolveRunStatePath = `);

fs.writeFileSync(SRC_FILE, newSrcContent);
console.log('playwright-node-runner.artifacts.ts extracted successfully!');
