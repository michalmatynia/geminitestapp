import type { PlaywrightStepInputBinding } from '@/shared/contracts/playwright-steps';

import {
  getSupplier1688RuntimeStepInputBindings,
  getSupplier1688RuntimeStepSelectorKeys,
  getSupplier1688RuntimeStepSemanticSnippet,
} from '@/shared/lib/playwright/supplier-1688-runtime-step-snippets';

const amazonRuntimeStepSnippets: Record<string, string> = {
  validate: [
    'const scanInput = validateAmazonScanInput(input);',
    'await artifacts.json("amazon-scan-input", scanInput);',
  ].join('\n'),
  prepare_scan: [
    'const scanContext = await runtimeSteps.prepareAmazonScanContext({',
    '  product: runtime.product,',
    '  imageCandidates: runtime.imageCandidates,',
    '});',
  ].join('\n'),
  queue_scan: [
    'await runtimeSteps.queueAmazonCandidateFollowup({',
    '  candidate: runtime.bestCandidate,',
    '  sequenceKey: runtime.nextSequenceKey,',
    '});',
  ].join('\n'),
  product_asin_update: [
    'await runtimeSteps.updateProductAsin({',
    '  productId: runtime.productId,',
    '  asin: runtime.bestCandidate?.asin ?? null,',
    '});',
  ].join('\n'),
  google_lens_open: [
    'await page.goto(runtime.googleLensStartUrl, { waitUntil: "domcontentloaded" });',
    'await runtimeSteps.acceptGoogleConsentIfNeeded({',
    '  entryTriggers: selectors.googleLens.entryTriggers,',
    '  acceptControls: selectors.googleConsent.acceptControls,',
    '});',
  ].join('\n'),
  google_upload: [
    'await runtimeSteps.uploadGoogleLensImage({',
    '  fileInputs: selectors.googleLens.fileInputs,',
    '  entryTriggers: selectors.googleLens.entryTriggers,',
    '  uploadTabs: selectors.googleLens.uploadTabs,',
    '  imageCandidates: runtime.imageCandidates,',
    '});',
  ].join('\n'),
  google_captcha: [
    'const captchaState = await runtimeSteps.detectGoogleLensCaptcha({',
    '  processingIndicators: selectors.googleLens.processingIndicators,',
    '  processingTextHints: selectors.googleLens.processingTextHints,',
    '});',
    'if (captchaState.blocked) await runtimeSteps.awaitGoogleLensManualVerification(captchaState);',
  ].join('\n'),
  google_candidates: [
    'const amazonCandidates = await runtimeSteps.collectGoogleLensAmazonCandidates({',
    '  resultHints: selectors.googleLens.resultHints,',
    '  resultShells: selectors.googleLens.resultShells,',
    '  candidateHints: selectors.googleLens.candidateHints,',
    '  limit: runtime.candidateResultLimit,',
    '});',
  ].join('\n'),
  amazon_open: [
    'await page.goto(runtime.candidateUrl, { waitUntil: "domcontentloaded" });',
    'await runtimeSteps.resolveAmazonRedirectInterstitial({',
    '  proceedSelectors: selectors.googleRedirect.proceedSelectors,',
    '});',
  ].join('\n'),
  amazon_overlays: [
    'await runtimeSteps.dismissAmazonOverlays({',
    '  cookieAccept: selectors.amazon.cookieAccept,',
    '  cookieDismiss: selectors.amazon.cookieDismiss,',
    '  addressDismiss: selectors.amazon.addressDismiss,',
    '});',
  ].join('\n'),
  amazon_content_ready: [
    'await runtimeSteps.waitForAmazonProductContent({',
    '  readySignals: selectors.amazon.productContent,',
    '});',
  ].join('\n'),
  amazon_probe: [
    'const probe = await runtimeSteps.probeAmazonCandidate({',
    '  titleSelectors: selectors.amazon.title,',
    '  priceSelectors: selectors.amazon.price,',
    '});',
  ].join('\n'),
  amazon_extract: [
    'const details = await runtimeSteps.extractAmazonDetails({',
    '  titleSelectors: selectors.amazon.title,',
    '  priceSelectors: selectors.amazon.price,',
    '  descriptionSelectors: selectors.amazon.description,',
    '  heroImageSelectors: selectors.amazon.heroImage,',
    '});',
  ].join('\n'),
  amazon_ai_triage: [
    'const triage = await runtimeSteps.triageAmazonCandidates({',
    '  candidates: runtime.candidates,',
    '  evaluatorConfig: runtime.triageEvaluatorConfig,',
    '});',
  ].join('\n'),
  amazon_ai_evaluate: [
    'const evaluation = await runtimeSteps.evaluateAmazonCandidateMatch({',
    '  product: runtime.product,',
    '  candidate: runtime.bestCandidate,',
    '  evaluatorConfig: runtime.extractionEvaluatorConfig,',
    '});',
  ].join('\n'),
};

const amazonRuntimeStepSelectorKeys: Record<string, Record<string, string>> = {
  validate: {},
  prepare_scan: {},
  queue_scan: {},
  product_asin_update: {},
  google_lens_open: {
    entryTriggers: 'amazon.googleLens.entryTriggers',
    acceptControls: 'amazon.googleConsent.acceptControls',
    proceedSelectors: 'amazon.googleRedirect.proceedSelectors',
  },
  google_upload: {
    fileInputs: 'amazon.googleLens.fileInputs',
    entryTriggers: 'amazon.googleLens.entryTriggers',
    uploadTabs: 'amazon.googleLens.uploadTabs',
  },
  google_captcha: {
    processingIndicators: 'amazon.googleLens.processingIndicators',
    processingTextHints: 'amazon.googleLens.processingTextHints',
    resultTextHints: 'amazon.googleLens.resultTextHints',
  },
  google_candidates: {
    resultHints: 'amazon.googleLens.resultHints',
    resultShells: 'amazon.googleLens.resultShells',
    candidateHints: 'amazon.googleLens.candidateHints',
  },
  amazon_open: {
    proceedSelectors: 'amazon.googleRedirect.proceedSelectors',
  },
  amazon_overlays: {
    cookieAccept: 'amazon.cookie.accept',
    cookieDismiss: 'amazon.cookie.dismiss',
    addressDismiss: 'amazon.address.dismiss',
  },
  amazon_content_ready: {
    readySignals: 'amazon.product.content',
  },
  amazon_probe: {
    titleSelectors: 'amazon.product.title',
    priceSelectors: 'amazon.product.price',
  },
  amazon_extract: {
    titleSelectors: 'amazon.product.title',
    priceSelectors: 'amazon.product.price',
    descriptionSelectors: 'amazon.product.description',
    heroImageSelectors: 'amazon.product.heroImage',
  },
  amazon_ai_triage: {},
  amazon_ai_evaluate: {},
};

const inferRuntimeStepSelectorProfile = (stepId: string | null | undefined): string | null => {
  if (!stepId) return null;
  if (stepId in amazonRuntimeStepSelectorKeys) return 'amazon';
  if (
    stepId.startsWith('supplier_1688_') ||
    stepId.startsWith('1688_') ||
    stepId.startsWith('supplier_')
  ) {
    return '1688';
  }
  return null;
};

export const getRuntimeStepSemanticSnippet = (
  stepId: string | null | undefined
): string | null => {
  if (!stepId) return null;
  const supplier1688Snippet = getSupplier1688RuntimeStepSemanticSnippet(stepId);
  if (supplier1688Snippet) return supplier1688Snippet;
  return amazonRuntimeStepSnippets[stepId] ?? null;
};

export const getRuntimeStepSelectorKeys = (
  stepId: string | null | undefined
): string[] => {
  if (!stepId) return [];
  const amazonSelectorKeys = amazonRuntimeStepSelectorKeys[stepId];
  if (amazonSelectorKeys) {
    return Object.values(amazonSelectorKeys);
  }
  return getSupplier1688RuntimeStepSelectorKeys(stepId);
};

export const getRuntimeStepInputBindings = (
  stepId: string | null | undefined,
  selectorProfile?: string | null
): Record<string, PlaywrightStepInputBinding> | undefined => {
  if (!stepId) return undefined;

  const amazonSelectorKeys = amazonRuntimeStepSelectorKeys[stepId];
  if (amazonSelectorKeys) {
    const effectiveSelectorProfile =
      selectorProfile?.trim() || inferRuntimeStepSelectorProfile(stepId) || 'amazon';
    return Object.fromEntries(
      Object.entries(amazonSelectorKeys).map(([field, selectorKey]) => [
        field,
        {
          mode: 'selectorRegistry',
          selectorNamespace: 'amazon',
          selectorKey,
          selectorProfile: effectiveSelectorProfile,
          fallbackSelector: null,
        } satisfies PlaywrightStepInputBinding,
      ])
    );
  }

  return getSupplier1688RuntimeStepInputBindings(
    stepId,
    selectorProfile?.trim() || inferRuntimeStepSelectorProfile(stepId) || '1688'
  );
};

export const createRuntimeStepSemanticSnippet = (
  stepId: string | null | undefined
): string | null => {
  const snippet = getRuntimeStepSemanticSnippet(stepId);
  if (snippet) return snippet;
  return stepId ? `await runtimeSteps[${JSON.stringify(stepId)}](context);` : null;
};
