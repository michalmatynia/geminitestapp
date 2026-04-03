import fs from 'node:fs';
import path from 'node:path';

const SRC_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.ts');
const EXT_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.artifacts.ts');

const content = fs.readFileSync(SRC_FILE, 'utf8');

const markerStart = `const resolveRelativeArtifactPath = (artifactPath: string): string =>`;
const markerEnd = `const executePlaywrightNodeRun = async (`;

const startIndex = content.indexOf(markerStart);
const endIndex = content.indexOf(markerEnd);

if (startIndex === -1 || endIndex === -1) {
  process.exit(1);
}

let extractedBlock = content.substring(startIndex, endIndex);

const exportsList = [
  'resolveRelativeArtifactPath',
  'saveFileArtifact',
  'createLiveRunStateCoordinator',
  'captureFinalRunArtifacts',
  'buildCompletedRunState',
  'captureFailureArtifacts',
  'buildFailedRunState',
  'persistVideoArtifact'
];

exportsList.forEach(fn => {
  extractedBlock = extractedBlock.replace(`const ${fn} =`, `export const ${fn} =`);
});

const extractedCode = `import path from 'path';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { getFsPromises, joinRuntimePath } from '@/shared/lib/files/runtime-fs';
import type { BrowserContext, Page } from 'playwright';
import { nowIso, updateRunState } from './playwright-node-runner.state';
import type {
  PlaywrightNodeRunArtifact,
  PlaywrightNodeRunRecord,
  PlaywrightNodeRunRequest,
} from './playwright-node-runner.types';
import type { ImageStudioRunStatus } from '@/shared/contracts/image-studio';

const nodeFs = getFsPromises();
// Extra stub helpers since we extracted them: we will extract them actually to state
${extractedBlock}
`;

fs.writeFileSync(EXT_FILE, extractedCode);
console.log('Got artifacts.');
