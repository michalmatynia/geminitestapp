import fs from 'node:fs';
import path from 'node:path';

const SRC_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.ts');
const EXT_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.artifacts.ts');

let src = fs.readFileSync(SRC_FILE, 'utf8');
src = src.replace(`import { getFsPromises, joinRuntimePath } from '@/shared/lib/files/runtime-fs';`, `import { getFsPromises } from '@/shared/lib/files/runtime-fs';`);
src = src.replace(`  resolveRelativeArtifactPath,\n`, ``);
fs.writeFileSync(SRC_FILE, src);

let ext = fs.readFileSync(EXT_FILE, 'utf8');
ext = ext.replace(`import type { ImageStudioRunStatus } from '@/shared/contracts/image-studio';\n`, ``);
fs.writeFileSync(EXT_FILE, ext);

console.log('Unused refs cleaned!');
