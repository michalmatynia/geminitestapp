const fs = require('fs');
const content = fs.readFileSync('original_index.ts.tmp', 'utf8');
const lines = content.split('\n');

function getRange(start, end) {
  if (end === undefined) return lines.slice(start - 1).join('\n');
  return lines.slice(start - 1, end).join('\n');
}

function exportInternals(text) {
  return text.split('\n').map(line => {
    if (line.match(/^(const|type|interface|function) [a-zA-Z0-9_]+/)) {
      return 'export ' + line;
    }
    return line;
  }).join('\n');
}

const imports = getRange(1, 137);

fs.writeFileSync('src/shared/lib/ai-paths/portable-engine/portable-engine-base.ts', 
  exportInternals(getRange(1, 1216)));

fs.writeFileSync('src/shared/lib/ai-paths/portable-engine/portable-engine-logic.ts',
  [imports, "export * from './portable-engine-base';", exportInternals(getRange(1217))].join('\n\n'));

const barrelContent = `import 'server-only';

export * from './portable-engine-base';
export * from './portable-engine-logic';
`;
fs.writeFileSync('src/shared/lib/ai-paths/portable-engine/index.ts', barrelContent);

console.log('Split complete.');
