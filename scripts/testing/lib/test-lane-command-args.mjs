const dedupeArgs = (values) => {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }

  return result;
};

export const buildTestingLaneCommandArgs = (
  suite,
  {
    noWrite = false,
    shouldWriteHistory = false,
  } = {}
) => {
  if (!suite?.supportsSummaryJson) {
    return Array.isArray(suite?.command) ? [...suite.command] : [];
  }

  const summaryArgs = dedupeArgs([
    '--summary-json',
    ...(Array.isArray(suite.summaryJsonArgs) ? suite.summaryJsonArgs : []),
    ...(noWrite ? ['--no-write'] : []),
    ...(shouldWriteHistory ? ['--write-history'] : ['--no-history']),
  ]);

  if (suite.command[0] === 'npm' && suite.command[1] === 'run') {
    return [...suite.command, '--', ...summaryArgs];
  }

  return [...suite.command, ...summaryArgs];
};
