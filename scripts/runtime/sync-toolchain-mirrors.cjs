const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const nvmrcPath = path.join(root, '.nvmrc');
const bunVersionPath = path.join(root, '.bun-version');
const nodeVersionPath = path.join(root, '.node-version');
const toolVersionsPath = path.join(root, '.tool-versions');

const readRequiredFile = (filePath, label) => {
  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch (error) {
    console.error(`[runtime] Missing required ${label} at ${filePath}.`);
    if (error instanceof Error && error.message) {
      console.error(error.message);
    }
    process.exit(1);
  }
};

const writeIfChanged = (filePath, nextValue) => {
  const currentValue = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (currentValue === nextValue) {
    return false;
  }

  fs.writeFileSync(filePath, nextValue, 'utf8');
  return true;
};

const nvmrc = readRequiredFile(nvmrcPath, '.nvmrc');
const bunVersion = readRequiredFile(bunVersionPath, '.bun-version');

const desiredNodeVersion = `${nvmrc}\n`;
const desiredToolVersions = `nodejs ${nvmrc}\nbun ${bunVersion}\n`;

const nodeVersionUpdated = writeIfChanged(nodeVersionPath, desiredNodeVersion);
const toolVersionsUpdated = writeIfChanged(toolVersionsPath, desiredToolVersions);

if (!nodeVersionUpdated && !toolVersionsUpdated) {
  console.log('[runtime] Toolchain mirror files are already aligned.');
  process.exit(0);
}

const updatedFiles = [];
if (nodeVersionUpdated) {
  updatedFiles.push('.node-version');
}
if (toolVersionsUpdated) {
  updatedFiles.push('.tool-versions');
}

console.log(`[runtime] Synced toolchain mirror files: ${updatedFiles.join(', ')}.`);
