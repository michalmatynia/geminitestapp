const fs = require('fs');
const content = fs.readFileSync('src/features/products/components/form/ProductFormScans.tsx', 'utf8');
const lines = content.split('\n');

const compStart = lines.findIndex(l => l.includes('export default function ProductFormScans(): React.JSX.Element {'));

// find where imports end
let lastImportIdx = -1;
for (let i = 0; i < compStart; i++) {
  if (lines[i].startsWith('import ')) {
    lastImportIdx = i;
  } else if (lines[i].startsWith('} from ')) {
    lastImportIdx = i;
  }
}

const header = lines.slice(0, lastImportIdx + 1).join('\n');
const helpersRaw = lines.slice(lastImportIdx + 1, compStart).join('\n');
const main = lines.slice(compStart).join('\n');

// Export all constants/functions at the top level
const exportedHelpers = helpersRaw.replace(/^(const|function|type) ([a-zA-Z0-9_]+)/gm, 'export $1 $2');

fs.writeFileSync('src/features/products/components/form/ProductFormScans.helpers.tsx', header + '\n' + exportedHelpers);

const exportedNames = [];
const regex = /^export (const|function|type) ([a-zA-Z0-9_]+)/gm;
let match;
while ((match = regex.exec(exportedHelpers)) !== null) {
  exportedNames.push(match[2]);
}

const importStatement = `import {\n  ${exportedNames.join(',\n  ')}\n} from './ProductFormScans.helpers';\n\n`;

fs.writeFileSync('src/features/products/components/form/ProductFormScans.tsx', header + '\n' + importStatement + main);
