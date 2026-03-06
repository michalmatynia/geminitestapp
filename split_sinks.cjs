const fs = require('fs');
const content = fs.readFileSync('original_sinks.server.ts.tmp', 'utf8');
const lines = content.split(/\r?\n/);

function getRange(start, end) {
  if (end === undefined) return lines.slice(start - 1).join('\n');
  return lines.slice(start - 1, end).join('\n');
}

const imports = getRange(1, 49);

// Section 1: Registry (1-680)
fs.writeFileSync('src/shared/lib/ai-paths/portable-engine/sinks-registry.server.ts', 
  [imports, getRange(50, 680)].join('\n\n'));

// Section 2: Policy (681-1365)
fs.writeFileSync('src/shared/lib/ai-paths/portable-engine/sinks-policy.server.ts',
  [imports, getRange(681, 1365)].join('\n\n'));

// Section 3: Persistence (1366-2282)
fs.writeFileSync('src/shared/lib/ai-paths/portable-engine/sinks-persistence.server.ts',
  [imports, getRange(1366, 2282)].join('\n\n'));

// Section 4: Remediation (2283-end)
fs.writeFileSync('src/shared/lib/ai-paths/portable-engine/sinks-remediation.server.ts',
  [imports, getRange(2283)].join('\n\n'));

console.log('Split complete.');
