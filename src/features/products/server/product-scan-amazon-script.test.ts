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
});
