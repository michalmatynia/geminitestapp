export const summarizeWeeklyChecks = (checks, checkSelection = null) => {
  const checkList = Array.isArray(checks) ? checks : [];
  const omittedCheckSet = new Set(checkSelection?.omittedChecks ?? []);

  const passed = checkList.filter((check) => check?.status === 'pass').length;
  const failed = checkList.filter((check) => check?.status === 'fail').length;
  const timedOut = checkList.filter((check) => check?.status === 'timeout').length;
  const skippedChecks = checkList.filter((check) => check?.status === 'skipped');
  const skipped = skippedChecks.length;
  const selectionSkipped = skippedChecks.filter((check) => omittedCheckSet.has(check.id)).length;

  return {
    totalChecks: checkList.length,
    executedChecks: checkList.length - skipped,
    passed,
    failed,
    timedOut,
    skipped,
    selectionSkipped,
    otherSkipped: skipped - selectionSkipped,
  };
};
