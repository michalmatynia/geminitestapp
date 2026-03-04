import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_LEGACY_PRUNE_MANIFEST_RELATIVE_PATH =
  'scripts/ai-paths/legacy-prune-manifest.json';

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
  const file =
    typeof target.file === 'string' && target.file.trim().length > 0 ? target.file.trim() : null;
  if (!file) {
    throw new Error(`rules[${index}] (${ruleId}) target.file must be a non-empty string`);
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

  return {
    file,
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
      const absolutePath = path.join(root, target.file);
      if (!fs.existsSync(absolutePath)) {
        targetReports.push({
          ruleId: rule.id,
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
