export const PRODUCT_SCAN_STEP_RUNTIME_SOURCE = String.raw`const productScanResolveText = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
const productScanResolveAttempt = (attempt) =>
  typeof attempt === 'number' && Number.isFinite(attempt) && attempt > 0
    ? Math.trunc(attempt)
    : 1;
const productScanResolveStepGroup = (key) => {
  const normalizedKey = productScanResolveText(key);
  if (!normalizedKey) {
    return null;
  }
  return PRODUCT_SCAN_STEP_REGISTRY[normalizedKey]?.group || null;
};
const productScanNormalizeStepDetails = (details) =>
  (Array.isArray(details) ? details : [])
    .map((entry) => {
      const label = productScanResolveText(entry?.label);
      const value = productScanResolveText(entry?.value);
      if (!label) {
        return null;
      }
      return { label, value };
    })
    .filter(Boolean)
    .slice(0, 12);
const mergeStepDetails = (...detailSets) =>
  detailSets.flatMap((details) => productScanNormalizeStepDetails(details));
const buildProductScanSequenceSteps = (input = {}) => {
  const defaultSequenceKey = productScanResolveText(input?.defaultSequenceKey);
  const sequenceKey = productScanResolveText(input?.sequenceKey);
  const customSequence = Array.isArray(input?.customSequence) ? input.customSequence : null;
  const entries =
    customSequence && customSequence.length > 0
      ? customSequence
      : PRODUCT_SCAN_STEP_SEQUENCES[sequenceKey] ||
        PRODUCT_SCAN_STEP_SEQUENCES[defaultSequenceKey] ||
        [];
  return entries
    .map((entry) => {
      const normalizedEntry = typeof entry === 'string' ? { key: entry } : entry;
      const key = productScanResolveText(normalizedEntry?.key);
      if (!key) {
        return null;
      }
      const registryEntry = PRODUCT_SCAN_STEP_REGISTRY[key] || null;
      return {
        key,
        label: productScanResolveText(normalizedEntry?.label) || registryEntry?.label || key,
        group:
          productScanResolveText(normalizedEntry?.group) ||
          registryEntry?.group ||
          productScanResolveStepGroup(key),
        attempt: null,
        candidateId: null,
        candidateRank: null,
        inputSource: null,
        retryOf: null,
        resultCode: null,
        status: 'pending',
        message: null,
        warning: null,
        details: [],
        url: null,
        startedAt: null,
        completedAt: null,
        durationMs: null,
      };
    })
    .filter(Boolean);
};
const productScanResolveStepIdentity = (key, attempt, inputSource, candidateId = null) =>
  String(productScanResolveText(key) || '') +
  '::' +
  String(productScanResolveAttempt(attempt)) +
  '::' +
  String(productScanResolveText(inputSource) || 'none') +
  '::' +
  String(productScanResolveText(candidateId) || 'none');
const productScanIsPendingTemplateStep = (step) =>
  step?.status === 'pending' &&
  !step?.startedAt &&
  !step?.completedAt &&
  !productScanResolveText(step?.message) &&
  !productScanResolveText(step?.warning) &&
  (!Array.isArray(step?.details) || step.details.length === 0) &&
  !productScanResolveText(step?.url) &&
  !productScanResolveText(step?.candidateId) &&
  !productScanResolveText(step?.inputSource) &&
  (!Number.isFinite(step?.candidateRank) || step.candidateRank <= 0);
const seedProductScanStepSequence = (input = {}) => {
  const seededSteps = buildProductScanSequenceSteps(input);
  for (const seededStep of seededSteps) {
    const existingIndex = scanSteps.findIndex(
      (entry) =>
        productScanResolveStepIdentity(
          entry.key,
          entry.attempt,
          entry.inputSource,
          entry.candidateId
        ) ===
        productScanResolveStepIdentity(
          seededStep.key,
          seededStep.attempt,
          seededStep.inputSource,
          seededStep.candidateId
        )
    );
    if (existingIndex < 0) {
      scanSteps.push(seededStep);
    }
  }
  return seededSteps;
};
const upsertScanStep = (input) => {
  const key = productScanResolveText(input?.key);
  const status = productScanResolveText(input?.status);
  const registryEntry = key ? PRODUCT_SCAN_STEP_REGISTRY[key] || null : null;
  const label = productScanResolveText(input?.label) || registryEntry?.label || key;
  if (!key || !label || !status) {
    return null;
  }
  const normalizedStatus =
    status === 'pending' ||
    status === 'running' ||
    status === 'completed' ||
    status === 'failed' ||
    status === 'skipped'
      ? status
      : null;
  if (!normalizedStatus) {
    return null;
  }
  const timestamp = new Date().toISOString();
  const stepUrl = productScanResolveText(input?.url) || productScanResolveText(page.url());
  const stepMessage = productScanResolveText(input?.message);
  const stepAttempt = productScanResolveAttempt(input?.attempt);
  const normalizedInputSource = productScanResolveText(input?.inputSource);
  const normalizedCandidateId = productScanResolveText(input?.candidateId);
  const existingIndex = scanSteps.findIndex(
    (entry) =>
      productScanResolveStepIdentity(
        entry.key,
        entry.attempt,
        entry.inputSource,
        entry.candidateId
      ) ===
      productScanResolveStepIdentity(
        key,
        stepAttempt,
        normalizedInputSource,
        normalizedCandidateId
      )
  );
  const pendingTemplateIndex =
    existingIndex >= 0
      ? -1
      : scanSteps.findIndex(
          (entry) => entry.key === key && productScanIsPendingTemplateStep(entry)
        );
  const existingStep =
    existingIndex >= 0
      ? scanSteps[existingIndex]
      : pendingTemplateIndex >= 0
        ? scanSteps[pendingTemplateIndex]
      : {
          key,
          label,
          group: registryEntry?.group || productScanResolveStepGroup(key),
          attempt: stepAttempt,
          candidateId: normalizedCandidateId,
          candidateRank: null,
          inputSource: null,
          retryOf: null,
          resultCode: null,
          status: 'pending',
          message: null,
          warning: null,
          details: [],
          url: null,
          startedAt: null,
          completedAt: null,
          durationMs: null,
        };
  const startedAt =
    normalizedStatus === 'pending'
      ? existingStep.startedAt
      : existingStep.startedAt || timestamp;
  const completedAt =
    normalizedStatus === 'completed' ||
    normalizedStatus === 'failed' ||
    normalizedStatus === 'skipped'
      ? timestamp
      : null;
  const durationMs =
    startedAt && completedAt
      ? Math.max(0, Date.parse(completedAt) - Date.parse(startedAt))
      : null;
  const nextStep = {
    ...existingStep,
    label,
    group:
      productScanResolveText(input?.group) ||
      existingStep.group ||
      registryEntry?.group ||
      productScanResolveStepGroup(key),
    attempt: stepAttempt,
    candidateId: normalizedCandidateId || existingStep.candidateId || null,
    candidateRank:
      typeof input?.candidateRank === 'number' &&
      Number.isFinite(input.candidateRank) &&
      input.candidateRank > 0
        ? Math.trunc(input.candidateRank)
        : existingStep.candidateRank || null,
    inputSource: normalizedInputSource || existingStep.inputSource || null,
    retryOf: productScanResolveText(input?.retryOf) ?? existingStep.retryOf ?? null,
    resultCode: productScanResolveText(input?.resultCode) ?? existingStep.resultCode ?? null,
    status: normalizedStatus,
    message: stepMessage ?? existingStep.message ?? null,
    warning: productScanResolveText(input?.warning) ?? existingStep.warning ?? null,
    details:
      Array.isArray(input?.details)
        ? productScanNormalizeStepDetails(input.details)
        : existingStep.details || [],
    url: stepUrl ?? existingStep.url ?? null,
    startedAt,
    completedAt,
    durationMs,
  };
  if (existingIndex >= 0) {
    scanSteps[existingIndex] = nextStep;
  } else if (pendingTemplateIndex >= 0) {
    scanSteps[pendingTemplateIndex] = nextStep;
  } else {
    scanSteps.push(nextStep);
  }
  return nextStep;
};`;
