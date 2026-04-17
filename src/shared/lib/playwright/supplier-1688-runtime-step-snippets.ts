import type { PlaywrightStepInputBinding } from '@/shared/contracts/playwright-steps';
import { SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY } from '@/shared/lib/browser-execution/supplier-1688-runtime-constants';

export { SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY };

const supplier1688RuntimeStepSnippets: Record<string, string> = {
  validate: [
    'const input = validate1688ProbeInput(runtime.input);',
    'await artifacts.json("1688-probe-input", input);',
  ].join('\n'),
  '1688_validate_input': [
    'const input = validate1688ProbeInput(runtime.input);',
    'await artifacts.json("1688-probe-input", input);',
  ].join('\n'),
  supplier_1688_input_validate: [
    'const input = validate1688ProbeInput(runtime.input);',
    'await artifacts.json("1688-probe-input", input);',
  ].join('\n'),
  '1688_open': [
    'await page.goto(runtime.scanner1688StartUrl, { waitUntil: "domcontentloaded" });',
    'await runtimeSteps.detect1688AccessBarrier({ stage: "1688_open" });',
  ].join('\n'),
  supplier_1688_open_search: [
    'await page.goto(runtime.scanner1688StartUrl, { waitUntil: "domcontentloaded" });',
    'await runtimeSteps.detect1688AccessBarrier({ stage: "1688_open" });',
  ].join('\n'),
  '1688_access_check': [
    'const barrier = await runtimeSteps.detect1688AccessBarrier({',
    '  stage: runtime.stage,',
    '  selectors: selectors.supplier1688.access,',
    '});',
    'if (barrier.blocked) await runtimeSteps.handle1688CaptchaRecovery(barrier);',
  ].join('\n'),
  supplier_1688_access_check: [
    'const barrier = await runtimeSteps.detect1688AccessBarrier({',
    '  stage: runtime.stage,',
    '  selectors: selectors.supplier1688.access,',
    '});',
    'if (barrier.blocked) await runtimeSteps.handle1688CaptchaRecovery(barrier);',
  ].join('\n'),
  '1688_upload': [
    'await runtimeSteps.upload1688Image({',
    '  fileInputs: selectors.supplier1688.imageSearch.fileInputs,',
    '  entryTriggers: selectors.supplier1688.imageSearch.entryTriggers,',
    '  imageCandidates: runtime.imageCandidates,',
    '});',
  ].join('\n'),
  supplier_1688_upload_image: [
    'await runtimeSteps.upload1688Image({',
    '  fileInputs: selectors.supplier1688.imageSearch.fileInputs,',
    '  entryTriggers: selectors.supplier1688.imageSearch.entryTriggers,',
    '  imageCandidates: runtime.imageCandidates,',
    '});',
  ].join('\n'),
  '1688_submit_search': [
    'await page.locator(selectors.supplier1688.imageSearch.submitButtons.join(", ")).first().click();',
    'await page.waitForLoadState("domcontentloaded");',
  ].join('\n'),
  supplier_1688_submit_search: [
    'await page.locator(selectors.supplier1688.imageSearch.submitButtons.join(", ")).first().click();',
    'await page.waitForLoadState("domcontentloaded");',
  ].join('\n'),
  '1688_collect_candidates': [
    'const candidateUrls = await runtimeSteps.collect1688CandidateUrls({',
    '  resultLinks: selectors.supplier1688.imageSearch.resultLinks,',
    '  limit: runtime.candidateResultLimit,',
    '});',
  ].join('\n'),
  supplier_1688_collect_candidates: [
    'const candidateUrls = await runtimeSteps.collect1688CandidateUrls({',
    '  resultLinks: selectors.supplier1688.imageSearch.resultLinks,',
    '  limit: runtime.candidateResultLimit,',
    '});',
  ].join('\n'),
  '1688_probe_candidate': [
    'for (const candidateUrl of runtime.candidateUrls) {',
    '  await runtimeSteps.open1688SupplierCandidate({ candidateUrl });',
    '  await runtimeSteps.waitFor1688SupplierContent({ candidateUrl });',
    '  await runtimeSteps.extract1688SupplierDetails({ candidateUrl });',
    '}',
  ].join('\n'),
  supplier_1688_probe_candidate: [
    'for (const candidateUrl of runtime.candidateUrls) {',
    '  await runtimeSteps.open1688SupplierCandidate({ candidateUrl });',
    '  await runtimeSteps.waitFor1688SupplierContent({ candidateUrl });',
    '  await runtimeSteps.extract1688SupplierDetails({ candidateUrl });',
    '}',
  ].join('\n'),
  supplier_open: [
    'await page.goto(runtime.candidateUrl, { waitUntil: "domcontentloaded" });',
    'await runtimeSteps.detect1688AccessBarrier({ stage: "supplier_open" });',
  ].join('\n'),
  supplier_overlays: [
    'const barrier = await runtimeSteps.detect1688AccessBarrier({',
    '  stage: "supplier_open",',
    '  selectors: selectors.supplier1688.access,',
    '});',
    'if (barrier.blocked) await runtimeSteps.handle1688CaptchaRecovery(barrier);',
  ].join('\n'),
  supplier_content_ready: [
    'await runtimeSteps.waitFor1688SupplierContent({',
    '  readySignals: selectors.supplier1688.supplierPage.readySignals,',
    '  bodySignalPattern: selectors.supplier1688.content.supplierBodySignalPattern,',
    '});',
  ].join('\n'),
  supplier_probe: [
    'const supplierProbe = await runtimeSteps.probe1688SupplierCandidate({',
    '  url: runtime.candidateUrl,',
    '  productName: runtime.productName,',
    '});',
  ].join('\n'),
  '1688_wait_supplier': [
    'await runtimeSteps.waitFor1688SupplierContent({',
    '  readySignals: selectors.supplier1688.supplierPage.readySignals,',
    '  bodySignalPattern: selectors.supplier1688.content.supplierBodySignalPattern,',
    '});',
  ].join('\n'),
  supplier_1688_wait_supplier: [
    'await runtimeSteps.waitFor1688SupplierContent({',
    '  readySignals: selectors.supplier1688.supplierPage.readySignals,',
    '  bodySignalPattern: selectors.supplier1688.content.supplierBodySignalPattern,',
    '});',
  ].join('\n'),
  '1688_extract_details': [
    'const supplierDetails = await runtimeSteps.extract1688SupplierDetails({',
    '  pricePattern: selectors.supplier1688.content.priceTextPattern,',
    '  maxImages: runtime.maxExtractedImages,',
    '});',
  ].join('\n'),
  supplier_1688_extract_details: [
    'const supplierDetails = await runtimeSteps.extract1688SupplierDetails({',
    '  pricePattern: selectors.supplier1688.content.priceTextPattern,',
    '  maxImages: runtime.maxExtractedImages,',
    '});',
  ].join('\n'),
  supplier_extract: [
    'const supplierDetails = await runtimeSteps.extract1688SupplierDetails({',
    '  pricePattern: selectors.supplier1688.content.priceTextPattern,',
    '  maxImages: runtime.maxExtractedImages,',
    '});',
  ].join('\n'),
  '1688_score_candidate': [
    'const candidateScore = runtimeSteps.score1688SupplierCandidate({',
    '  product: runtime.product,',
    '  supplierDetails: runtime.supplierDetails,',
    '});',
  ].join('\n'),
  supplier_1688_score_candidate: [
    'const candidateScore = runtimeSteps.score1688SupplierCandidate({',
    '  product: runtime.product,',
    '  supplierDetails: runtime.supplierDetails,',
    '});',
  ].join('\n'),
  supplier_evaluate: [
    'const candidateScore = runtimeSteps.score1688SupplierCandidate({',
    '  product: runtime.product,',
    '  supplierDetails: runtime.supplierDetails,',
    '});',
    'if (candidateScore < runtime.minimumCandidateScore) continue;',
  ].join('\n'),
  '1688_evaluate_match': [
    'const supplierEvaluation = await runtimeSteps.evaluate1688SupplierMatch({',
    '  product: runtime.product,',
    '  supplierCandidate: runtime.bestCandidate,',
    '  evaluatorConfig: runtime.evaluatorConfig,',
    '});',
  ].join('\n'),
  'supplier_ai_evaluate': [
    'const supplierEvaluation = await runtimeSteps.evaluate1688SupplierMatch({',
    '  product: runtime.product,',
    '  supplierCandidate: runtime.bestCandidate,',
    '  evaluatorConfig: runtime.evaluatorConfig,',
    '});',
  ].join('\n'),
  supplier_1688_evaluate_match: [
    'const supplierEvaluation = await runtimeSteps.evaluate1688SupplierMatch({',
    '  product: runtime.product,',
    '  supplierCandidate: runtime.bestCandidate,',
    '  evaluatorConfig: runtime.evaluatorConfig,',
    '});',
  ].join('\n'),
  '1688_finalize_result': [
    'await runtimeSteps.finalize1688ProbeResult({',
    '  supplierCandidate: runtime.bestCandidate,',
    '  supplierEvaluation: runtime.supplierEvaluation,',
    '  artifacts,',
    '});',
  ].join('\n'),
  supplier_1688_finalize: [
    'await runtimeSteps.finalize1688ProbeResult({',
    '  supplierCandidate: runtime.bestCandidate,',
    '  supplierEvaluation: runtime.supplierEvaluation,',
    '  artifacts,',
    '});',
  ].join('\n'),
};

const supplier1688RuntimeStepSelectorKeys: Record<string, Record<string, string>> = {
  validate: {},
  '1688_open': {
    access: 'supplier1688.access.softBlockingSelectors',
  },
  supplier_1688_open_search: {
    access: 'supplier1688.access.softBlockingSelectors',
  },
  '1688_access_check': {
    hardBlockingSelectors: 'supplier1688.access.hardBlockingSelectors',
    softBlockingSelectors: 'supplier1688.access.softBlockingSelectors',
    loginHints: 'supplier1688.access.loginHints',
    captchaHints: 'supplier1688.access.captchaHints',
    blockHints: 'supplier1688.access.blockHints',
    barrierTitleHints: 'supplier1688.access.barrierTitleHints',
  },
  supplier_1688_access_check: {
    hardBlockingSelectors: 'supplier1688.access.hardBlockingSelectors',
    softBlockingSelectors: 'supplier1688.access.softBlockingSelectors',
    loginHints: 'supplier1688.access.loginHints',
    captchaHints: 'supplier1688.access.captchaHints',
    blockHints: 'supplier1688.access.blockHints',
    barrierTitleHints: 'supplier1688.access.barrierTitleHints',
  },
  '1688_upload': {
    fileInputs: 'supplier1688.imageSearch.fileInputs',
    entryTriggers: 'supplier1688.imageSearch.entryTriggers',
  },
  supplier_1688_upload_image: {
    fileInputs: 'supplier1688.imageSearch.fileInputs',
    entryTriggers: 'supplier1688.imageSearch.entryTriggers',
  },
  '1688_submit_search': {
    submitButtons: 'supplier1688.imageSearch.submitButtons',
  },
  supplier_1688_submit_search: {
    submitButtons: 'supplier1688.imageSearch.submitButtons',
  },
  '1688_collect_candidates': {
    resultLinks: 'supplier1688.imageSearch.resultLinks',
    searchBodySignalPattern: 'supplier1688.content.searchBodySignalPattern',
  },
  supplier_1688_collect_candidates: {
    resultLinks: 'supplier1688.imageSearch.resultLinks',
    searchBodySignalPattern: 'supplier1688.content.searchBodySignalPattern',
  },
  supplier_open: {
    softBlockingSelectors: 'supplier1688.access.softBlockingSelectors',
  },
  supplier_overlays: {
    hardBlockingSelectors: 'supplier1688.access.hardBlockingSelectors',
    softBlockingSelectors: 'supplier1688.access.softBlockingSelectors',
    loginHints: 'supplier1688.access.loginHints',
    captchaHints: 'supplier1688.access.captchaHints',
    blockHints: 'supplier1688.access.blockHints',
    barrierTitleHints: 'supplier1688.access.barrierTitleHints',
  },
  supplier_content_ready: {
    readySignals: 'supplier1688.supplierPage.readySignals',
    supplierBodySignalPattern: 'supplier1688.content.supplierBodySignalPattern',
  },
  supplier_probe: {
    readySignals: 'supplier1688.supplierPage.readySignals',
  },
  '1688_wait_supplier': {
    readySignals: 'supplier1688.supplierPage.readySignals',
    supplierBodySignalPattern: 'supplier1688.content.supplierBodySignalPattern',
  },
  supplier_1688_wait_supplier: {
    readySignals: 'supplier1688.supplierPage.readySignals',
    supplierBodySignalPattern: 'supplier1688.content.supplierBodySignalPattern',
  },
  '1688_extract_details': {
    readySignals: 'supplier1688.supplierPage.readySignals',
    priceTextPattern: 'supplier1688.content.priceTextPattern',
  },
  supplier_1688_extract_details: {
    readySignals: 'supplier1688.supplierPage.readySignals',
    priceTextPattern: 'supplier1688.content.priceTextPattern',
  },
  supplier_extract: {
    readySignals: 'supplier1688.supplierPage.readySignals',
    priceTextPattern: 'supplier1688.content.priceTextPattern',
  },
  supplier_evaluate: {
    priceTextPattern: 'supplier1688.content.priceTextPattern',
  },
};

export const getSupplier1688RuntimeStepSemanticSnippet = (
  stepId: string | null | undefined
): string | null => {
  if (!stepId) return null;
  return supplier1688RuntimeStepSnippets[stepId] ?? null;
};

export const getSupplier1688RuntimeStepSelectorKeys = (
  stepId: string | null | undefined
): string[] => {
  if (!stepId) return [];
  return Object.values(supplier1688RuntimeStepSelectorKeys[stepId] ?? {});
};

export const getSupplier1688RuntimeStepInputBindings = (
  stepId: string | null | undefined,
  selectorProfile = '1688'
): Record<string, PlaywrightStepInputBinding> | undefined => {
  if (!stepId) return undefined;
  const selectorKeys = supplier1688RuntimeStepSelectorKeys[stepId];
  if (!selectorKeys) return undefined;

  return Object.fromEntries(
    Object.entries(selectorKeys).map(([field, selectorKey]) => [
      field,
      {
        mode: 'selectorRegistry',
        field,
        selectorKey,
        selectorProfile,
        fallbackSelector: null,
      } satisfies PlaywrightStepInputBinding,
    ])
  );
};

export const createRuntimeStepSemanticSnippet = (
  stepId: string | null | undefined
): string | null => {
  const supplier1688Snippet = getSupplier1688RuntimeStepSemanticSnippet(stepId);
  if (supplier1688Snippet) return supplier1688Snippet;
  return stepId ? `await runtimeSteps[${JSON.stringify(stepId)}](context);` : null;
};
