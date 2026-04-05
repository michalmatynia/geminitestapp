import fs from 'node:fs';
import path from 'node:path';

const SRC_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.ts');
const EXT_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.utils.ts');

const content = fs.readFileSync(SRC_FILE, 'utf8');

const markerStart = `type PlaywrightHelperTarget = {`;
const markerEnd = `const resolveRunStatePath = (runId: string): string =>`;

const startIndex = content.indexOf(markerStart);
const endIndex = content.indexOf(markerEnd);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found");
  process.exit(1);
}

const extractedBlock = content.substring(startIndex, endIndex);

const extractedCode = `// Stateless numeric utils for Playwright Runner
export ${extractedBlock.replace(/const /g, 'export const ')}
`;

fs.writeFileSync(EXT_FILE, extractedCode);

let newSrcContent = content.substring(0, startIndex) + content.substring(endIndex);

const importsToInject = `import {
  normalizeDelayRange,
  pickDelayInRange,
  pickSignedOffset,
  clampNumber,
} from './playwright-node-runner.utils';\nimport type { PlaywrightHelperTarget } from './playwright-node-runner.utils';\n\n`;

newSrcContent = newSrcContent.replace(`const resolveRunStatePath = `, importsToInject + `const resolveRunStatePath = `);

fs.writeFileSync(SRC_FILE, newSrcContent);
console.log('playwright-node-runner.utils.ts extracted successfully!');
