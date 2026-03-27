import fs from 'node:fs/promises';
import path from 'node:path';

const walk = async (directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const children = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return [fullPath];
    })
  );
  return children.flat();
};

const appDir = path.join(process.cwd(), 'src/app');
const files = await walk(appDir);
const appUiFiles = files.filter(f => !f.includes('/api/') && /\.(tsx?|jsx?)$/.test(f));

const appFeatureDeepRegex = /from\s+['"]@\/features\/([^/'"\n]+)\/(?!public(?:['"/])|server(?:['"/]))/g;
const deepImports = new Map();

for (const file of appUiFiles) {
  const content = await fs.readFile(file, 'utf8');
  let match;
  while ((match = appFeatureDeepRegex.exec(content)) !== null) {
    const feature = match[1];
    if (!deepImports.has(feature)) deepImports.set(feature, []);
    deepImports.get(feature).push({ file: path.relative(process.cwd(), file), import: match[0], fullLine: content.split('\n').find(l => l.includes(match[0])) });
  }
}

for (const [feature, occurrences] of deepImports.entries()) {
  console.log(`\nFeature: ${feature} (${occurrences.length} occurrences)`);
  occurrences.forEach(occ => console.log(`  ${occ.file}: ${occ.fullLine?.trim()}`));
}
