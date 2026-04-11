import { describe, expect, it } from 'vitest';

import { AMAZON_REVERSE_IMAGE_SCAN_SCRIPT } from './product-scan-amazon-script';

describe('product-scan-amazon-script', () => {
  it('handles Google consent on both upload flows', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      'button:has-text("Accept all cookies")'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      "await page.goto('https://lens.google.com/',"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      "await page.goto('https://lens.google.com/uploadbyurl?url=' + encodeURIComponent(imageUrl),"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('await clickGoogleConsentIfPresent();');
  });

  it('supports additional Amazon ASIN extraction and canonical URL normalization fallbacks', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('\\/GP\\/AW\\/D\\/');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("locator('[data-asin]')");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('const toAbsoluteUrl = (value, baseUrl) => {');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      'const canonicalUrl = toAbsoluteUrl(canonicalHref, currentUrl) || currentUrl;'
    );
  });

  it('collects candidate links from generic anchors so Google redirect URLs can resolve to Amazon', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("locator('a[href]')");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("const isGoogleRedirectHost = (host) => {");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("const googleIndex = hostParts.lastIndexOf('google');");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("normalizedHost === 'googleadservices.com'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("normalizedHost.endsWith('.googleusercontent.com')");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("parsed.searchParams.get('adurl')");
  });

  it('prioritizes Amazon product-like links ahead of generic marketplace links', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('const rankAmazonCandidateUrl = (value) => {');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('/\\/(?:dp|gp\\/product|gp\\/aw\\/d|product)\\//i');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('const sortedCandidates = [...candidates].sort(');
  });

  it('drops obvious non-product Amazon destinations before candidate ranking', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("const blockedPathPrefixes = [");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("'/ap/',");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("'/gp/help',");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("'/gp/cart',");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("'/hz/',");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("'/stores',");
  });

  it('only accepts real Amazon hostnames and strips query strings from product URLs with ASINs', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("const hostParts = host.split('.').filter(Boolean);");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("const amazonIndex = hostParts.lastIndexOf('amazon');");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('amazonSuffixParts.length <= 2');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("/^[a-z]{2,3}$/i.test(part)");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('if (extractAsin(parsed.toString())) {');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("parsed.search = '';");
  });

  it('normalizes Amazon-hosted redirect wrappers to their underlying product URLs', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("parsed.searchParams.get('url') ||");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("parsed.searchParams.get('u') ||");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("parsed.searchParams.get('redirectUrl')");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      "return normalizeAmazonUrl(new URL(redirectedAmazonUrl, parsed.origin).toString());"
    );
  });

  it('continues past a broken Amazon candidate instead of failing the whole scan immediately', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('let attemptedAmazonCandidateCount = 0;');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('let openedAmazonCandidateCount = 0;');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('let lastAmazonCandidateError = null;');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      "log('amazon.scan.amazon_candidate_failed', {"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('openedAmazonCandidateCount === 0');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("stage: 'amazon_extract'");
  });

  it('keeps the best no-match Amazon page data instead of returning an empty generic result', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      'const scoreAmazonPageData = (result) =>'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('let bestNoMatchResult = null;');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('let bestNoMatchCandidateUrls = [];');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('scoreAmazonPageData(extracted)');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('await emitResult({');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('candidateUrls: bestNoMatchCandidateUrls');
  });

  it('returns a real failure when every image candidate upload/search attempt fails', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('let uploadedCandidateCount = 0;');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('let lastUploadError = null;');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      "error: 'Product image candidate did not include a filepath or URL.'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      "log('amazon.scan.image_candidate_failed', {"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('uploadedCandidateCount === 0 && lastUploadError');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("stage: 'google_upload'");
  });

  it('detects Google Lens captcha pages and supports manual verification waiting', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      'const allowManualVerification = input?.allowManualVerification === true;'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      'const manualVerificationTimeoutMs ='
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      "const detectGoogleLensCaptcha = async () => {"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("'unusual traffic'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("'iframe[src*=\"recaptcha\"]'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("status: 'captcha_required'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      'Solve it in the opened browser window and the scan will continue automatically.'
    );
  });

  it('dismisses Amazon cookie and delivery overlays before extraction', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      'const dismissAmazonOverlaysIfPresent = async () => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      'const AMAZON_PRODUCT_CONTENT_SELECTORS = ['
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      'const readVisibleBodyText = async () =>'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("'#productTitle'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("'input#ASIN'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("'#sp-cc-accept'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("'button:has-text(\"Accept\")'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("'#glow-toaster button:has-text(\"Dismiss\")'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      `"we're showing you items that dispatch to poland"`
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      "'select your cookie preferences'"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('return node.innerText;');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('await locator.scrollIntoViewIfNeeded()');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('element.click();');
  });

  it('does not treat the delivery banner as blocking when Amazon product content is already visible', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('productContentReady');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      '(!state.addressVisible || state.productContentReady)'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      '(!finalState.addressVisible || finalState.productContentReady)'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      "Amazon page remained blocked before product content became available."
    );
  });

  it('waits briefly for Amazon product content after overlays clear', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      'const waitForAmazonProductContent = async () => {'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      'const productContentReady = await waitForAmazonProductContent();'
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('Promise.any(');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('AMAZON_PRODUCT_CONTENT_SELECTORS.map');
  });

  it('treats missing Amazon product content as an extraction failure instead of no_match', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('if (!productContentReady) {');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      "Amazon product content did not become available after overlays were cleared."
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("stage: 'amazon_content_unavailable'");
  });

  it('treats persistent Amazon overlays as a candidate-level extraction failure', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      "const overlayState = await dismissAmazonOverlaysIfPresent();"
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("stage: 'amazon_overlay_blocked'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      "Amazon page remained blocked by overlays."
    );
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain(
      "log('amazon.scan.amazon_overlay_blocked', {"
    );
  });

  it('emits structured scan steps and running progress snapshots', () => {
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('const scanSteps = [];');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain('const upsertScanStep = (input) => {');
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("steps: scanSteps.map((step) => ({ ...step }))");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("status: 'running'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("key: 'validate'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("key: 'google_upload'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("key: 'google_candidates'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("key: 'amazon_overlays'");
    expect(AMAZON_REVERSE_IMAGE_SCAN_SCRIPT).toContain("key: 'amazon_extract'");
  });
});
