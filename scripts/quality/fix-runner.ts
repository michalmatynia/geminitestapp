import fs from 'node:fs';
import path from 'node:path';

const PARSER_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.parser.ts');
const RUNNER_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.ts');

let parser = fs.readFileSync(PARSER_FILE, 'utf8');
parser = parser.replace(`const safeStringify = `, `export const safeStringify = `);
fs.writeFileSync(PARSER_FILE, parser);

let runner = fs.readFileSync(RUNNER_FILE, 'utf8');
runner = runner.replace(`import { parseUserScript } from './playwright-node-runner.parser';`, `import { parseUserScript, safeStringify } from './playwright-node-runner.parser';`);
fs.writeFileSync(RUNNER_FILE, runner);

console.log('Fixed missing safeStringify!');
