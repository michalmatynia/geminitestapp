import fs from 'node:fs';
import path from 'node:path';

const SCRIPT_PATH = path.resolve('src/features/integrations/services/tradera-listing/default-script.ts');
const PARTIALS_DIR = path.resolve('src/features/integrations/services/tradera-listing/script-partials');

fs.rmSync(PARTIALS_DIR, { recursive: true, force: true });
fs.mkdirSync(PARTIALS_DIR);

// recover original
import { execSync } from 'child_process';
execSync('git checkout src/features/integrations/services/tradera-listing/default-script.ts');

const content = fs.readFileSync(SCRIPT_PATH, 'utf8');
const match = content.match(/export const DEFAULT_TRADERA_QUICKLIST_SCRIPT = String\.raw\`([\s\S]*?)\`;/);

if (!match) {
  process.exit(1);
}

const fullScriptBody = match[1];
if (typeof fullScriptBody !== 'string') {
  process.exit(1);
}
const lines = fullScriptBody.split('\n');

const CHUNK_SIZE = 400; // Let's use 400 lines just to be safe
let chunkIdx = 1;
const imports: string[] = [];
const arrayVars: string[] = [];

for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
  const chunkLines = lines.slice(i, i + CHUNK_SIZE);
  const chunkStr = chunkLines.join('\n');
  
  // escaping backticks and ${}
  const escaped = chunkStr.replace(/`/g, '\\`').replace(/\$/g, '\\$');
  
  const varName = `PART_${chunkIdx}`;
  const fileName = `part-${chunkIdx}.ts`;
  
  fs.writeFileSync(path.join(PARTIALS_DIR, fileName), `export const ${varName} = \`${escaped}\`;\n`);
  
  imports.push(`import { ${varName} } from './script-partials/part-${chunkIdx}';`);
  arrayVars.push(varName);
  
  chunkIdx++;
}

const newDefaultScript = `${imports.join('\n')}

export const DEFAULT_TRADERA_QUICKLIST_SCRIPT = [
${arrayVars.map(v => `  ${v},`).join('\n')}
].join('');
`;

fs.writeFileSync(SCRIPT_PATH, newDefaultScript);
console.log("split successfully");
