import { describe, expect, it } from 'vitest';

import { AMAZON_REVERSE_IMAGE_SCAN_RUNTIME } from './product-scan-amazon-runtime';
import { validatePlaywrightNodeScript } from '@/features/ai/ai-paths/services/playwright-node-runner.parser';

describe('product-scan-amazon-runtime', () => {
  it('handles Google consent on both upload flows', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'button:has-text("Accept all cookies")'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "const GOOGLE_CONSENT_CONTROL_SELECTOR ="
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "const listGoogleConsentFrames = async () => {"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "const findGoogleConsentAcceptControl = async (frame) => {"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'button:has-text("Zaakceptuj")'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "page.frames()"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "window.getComputedStyle(element)"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "log('amazon.scan.google_consent_accepted', {"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const openGoogleLensForUpload = async ({'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "const imageSearchProvider = resolveAmazonImageSearchProvider(input?.imageSearchProvider);"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "return 'google_images_upload';"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "https://images.google.com/?hl=en"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "https://lens.google.com/?hl=en"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "'https://www.google.com/searchbyimage?image_url=' +"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'&hl=en'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('await clickGoogleConsentIfPresent();');
  });

  it('supports additional Amazon ASIN extraction and canonical URL normalization fallbacks', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('\\/GP\\/AW\\/D\\/');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("locator('[data-asin]')");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('const toAbsoluteUrl = (value, baseUrl) => {');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const canonicalUrl = toAbsoluteUrl(canonicalHref, currentUrl) || currentUrl;'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('document.documentElement?.lang');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('marketplaceDomain');
  });

  it('collects candidate links from generic anchors so Google redirect URLs can resolve to Amazon', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("locator('a[href]')");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("const isGoogleRedirectHost = (host) => {");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("const googleIndex = hostParts.lastIndexOf('google');");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("normalizedHost === 'googleadservices.com'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("normalizedHost.endsWith('.googleusercontent.com')");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("parsed.searchParams.get('adurl')");
  });

  it('prioritizes Amazon product-like links ahead of generic marketplace links', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('const rankAmazonCandidateUrl = (value) => {');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('const scoreAmazonCandidateUrl = (value) => {');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('/\\/(?:dp|gp\\/product|gp\\/aw\\/d|product)\\//i');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const readGoogleLensAmazonCandidates = async () => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('right.score - left.score');
  });

  it('drops obvious non-product Amazon destinations before candidate ranking', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("const blockedPathPrefixes = [");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'/ap/',");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'/gp/help',");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'/gp/cart',");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'/hz/',");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'/stores',");
  });

  it('only accepts real Amazon hostnames and strips query strings from product URLs with ASINs', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("const hostParts = host.split('.').filter(Boolean);");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("const amazonIndex = hostParts.lastIndexOf('amazon');");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('amazonSuffixParts.length <= 2');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("/^[a-z]{2,3}$/i.test(part)");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('if (extractAsin(parsed.toString())) {');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("parsed.search = '';");
  });

  it('normalizes Amazon-hosted redirect wrappers to their underlying product URLs', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("parsed.searchParams.get('url') ||");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("parsed.searchParams.get('u') ||");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("parsed.searchParams.get('redirectUrl')");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "return normalizeAmazonUrl(new URL(redirectedAmazonUrl, parsed.origin).toString());"
    );
  });

  it('continues past a broken Amazon candidate instead of failing the whole scan immediately', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('let attemptedAmazonCandidateCount = 0;');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('let openedAmazonCandidateCount = 0;');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('let lastAmazonCandidateError = null;');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "log('amazon.scan.amazon_candidate_failed', {"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('openedAmazonCandidateCount === 0');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("stage: 'amazon_extract'");
  });

  it('keeps the best no-match Amazon page data instead of returning an empty generic result', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const scoreAmazonPageData = (result) =>'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('let bestNoMatchResult = null;');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('let bestNoMatchCandidateUrls = [];');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('scoreAmazonPageData(extracted)');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('await emitResult({');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('candidateUrls: bestNoMatchCandidateUrls');
  });

  it('returns a real failure when every image candidate upload/search attempt fails', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('let uploadedCandidateCount = 0;');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('let lastUploadError = null;');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "error: 'Product image candidate did not include a filepath or URL.'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "log('amazon.scan.image_candidate_failed', {"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('uploadedCandidateCount === 0 && lastUploadError');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("stage: 'google_upload'");
  });

  it('verifies that Google Lens actually received a non-empty file before treating upload as successful', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const buildGoogleUploadResult = (input = {}) => ({'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'captchaEncountered: input.captchaEncountered === true,'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const readSelectedGoogleLensFileState = async (inputLocator) => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const GOOGLE_LENS_PROCESSING_INDICATOR_SELECTORS = ['
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const GOOGLE_LENS_PROCESSING_TEXT_HINTS = ['
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const GOOGLE_LENS_RESULT_TEXT_HINTS = ['
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const GOOGLE_LENS_RESULT_SHELL_SELECTORS = ['
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const findGoogleLensProcessingText = async () => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const findGoogleLensResultText = async () => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const readGoogleLensProcessingState = async () => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const waitForGoogleLensResultState = async (startingUrl, inputLocator = null, stepMeta = null) => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const GOOGLE_LENS_RESULT_HINT_SELECTORS = ['
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'isGoogleLensUploadAdvancedUrl(startingUrl, currentUrl)'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const verifyGoogleLensFileUploadAccepted = async (inputLocator, startingUrl, stepMeta = null) => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "reason: 'file_selected'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "resultCode: 'upload_processing'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "key: 'google_upload'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const GOOGLE_LENS_ENTRY_TRIGGER_SELECTORS = ['
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const GOOGLE_LENS_UPLOAD_TAB_SELECTORS = ['
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const describeGoogleLensUploadEntryState = async () => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const resolveGoogleLensUploadEntryFailure = (entryState) => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const consentFrames = await listGoogleConsentFrames().catch(() => []);'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'consentPresent'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'consentFrameUrl'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "resultCode: 'google_consent_blocking'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'Google consent dialog stayed open and blocked access to Google Lens upload.'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const buildGoogleUploadArtifactKey = (stage, candidateId, candidateAttempt) => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const captureGoogleUploadArtifacts = async (stage, candidateId, candidateAttempt) => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const GOOGLE_LENS_FILE_INPUT_SELECTORS = ['
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const listGoogleLensSearchScopes = () => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const resolveGoogleLensFileInput = async () => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'frameUrl: scope.frameUrl'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "label: 'File input selector'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "label: 'Artifact key'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "resultCode: 'file_attach_failed'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "log('amazon.scan.google_upload_attach_failed', {"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const waitForGoogleLensFileInput = async () => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'await clickFirstVisible(GOOGLE_LENS_ENTRY_TRIGGER_SELECTORS).catch(() => undefined);'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'await clickFirstVisible(GOOGLE_LENS_UPLOAD_TAB_SELECTORS).catch(() => undefined);'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const entryState = ready ? null : await describeGoogleLensUploadEntryState();'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "host === 'lens.google.com' && pathname.startsWith('/upload')"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const selectionConfirmed ='
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'if (selectionConfirmed) {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'Google Lens did not receive a usable image file upload.'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "reason: 'file_selected'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'Google Lens accepted the image and is still processing it.'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'Google Lens accepted the image and is still processing it.'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'Google Lens accepted the image URL but stayed in the upload processing state without producing results.'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'Google Lens file upload entry did not become available.'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'Google reverse image search entry flow did not match the expected Google Images UI.'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "resultCode: 'lens_upload_entry_missing'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "resultCode: 'lens_ui_variant_unknown'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "log('amazon.scan.google_upload_entry_missing', {"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "const isGoogleImagesUploadEntryUrl = (value) => {"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "if (!isGoogleImagesUploadEntryUrl(currentUrl)) {"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "? 'lens_result_page_not_ready'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "reason: 'results_shell_visible'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "'button[aria-label*=\"Edit visual search\"]'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'main h2'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'visual matches'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'search results'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "label: 'Consent present'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "label: 'Consent frame'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "log('amazon.scan.google_upload_empty', {"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("stage: 'google_upload_empty'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "const uploadNeverReachedResults ="
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "? 'lens_result_page_not_ready'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "label: 'Processing text'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "label: 'Result shell selector'"
    );
  });

  it('verifies that Google Lens advanced after URL submission instead of assuming upload-by-URL succeeded', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const verifyGoogleLensUrlSubmissionAccepted = async (startingUrl, stepMeta = null) => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'Google Lens did not advance after receiving the image URL.'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "await page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => undefined);"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("resultCode: 'url_submit_not_advanced'");
  });

  it('routes into explicit provider-specific Google upload strategies', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const uploadImageCandidateByUrl = async ('
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const uploadImageCandidateFromFile = async ('
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "if (imageSearchProvider === 'google_images_url') {"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "provider_requires_image_url"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "provider_requires_local_file"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "{ label: 'Image search provider', value: imageSearchProviderLabel }"
    );
  });

  it('keeps provider choice deterministic instead of silently cross-falling back between Google modes', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const canUseGoogleReverseImageUrl = (value) => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "if (imageSearchProvider === 'google_images_url') {"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).not.toContain(
      "log('amazon.scan.google_upload_fallback_to_file', {"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).not.toContain(
      "log('amazon.scan.google_upload_fallback_to_url', {"
    );
  });

  it('records retained Google Lens candidate details for the scan timeline', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const readGoogleLensAmazonCandidates = async () => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const GOOGLE_LENS_CANDIDATE_HINT_SELECTORS = ['
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'Retained candidates'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'Strong candidates'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'Top candidate score'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'Top ASIN'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('retainedCandidates[0]?.asin');
  });

  it('waits on Google Lens candidate hints instead of sleeping a fixed second between collection passes', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const waitForGoogleLensCandidateHints = async (timeoutMs = 700) => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const describeGoogleLensCandidateCollectionState = async () => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const processingState = await readGoogleLensProcessingState();'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'#search a[href]'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'#rso a[href]'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'div.g a[href]'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'[data-lpage]'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "await locator.waitFor({ state: 'visible', timeout: timeoutMs });"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "page.waitForLoadState('networkidle', { timeout: timeoutMs })"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'await waitForGoogleLensCandidateHints();'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('let deadline = Date.now() + 25000;');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "resultCode: processingState.processingVisible"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "? 'upload_processing'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      ": 'candidate_collect_waiting'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'Google Lens kept showing upload progress without usable results.'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "resultCode: timedOutWhileProcessing"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "? 'upload_processing_timeout'"
    );
  });

  it('detects Google Lens captcha pages and supports manual verification waiting', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const allowManualVerification = input?.allowManualVerification === true;'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const manualVerificationTimeoutMs ='
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const CAPTCHA_STABLE_CLEAR_WINDOW_MS = 10000;'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "const detectGoogleLensCaptcha = async () => {"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const readGoogleLensPostCaptchaReadyState = async (stage) => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'for (const scope of listGoogleLensSearchScopes())'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'unusual traffic'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'iframe[src*=\"recaptcha\"]'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("status: 'captcha_required'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("resultCode: 'captcha_stabilizing'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("resultCode: 'captcha_resolved'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('captchaEncountered: true,');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'Captcha challenge looks partially resolved. Waiting for Google Lens to become ready.'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('let lastCaptchaDetectedAt = Date.now();');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'timeSinceLastCaptchaDetection < CAPTCHA_STABLE_CLEAR_WINDOW_MS'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('let stableReadyCount = 0;');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('if (stableReadyCount < 3)');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("label: 'Ready reason'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'Solve it in the opened browser window and the scan will continue automatically.'
    );
  });

  it('fails closed after any Google captcha encounter instead of advancing to another upload candidate', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('let googleCaptchaEncountered = false;');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'googleCaptchaEncountered || uploadResult.captchaEncountered === true'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'googleCaptchaEncountered || amazonCandidateResult.captchaEncountered === true'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'if (googleCaptchaEncountered) {'
    );
  });

  it('fails closed when Google Lens remains stuck in upload processing instead of cycling through more candidates', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'retryRecommended:\n          !uploadTimedOutWhileProcessing &&\n          !uploadNeverReachedResults &&'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "uploadResult.failureCode === 'upload_processing_timeout' ||"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "uploadResult.failureCode === 'lens_result_page_not_ready'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "stage: 'google_upload'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "amazonCandidateResult.failureCode === 'upload_processing_timeout'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "amazonCandidateResult.failureCode === 'lens_result_page_not_ready'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "stage: 'google_candidates'"
    );
  });

  it('tracks scan steps per image candidate instead of overwriting repeated Google upload attempts', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "const productScanResolveStepIdentity = (key, attempt, inputSource, candidateId = null) =>"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('productScanResolveStepIdentity(');
  });

  it('dismisses Amazon cookie and delivery overlays before extraction', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const dismissAmazonOverlaysIfPresent = async () => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const AMAZON_PRODUCT_CONTENT_SELECTORS = ['
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const readVisibleBodyText = async () =>'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'#productTitle'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'input[name=\"ASIN\"]'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'#dp-container'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'#sp-cc-accept'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'button[data-action=\"sp-cc-accept\"]'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'button:has-text(\"Accept\")'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'#glow-toaster button:has-text(\"Dismiss\")'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      `"we're showing you items that dispatch to poland"`
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "'select your cookie preferences'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('return node.innerText;');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('await locator.scrollIntoViewIfNeeded()');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('element.click();');
  });

  it('does not treat the delivery banner as blocking when Amazon product content is already visible', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('productContentReady');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      '(!state.addressVisible || state.productContentReady)'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      '(!finalState.addressVisible || finalState.productContentReady)'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "Amazon page remained blocked before product content became available."
    );
  });

  it('waits briefly for Amazon product content after overlays clear', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const waitForAmazonProductContent = async () => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const productContentReady = await waitForAmazonProductContent();'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('Promise.any(');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('AMAZON_PRODUCT_CONTENT_SELECTORS.map');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "await locator.waitFor({ state: 'visible', timeout: 10000 });"
    );
  });

  it('treats missing Amazon product content as an extraction failure instead of no_match', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('if (!productContentReady) {');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "Amazon product content did not become available after overlays were cleared."
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("stage: 'amazon_content_unavailable'");
  });

  it('treats persistent Amazon overlays as a candidate-level extraction failure', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const clearAmazonCandidateOverlays = async ({'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("stage: 'amazon_overlay_blocked'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "Amazon page remained blocked by overlays."
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "log('amazon.scan.amazon_overlay_blocked', {"
    );
  });

  it('normalizes Amazon candidate phases behind shared helpers with explicit failure codes', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const buildAmazonCandidateOutcome = (input = {}) => ({'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const buildAmazonPhaseResult = (input = {}) => ({'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const openAmazonCandidatePage = async ({'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const clearAmazonCandidateOverlays = async ({'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const ensureAmazonCandidateContentReady = async ({'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const extractAmazonProductFromPage = async ({'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("resultCode: 'candidate_open_failed'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("resultCode: 'extract_failed'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "const openResult = await openAmazonCandidatePage({"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "const overlayResult = await clearAmazonCandidateOverlays({"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "const contentReadyResult = await ensureAmazonCandidateContentReady({"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'return await extractAmazonProductFromPage({'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);"
    );
  });

  it('captures dedicated Amazon probe artifacts before detailed extraction', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "key: 'amazon_probe'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "await page.evaluate(() => document.documentElement?.lang || null).catch(() => null)"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "return new URL(canonicalUrl || currentUrl).hostname.toLowerCase();"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'amazon-scan-probe'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("const heroArtifactKey = artifactKey + '-hero';");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('artifacts.file(heroArtifactKey, value, {');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("heroImageArtifactName = toText(heroArtifactPath?.split('/').pop());");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "await artifacts.screenshot(artifactKey).catch(() => undefined);"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "await artifacts.html(artifactKey).catch(() => undefined);"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('artifactKey,');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('heroImageArtifactName,');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('descriptionSnippet');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('bulletPoints');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("{ label: 'Hero image artifact', value: heroImageArtifactName }");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("{ label: 'Artifact key', value: artifactKey }");
  });

  it('can stop after probe collection for AI evaluation before detailed extraction', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("input?.probeOnlyOnAmazonMatch === true");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("status: 'probe_ready'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "message: 'Collected Amazon candidate evidence for AI evaluation.'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("stage: 'amazon_probe'");
  });

  it('supports a direct Amazon candidate extraction mode that skips Google Lens', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const directAmazonCandidateUrl = toText(input?.directAmazonCandidateUrl);'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const directAmazonCandidateUrls = Array.isArray(input?.directAmazonCandidateUrls)'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const skipAmazonProbe = input?.skipAmazonProbe === true;'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'if (directAmazonCandidateUrl) {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const extracted = await extractAmazonPageData('
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'directAmazonCandidateUrl,'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'candidateUrls: directCandidateUrls,'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "resultCode: 'probe_reused'"
    );
  });

  it('keeps searching past weak Amazon matches and exits early on strong ones', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const scoreAmazonMatchResult = (result) => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const isStrongAmazonMatch = (result) =>'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('let bestMatchedResult = null;');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('let bestMatchedCandidateUrls = [];');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('if (isStrongAmazonMatch(extracted)) {');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'scoreAmazonMatchResult(extracted) > scoreAmazonMatchResult(bestMatchedResult)'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'candidateUrls: bestMatchedCandidateUrls'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      "await artifacts.screenshot('amazon-scan-match').catch(() => undefined);"
    );
  });

  it('emits structured scan steps and running progress snapshots', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('const scanSteps = [];');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('const PRODUCT_SCAN_STEP_REGISTRY =');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('seedProductScanStepSequence({');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('const hasDirectAmazonCandidateInput =');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'amazon_candidate_extraction'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'amazon_google_lens_candidate_search'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'amazon_reverse_image_scan'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('const upsertScanStep = (input) => {');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("steps: scanSteps.map((step) => ({ ...step }))");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("status: 'running'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("key: 'validate'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("key: 'google_upload'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("key: 'google_candidates'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("key: 'amazon_overlays'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("key: 'amazon_extract'");
  });

  it('extracts structured Amazon product details from spec tables, bullets, and ranking sections', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('const readAmazonAttributePairs = async () =>');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('const readAmazonBulletPoints = async () =>');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('const buildAmazonDetails = async () => {');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("collectTableRows('#productDetails_techSpec_section_1 tr'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("collectTableRows('#productOverview_feature_div tr'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("collectDetailBulletPairs('#detailBullets_feature_div li'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'Best Sellers Rank'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'Manufacturer Part Number'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'Product Dimensions'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain("'EAN / GTIN'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const amazonDetails = await buildAmazonDetails();'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('amazonDetails,');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain(
      'const attributes = await readAmazonAttributePairs();'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('attributes,');
    expect(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME).toContain('rankings: parseAmazonRankings(bestSellersRank)');
  });

  it('passes Playwright script validation', () => {
    const validation = validatePlaywrightNodeScript(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME);

    expect(validation.ok).toBe(true);
  });
});
