import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');

const REQUIRED_DOCS = [
  'docs/site-wide-canonical-migration-plan-2026-03-04.md',
  'docs/canonical-contract-matrix-2026-03-04.md',
  'docs/legacy-compatibility-exception-register-2026-03-04.md',
  'docs/legacy-compatibility-exception-register-2026-03-04.json',
];

const EXCEPTION_REGISTER_PATH = 'docs/legacy-compatibility-exception-register-2026-03-04.json';

const violations = [];

const reportViolation = (message) => {
  violations.push(message);
};

const toRelative = (absolutePath) => path.relative(ROOT, absolutePath).split(path.sep).join('/');

const isSourceCodeFile = (fileName) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(fileName);

const isRuntimeTestFile = (relativePath) => {
  if (relativePath.includes('/__tests__/')) return true;
  return /\.(test|spec)\.[tj]sx?$/.test(relativePath);
};

const collectSourceFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  const stack = [dir];
  const files = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') {
        continue;
      }
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!isSourceCodeFile(entry.name)) continue;
      files.push(absolute);
    }
  }

  return files;
};

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const readExceptionRegister = () => {
  const absolute = path.join(ROOT, EXCEPTION_REGISTER_PATH);
  if (!fs.existsSync(absolute)) {
    reportViolation(`missing exception register: ${EXCEPTION_REGISTER_PATH}`);
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      reportViolation(`invalid exception register payload shape: ${EXCEPTION_REGISTER_PATH}`);
      return null;
    }
    return parsed;
  } catch (error) {
    reportViolation(
      `failed to parse exception register JSON: ${EXCEPTION_REGISTER_PATH} (${error instanceof Error ? error.message : 'unknown_error'})`
    );
    return null;
  }
};

const requireNonEmptyString = (value, fieldPath) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    reportViolation(`missing or invalid string field: ${fieldPath}`);
    return null;
  }
  return value.trim();
};

const checkRequiredDocs = () => {
  for (const relative of REQUIRED_DOCS) {
    if (!fs.existsSync(path.join(ROOT, relative))) {
      reportViolation(`required canonicalization artifact missing: ${relative}`);
    }
  }
};

const checkExceptionRegister = (register, sourceFileMap) => {
  const schemaVersion = register['schemaVersion'];
  if (typeof schemaVersion !== 'number') {
    reportViolation('exception register schemaVersion must be a number');
  }

  const generatedOn = requireNonEmptyString(register['generatedOn'], 'generatedOn');
  if (generatedOn && !isIsoDate(generatedOn)) {
    reportViolation(`generatedOn must use YYYY-MM-DD: ${generatedOn}`);
  }

  const owner = requireNonEmptyString(register['owner'], 'owner');
  if (!owner) {
    reportViolation('exception register owner is required');
  }

  const exceptions = register['exceptions'];
  if (!Array.isArray(exceptions) || exceptions.length === 0) {
    reportViolation('exception register exceptions must be a non-empty array');
    return;
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const ids = new Set();

  for (let index = 0; index < exceptions.length; index += 1) {
    const entry = exceptions[index];
    const prefix = `exceptions[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      reportViolation(`${prefix} must be an object`);
      continue;
    }

    const id = requireNonEmptyString(entry['id'], `${prefix}.id`);
    if (id) {
      if (ids.has(id)) {
        reportViolation(`${prefix}.id is duplicated: ${id}`);
      }
      ids.add(id);
    }

    requireNonEmptyString(entry['status'], `${prefix}.status`);
    requireNonEmptyString(entry['category'], `${prefix}.category`);
    requireNonEmptyString(entry['owner'], `${prefix}.owner`);
    requireNonEmptyString(entry['description'], `${prefix}.description`);

    const sunsetDate = requireNonEmptyString(entry['sunsetDate'], `${prefix}.sunsetDate`);
    if (sunsetDate) {
      if (!isIsoDate(sunsetDate)) {
        reportViolation(`${prefix}.sunsetDate must use YYYY-MM-DD: ${sunsetDate}`);
      } else if (sunsetDate < todayIso) {
        reportViolation(`${prefix}.sunsetDate is expired: ${sunsetDate}`);
      }
    }

    const guardToken = requireNonEmptyString(entry['guardToken'], `${prefix}.guardToken`);

    const files = entry['files'];
    if (!Array.isArray(files) || files.length === 0) {
      reportViolation(`${prefix}.files must be a non-empty string array`);
      continue;
    }

    const normalizedFiles = [];
    for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
      const rawFile = files[fileIndex];
      if (typeof rawFile !== 'string' || rawFile.trim().length === 0) {
        reportViolation(`${prefix}.files[${fileIndex}] must be a non-empty string`);
        continue;
      }
      const relativeFile = rawFile.trim();
      normalizedFiles.push(relativeFile);
      const absolute = path.join(ROOT, relativeFile);
      if (!fs.existsSync(absolute)) {
        reportViolation(`${prefix}.files[${fileIndex}] does not exist: ${relativeFile}`);
      }
      if (!relativeFile.startsWith('src/')) {
        reportViolation(`${prefix}.files[${fileIndex}] must target runtime source under src/: ${relativeFile}`);
      }
    }

    if (!guardToken) continue;

    const mustExist = entry['mustExist'] !== false;
    const allowedFiles = new Set(normalizedFiles);
    const tokenMatches = [];

    for (const [relativeFile, content] of sourceFileMap.entries()) {
      if (content.includes(guardToken)) {
        tokenMatches.push(relativeFile);
      }
    }

    if (mustExist && tokenMatches.length === 0) {
      reportViolation(`${prefix}.guardToken not found in runtime source: ${guardToken}`);
    }

    for (const matchFile of tokenMatches) {
      if (!allowedFiles.has(matchFile)) {
        reportViolation(
          `${prefix}.guardToken found outside allowlisted files: token="${guardToken}" file="${matchFile}"`
        );
      }
    }
  }
};

const main = () => {
  checkRequiredDocs();

  const sourceFiles = collectSourceFiles(SRC_DIR);
  const runtimeFiles = sourceFiles
    .map((absolute) => toRelative(absolute))
    .filter((relative) => !isRuntimeTestFile(relative));

  const sourceFileMap = new Map(
    runtimeFiles.map((relative) => [relative, fs.readFileSync(path.join(ROOT, relative), 'utf8')])
  );

  const register = readExceptionRegister();
  if (register) {
    checkExceptionRegister(register, sourceFileMap);
  }

  if (violations.length > 0) {
    console.error('[canonical:check:sitewide] failed with violations:');
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('[canonical:check:sitewide] passed');
  console.log(
    `[canonical:check:sitewide] validated ${runtimeFiles.length} runtime source file(s) and ${REQUIRED_DOCS.length} docs artifact(s)`
  );
};

main();
