const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const nvmrcPath = path.join(root, '.nvmrc');
const nodeVersionPath = path.join(root, '.node-version');
const bunVersionPath = path.join(root, '.bun-version');
const toolVersionsPath = path.join(root, '.tool-versions');
const packageJsonPath = path.join(root, 'package.json');

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

const normalizePinnedMajor = (rawValue, label) => {
  const normalized = rawValue.replace(/^v/i, '').trim();
  if (!/^\d+$/.test(normalized)) {
    console.error(`[runtime] ${label} must contain a single Node major version. Received "${rawValue}".`);
    process.exit(1);
  }

  return Number.parseInt(normalized, 10);
};

const parseToolVersions = (rawValue) => {
  const entries = new Map();
  for (const line of rawValue.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }

    const [tool, version] = trimmed.split(/\s+/, 2);
    if (tool && version) {
      entries.set(tool, version.trim());
    }
  }

  return entries;
};

const parseComparator = (rawComparator) => {
  const match = rawComparator.match(/^(>=|<=|>|<|=)?\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);
  if (!match) {
    throw new Error(`Unsupported node engine comparator "${rawComparator}".`);
  }

  return {
    operator: match[1] ?? '=',
    version: [match[2], match[3] ?? '0', match[4] ?? '0'].map((part) => Number.parseInt(part, 10)),
  };
};

const compareVersions = (left, right) => {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] > right[index]) {
      return 1;
    }
    if (left[index] < right[index]) {
      return -1;
    }
  }

  return 0;
};

const satisfiesComparator = (version, comparator) => {
  const comparison = compareVersions(version, comparator.version);
  switch (comparator.operator) {
    case '>':
      return comparison > 0;
    case '>=':
      return comparison >= 0;
    case '<':
      return comparison < 0;
    case '<=':
      return comparison <= 0;
    case '=':
      return comparison === 0;
    default:
      return false;
  }
};

const satisfiesSimpleRange = (version, range) => {
  const comparators = range
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map(parseComparator);

  if (comparators.length === 0) {
    throw new Error('Node engine range is empty.');
  }

  return comparators.every((comparator) => satisfiesComparator(version, comparator));
};

const nvmrc = readRequiredFile(nvmrcPath, '.nvmrc');
const nodeVersion = readRequiredFile(nodeVersionPath, '.node-version');
const bunVersion = readRequiredFile(bunVersionPath, '.bun-version');
const toolVersionsRaw = readRequiredFile(toolVersionsPath, '.tool-versions');
const packageJsonRaw = readRequiredFile(packageJsonPath, 'package.json');
const toolVersions = parseToolVersions(toolVersionsRaw);

const nvmrcMajor = normalizePinnedMajor(nvmrc, '.nvmrc');
const nodeVersionMajor = normalizePinnedMajor(nodeVersion, '.node-version');
const toolVersionsNode = toolVersions.get('nodejs');
const toolVersionsBun = toolVersions.get('bun');

if (nvmrcMajor !== nodeVersionMajor) {
  console.error(
    `[runtime] Node version files are out of sync: .nvmrc=${nvmrcMajor} but .node-version=${nodeVersionMajor}.`
  );
  process.exit(1);
}

if (!toolVersionsNode) {
  console.error('[runtime] .tool-versions must declare a nodejs entry.');
  process.exit(1);
}

if (normalizePinnedMajor(toolVersionsNode, '.tool-versions nodejs entry') !== nvmrcMajor) {
  console.error(
    `[runtime] .tool-versions nodejs entry (${toolVersionsNode}) does not match the pinned Node major ${nvmrcMajor}.`
  );
  process.exit(1);
}

if (!toolVersionsBun) {
  console.error('[runtime] .tool-versions must declare a bun entry.');
  process.exit(1);
}

if (toolVersionsBun !== bunVersion) {
  console.error(
    `[runtime] .tool-versions bun entry (${toolVersionsBun}) does not match .bun-version (${bunVersion}).`
  );
  process.exit(1);
}

let packageJson = null;
try {
  packageJson = JSON.parse(packageJsonRaw);
} catch (error) {
  console.error('[runtime] package.json is not valid JSON.');
  if (error instanceof Error && error.message) {
    console.error(error.message);
  }
  process.exit(1);
}

const nodeEngine = packageJson?.engines?.node;
if (typeof nodeEngine !== 'string' || nodeEngine.trim().length === 0) {
  console.error('[runtime] package.json must declare engines.node.');
  process.exit(1);
}

const bunEngine = packageJson?.engines?.bun;
if (typeof bunEngine !== 'string' || bunEngine.trim().length === 0) {
  console.error('[runtime] package.json must declare engines.bun.');
  process.exit(1);
}

const pinnedNodeVersion = [nvmrcMajor, 0, 0];
let nodeEngineSatisfied = false;
try {
  nodeEngineSatisfied = satisfiesSimpleRange(pinnedNodeVersion, nodeEngine.trim());
} catch (error) {
  console.error('[runtime] Unable to evaluate package.json engines.node.');
  if (error instanceof Error && error.message) {
    console.error(error.message);
  }
  process.exit(1);
}

if (!nodeEngineSatisfied) {
  console.error(
    `[runtime] package.json engines.node="${nodeEngine}" does not include the pinned Node major ${nvmrcMajor}.`
  );
  process.exit(1);
}

if (bunEngine.trim() !== bunVersion) {
  console.error(
    `[runtime] package.json engines.bun="${bunEngine}" does not match .bun-version (${bunVersion}).`
  );
  process.exit(1);
}

console.log(
  `[runtime] Node toolchain pins are aligned: .nvmrc=${nvmrcMajor}, .node-version=${nodeVersionMajor}, .tool-versions nodejs=${toolVersionsNode}, .tool-versions bun=${toolVersionsBun}, engines.node=${nodeEngine}, engines.bun=${bunEngine}.`
);
