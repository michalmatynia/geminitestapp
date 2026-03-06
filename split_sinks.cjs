const fs = require('fs');
const { execSync } = require('child_process');

const content = execSync('git show origin/ann:src/shared/lib/ai-paths/portable-engine/sinks.server.ts', { encoding: 'utf8' });
const lines = content.split('\n');

function exportInternals(text) {
  return text.split('\n').map(line => {
    if (line.match(/^(const|type|interface|function) [a-zA-Z0-9_]+/)) {
      return 'export ' + line;
    }
    return line;
  }).join('\n');
}

const imports = lines.slice(0, 49).join('\n');
const base = lines.slice(49, 1500).join('\n');
const logic = lines.slice(1500).join('\n');

fs.writeFileSync('src/shared/lib/ai-paths/portable-engine/sinks-base.server.ts', 
  imports + '\n\n' + exportInternals(base));

fs.writeFileSync('src/shared/lib/ai-paths/portable-engine/sinks-logic.server.ts',
  imports + '\n\n' + "export * from './sinks-base.server';\n\n" + exportInternals(logic));

const barrel = "import 'server-only';\n\nexport * from './sinks-base.server';\nexport * from './sinks-logic.server';\n";
fs.writeFileSync('src/shared/lib/ai-paths/portable-engine/sinks.server.ts', barrel);
