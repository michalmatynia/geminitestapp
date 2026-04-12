import { describe, expect, it } from 'vitest';

import { SCAN_1688_REVERSE_IMAGE_SCRIPT } from './product-scan-1688-script';

describe('SCAN_1688_REVERSE_IMAGE_SCRIPT', () => {
  it('waits for a stage-specific ready state after captcha before resuming', () => {
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
      'const hardBlockingSelectors = ['
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'const softBlockingSelectors = ['
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'if (visibleSoftBlockingSelector && !hasStrongReadySignal) {'
    );
    expect(SCAN_1688_REVERSE_IMAGE_SCRIPT).toContain(
      'const attempt1688PostCaptchaRecovery = async (stage) => {'
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
  });
});
