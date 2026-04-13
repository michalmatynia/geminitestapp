import { describe, expect, it } from 'vitest';

import { SCAN_1688_REVERSE_IMAGE_SCRIPT } from './product-scan-1688-script';

describe('SCAN_1688_REVERSE_IMAGE_SCRIPT', () => {
  it('waits for a stage-specific ready state after captcha before resuming', () => {
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'const DEFAULT_1688_IMAGE_SEARCH_START_URL ='
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'https://s.1688.com/youyuan/index.htm?tab=imageSearch'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'const scanner1688StartUrl = resolve1688ImageSearchStartUrl(input?.scanner1688StartUrl);'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      "waitUntil: 'commit'"
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      '1688 image search navigation timed out; continuing with the partially loaded page.'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      "const DEFAULT_1688_HOME_START_URL = 'https://www.1688.com/';"
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'isChromeNavigationErrorUrl(page.url())'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      '1688 image search page could not be opened in the browser runtime.'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'const recoverPageFromContext = async () => {'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'const isPageAlive = () => {'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'if (!isPageAlive())'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'const detect1688ReadyState = async (stage) => {'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      "reason: 'returned_to_search_entry'"
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      "'post_captcha_not_ready'"
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      '1688 captcha was resolved and the page is ready again.'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      "const progressStatus = toText(input?.status) === 'captcha_required' ? 'captcha_required' : 'running';"
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain('const captchaStateAfterOpen = await handle1688CaptchaIfPresent');
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      "candidateState.failureCode || 'candidate_timeout'"
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      "toText(await page.locator('body').first().innerText().catch(() => null))"
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'const hasStrongReadySignal ='
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'const pageTitleText ='
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      "'captcha interception'"
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain("'unusual traffic'");
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'const resolveBarrierKind = () => {'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      "'1688 requested login before the scan could continue. Log in using the opened browser window.'"
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'barrierKind'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'if (textSuggestsBarrier && candidateUrls.length === 0) {'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'const hardBlockingSelectors = ['
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'const softBlockingSelectors = ['
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'if (visibleSoftBlockingSelector && !hasStrongReadySignal) {'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'const attempt1688PostCaptchaRecovery = async (stage, recoveryUrl = null) => {'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      "'Reopen 1688 supplier page after captcha.'"
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      "'Reopen 1688 image search after captcha.'"
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      "'post_captcha_reupload_required'"
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      "status: blockedCaptchaRequired ? 'captcha_required' : 'failed'"
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      '1688 returned to the image-search entry page after captcha. Re-uploading the product image.'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'const selectedLocalImageCandidate = imageCandidates.find'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'const selectedImageCandidate = selectedLocalImageCandidate || selectedUrlImageCandidate;'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'const imageUrl = selectedImageUrl || toText(selectedUrlImageCandidate?.url);'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      "resultCode: 'missing_image_source'"
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'const apply1688NaturalBrowserSetup = async () => {'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      "'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7'"
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      "Object.defineProperty(navigator, 'webdriver'"
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'await moveMouseNaturally();'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'const submit1688UploadedImageSearch = async () => {'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'window.location.assign(url);'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'await submit1688UploadedImageSearch();'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      "resultCode: 'file_input_missing'"
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      '1688 image upload control did not become available after opening image search.'
    );
  });
});
