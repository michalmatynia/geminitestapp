import fs from 'node:fs';
import path from 'node:path';

const SRC_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.ts');
const EXT_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.artifacts.ts');

const content = fs.readFileSync(SRC_FILE, 'utf8');

const markerStart = `const resolveRelativeArtifactPath = (artifactPath: string): string =>`;
const markerEnd = `const executePlaywrightNodeRun = async (`;

const startIndex = content.indexOf(markerStart);
const endIndex = content.indexOf(markerEnd);

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

const extractedCode = `import path from 'node:path';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { getFsPromises, joinRuntimePath } from '@/shared/lib/files/runtime-fs';
import type { BrowserContext, Page } from 'playwright';
import { nowIso, updateRunState } from './playwright-node-runner';
import type {
  PlaywrightNodeRunArtifact,
  PlaywrightNodeRunRecord,
  PlaywrightNodeRunRequest,
} from './playwright-node-runner.types';
import type { ImageStudioRunStatus } from '@/shared/contracts/image-studio';

const nodeFs = getFsPromises();

${extractedBlock}
`;

fs.writeFileSync(EXT_FILE, extractedCode);

let newSrcContent = content.substring(0, startIndex) + content.substring(endIndex);

newSrcContent = newSrcContent.replace(`const nowIso = () =>`, `export const nowIso = () =>`);
newSrcContent = newSrcContent.replace(`const updateRunState = async (`, `export const updateRunState = async (`);

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

newSrcContent = newSrcContent.replace(`export const executePlaywrightNodeRun = `, importsToInject + `export const executePlaywrightNodeRun = `);
// fallback replacement
if (!newSrcContent.includes(importsToInject)) {
  newSrcContent = newSrcContent.replace(`const executePlaywrightNodeRun = `, importsToInject + `const executePlaywrightNodeRun = `);
}

fs.writeFileSync(SRC_FILE, newSrcContent);
console.log('Final artifacts extraction completed successfully!');
