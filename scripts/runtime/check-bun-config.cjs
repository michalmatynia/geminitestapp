const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const bunfigPath = path.join(root, 'bunfig.toml');

let bunfig = '';
try {
  bunfig = fs.readFileSync(bunfigPath, 'utf8');
} catch (error) {
  console.error(`[runtime] Missing required bunfig.toml at ${bunfigPath}.`);
  if (error instanceof Error && error.message) {
    console.error(error.message);
  }
  process.exit(1);
}

const installSectionMatch = bunfig.match(/(?:^|\n)\[install\]\s*([\s\S]*?)(?=\n\[|$)/);
if (!installSectionMatch) {
  console.error('[runtime] bunfig.toml must declare an [install] section.');
  process.exit(1);
}

const installSection = installSectionMatch[1];
const linkerMatch = installSection.match(/(?:^|\n)\s*linker\s*=\s*["']([^"']+)["']/);
if (!linkerMatch) {
  console.error('[runtime] bunfig.toml [install] section must declare linker = "hoisted".');
  process.exit(1);
}

if (linkerMatch[1] !== 'hoisted') {
  console.error(
    `[runtime] bunfig.toml [install].linker must stay "hoisted". Received "${linkerMatch[1]}".`
  );
  process.exit(1);
}

console.log('[runtime] bunfig.toml keeps Bun on the hoisted install layout.');
