import fs from 'node:fs';
import path from 'node:path';

type ArtifactFileMatchInput = {
  directoryPath: string;
  suffix: string;
  expectedBaseNames: ReadonlySet<string>;
  excludedFileNames?: readonly string[];
};

const toSortedUniqueSet = (values: readonly string[]): Set<string> =>
  new Set(values.filter((value) => value.length > 0));

export const listUnexpectedFilesBySuffix = ({
  directoryPath,
  suffix,
  expectedBaseNames,
  excludedFileNames = [],
}: ArtifactFileMatchInput): string[] => {
  if (!fs.existsSync(directoryPath)) return [];
  if (suffix.length === 0) return [];

  const excludedSet = toSortedUniqueSet(excludedFileNames);
  const unexpectedFileNames = fs.readdirSync(directoryPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => fileName.endsWith(suffix))
    .filter((fileName) => !excludedSet.has(fileName))
    .filter((fileName) => {
      const baseName = fileName.slice(0, -suffix.length);
      return !expectedBaseNames.has(baseName);
    })
    .sort((left, right) => left.localeCompare(right));

  return unexpectedFileNames;
};

export const pruneUnexpectedFilesBySuffix = ({
  directoryPath,
  suffix,
  expectedBaseNames,
  excludedFileNames = [],
}: ArtifactFileMatchInput): string[] => {
  const unexpectedFileNames = listUnexpectedFilesBySuffix({
    directoryPath,
    suffix,
    expectedBaseNames,
    excludedFileNames,
  });

  for (const fileName of unexpectedFileNames) {
    fs.unlinkSync(path.join(directoryPath, fileName));
  }

  return unexpectedFileNames;
};
