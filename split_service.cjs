const fs = require('fs');
const content = fs.readFileSync('src/features/products/server/product-scans-service.ts', 'utf8');

const lines = content.split('\n');

const helpersStart = lines.findIndex(l => l.includes('const AMAZON_SCAN_TIMEOUT_MS = 180_000;'));
const helpersEnd = lines.findIndex(l => l.includes('export async function synchronizeProductScan(scan: ProductScanRecord)'));

const header = lines.slice(0, helpersStart).join('\n');
const helpers = lines.slice(helpersStart, helpersEnd).join('\n');
const main = lines.slice(helpersEnd).join('\n');

// Make helpers exported
const exportedHelpers = helpers.replace(/^(const|type) /gm, 'export $1 ');

fs.writeFileSync('src/features/products/server/product-scans-service.helpers.ts', header + '\n' + exportedHelpers);

// Extract the exported names to import them
const exportedNames = [];
const regex = /^export (const|type) ([a-zA-Z0-9_]+)/gm;
let match;
while ((match = regex.exec(exportedHelpers)) !== null) {
  exportedNames.push(match[2]);
}

const importStatement = `import {\n  ${exportedNames.join(',\n  ')}\n} from './product-scans-service.helpers';\n\n`;

fs.writeFileSync('src/features/products/server/product-scans-service.ts', header + '\n' + importStatement + main);
