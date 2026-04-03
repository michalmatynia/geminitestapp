import fs from 'node:fs';
import path from 'node:path';

const SRC_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.ts');
const EXT_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.artifacts.ts');

let src = fs.readFileSync(SRC_FILE, 'utf8');
src = src.replace(`const nowIso = ():`, `export const nowIso = ():`);

const rootDirRegex = /const RUN_ROOT_DIR = [^;]+;/;
const match = src.match(rootDirRegex);
let rootDirVal = '';
if (match) {
  rootDirVal = match[0];
  src = src.replace(rootDirRegex, `export ${match[0]}`);
}

fs.writeFileSync(SRC_FILE, src);

let ext = fs.readFileSync(EXT_FILE, 'utf8');
ext = ext.replace(`import { nowIso, updateRunState } from './playwright-node-runner';`, `import { nowIso, updateRunState, RUN_ROOT_DIR } from './playwright-node-runner';`);
fs.writeFileSync(EXT_FILE, ext);

console.log('Fixed export matches!');
