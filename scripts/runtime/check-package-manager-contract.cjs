const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const packageJsonPath = path.join(root, 'package.json');
const packageLockPath = path.join(root, 'package-lock.json');

const readJson = (filePath, label) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`[runtime] Unable to read ${label} at ${filePath}.`);
    if (error instanceof Error && error.message) {
      console.error(error.message);
    }
    process.exit(1);
  }
};

const parseComparator = (rawComparator) => {
  const match = rawComparator.match(/^(>=|<=|>|<|=)?\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);
  if (!match) {
    throw new Error(`Unsupported npm engine comparator "${rawComparator}".`);
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
    throw new Error('npm engine range is empty.');
  }

  return comparators.every((comparator) => satisfiesComparator(version, comparator));
};

const packageJson = readJson(packageJsonPath, 'package.json');
const packageLock = readJson(packageLockPath, 'package-lock.json');

const packageManager = packageJson?.packageManager;
if (typeof packageManager !== 'string' || packageManager.trim().length === 0) {
  console.error('[runtime] package.json must declare packageManager.');
  process.exit(1);
}

const packageManagerMatch = packageManager.trim().match(/^([^@]+)@(\d+)\.(\d+)\.(\d+)$/);
if (!packageManagerMatch) {
  console.error(`[runtime] packageManager must use the form "<manager>@<major>.<minor>.<patch>". Received "${packageManager}".`);
  process.exit(1);
}

const packageManagerName = packageManagerMatch[1];
const packageManagerVersion = packageManagerMatch.slice(2).map((part) => Number.parseInt(part, 10));
if (packageManagerName !== 'npm') {
  console.error(`[runtime] packageManager must stay pinned to npm. Received "${packageManagerName}".`);
  process.exit(1);
}

const npmEngine = packageJson?.engines?.npm;
if (typeof npmEngine !== 'string' || npmEngine.trim().length === 0) {
  console.error('[runtime] package.json must declare engines.npm.');
  process.exit(1);
}

let npmEngineSatisfied = false;
try {
  npmEngineSatisfied = satisfiesSimpleRange(packageManagerVersion, npmEngine.trim());
} catch (error) {
  console.error('[runtime] Unable to evaluate package.json engines.npm.');
  if (error instanceof Error && error.message) {
    console.error(error.message);
  }
  process.exit(1);
}

if (!npmEngineSatisfied) {
  console.error(
    `[runtime] packageManager version ${packageManagerVersion.join('.')} does not satisfy engines.npm="${npmEngine}".`
  );
  process.exit(1);
}

if (packageLock?.lockfileVersion !== 3) {
  console.error(
    `[runtime] package-lock.json lockfileVersion must stay at 3 for the repo npm contract. Received "${packageLock?.lockfileVersion ?? 'missing'}".`
  );
  process.exit(1);
}

console.log(
  `[runtime] Package manager contract is aligned: packageManager=${packageManager}, engines.npm=${npmEngine}, lockfileVersion=${packageLock.lockfileVersion}.`
);
