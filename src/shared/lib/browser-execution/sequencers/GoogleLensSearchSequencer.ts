import type { Frame, Locator, Page } from 'playwright';

import {
  createPlaywrightVerificationReviewLoopProfile,
  runPlaywrightVerificationObservationLoopWithProfile,
  slugifyPlaywrightVerificationReviewSegment,
  type PlaywrightObservationLoopDecision,
} from '@/features/playwright/server/ai-step-service';
import {
  buildProductScanVerificationDiagnosticsPayloadFromState,
  createProductScanVerificationState,
  createProductScanVerificationBarrierAutoInjectionConfig,
  runProductScanVerificationBarrierReviewCaptureWithState,
  type ProductScanVerificationObservationBase,
  type ProductScanVerificationReview as GoogleVerificationReview,
} from '@/features/products/server/product-scan-ai-evaluator';

import {
  GOOGLE_LENS_FILE_INPUT_SELECTORS,
  GOOGLE_LENS_ENTRY_TRIGGER_SELECTORS,
  GOOGLE_LENS_UPLOAD_TAB_SELECTORS,
  GOOGLE_LENS_RESULT_HINT_SELECTORS,
  GOOGLE_LENS_RESULT_SHELL_SELECTORS,
  GOOGLE_LENS_PROCESSING_INDICATOR_SELECTORS,
  GOOGLE_LENS_PROCESSING_TEXT_HINTS,
  GOOGLE_LENS_RESULT_TEXT_HINTS,
  GOOGLE_CONSENT_CONTROL_SELECTOR,
  GOOGLE_CONSENT_ACCEPT_SELECTORS,
  GOOGLE_CONSENT_SURFACE_TEXT_HINTS,
  GOOGLE_CONSENT_ACCEPT_TEXT_HINTS,
  GOOGLE_CONSENT_REJECT_TEXT_HINTS,
} from '../selectors/amazon';
import { ProductScanSequencer, type ProductScanSequencerContext } from './ProductScanSequencer';

const GOOGLE_LENS_SAFE_ENTRY_TRIGGER_SELECTORS = [
  'div[aria-label="Search by image"]',
  'button[aria-label="Search by image"]',
  'div[aria-label="Search with an image"]',
  'button[aria-label="Search with an image"]',
  'div[aria-label="Search with Google Lens"]',
  'button[aria-label="Search with Google Lens"]',
  'div[aria-label="Google Lens"]',
  'button[aria-label="Google Lens"]',
  'div[role="button"]:has-text("Search by image")',
  'button:has-text("Search by image")',
  'div[role="button"]:has-text("Search with an image")',
  'button:has-text("Search with an image")',
  '[data-base-uri="/searchbyimage"]',
  '[data-base-uri*="lens"]',
] as const;

const GOOGLE_IMAGES_UPLOAD_ENTRY_URL = 'https://www.google.com/imghp?hl=en';
const GOOGLE_LENS_DIRECT_UPLOAD_URL = 'https://lens.google.com/?hl=en';
const GOOGLE_LENS_CAPTCHA_SELECTORS = [
  '#captcha-form',
  '.g-recaptcha',
  '#recaptcha',
  'iframe[src*="recaptcha"]',
  'iframe[title*="reCAPTCHA"]',
  'textarea[name="g-recaptcha-response"]',
  'input[name="g-recaptcha-response"]',
] as const;
const GOOGLE_LENS_CAPTCHA_TEXT_HINTS = [
  'our systems have detected unusual traffic',
  'unusual traffic from your computer network',
  'to continue, please type the characters below',
  'verify you are human',
  'not a robot',
  'complete the captcha',
  'nasze systemy wykryly nietypowy ruch',
  'nietypowy ruch pochodzacy z twojej sieci komputerowej',
  'nie jestem robotem',
] as const;
export type GoogleLensSearchProvider =
  | 'google_images_upload'
  | 'google_lens_upload'
  | 'google_images_url';

export interface GoogleLensSearchImageCandidate {
  id?: string | null;
  url?: string | null;
  filepath?: string | null;
  localPath?: string | null;
  buffer?: Buffer | null;
  filename?: string | null;
}

export interface GoogleLensSearchInput {
  imageSearchProvider?: GoogleLensSearchProvider;
  imageSearchPageUrl?: string | null;
  allowManualVerification?: boolean;
  manualVerificationTimeoutMs?: number;
}

interface GoogleLensSearchScope {
  target: Page | Frame;
  scopeType: 'page' | 'frame';
  frameUrl: string;
}

interface SelectorMatchState {
  selector: string | null;
  scopeType: 'page' | 'frame' | null;
  frameUrl: string | null;
}

interface ProcessingState {
  currentUrl: string;
  processingVisible: boolean;
  progressIndicatorVisible: boolean;
  progressIndicatorSelector: string | null;
  processingText: string | null;
  resultShellVisible: boolean;
  resultShellSelector: string | null;
}

interface TransitionState {
  advanced: boolean;
  currentUrl: string;
  reason: string;
  processingState: ProcessingState | null;
}

interface FileInputState {
  ready: boolean;
  inputLocator: Locator | null;
  currentUrl: string;
  selector: string | null;
  scopeType: string | null;
  frameUrl: string | null;
  inputCount: number;
}

interface GoogleLensUploadEntryState {
  currentUrl: string;
  fileInputCount: number;
  fileInputSelector: string | null;
  fileInputScopeType: string | null;
  fileInputFrameUrl: string | null;
  searchTriggerSelector: string | null;
  uploadTabSelector: string | null;
  resultHintsVisible: boolean;
  processingVisible: boolean;
  resultShellVisible: boolean;
  captchaDetected: boolean;
  consentPresent: boolean;
  consentFrameUrl: string | null;
  loginDetected: boolean;
  loginReason: string | null;
}

interface GoogleLensOpenReadinessState extends GoogleLensUploadEntryState {
  requestedUrl: string;
  uploadEntryUrl: boolean;
  ready: boolean;
  readyReason: string | null;
}

interface GoogleLoginState {
  detected: boolean;
  currentUrl: string;
  reason: string | null;
}

type GoogleLensUploadFile =
  | string
  | {
      name: string;
      mimeType: string;
      buffer: Buffer;
    };

interface GoogleLensFileAttachResult {
  success: boolean;
  method: 'set_input_files' | null;
  message: string | null;
}

interface ConsentFrame {
  frame: Frame;
  frameUrl: string;
}

interface CaptchaState {
  detected: boolean;
  currentUrl: string;
}

export type GoogleVerificationLoopDecision =
  | 'captcha_present'
  | 'awaiting_stable_clear'
  | 'resolved'
  | 'page_closed'
  | 'timeout';

export type GoogleVerificationObservation =
  ProductScanVerificationObservationBase<GoogleVerificationLoopDecision> & {
  captchaDetected: boolean;
};

const GOOGLE_VERIFICATION_REVIEW_DETAIL_DESCRIPTORS = [
  { label: 'Captcha detected', value: 'captchaDetected' },
] as const;

type GoogleVerificationObservationCaptureParams = {
  candidateId: string;
  candidateRank: number;
  iteration: number;
  loopDecision: GoogleVerificationLoopDecision;
  captchaDetected: boolean;
  stableForMs: number | null;
  currentUrl?: string | null;
};

type GoogleVerificationLoopBaseParams = {
  candidateId: string;
  candidateRank: number;
  resolveCurrentUrl: () => string | null;
};

const mapGoogleVerificationLoopDecision = (
  decision: PlaywrightObservationLoopDecision
): GoogleVerificationLoopDecision => {
  switch (decision) {
    case 'blocked':
      return 'captcha_present';
    case 'awaiting_stable_clear':
      return 'awaiting_stable_clear';
    case 'resolved':
      return 'resolved';
    case 'page_closed':
      return 'page_closed';
    case 'timeout':
      return 'timeout';
  }
};

const GOOGLE_VERIFICATION_LOOP_PROFILE =
  createPlaywrightVerificationReviewLoopProfile<
    CaptchaState,
    GoogleVerificationLoopBaseParams,
    GoogleVerificationObservationCaptureParams,
    GoogleVerificationObservation
  >({
    key: 'google_verification_review',
    subject: 'Google verification screen',
    runningMessage: 'Capturing Google verification screen for AI review.',
    historyArtifactKey: 'google-verification-review-history',
    artifactKeyPrefix: 'google-verification-review',
    analysisFailureLogKey: 'google.verification.review.analysis_failed',
    screenshotFailureLogKey: 'google.verification.review.screenshot_failed',
    evaluationProvider: 'google_lens',
    resolveEvaluationStage: () => 'google_captcha',
    evaluationObjective:
      'Describe the visible Google verification barrier for manual handling only. Do not solve it.',
    buildObservationExtra: (params) => ({
      captchaDetected: params.captchaDetected,
    }),
    buildArtifactSegments: (params) => [
      slugifyPlaywrightVerificationReviewSegment(params.candidateId, 'unknown-candidate'),
      `rank-${String(params.candidateRank)}`,
      `iter-${String(params.iteration)}`,
    ],
    buildFingerprintPartMap: (params) => ({
      candidateId: params.candidateId,
      candidateRank: params.candidateRank,
      loopDecision: params.loopDecision,
      captchaDetected: params.captchaDetected,
    }),
    detailDescriptors: GOOGLE_VERIFICATION_REVIEW_DETAIL_DESCRIPTORS,
    buildLoopCaptureParams: ({ iteration, decision, snapshot, stableForMs }, baseParams) => ({
      candidateId: baseParams.candidateId,
      candidateRank: baseParams.candidateRank,
      iteration,
      loopDecision: mapGoogleVerificationLoopDecision(decision),
      captchaDetected: snapshot.blocked,
      stableForMs,
      currentUrl:
        snapshot.currentUrl ??
        snapshot.state?.currentUrl ??
        baseParams.resolveCurrentUrl(),
    }),
  });

export abstract class GoogleLensSearchSequencer<
  TInput extends GoogleLensSearchInput,
> extends ProductScanSequencer {
  protected readonly input: TInput;
  protected readonly CAPTCHA_REQUIRED_MESSAGE = 'Google Lens requested captcha verification.';
  protected readonly CAPTCHA_WAIT_MESSAGE =
    'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.';
  protected readonly CAPTCHA_STABLE_CLEAR_WINDOW_MS = 10_000;

  private readonly googleVerificationState = createProductScanVerificationState<
    GoogleVerificationReview,
    GoogleVerificationObservation
  >();

  constructor(context: ProductScanSequencerContext, input: TInput) {
    super(context);
    this.input = input;
  }

  protected buildGoogleVerificationDiagnosticsPayload(): Record<string, unknown> {
    return buildProductScanVerificationDiagnosticsPayloadFromState({
      reviewKey: 'googleVerificationReview',
      observationsKey: 'googleVerificationObservations',
      state: this.googleVerificationState,
    });
  }

  protected resolveImageSearchProvider(): GoogleLensSearchProvider {
    return this.input.imageSearchProvider === 'google_images_url' ||
      this.input.imageSearchProvider === 'google_lens_upload'
      ? this.input.imageSearchProvider
      : 'google_images_upload';
  }

  protected resolveConfiguredImageSearchPageUrl(): string | null {
    const rawUrl = this.normalizeText(this.input.imageSearchPageUrl);
    if (rawUrl === null) {
      return null;
    }

    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }
      return parsed.toString();
    } catch {
      return null;
    }
  }

  protected abstract resolveImageCandidateFilepath(
    candidate: GoogleLensSearchImageCandidate
  ): string | null;

  protected async openGoogleLens(params: {
    candidateId: string;
    candidateRank: number;
  }): Promise<{ success: boolean; message: string | null }> {
    const { candidateId, candidateRank } = params;

    this.upsertScanStep({
      key: 'google_lens_open',
      status: 'running',
      candidateId,
      candidateRank,
      message: 'Opening Google Lens search.',
    });

    try {
      const attemptUrls = this.resolveGoogleLensOpenAttemptUrls();
      let lastState: GoogleLensOpenReadinessState | null = null;

      for (const [attemptIndex, url] of attemptUrls.entries()) {
        const consentState = await this.openGoogleLensAttemptUrl(url);
        let state = await this.readGoogleLensOpenReadinessState(url);

        if (
          consentState.resolved &&
          !state.ready &&
          !state.loginDetected &&
          this.shouldReopenImageSearchPageAfterConsent(url)
        ) {
          await this.openGoogleLensAttemptUrl(url);
          state = await this.readGoogleLensOpenReadinessState(url);
        }

        lastState = state;

        if (state.loginDetected) {
          const message = 'Google requested sign-in before the Lens upload page became available.';
          this.upsertScanStep({
            key: 'google_lens_open',
            status: 'failed',
            candidateId,
            candidateRank,
            resultCode: 'google_login_required',
            message,
            url: state.currentUrl,
            details: this.buildGoogleLensOpenDetails(state, attemptIndex + 1),
          });
          return { success: false, message };
        }

        if (state.ready) {
          this.upsertScanStep({
            key: 'google_lens_open',
            status: 'completed',
            candidateId,
            candidateRank,
            resultCode: 'ok',
            message: 'Google Lens search opened.',
            url: state.currentUrl,
            details: this.buildGoogleLensOpenDetails(state, attemptIndex + 1),
          });

          return { success: true, message: null };
        }
      }

      const fallbackUrl = attemptUrls[attemptUrls.length - 1] ?? this.resolveGoogleLensOpenUrl();
      const fallbackState = lastState ?? await this.readGoogleLensOpenReadinessState(fallbackUrl);
      const message = 'Google did not keep the browser on a usable image search page after consent.';
      this.upsertScanStep({
        key: 'google_lens_open',
        status: 'failed',
        candidateId,
        candidateRank,
        resultCode: 'image_search_page_unavailable',
        message,
        url: fallbackState.currentUrl,
        details: this.buildGoogleLensOpenDetails(fallbackState, attemptUrls.length),
      });
      return { success: false, message };
    } catch (_err) {
      const message = 'Google Lens search could not be opened.';
      this.upsertScanStep({
        key: 'google_lens_open',
        status: 'failed',
        candidateId,
        candidateRank,
        resultCode: 'navigation_failed',
        message,
        url: this.page.url(),
      });
      return { success: false, message };
    }
  }

  protected async uploadToGoogleLens(params: {
    candidate: GoogleLensSearchImageCandidate;
    candidateId: string;
    candidateRank: number;
  }): Promise<{
    advanced: boolean;
    captchaRequired: boolean;
    error: string | null;
    failureCode: string | null;
  }> {
    const { candidate, candidateId, candidateRank } = params;

    const provider = this.resolveImageSearchProvider();

    this.upsertScanStep({
      key: 'google_upload',
      status: 'running',
      candidateId,
      candidateRank,
      message:
        provider === 'google_images_url'
          ? 'Submitting product image URL to Google Lens.'
          : 'Finding Google Lens upload entry.',
      details: [{ label: 'Image search provider', value: provider }],
    });

    const startingUrl = this.page.url();

    if (provider === 'google_images_url') {
      const imageUrl = this.normalizeText(candidate.url);
      if (!this.canUseGoogleReverseImageUrl(imageUrl)) {
        const message = imageUrl
          ? 'Google Images URL mode requires a public HTTP image URL and will not open a manual file upload.'
          : 'Google Images URL mode requires an image URL and will not open a manual file upload.';
        this.upsertScanStep({
          key: 'google_upload',
          status: 'failed',
          candidateId,
          candidateRank,
          resultCode: 'provider_requires_image_url',
          message,
          url: this.page.url(),
          details: [
            { label: 'Image search provider', value: provider },
            { label: 'Image URL', value: imageUrl },
          ],
        });
        return {
          advanced: false,
          captchaRequired: false,
          error: message,
          failureCode: 'provider_requires_image_url',
        };
      }

      const lensUrl = `https://www.google.com/searchbyimage?image_url=${encodeURIComponent(imageUrl!)}&hl=en`;
      await this.page.goto(lensUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      const transitionState = await this.waitForGoogleLensResultState(startingUrl, null, {
        attempt: candidateRank,
        candidateId,
        inputSource: 'url',
      });
      return this.resolveUploadOutcome(transitionState, candidateId, candidateRank);
    }

    const inputState = await this.waitForGoogleLensFileInput();

    if (!inputState.ready || !inputState.inputLocator) {
      const captchaState = await this.detectGoogleLensCaptcha();
      if (captchaState.detected) {
        this.upsertScanStep({
          key: 'google_upload',
          status: 'running',
          candidateId,
          candidateRank,
          resultCode: 'captcha_required',
          message: this.CAPTCHA_REQUIRED_MESSAGE,
          url: this.page.url(),
        });
        return {
          advanced: false,
          captchaRequired: true,
          error: this.CAPTCHA_REQUIRED_MESSAGE,
          failureCode: 'captcha_required',
        };
      }

      const entryState = await this.describeGoogleLensUploadEntryState(inputState);
      const message =
        'Google Lens image upload control did not become available after opening image search.';
      this.upsertScanStep({
        key: 'google_upload',
        status: 'failed',
        candidateId,
        candidateRank,
        resultCode: 'file_input_missing',
        message,
        url: this.page.url(),
        details: this.buildGoogleLensUploadEntryDetails(entryState),
      });
      return {
        advanced: false,
        captchaRequired: false,
        error: message,
        failureCode: 'file_input_missing',
      };
    }

    const candidateFilepath = this.resolveImageCandidateFilepath(candidate);

    try {
      let uploadFile: GoogleLensUploadFile | null = null;
      if (candidateFilepath) {
        uploadFile = candidateFilepath;
      } else if (candidate.buffer) {
        uploadFile = {
          name: this.normalizeText(candidate.filename) ?? `image_${candidateId}.jpg`,
          mimeType: 'image/jpeg',
          buffer: candidate.buffer,
        };
      }

      if (uploadFile !== null) {
        const attachResult = await this.attachImageToGoogleLensInput(
          inputState.inputLocator,
          uploadFile
        );
        if (!attachResult.success) {
          const message =
            attachResult.message ?? 'Failed to supply image file to Google Lens upload input.';
          this.upsertScanStep({
            key: 'google_upload',
            status: 'failed',
            candidateId,
            candidateRank,
            resultCode: 'set_input_files_failed',
            message,
          });
          return {
            advanced: false,
            captchaRequired: false,
            error: message,
            failureCode: 'set_input_files_failed',
          };
        }
        await this.clickGoogleLensSearchSubmitIfPresent();
        await this.wait(300);
      } else {
        const message =
          'No usable local image source (localPath or buffer) was provided for file upload mode.';
        this.upsertScanStep({
          key: 'google_upload',
          status: 'failed',
          candidateId,
          candidateRank,
          resultCode: 'missing_image_source',
          message,
        });
        return {
          advanced: false,
          captchaRequired: false,
          error: message,
          failureCode: 'missing_image_source',
        };
      }
    } catch {
      const message = 'Failed to supply image file to Google Lens upload input.';
      this.upsertScanStep({
        key: 'google_upload',
        status: 'failed',
        candidateId,
        candidateRank,
        resultCode: 'set_input_files_failed',
        message,
      });
      return {
        advanced: false,
        captchaRequired: false,
        error: message,
        failureCode: 'set_input_files_failed',
      };
    }

    const transitionState = await this.waitForGoogleLensResultState(
      startingUrl,
      inputState.inputLocator,
      { attempt: candidateRank, candidateId, inputSource: 'local' }
    );

    return this.resolveUploadOutcome(transitionState, candidateId, candidateRank);
  }

  protected async continueGoogleLensUploadAfterCaptcha(params: {
    candidate: GoogleLensSearchImageCandidate;
    candidateId: string;
    candidateRank: number;
  }): Promise<{
    advanced: boolean;
    captchaRequired: boolean;
    error: string | null;
    failureCode: string | null;
  }> {
    const currentUrl = this.page.url();
    const processingState = await this.readGoogleLensProcessingState();
    const hasResultHints = await this.hasGoogleLensResultHints();
    const isUploadEntryUrl = this.isGoogleImagesUploadEntryUrl(currentUrl);

    if (hasResultHints || processingState.resultShellVisible || !isUploadEntryUrl) {
      return this.resolveUploadOutcome(
        {
          advanced: true,
          currentUrl,
          reason: hasResultHints ? 'result_hints' : 'post_captcha_ready',
          processingState,
        },
        params.candidateId,
        params.candidateRank
      );
    }

    return this.uploadToGoogleLens(params);
  }

  private resolveUploadOutcome(
    transitionState: TransitionState,
    candidateId: string,
    candidateRank: number
  ): { advanced: boolean; captchaRequired: boolean; error: string | null; failureCode: string | null } {
    if (transitionState.advanced && transitionState.reason === 'captcha') {
      this.upsertScanStep({
        key: 'google_upload',
        status: 'running',
        candidateId,
        candidateRank,
        resultCode: 'captcha_required',
        message: this.CAPTCHA_REQUIRED_MESSAGE,
        url: transitionState.currentUrl,
      });
      return {
        advanced: false,
        captchaRequired: true,
        error: this.CAPTCHA_REQUIRED_MESSAGE,
        failureCode: 'captcha_required',
      };
    }

    if (!transitionState.advanced) {
      const message = 'Google Lens did not advance after the image was supplied.';
      this.upsertScanStep({
        key: 'google_upload',
        status: 'failed',
        candidateId,
        candidateRank,
        resultCode: transitionState.reason ?? 'upload_timeout',
        message,
        url: transitionState.currentUrl,
      });
      return {
        advanced: false,
        captchaRequired: false,
        error: message,
        failureCode: transitionState.reason ?? 'upload_timeout',
      };
    }

    this.upsertScanStep({
      key: 'google_upload',
      status: 'completed',
      candidateId,
      candidateRank,
      resultCode: 'ok',
      message: 'Image was submitted to Google Lens and the search advanced.',
      url: transitionState.currentUrl,
    });
    return { advanced: true, captchaRequired: false, error: null, failureCode: null };
  }

  protected async handleGoogleCaptcha(params: {
    candidateId: string;
    candidateRank: number;
    waitForClear: boolean;
  }): Promise<{ resolved: boolean }> {
    const { candidateId, candidateRank, waitForClear } = params;
    const allowManual = this.input.allowManualVerification === true;
    const timeoutMs =
      typeof this.input.manualVerificationTimeoutMs === 'number'
        ? this.input.manualVerificationTimeoutMs
        : 240_000;

    this.upsertScanStep({
      key: 'google_captcha',
      status: allowManual ? 'running' : 'failed',
      candidateId,
      candidateRank,
      resultCode: 'captcha_required',
      message: allowManual ? this.CAPTCHA_WAIT_MESSAGE : this.CAPTCHA_REQUIRED_MESSAGE,
      url: this.safePageUrl(),
    });

    if (!waitForClear || !allowManual) {
      await this.captureGoogleVerificationObservation({
        candidateId,
        candidateRank,
        iteration: 1,
        loopDecision: 'captcha_present',
        captchaDetected: true,
        stableForMs: null,
      });
      return { resolved: false };
    }

    const loopResult =
      await runPlaywrightVerificationObservationLoopWithProfile<
        CaptchaState,
        GoogleVerificationObservation,
        GoogleVerificationLoopBaseParams,
        GoogleVerificationObservationCaptureParams,
        GoogleVerificationObservation
      >({
        timeoutMs,
        stableClearWindowMs: this.CAPTCHA_STABLE_CLEAR_WINDOW_MS,
        intervalMs: 2_000,
        initialSnapshot: {
          state: null,
          blocked: true,
          currentUrl: this.safePageUrl(),
        },
        isPageClosed: () => this.isPageClosed(),
        wait: (ms) => this.wait(ms),
        readSnapshot: async () => {
          const state = await this.detectGoogleLensCaptcha();
          return {
            state,
            blocked: state.detected,
            currentUrl: state.currentUrl,
          };
        },
        profile: GOOGLE_VERIFICATION_LOOP_PROFILE,
        baseParams: {
          candidateId,
          candidateRank,
          resolveCurrentUrl: () => this.safePageUrl(),
        },
        captureObservation: (captureParams) =>
          this.captureGoogleVerificationObservation(captureParams),
      });

    if (loopResult.resolved) {
      this.upsertScanStep({
        key: 'google_captcha',
        status: 'completed',
        candidateId,
        candidateRank,
        resultCode: 'captcha_resolved',
        message: 'Google captcha was resolved and the page is ready again.',
        url: this.safePageUrl(),
      });
      return { resolved: true };
    }

    if (loopResult.finalDecision === 'timeout') {
      this.upsertScanStep({
        key: 'google_captcha',
        status: 'failed',
        candidateId,
        candidateRank,
        resultCode: 'captcha_timeout',
        message: 'Google captcha was not resolved within the allowed time.',
        url: this.safePageUrl(),
      });
    }

    return { resolved: false };
  }

  private async captureGoogleVerificationObservation(
    params: GoogleVerificationObservationCaptureParams
  ): Promise<GoogleVerificationObservation | null> {
    const currentUrl = params.currentUrl ?? this.safePageUrl();
    return runProductScanVerificationBarrierReviewCaptureWithState({
      profile: GOOGLE_VERIFICATION_LOOP_PROFILE,
      verificationState: this.googleVerificationState,
      params,
      currentUrl,
      page: this.page,
      artifacts: this.artifacts,
      log: this.log,
      upsertStep: (step) => this.upsertScanStep(step),
      injectOnEvaluation: createProductScanVerificationBarrierAutoInjectionConfig({
        provider: 'Google',
      }),
    });
  }

  private resolveGoogleLensOpenUrl(): string {
    const configuredUrl = this.resolveConfiguredImageSearchPageUrl();
    if (configuredUrl !== null) {
      return configuredUrl;
    }

    return GOOGLE_LENS_DIRECT_UPLOAD_URL;
  }

  private resolveGoogleLensOpenAttemptUrls(): string[] {
    const urls: string[] = [];
    const configuredUrl = this.resolveConfiguredImageSearchPageUrl();
    const candidates = [
      configuredUrl ?? GOOGLE_LENS_DIRECT_UPLOAD_URL,
      GOOGLE_LENS_DIRECT_UPLOAD_URL,
      GOOGLE_IMAGES_UPLOAD_ENTRY_URL,
    ];

    for (const candidate of candidates) {
      if (!urls.includes(candidate)) {
        urls.push(candidate);
      }
    }

    return urls;
  }

  private async openGoogleLensAttemptUrl(url: string): Promise<{ resolved: boolean }> {
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    const consentState = await this.clickGoogleConsentIfPresent().catch(() => ({ resolved: false }));
    await this.page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
    await this.wait(800);
    return consentState;
  }

  private async readGoogleLensOpenReadinessState(
    requestedUrl: string
  ): Promise<GoogleLensOpenReadinessState> {
    const inputState = await this.resolveGoogleLensFileInput();
    const entryState = await this.describeGoogleLensUploadEntryState(inputState);
    const uploadEntryUrl = this.isGoogleImagesUploadEntryUrl(entryState.currentUrl);
    const directUploadUrl = this.isGoogleLensDirectUploadUrl(entryState.currentUrl);
    const readyReason = this.resolveGoogleLensOpenReadyReason({
      entryState,
      inputReady: inputState.ready,
      uploadEntryUrl,
      directUploadUrl,
    });

    return {
      ...entryState,
      requestedUrl,
      uploadEntryUrl,
      ready: readyReason !== null,
      readyReason,
    };
  }

  private resolveGoogleLensOpenReadyReason(input: {
    entryState: GoogleLensUploadEntryState;
    inputReady: boolean;
    uploadEntryUrl: boolean;
    directUploadUrl: boolean;
  }): string | null {
    if (input.entryState.loginDetected) {
      return null;
    }

    const readinessSignals: Array<{ ready: boolean; reason: string }> = [
      { ready: input.inputReady, reason: 'file_input_ready' },
      { ready: input.entryState.resultHintsVisible, reason: 'result_hints' },
      { ready: input.entryState.resultShellVisible, reason: 'result_shell' },
      { ready: input.entryState.processingVisible, reason: 'processing' },
      { ready: input.entryState.captchaDetected, reason: 'captcha' },
      { ready: input.entryState.consentPresent, reason: 'consent_present' },
      {
        ready: input.entryState.searchTriggerSelector !== null,
        reason: 'image_search_entry',
      },
      { ready: input.entryState.uploadTabSelector !== null, reason: 'upload_tab' },
      { ready: input.directUploadUrl, reason: 'direct_upload_url' },
      { ready: input.uploadEntryUrl, reason: 'upload_entry_url' },
    ];

    return readinessSignals.find((signal) => signal.ready)?.reason ?? null;
  }

  private buildGoogleLensOpenDetails(
    state: GoogleLensOpenReadinessState,
    attempt: number
  ): Array<{ label: string; value?: string | null }> {
    return [
      { label: 'Image search provider', value: this.resolveImageSearchProvider() },
      { label: 'Open attempt', value: String(attempt) },
      { label: 'Image search page', value: state.requestedUrl },
      { label: 'Current URL', value: state.currentUrl },
      { label: 'Ready', value: String(state.ready) },
      { label: 'Ready reason', value: state.readyReason },
      { label: 'Upload entry URL', value: String(state.uploadEntryUrl) },
      ...this.buildGoogleLensUploadEntryDetails(state).filter(
        (detail) => detail.label !== 'Current URL'
      ),
    ];
  }

  private canUseGoogleReverseImageUrl(value: string | null): boolean {
    if (value === null) {
      return false;
    }

    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private isGoogleLensDirectUploadUrl(value: string | null): boolean {
    const normalized = this.normalizeText(value);
    return normalized !== null && normalized.startsWith('https://lens.google.com/');
  }

  private shouldReopenImageSearchPageAfterConsent(requestedUrl: string): boolean {
    const currentUrl = this.page.url();
    try {
      const requested = new URL(requestedUrl);
      const current = new URL(currentUrl);
      const requestedHost = requested.hostname.toLowerCase();
      const currentHost = current.hostname.toLowerCase();

      if (currentHost.includes('consent.google')) {
        return true;
      }

      if (requestedHost !== currentHost || requested.pathname !== current.pathname) {
        return true;
      }

      for (const [key, value] of requested.searchParams.entries()) {
        if (current.searchParams.get(key) !== value) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  protected async clickGoogleConsentIfPresent(): Promise<{ resolved: boolean }> {
    const frames = await this.listGoogleConsentFrames();
    if (frames.length === 0) return { resolved: false };

    for (const { frame } of frames) {
      const control = await this.findGoogleConsentAcceptControl(frame);
      if (!control) continue;
      await this.clickLocator(control.locator, { timeout: 5_000 });
      await this.wait(600);
      return { resolved: true };
    }
    return { resolved: false };
  }

  private async listGoogleConsentFrames(): Promise<ConsentFrame[]> {
    const matches: ConsentFrame[] = [];
    for (const frame of this.page.frames()) {
      const detected = await this.frameLooksLikeGoogleConsentSurface(frame).catch(() => false);
      if (detected) matches.push({ frame, frameUrl: frame.url() });
    }
    return matches;
  }

  private async frameLooksLikeGoogleConsentSurface(frame: Frame): Promise<boolean> {
    const url = frame.url();
    if (url.includes('consent.google') || url.includes('/consent') || url.includes('before-you-continue')) {
      return true;
    }

    const hasConsentForm =
      (await frame.locator('form[action*="consent"], form[action*="save"]').count().catch(() => 0)) > 0;
    if (hasConsentForm) return true;

    const bodyText = (
      await frame.locator('body').first().textContent().catch(() => '')
    )?.toLowerCase() ?? '';
    return GOOGLE_CONSENT_SURFACE_TEXT_HINTS.some((hint) => bodyText.includes(hint));
  }

  private async findGoogleConsentAcceptControl(
    frame: Frame
  ): Promise<{ locator: Locator; label: string; frameUrl: string } | null> {
    for (const selector of GOOGLE_CONSENT_ACCEPT_SELECTORS) {
      const locator = frame.locator(selector).first();
      if ((await locator.count().catch(() => 0)) === 0) continue;
      if (!(await locator.isVisible().catch(() => false))) continue;
      return { locator, label: selector, frameUrl: frame.url() };
    }

    const bestIndex = await frame
      .locator(GOOGLE_CONSENT_CONTROL_SELECTOR)
      .evaluateAll(
        (elements, hints) => {
          const normalize = (v: unknown): string =>
            (typeof v === 'string' ? v : '')
              .normalize('NFKD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim()
              .toLowerCase();
          const acceptHints = Array.isArray(hints?.accept) ? hints.accept : [];
          const rejectHints = Array.isArray(hints?.reject) ? hints.reject : [];
          let bestIdx = -1;
          let bestScore = -1;
          elements.forEach((el, idx) => {
            if (!(el instanceof HTMLElement)) return;
            const text = normalize(
              [el.innerText, el.textContent, el.getAttribute('aria-label'), el.getAttribute('title')]
                .filter(Boolean)
                .join(' ')
            );
            if (!text || rejectHints.some((hint) => text.includes(hint))) return;
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            if (style.display === 'none' || style.visibility === 'hidden' || !rect.width || !rect.height) return;
            let score = 0;
            if (text.includes('accept all')) score += 8;
            if (text.includes('i agree')) score += 7;
            if (acceptHints.some((hint) => text.includes(hint))) score += 4;
            const formAction = normalize(el.closest('form')?.getAttribute('action') ?? '');
            if (formAction.includes('consent') || formAction.includes('save')) score += 2;
            if (score > bestScore) {
              bestIdx = idx;
              bestScore = score;
            }
          });
          return bestIdx;
        },
        { accept: GOOGLE_CONSENT_ACCEPT_TEXT_HINTS, reject: GOOGLE_CONSENT_REJECT_TEXT_HINTS }
      )
      .catch(() => -1);

    if (typeof bestIndex !== 'number' || bestIndex < 0) return null;

    return {
      locator: frame.locator(GOOGLE_CONSENT_CONTROL_SELECTOR).nth(bestIndex),
      label: 'heuristic_accept_control',
      frameUrl: frame.url(),
    };
  }

  protected async detectGoogleLensCaptcha(): Promise<CaptchaState> {
    const url = this.safePageUrl() ?? '';
    if (this.isGoogleCaptchaUrl(url)) {
      return { detected: true, currentUrl: url };
    }

    const captchaSelectorState = await this.findFirstPresentInScopes(GOOGLE_LENS_CAPTCHA_SELECTORS);
    if (captchaSelectorState.selector) {
      return { detected: true, currentUrl: url };
    }

    for (const scope of this.listSearchScopes()) {
      const bodyText = this.normalizeSurfaceText(
        await scope.target.locator('body').first().textContent().catch(() => '')
      );
      if (GOOGLE_LENS_CAPTCHA_TEXT_HINTS.some((hint) => bodyText.includes(hint))) {
        return { detected: true, currentUrl: url };
      }
    }

    return { detected: false, currentUrl: url };
  }

  protected isGoogleCaptchaUrl(url: string | null): boolean {
    const normalizedUrl = this.normalizeText(url)?.toLowerCase() ?? '';
    return (
      normalizedUrl.includes('sorry') ||
      normalizedUrl.includes('ipv4.google.com') ||
      normalizedUrl.includes('ipv6.google.com')
    );
  }

  private async detectGoogleLoginSurface(): Promise<GoogleLoginState> {
    const currentUrl = this.page.url();
    const consentFrames = await this.listGoogleConsentFrames().catch(() => []);
    if (consentFrames.length > 0) {
      return { detected: false, currentUrl, reason: 'google_consent' };
    }

    try {
      const parsed = new URL(currentUrl);
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname.toLowerCase();
      if (
        host === 'accounts.google.com' ||
        host.endsWith('.accounts.google.com') ||
        path.includes('servicelogin') ||
        path.includes('signin') ||
        path.includes('interactivelogin')
      ) {
        return { detected: true, currentUrl, reason: 'login_url' };
      }
    } catch {
      // ignore
    }

    const bodyText = (
      await this.page.locator('body').first().textContent().catch(() => '')
    )?.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase() ?? '';
    const loginHints = [
      'use your google account',
      'to continue to google',
      'sign in with google',
      'sign in to your google account',
      'zaloguj sie',
      'uzyj konta google',
      'aby kontynuowac',
    ];

    const matchedHint = loginHints.find((hint) => bodyText.includes(hint)) ?? null;
    return matchedHint !== null
      ? { detected: true, currentUrl, reason: `login_text:${matchedHint}` }
      : { detected: false, currentUrl, reason: null };
  }

  private listSearchScopes(): GoogleLensSearchScope[] {
    const mainFrame = this.page.mainFrame();
    const childFrames = this.page.frames()
      .filter((frame) => frame !== mainFrame)
      .map((frame) => ({
        target: frame as unknown as Page,
        scopeType: 'frame' as const,
        frameUrl: frame.url(),
      }));

    return [
      { target: this.page, scopeType: 'page' as const, frameUrl: this.page.url() },
      ...childFrames,
    ];
  }

  private async findFirstVisibleInScopes(selectors: readonly string[]): Promise<SelectorMatchState> {
    for (const scope of this.listSearchScopes()) {
      for (const selector of selectors) {
        const locator = scope.target.locator(selector).first();
        if ((await locator.count().catch(() => 0)) === 0) continue;
        if (await locator.isVisible().catch(() => false)) {
          return { selector, scopeType: scope.scopeType, frameUrl: scope.frameUrl };
        }
      }
    }
    return { selector: null, scopeType: null, frameUrl: null };
  }

  private async findFirstPresentInScopes(selectors: readonly string[]): Promise<SelectorMatchState> {
    for (const scope of this.listSearchScopes()) {
      for (const selector of selectors) {
        const locator = scope.target.locator(selector).first();
        if ((await locator.count().catch(() => 0)) > 0) {
          return { selector, scopeType: scope.scopeType, frameUrl: scope.frameUrl };
        }
      }
    }
    return { selector: null, scopeType: null, frameUrl: null };
  }

  private async readGoogleLensProcessingState(): Promise<ProcessingState> {
    const progressState = await this.findFirstVisibleInScopes(
      GOOGLE_LENS_PROCESSING_INDICATOR_SELECTORS
    );
    const resultShellState = await this.findFirstVisibleInScopes(
      GOOGLE_LENS_RESULT_SHELL_SELECTORS
    );

    let processingText: string | null = null;
    let resultText: string | null = null;
    for (const scope of this.listSearchScopes()) {
      const bodyText = (
        await scope.target.locator('body').first().textContent().catch(() => '')
      )?.toLowerCase() ?? '';
      if (!processingText) {
        processingText = GOOGLE_LENS_PROCESSING_TEXT_HINTS.find((hint) => bodyText.includes(hint)) ?? null;
      }
      if (!resultText) {
        resultText = GOOGLE_LENS_RESULT_TEXT_HINTS.find((hint) => bodyText.includes(hint)) ?? null;
      }
      if (processingText && resultText) break;
    }

    return {
      currentUrl: this.page.url(),
      processingVisible: Boolean(progressState.selector || processingText),
      progressIndicatorVisible: Boolean(progressState.selector),
      progressIndicatorSelector: progressState.selector,
      processingText,
      resultShellVisible: Boolean(resultShellState.selector || resultText),
      resultShellSelector: resultShellState.selector ?? resultText,
    };
  }

  protected async waitForGoogleLensFileInput(): Promise<FileInputState> {
    const poll = async (timeoutMs: number): Promise<FileInputState | null> => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (this.isPageClosed()) {
          return {
            ready: false,
            inputLocator: null,
            currentUrl: this.safePageUrl() ?? '',
            selector: null,
            scopeType: null,
            frameUrl: null,
            inputCount: 0,
          };
        }
        const state = await this.resolveGoogleLensFileInput();
        if (state.ready) return state;
        await this.wait(500);
      }
      return null;
    };

    let state = await poll(2_500);
    if (state) return state;

    await this.clickGoogleConsentIfPresent().catch(() => undefined);
    await this.clickGoogleLensSafeImageSearchEntryIfPresent().catch(() => false);

    state = await poll(4_000);
    if (state) return state;

    await this.clickGoogleConsentIfPresent().catch(() => undefined);

    state = await poll(7_000);
    return state ?? {
      ready: false,
      inputLocator: null,
      currentUrl: this.page.url(),
      selector: null,
      scopeType: null,
      frameUrl: null,
      inputCount: 0,
    };
  }

  private async clickGoogleLensSafeImageSearchEntryIfPresent(): Promise<boolean> {
    return await this.clickFirstVisible(GOOGLE_LENS_SAFE_ENTRY_TRIGGER_SELECTORS);
  }

  protected async resolveGoogleLensFileInput(): Promise<FileInputState> {
    let fallbackState: FileInputState | null = null;

    for (const scope of this.listSearchScopes()) {
      for (const selector of GOOGLE_LENS_FILE_INPUT_SELECTORS) {
        const scopeLocator = scope.target.locator(selector);
        const count = await scopeLocator.count().catch(() => 0);
        if (count < 1) continue;
        fallbackState ??= {
          ready: false,
          inputLocator: null,
          currentUrl: this.page.url(),
          selector,
          scopeType: scope.scopeType,
          frameUrl: scope.frameUrl,
          inputCount: count,
        };

        const bestIndex = await scopeLocator
          .evaluateAll((nodes) => {
            let bestIdx = -1;
            let bestScore = -1;
            nodes.forEach((node, idx) => {
              if (!(node instanceof HTMLInputElement) || node.disabled) return;
              if (node.type.toLowerCase() !== 'file') return;
              const style = window.getComputedStyle(node);
              const rect = node.getBoundingClientRect();
              const visible =
                style.visibility !== 'hidden' &&
                style.display !== 'none' &&
                rect.width > 0 &&
                rect.height > 0;
              const parentVisible = node.parentElement
                ? (() => {
                    const parentStyle = window.getComputedStyle(node.parentElement);
                    const parentRect = node.parentElement.getBoundingClientRect();
                    return (
                      parentStyle.visibility !== 'hidden' &&
                      parentStyle.display !== 'none' &&
                      parentRect.width > 0 &&
                      parentRect.height > 0
                    );
                  })()
                : false;
              let score = visible ? 8 : parentVisible ? 4 : 0;
              const accept = (typeof node.accept === 'string' ? node.accept : '').toLowerCase();
              if (!accept || accept.includes('image')) score += 4;
              if (node.closest('[role="dialog"]') || node.closest('c-wiz') || node.closest('form')) score += 2;
              if (score > bestScore) {
                bestIdx = idx;
                bestScore = score;
              }
            });
            return bestIdx;
          })
          .catch(() => -1);

        if (typeof bestIndex === 'number' && bestIndex >= 0) {
          return {
            ready: true,
            inputLocator: scopeLocator.nth(bestIndex),
            currentUrl: this.page.url(),
            selector,
            scopeType: scope.scopeType,
            frameUrl: scope.frameUrl,
            inputCount: count,
          };
        }
      }
    }

    return fallbackState ?? {
      ready: false,
      inputLocator: null,
      currentUrl: this.page.url(),
      selector: null,
      scopeType: null,
      frameUrl: null,
      inputCount: 0,
    };
  }

  protected async attachImageToGoogleLensInput(
    inputLocator: Locator,
    uploadFile: GoogleLensUploadFile
  ): Promise<GoogleLensFileAttachResult> {
    const setInputFilesError = await inputLocator
      .setInputFiles(uploadFile)
      .then(() => null)
      .catch((error) =>
        error instanceof Error ? error.message : 'Google Lens rejected the selected image file.'
      );

    if (setInputFilesError !== null) {
      return { success: false, method: null, message: setInputFilesError };
    }

    await inputLocator.dispatchEvent?.('change').catch(() => undefined);
    await inputLocator.dispatchEvent?.('input').catch(() => undefined);
    return { success: true, method: 'set_input_files', message: null };
  }

  protected async clickGoogleLensSearchSubmitIfPresent(): Promise<boolean> {
    const submitSelectors = [
      'button[aria-label*="Search"]',
      'button[aria-label*="search"]',
      'div[aria-label*="Search"] button',
      'form button[type="submit"]',
    ];

    return await this.clickFirstVisible(submitSelectors);
  }

  private async describeGoogleLensUploadEntryState(
    inputState: FileInputState
  ): Promise<GoogleLensUploadEntryState> {
    const searchTrigger = await this.findFirstVisibleInScopes(
      GOOGLE_LENS_ENTRY_TRIGGER_SELECTORS
    );
    const uploadTab = await this.findFirstVisibleInScopes(GOOGLE_LENS_UPLOAD_TAB_SELECTORS);
    const resultHintsVisible = await this.hasGoogleLensResultHints();
    const processingState = await this.readGoogleLensProcessingState();
    const captchaState = await this.detectGoogleLensCaptcha();
    const consentFrames = await this.listGoogleConsentFrames().catch(() => []);
    const loginState = await this.detectGoogleLoginSurface();

    return {
      currentUrl: this.page.url(),
      fileInputCount: inputState.inputCount,
      fileInputSelector: inputState.selector,
      fileInputScopeType: inputState.scopeType,
      fileInputFrameUrl: inputState.frameUrl,
      searchTriggerSelector: searchTrigger.selector,
      uploadTabSelector: uploadTab.selector,
      resultHintsVisible,
      processingVisible: processingState.processingVisible,
      resultShellVisible: processingState.resultShellVisible,
      captchaDetected: captchaState.detected,
      consentPresent: consentFrames.length > 0,
      consentFrameUrl: consentFrames[0]?.frameUrl ?? null,
      loginDetected: loginState.detected,
      loginReason: loginState.reason,
    };
  }

  private buildGoogleLensUploadEntryDetails(
    state: GoogleLensUploadEntryState
  ): Array<{ label: string; value?: string | null }> {
    return [
      { label: 'Current URL', value: state.currentUrl },
      { label: 'File input count', value: String(state.fileInputCount) },
      { label: 'File input selector', value: state.fileInputSelector },
      { label: 'File input scope', value: state.fileInputScopeType },
      { label: 'File input frame', value: state.fileInputFrameUrl },
      { label: 'Entry trigger', value: state.searchTriggerSelector },
      { label: 'Upload tab', value: state.uploadTabSelector },
      { label: 'Result hints visible', value: String(state.resultHintsVisible) },
      { label: 'Processing visible', value: String(state.processingVisible) },
      { label: 'Result shell visible', value: String(state.resultShellVisible) },
      { label: 'Captcha detected', value: String(state.captchaDetected) },
      { label: 'Consent frame', value: state.consentPresent ? state.consentFrameUrl : 'false' },
      { label: 'Google login detected', value: String(state.loginDetected) },
      { label: 'Google login reason', value: state.loginReason },
    ];
  }

  protected async waitForGoogleLensResultState(
    startingUrl: string,
    inputLocator: Locator | null,
    stepMeta: { attempt: number; candidateId: string; inputSource: string } | null
  ): Promise<TransitionState> {
    let deadline = Date.now() + 25_000;
    let extendedForProcessing = false;
    let lastProcessingState: ProcessingState | null = null;
    let lastObservedUrl = startingUrl;
    const resolveClosedPageTransition = (): TransitionState => {
      const currentUrl = this.safePageUrl() ?? lastObservedUrl;
      return {
        advanced: this.isGoogleCaptchaUrl(currentUrl),
        currentUrl,
        reason: this.isGoogleCaptchaUrl(currentUrl) ? 'captcha' : 'page_closed',
        processingState: lastProcessingState,
      };
    };

    while (Date.now() < deadline) {
      if (this.isPageClosed()) {
        return resolveClosedPageTransition();
      }

      const currentUrl = this.safePageUrl() ?? lastObservedUrl;
      lastObservedUrl = currentUrl;

      if (await this.isGoogleConsentPresent()) {
        await this.clickGoogleConsentIfPresent().catch(() => undefined);
        await this.wait(600);
        continue;
      }

      const processingState = await this.readGoogleLensProcessingState();
      if (processingState.processingVisible || processingState.resultShellVisible) {
        lastProcessingState = processingState;
      }

      const hasResultHints = await this.hasGoogleLensResultHints();
      if (hasResultHints) {
        return { advanced: true, currentUrl, reason: 'result_hints', processingState };
      }

      const captchaState = await this.detectGoogleLensCaptcha();
      if (captchaState.detected) {
        return {
          advanced: true,
          currentUrl: captchaState.currentUrl,
          reason: 'captcha',
          processingState,
        };
      }

      if (currentUrl !== startingUrl && !this.isGoogleImagesUploadEntryUrl(currentUrl)) {
        return {
          advanced: true,
          currentUrl,
          reason: 'url_changed',
          processingState: lastProcessingState,
        };
      }

      if (processingState.resultShellVisible) {
        return { advanced: true, currentUrl, reason: 'results_shell_visible', processingState };
      }

      if (inputLocator && (await inputLocator.count().catch(() => 0)) === 0) {
        if (!this.isGoogleImagesUploadEntryUrl(currentUrl)) {
          return { advanced: true, currentUrl, reason: 'input_replaced', processingState };
        }
      }

      if (processingState.processingVisible && !extendedForProcessing) {
        deadline = Math.max(deadline, Date.now() + 35_000);
        extendedForProcessing = true;

        if (stepMeta) {
          this.upsertScanStep({
            key: 'google_upload',
            status: 'running',
            candidateId: stepMeta.candidateId,
            candidateRank: stepMeta.attempt,
            inputSource: stepMeta.inputSource as never,
            resultCode: 'upload_processing',
            message: 'Google Lens accepted the image and is still processing it.',
            url: currentUrl,
          });
        }
      }

      await this.wait(500);
    }

    if (this.isPageClosed()) {
      return resolveClosedPageTransition();
    }

    const finalCurrentUrl = this.safePageUrl() ?? lastObservedUrl;
    const finalProcessingState = await this.readGoogleLensProcessingState().catch(
      () => lastProcessingState
    );
    const finalHasResultHints = await this.hasGoogleLensResultHints();

    if (finalHasResultHints) {
      return {
        advanced: true,
        currentUrl: finalCurrentUrl,
        reason: 'result_hints',
        processingState: finalProcessingState,
      };
    }

    const timeoutCaptchaState = await this.detectGoogleLensCaptcha();
    if (timeoutCaptchaState.detected) {
      return {
        advanced: true,
        currentUrl: timeoutCaptchaState.currentUrl,
        reason: 'captcha',
        processingState: finalProcessingState,
      };
    }

    if (finalCurrentUrl !== startingUrl && !this.isGoogleImagesUploadEntryUrl(finalCurrentUrl)) {
      return {
        advanced: true,
        currentUrl: finalCurrentUrl,
        reason: 'url_changed',
        processingState: finalProcessingState,
      };
    }

    if (finalProcessingState?.resultShellVisible) {
      return {
        advanced: true,
        currentUrl: finalCurrentUrl,
        reason: 'results_shell_visible',
        processingState: finalProcessingState,
      };
    }

    return {
      advanced: false,
      currentUrl: finalCurrentUrl,
      reason: finalProcessingState?.processingVisible ? 'upload_processing_timeout' : 'timeout',
      processingState: finalProcessingState,
    };
  }

  protected async hasGoogleLensResultHints(): Promise<boolean> {
    return await Promise.any(
      GOOGLE_LENS_RESULT_HINT_SELECTORS.map(async (selector) => {
        const locator = this.page.locator(selector).first();
        if ((await locator.count().catch(() => 0)) === 0) throw new Error('nf');
        if (!(await locator.isVisible().catch(() => false))) throw new Error('nv');
        return true;
      })
    ).catch(() => false);
  }

  protected isGoogleImagesUploadEntryUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname;
      if (host === 'images.google.com' && (path === '/' || path === '')) return true;
      if (host === 'lens.google.com' && (path.startsWith('/upload') || path === '/' || path === '')) return true;
      if (host.startsWith('www.google.') && (path === '/imghp' || path === '/images')) return true;
    } catch {
      // ignore
    }
    return false;
  }

  private normalizeSurfaceText(value: unknown): string {
    return (typeof value === 'string' ? value : '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private async isGoogleConsentPresent(): Promise<boolean> {
    return (await this.listGoogleConsentFrames()).length > 0;
  }
}
