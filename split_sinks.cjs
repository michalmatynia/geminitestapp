const fs = require('fs');
const content = fs.readFileSync('original_sinks.server.ts.tmp', 'utf8');
const lines = content.split(/\r?\n/);

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

const imports = getRange(1, 49);

fs.writeFileSync('src/shared/lib/ai-paths/portable-engine/sinks-base.server.ts', 
  exportInternals(getRange(1, 1018)));

fs.writeFileSync('src/shared/lib/ai-paths/portable-engine/sinks-trends.server.ts',
  [imports, "export * from './sinks-base.server';", exportInternals(getRange(1019, 2085))].join('\n\n'));

fs.writeFileSync('src/shared/lib/ai-paths/portable-engine/sinks-remediation.server.ts',
  [imports, "export * from './sinks-base.server';", "export * from './sinks-trends.server';", exportInternals(getRange(2086))].join('\n\n'));

const barrelContent = `import 'server-only';

export * from './sinks-base.server';
export * from './sinks-trends.server';
export * from './sinks-remediation.server';
`;
fs.writeFileSync('src/shared/lib/ai-paths/portable-engine/sinks.server.ts', barrelContent);

console.log('Split complete.');
