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

const root = process.cwd();
const appDir = path.join(root, 'src/app');
const files = await walk(appDir);
const appUiFiles = files.filter(f => !f.includes('/api/') && /\.(tsx?|jsx?)$/.test(f));

for (const file of appUiFiles) {
  let content = await fs.readFile(file, 'utf8');
  let changed = false;

  // Pattern for UI/Public imports
  const uiRegex = /from\s+['"]@\/features\/kangur\/(admin|ui|config|observability)\/[^'"]+['"]/g;
  if (uiRegex.test(content)) {
    content = content.replace(uiRegex, "from '@/features/kangur/public'");
    changed = true;
  }

  // Pattern for Server imports
  const serverRegex = /from\s+['"]@\/features\/kangur\/(server|services)\/[^'"]+['"]/g;
  if (serverRegex.test(content)) {
    content = content.replace(serverRegex, "from '@/features/kangur/server'");
    changed = true;
  }

  // Specific case for FrontendPublicOwnerShellClient
  if (content.includes("@/features/kangur/ui/FrontendPublicOwnerShellClient")) {
    content = content.replace(/['"]@\/features\/kangur\/ui\/FrontendPublicOwnerShellClient['"]/g, "'@/features/kangur/public'");
    changed = true;
  }

  if (changed) {
    await fs.writeFile(file, content);
    console.log(`Updated ${path.relative(root, file)}`);
  }
}
