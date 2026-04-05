import fs from 'node:fs';

const ARTIFACTS_FILE = 'src/features/ai/ai-paths/services/playwright-node-runner.artifacts.ts';
let content = fs.readFileSync(ARTIFACTS_FILE, 'utf8');

// The naive replacement exported every `const`. We fix it by replacing `export const` with `const` first.
content = content.replace(/export const /g, 'const ');

// Now we strictly export ONLY the top-level functions!
const functionsToExport = [
  'resolveRelativeArtifactPath',
  'saveFileArtifact',
  'createLiveRunStateCoordinator',
  'captureFinalRunArtifacts',
  'buildCompletedRunState',
  'captureFailureArtifacts',
  'buildFailedRunState',
  'persistVideoArtifact'
];

functionsToExport.forEach(fn => {
  content = content.replace(`const ${fn} =`, `export const ${fn} =`);
});

fs.writeFileSync(ARTIFACTS_FILE, content);
console.log('Artifacts TS fixed!');
