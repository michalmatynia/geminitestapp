const parseCheckIdList = (argv, prefix) => {
  const values = [];

  for (const arg of argv) {
    if (!arg.startsWith(prefix)) {
      continue;
    }

    values.push(...arg.slice(prefix.length).split(','));
  }

  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
};

const validateCheckIds = (ids, availableIds, flagName) => {
  const availableIdSet = new Set(availableIds);
  const unknownIds = ids.filter((id) => !availableIdSet.has(id));

  if (unknownIds.length === 0) {
    return;
  }

  throw new Error(
    `Unknown check IDs for ${flagName}: ${unknownIds.join(', ')}. Available checks: ${availableIds.join(', ')}`
  );
};

export const parseWeeklyCheckSelectionArgs = (argv) => ({
  onlyChecks: parseCheckIdList(argv, '--only-checks='),
  skipChecks: parseCheckIdList(argv, '--skip-checks='),
});

export const applyWeeklyCheckSelection = (checks, selection) => {
  const onlyChecks = Array.isArray(selection?.onlyChecks) ? selection.onlyChecks : [];
  const skipChecks = Array.isArray(selection?.skipChecks) ? selection.skipChecks : [];
  const availableIds = checks.map((check) => check.id);

  validateCheckIds(onlyChecks, availableIds, '--only-checks');
  validateCheckIds(skipChecks, availableIds, '--skip-checks');

  const onlyCheckSet = new Set(onlyChecks);
  const skipCheckSet = new Set(skipChecks);
  const omittedChecks = [];
  const selectedChecks = [];

  const resolvedChecks = checks.map((check) => {
    const baseEnabled = check.enabled ?? true;
    const onlySelected = onlyCheckSet.size === 0 ? baseEnabled : onlyCheckSet.has(check.id);
    const selectionSkipped =
      (onlyCheckSet.size > 0 && !onlyCheckSet.has(check.id)) || skipCheckSet.has(check.id);
    const enabled = onlySelected && !skipCheckSet.has(check.id);

    if (selectionSkipped) {
      omittedChecks.push(check.id);
    }

    if (enabled) {
      selectedChecks.push(check.id);
    }

    return {
      ...check,
      enabled,
      disabledOutput: selectionSkipped
        ? skipCheckSet.has(check.id)
          ? `Skipped by --skip-checks selection (${check.id}).`
          : `Skipped by --only-checks selection (${check.id}).`
        : check.disabledOutput,
    };
  });

  return {
    checks: resolvedChecks,
    selection: {
      onlyChecks,
      skipChecks,
      selectedChecks,
      omittedChecks,
    },
  };
};
