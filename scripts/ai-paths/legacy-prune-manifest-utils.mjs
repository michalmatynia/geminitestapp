import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_LEGACY_PRUNE_MANIFEST_RELATIVE_PATH =
  'scripts/ai-paths/legacy-prune-manifest.json';
const TARGET_MODES = new Set(['file', 'source_scan', 'const_array']);
const TARGET_EXPECTED_STATES = new Set(['present', 'missing']);

const normalizeStringArray = (value, label) => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  const normalized = value.map((item) => {
    if (typeof item !== 'string' || item.trim().length === 0) {
      throw new Error(`${label} must contain non-empty strings`);
    }
    return item;
  });
  return normalized;
};

const normalizeManifestTarget = (target, ruleId, index) => {
  if (!target || typeof target !== 'object' || Array.isArray(target)) {
    throw new Error(`rules[${index}] (${ruleId}) target must be an object`);
  }
  const mode =
    typeof target.mode === 'string' && target.mode.trim().length > 0 ? target.mode.trim() : 'file';
  if (!TARGET_MODES.has(mode)) {
    throw new Error(
      `rules[${index}] (${ruleId}) target.mode must be one of: file, source_scan, const_array`
    );
  }

  const file =
    typeof target.file === 'string' && target.file.trim().length > 0 ? target.file.trim() : null;
  if (!file) {
    throw new Error(`rules[${index}] (${ruleId}) target.file must be a non-empty string`);
  }

  if (mode !== 'file' && target.expectedState !== undefined) {
    throw new Error(`rules[${index}] (${ruleId}) target.expectedState is only supported for mode=file`);
  }
  const expectedState =
    mode === 'file'
      ? typeof target.expectedState === 'string' && target.expectedState.trim().length > 0
        ? target.expectedState.trim()
        : 'present'
      : 'present';
  if (mode === 'file' && !TARGET_EXPECTED_STATES.has(expectedState)) {
    throw new Error(
      `rules[${index}] (${ruleId}) target.expectedState must be one of: present, missing`
    );
  }

  const forbiddenSnippets =
    target.forbiddenSnippets === undefined
      ? []
      : normalizeStringArray(target.forbiddenSnippets, `${ruleId}.targets[].forbiddenSnippets`);
  const requiredSnippets =
    target.requiredSnippets === undefined
      ? []
      : normalizeStringArray(target.requiredSnippets, `${ruleId}.targets[].requiredSnippets`);
  const replacements =
    target.replacements === undefined
      ? []
      : normalizeManifestReplacements(target.replacements, ruleId, file);

  const arrayName =
    mode === 'const_array'
      ? typeof target.arrayName === 'string' && target.arrayName.trim().length > 0
        ? target.arrayName.trim()
        : null
      : null;
  const expectedItems =
    mode === 'const_array'
      ? normalizeStringArray(target.expectedItems, `${ruleId}.targets[].expectedItems`)
      : [];

  if (mode === 'source_scan') {
    if (requiredSnippets.length > 0) {
      throw new Error(
        `${ruleId}.targets[${file}].requiredSnippets is not supported for mode=source_scan`
      );
    }
    if (replacements.length > 0) {
      throw new Error(`${ruleId}.targets[${file}].replacements is not supported for mode=source_scan`);
    }
  }

  if (mode === 'const_array') {
    if (!arrayName) {
      throw new Error(`${ruleId}.targets[${file}].arrayName must be a non-empty string`);
    }
    if (requiredSnippets.length > 0) {
      throw new Error(`${ruleId}.targets[${file}].requiredSnippets is not supported for mode=const_array`);
    }
    if (forbiddenSnippets.length > 0) {
      throw new Error(
        `${ruleId}.targets[${file}].forbiddenSnippets is not supported for mode=const_array`
      );
    }
    if (replacements.length > 0) {
      throw new Error(`${ruleId}.targets[${file}].replacements is not supported for mode=const_array`);
    }
  }

  if (mode === 'file' && expectedState === 'missing') {
    if (forbiddenSnippets.length > 0 || requiredSnippets.length > 0 || replacements.length > 0) {
      throw new Error(
        `${ruleId}.targets[${file}] expectedState=missing cannot define snippets/replacements`
      );
    }
  }

  return {
    mode,
    file,
    expectedState,
    arrayName,
    expectedItems,
    forbiddenSnippets,
    requiredSnippets,
    replacements,
  };
};

const normalizeManifestReplacement = (replacement, ruleId, file, index) => {
  if (!replacement || typeof replacement !== 'object' || Array.isArray(replacement)) {
    throw new Error(`${ruleId}.targets[${file}].replacements[${index}] must be an object`);
  }
  const from =
    typeof replacement.from === 'string' && replacement.from.length > 0 ? replacement.from : null;
  const to = typeof replacement.to === 'string' ? replacement.to : null;
  if (!from) {
    throw new Error(`${ruleId}.targets[${file}].replacements[${index}].from must be non-empty`);
  }
  if (to === null) {
    throw new Error(`${ruleId}.targets[${file}].replacements[${index}].to must be a string`);
  }
  const replaceAll =
    replacement.replaceAll === undefined ? true : Boolean(replacement.replaceAll);

  return {
    from,
    to,
    replaceAll,
  };
};

const normalizeManifestReplacements = (value, ruleId, file) => {
  if (!Array.isArray(value)) {
    throw new Error(`${ruleId}.targets[${file}].replacements must be an array`);
  }
  return value.map((replacement, index) => normalizeManifestReplacement(replacement, ruleId, file, index));
};

const normalizeManifestRule = (rule, index) => {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
    throw new Error(`rules[${index}] must be an object`);
  }
  const id = typeof rule.id === 'string' && rule.id.trim().length > 0 ? rule.id.trim() : null;
  if (!id) {
    throw new Error(`rules[${index}].id must be a non-empty string`);
  }
  const description =
    typeof rule.description === 'string' && rule.description.trim().length > 0
      ? rule.description.trim()
      : '';
  const targets = Array.isArray(rule.targets)
    ? rule.targets.map((target, targetIndex) => normalizeManifestTarget(target, id, targetIndex))
    : [];
  if (targets.length === 0) {
    throw new Error(`rules[${index}] (${id}) must define at least one target`);
  }

  return {
    id,
    description,
    targets,
  };
};

export const resolveLegacyPruneManifestPath = (
  root,
  manifestRelativePath = DEFAULT_LEGACY_PRUNE_MANIFEST_RELATIVE_PATH
) => path.join(root, manifestRelativePath);

const toRelative = (root, absolutePath) => path.relative(root, absolutePath).split(path.sep).join('/');

const isSourceCodeFile = (file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file);
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isTestFile = (relativeFile) => {
  if (relativeFile.includes('/__tests__/')) return true;
  return /\.(test|spec)\.[tj]sx?$/.test(relativeFile);
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

export const loadLegacyPruneManifest = (
  root,
  manifestRelativePath = DEFAULT_LEGACY_PRUNE_MANIFEST_RELATIVE_PATH
) => {
  const absolutePath = resolveLegacyPruneManifestPath(root, manifestRelativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`legacy prune manifest not found: ${manifestRelativePath}`);
  }
  const raw = fs.readFileSync(absolutePath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown parse error';
    throw new Error(`failed to parse legacy prune manifest (${manifestRelativePath}): ${message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`legacy prune manifest must be an object: ${manifestRelativePath}`);
  }

  const version =
    typeof parsed.version === 'string' && parsed.version.trim().length > 0
      ? parsed.version.trim()
      : null;
  if (!version) {
    throw new Error(`legacy prune manifest missing non-empty version: ${manifestRelativePath}`);
  }

  const rules = Array.isArray(parsed.rules)
    ? parsed.rules.map((rule, index) => normalizeManifestRule(rule, index))
    : [];
  if (rules.length === 0) {
    throw new Error(`legacy prune manifest must include at least one rule: ${manifestRelativePath}`);
  }

  return {
    version,
    description: typeof parsed.description === 'string' ? parsed.description : '',
    rules,
    manifestRelativePath,
  };
};

export const evaluateLegacyPruneManifest = (
  manifest,
  { root, includeTargetFileMissingFindings = true }
) => {
  const findings = [];

  for (const rule of manifest.rules) {
    for (const target of rule.targets) {
      if (target.mode === 'source_scan') {
        const absoluteScanRoot = path.join(root, target.file);
        if (!fs.existsSync(absoluteScanRoot)) {
          if (includeTargetFileMissingFindings) {
            findings.push({
              ruleId: rule.id,
              file: target.file,
              type: 'missing_target_file',
              message: `manifest target file is missing: ${target.file}`,
            });
          }
          continue;
        }

        const stats = fs.statSync(absoluteScanRoot);
        const sourceFiles = stats.isDirectory()
          ? collectSourceFiles(absoluteScanRoot)
          : stats.isFile() && isSourceCodeFile(path.basename(absoluteScanRoot))
            ? [absoluteScanRoot]
            : [];

        for (const absoluteSourcePath of sourceFiles) {
          const relativeSourcePath = toRelative(root, absoluteSourcePath);
          if (isTestFile(relativeSourcePath)) continue;
          const text = fs.readFileSync(absoluteSourcePath, 'utf8');
          for (const snippet of target.forbiddenSnippets) {
            if (text.includes(snippet)) {
              findings.push({
                ruleId: rule.id,
                file: relativeSourcePath,
                type: 'forbidden_snippet_present',
                snippet,
                message: `forbidden snippet detected: ${snippet}`,
              });
            }
          }
        }

        continue;
      }

      if (target.mode === 'const_array') {
        const absolutePath = path.join(root, target.file);
        if (!fs.existsSync(absolutePath)) {
          if (includeTargetFileMissingFindings) {
            findings.push({
              ruleId: rule.id,
              file: target.file,
              type: 'missing_target_file',
              message: `manifest target file is missing: ${target.file}`,
            });
          }
          continue;
        }

        const text = fs.readFileSync(absolutePath, 'utf8');
        const arrayMatch = text.match(
          new RegExp(`${escapeRegExp(target.arrayName)}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as\\s+const`)
        );
        if (!arrayMatch) {
          findings.push({
            ruleId: rule.id,
            file: target.file,
            type: 'const_array_parse_failed',
            message: `failed to parse const array "${target.arrayName}"`,
          });
          continue;
        }

        const body = arrayMatch[1] ?? '';
        const actualItems = Array.from(body.matchAll(/'([^']+)'/g)).map((match) => match[1]);
        if (JSON.stringify(actualItems) !== JSON.stringify(target.expectedItems)) {
          findings.push({
            ruleId: rule.id,
            file: target.file,
            type: 'const_array_items_mismatch',
            message: `const array "${target.arrayName}" mismatch; expected ${JSON.stringify(target.expectedItems)}, received ${JSON.stringify(actualItems)}`,
          });
        }

        continue;
      }

      const absolutePath = path.join(root, target.file);
      if (target.expectedState === 'missing') {
        if (fs.existsSync(absolutePath)) {
          findings.push({
            ruleId: rule.id,
            file: target.file,
            type: 'unexpected_target_file_present',
            message: `manifest target file must remain removed: ${target.file}`,
          });
        }
        continue;
      }

      if (!fs.existsSync(absolutePath)) {
        if (includeTargetFileMissingFindings) {
          findings.push({
            ruleId: rule.id,
            file: target.file,
            type: 'missing_target_file',
            message: `manifest target file is missing: ${target.file}`,
          });
        }
        continue;
      }

      const text = fs.readFileSync(absolutePath, 'utf8');

      for (const snippet of target.forbiddenSnippets) {
        if (text.includes(snippet)) {
          findings.push({
            ruleId: rule.id,
            file: target.file,
            type: 'forbidden_snippet_present',
            snippet,
            message: `forbidden snippet detected: ${snippet}`,
          });
        }
      }

      for (const snippet of target.requiredSnippets) {
        if (!text.includes(snippet)) {
          findings.push({
            ruleId: rule.id,
            file: target.file,
            type: 'required_snippet_missing',
            snippet,
            message: `required snippet missing: ${snippet}`,
          });
        }
      }
    }
  }

  return findings;
};

const countOccurrences = (text, needle) => {
  if (needle.length === 0) return 0;
  let count = 0;
  let index = 0;
  while (index <= text.length) {
    const foundIndex = text.indexOf(needle, index);
    if (foundIndex === -1) break;
    count += 1;
    index = foundIndex + needle.length;
  }
  return count;
};

export const applyLegacyPruneManifest = (manifest, { root, dryRun = false }) => {
  const targetReports = [];
  let changedFileCount = 0;
  let replacedSnippetCount = 0;

  for (const rule of manifest.rules) {
    for (const target of rule.targets) {
      if (target.mode === 'source_scan') {
        const absoluteScanRoot = path.join(root, target.file);
        const missingTargetFile = !fs.existsSync(absoluteScanRoot);
        let scannedFileCount = 0;
        if (!missingTargetFile) {
          const stats = fs.statSync(absoluteScanRoot);
          const sourceFiles = stats.isDirectory()
            ? collectSourceFiles(absoluteScanRoot)
            : stats.isFile() && isSourceCodeFile(path.basename(absoluteScanRoot))
              ? [absoluteScanRoot]
              : [];
          scannedFileCount = sourceFiles
            .map((absoluteSourcePath) => toRelative(root, absoluteSourcePath))
            .filter((relativeSourcePath) => !isTestFile(relativeSourcePath)).length;
        }

        targetReports.push({
          ruleId: rule.id,
          mode: target.mode,
          expectedState: target.expectedState,
          file: target.file,
          missingTargetFile,
          changed: false,
          replacementCount: 0,
          replacements: [],
          scannedFileCount,
        });
        continue;
      }

      if (target.mode === 'const_array') {
        const absolutePath = path.join(root, target.file);
        targetReports.push({
          ruleId: rule.id,
          mode: target.mode,
          expectedState: target.expectedState,
          file: target.file,
          missingTargetFile: !fs.existsSync(absolutePath),
          changed: false,
          replacementCount: 0,
          replacements: [],
        });
        continue;
      }

      const absolutePath = path.join(root, target.file);
      if (target.expectedState === 'missing') {
        targetReports.push({
          ruleId: rule.id,
          mode: target.mode,
          expectedState: target.expectedState,
          file: target.file,
          missingTargetFile: !fs.existsSync(absolutePath),
          changed: false,
          replacementCount: 0,
          replacements: [],
        });
        continue;
      }

      if (!fs.existsSync(absolutePath)) {
        targetReports.push({
          ruleId: rule.id,
          mode: target.mode,
          expectedState: target.expectedState,
          file: target.file,
          missingTargetFile: true,
          changed: false,
          replacementCount: 0,
          replacements: [],
        });
        continue;
      }

      const before = fs.readFileSync(absolutePath, 'utf8');
      let after = before;
      const replacements = [];
      let targetReplacementCount = 0;

      for (const replacement of target.replacements) {
        const occurrences = countOccurrences(after, replacement.from);
        let appliedCount = 0;
        if (occurrences > 0) {
          if (replacement.replaceAll) {
            after = after.split(replacement.from).join(replacement.to);
            appliedCount = occurrences;
          } else {
            after = after.replace(replacement.from, replacement.to);
            appliedCount = 1;
          }
          targetReplacementCount += appliedCount;
          replacedSnippetCount += appliedCount;
        }

        replacements.push({
          from: replacement.from,
          to: replacement.to,
          replaceAll: replacement.replaceAll,
          occurrences,
          appliedCount,
        });
      }

      const changed = after !== before;
      if (changed && !dryRun) {
        fs.writeFileSync(absolutePath, after, 'utf8');
      }
      if (changed) {
        changedFileCount += 1;
      }

      targetReports.push({
        ruleId: rule.id,
        mode: target.mode,
        expectedState: target.expectedState,
        file: target.file,
        missingTargetFile: false,
        changed,
        replacementCount: targetReplacementCount,
        replacements,
      });
    }
  }

  return {
    dryRun,
    changedFileCount,
    replacedSnippetCount,
    targetReports,
  };
};
