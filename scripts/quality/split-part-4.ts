import fs from 'node:fs';

const PART_4_FILE = 'src/features/integrations/services/tradera-listing/script-partials/part-4.ts';
const PART_4B_FILE = 'src/features/integrations/services/tradera-listing/script-partials/part-4b.ts';
const INDEX = 'src/features/integrations/services/tradera-listing/default-script.ts';

const text = fs.readFileSync(PART_4_FILE, 'utf8');

const lines = text.split('\n');

const middleLine = 650;
const p4Lines = lines.slice(0, middleLine);
p4Lines.push('\`;\n');

const p4BLines = ['export const PART_4B = \`'];
p4BLines.push(...lines.slice(middleLine, -2)); // omit the \`; at the end
p4BLines.push('\`;\n');

fs.writeFileSync(PART_4_FILE, p4Lines.join('\n'));
fs.writeFileSync(PART_4B_FILE, p4BLines.join('\n'));

let indexText = fs.readFileSync(INDEX, 'utf8');
indexText = indexText.replace(`import { PART_4 } from './script-partials/part-4';`, `import { PART_4 } from './script-partials/part-4';\nimport { PART_4B } from './script-partials/part-4b';`);
indexText = indexText.replace(`PART_4,\n`, `PART_4,\n  PART_4B,\n`);
fs.writeFileSync(INDEX, indexText);

console.log('part-4 split!');
