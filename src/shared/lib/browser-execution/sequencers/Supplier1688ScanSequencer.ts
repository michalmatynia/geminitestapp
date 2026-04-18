import type { Locator } from 'playwright';
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
  type ProductScanVerificationReview,
} from '@/features/products/server/product-scan-ai-evaluator';
import {
  SUPPLIER_1688_DEFAULT_SELECTOR_RUNTIME,
  type Supplier1688SelectorRuntime,
} from '../selectors/supplier-1688';
import type { ProductScanSequenceEntry } from '../product-scan-step-sequencer';
import { ProductScanSequencer, type ProductScanSequencerContext } from './ProductScanSequencer';

// ─── Input types ───────────────────────────────────────────────────────────────

export interface Supplier1688ScanImageCandidate {
  id?: string | null;
  url?: string | null;
  localPath?: string | null;
  buffer?: Buffer | null;
  rank?: number | null;
}

export interface Supplier1688ScanInput {
  imageCandidates?: Supplier1688ScanImageCandidate[];
  directSupplierCandidateUrls?: string[];
  directSupplierCandidateUrl?: string;
  directMatchedImageId?: string;
  directSupplierCandidateRank?: number;
  scanner1688StartUrl?: string;
  productName?: string;
  candidateResultLimit?: number;
  minimumCandidateScore?: number;
  maxExtractedImages?: number;
  allowUrlImageSearchFallback?: boolean;
  allowManualVerification?: boolean;
  manualVerificationTimeoutMs?: number;
  stepSequenceKey?: string | null;
  stepSequence?: ProductScanSequenceEntry[] | null;
  selectorRuntime?: Partial<Supplier1688SelectorRuntime> | null;
}

// ─── Internal types ────────────────────────────────────────────────────────────

type BarrierKind = 'login' | 'captcha' | 'unknown' | 'page_closed' | null;
type ScanStage = '1688_open' | '1688_upload' | 'supplier_open' | null;

interface BarrierState {
  blocked: boolean;
  barrierKind: BarrierKind;
  currentUrl: string;
  message: string | null;
}

interface ReadyState {
  ready: boolean;
  currentUrl: string;
  reason: string;
  message: string | null;
  entrySelector?: string | null;
  resultShellSelector?: string | null;
  supplierReadySelector?: string | null;
}

interface SupplierProductData {
  url: string;
  title: string | null;
  price: string | null;
  description: string | null;
  imageUrls: string[];
  supplierDetails: SupplierDetails | null;
}

interface SupplierDetails {
  shopName: string | null;
  location: string | null;
  minOrderQuantity: string | null;
  attributes: Array<{ label: string; value: string }>;
}

interface CaptchaHandleResult {
  resolved: boolean;
  captchaEncountered: boolean;
  captchaRequired: boolean;
  currentUrl: string;
  message: string | null;
  failureCode: string | null;
}

interface Supplier1688VerificationSnapshotState {
  barrier: BarrierState;
  readyState: ReadyState | null;
  recoveryReady: boolean;
  reuploadRequired: boolean;
}

type Supplier1688VerificationObservation =
  ProductScanVerificationObservationBase<PlaywrightObservationLoopDecision> & {
  blocked: boolean;
  barrierKind: BarrierKind;
  stage: ScanStage;
  barrierMessage: string | null;
  recoveryReason: string | null;
  recoveryMessage: string | null;
};

const SUPPLIER_VERIFICATION_REVIEW_DETAIL_DESCRIPTORS = [
  { label: 'Blocked', value: 'blocked' },
  { label: 'Barrier kind', value: 'barrierKind' },
  { label: 'Barrier message', value: 'barrierMessage' },
  { label: 'Recovery reason', value: 'recoveryReason' },
  { label: 'Recovery message', value: 'recoveryMessage' },
] as const;

type SupplierVerificationObservationCaptureParams = {
  stage: ScanStage;
  candidateId: string;
  candidateRank: number;
  iteration: number;
  loopDecision: PlaywrightObservationLoopDecision;
  blocked: boolean;
  barrierKind: BarrierKind;
  barrierMessage: string | null;
  stableForMs: number | null;
  currentUrl: string | null;
  recoveryReason: string | null;
  recoveryMessage: string | null;
};

type SupplierVerificationLoopBaseParams = {
  stage: ScanStage;
  candidateId: string;
  candidateRank: number;
  resolveFallbackUrl: () => string;
};

const isSelectorRuntimeRecord = (
  value: unknown
): value is Partial<Record<keyof Supplier1688SelectorRuntime, unknown>> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const readSelectorStringArray = (
  value: unknown,
  fallback: readonly string[]
): readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string')
    ? value
    : fallback;

const readSelectorString = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

const normalizeSupplier1688SelectorRuntime = (
  value: unknown
): Supplier1688SelectorRuntime => {
  const source = isSelectorRuntimeRecord(value) ? value : {};
  const fallback = SUPPLIER_1688_DEFAULT_SELECTOR_RUNTIME;
  return {
    fileInputSelectors: readSelectorStringArray(source.fileInputSelectors, fallback.fileInputSelectors),
    imageSearchEntrySelectors: readSelectorStringArray(
      source.imageSearchEntrySelectors,
      fallback.imageSearchEntrySelectors
    ),
    searchResultReadySelectors: readSelectorStringArray(
      source.searchResultReadySelectors,
      fallback.searchResultReadySelectors
    ),
    supplierReadySelectors: readSelectorStringArray(
      source.supplierReadySelectors,
      fallback.supplierReadySelectors
    ),
    submitSearchSelectors: readSelectorStringArray(
      source.submitSearchSelectors,
      fallback.submitSearchSelectors
    ),
    loginTextHints: readSelectorStringArray(source.loginTextHints, fallback.loginTextHints),
    captchaTextHints: readSelectorStringArray(source.captchaTextHints, fallback.captchaTextHints),
    accessBlockTextHints: readSelectorStringArray(
      source.accessBlockTextHints,
      fallback.accessBlockTextHints
    ),
    barrierTitleHints: readSelectorStringArray(
      source.barrierTitleHints,
      fallback.barrierTitleHints
    ),
    hardBlockingSelectors: readSelectorStringArray(
      source.hardBlockingSelectors,
      fallback.hardBlockingSelectors
    ),
    softBlockingSelectors: readSelectorStringArray(
      source.softBlockingSelectors,
      fallback.softBlockingSelectors
    ),
    searchBodySignalPattern: readSelectorString(
      source.searchBodySignalPattern,
      fallback.searchBodySignalPattern
    ),
    supplierBodySignalPattern: readSelectorString(
      source.supplierBodySignalPattern,
      fallback.supplierBodySignalPattern
    ),
    priceTextPatternSource: readSelectorString(
      source.priceTextPatternSource,
      fallback.priceTextPatternSource
    ),
  };
};

const SUPPLIER_VERIFICATION_LOOP_PROFILE =
  createPlaywrightVerificationReviewLoopProfile<
    Supplier1688VerificationSnapshotState,
    SupplierVerificationLoopBaseParams,
    SupplierVerificationObservationCaptureParams,
    Supplier1688VerificationObservation
  >({
    key: 'supplier_verification_review',
    subject: 'supplier verification barrier',
    runningMessage: 'Capturing supplier verification barrier for AI review.',
    historyArtifactKey: '1688-verification-review-history',
    artifactKeyPrefix: '1688-verification-review',
    group: 'supplier',
    label: 'Inspect supplier verification barrier',
    analysisFailureLogKey: '1688.verification.review.analysis_failed',
    screenshotFailureLogKey: '1688.verification.review.screenshot_failed',
    evaluationProvider: '1688',
    resolveEvaluationStage: (params) => params.stage ?? '1688_barrier',
    evaluationObjective:
      'Describe the visible 1688 login, captcha, or access barrier for manual handling. If the barrier appears cleared, say so explicitly. Do not solve it.',
    buildObservationExtra: (params) => ({
      blocked: params.blocked,
      barrierKind: params.barrierKind,
      stage: params.stage,
      barrierMessage: params.barrierMessage,
      recoveryReason: params.recoveryReason,
      recoveryMessage: params.recoveryMessage,
    }),
    buildArtifactSegments: (params) => [
      slugifyPlaywrightVerificationReviewSegment(params.stage, 'unknown-stage'),
      slugifyPlaywrightVerificationReviewSegment(params.candidateId, 'unknown-candidate'),
      `rank-${String(params.candidateRank)}`,
      `iter-${String(params.iteration)}`,
    ],
    buildFingerprintPartMap: (params) => ({
      stage: params.stage ?? 'unknown_stage',
      candidateId: params.candidateId,
      candidateRank: params.candidateRank,
      loopDecision: params.loopDecision,
      blocked: params.blocked,
      barrierKind: params.barrierKind ?? 'none',
      recoveryReason: params.recoveryReason ?? '',
    }),
    detailDescriptors: SUPPLIER_VERIFICATION_REVIEW_DETAIL_DESCRIPTORS,
    buildLoopCaptureParams: ({ iteration, decision, snapshot, stableForMs }, baseParams) => ({
      stage: baseParams.stage,
      candidateId: baseParams.candidateId,
      candidateRank: baseParams.candidateRank,
      iteration,
      loopDecision: decision,
      blocked: snapshot.blocked,
      barrierKind: snapshot.state?.barrier.barrierKind ?? null,
      barrierMessage: snapshot.state?.barrier.message ?? null,
      stableForMs,
      currentUrl:
        snapshot.currentUrl ??
        snapshot.state?.readyState?.currentUrl ??
        snapshot.state?.barrier.currentUrl ??
        baseParams.resolveFallbackUrl(),
      recoveryReason: snapshot.state?.readyState?.reason ?? null,
      recoveryMessage: snapshot.state?.readyState?.message ?? null,
    }),
  });

// ─── Main sequencer ────────────────────────────────────────────────────────────

export class Supplier1688ScanSequencer extends ProductScanSequencer {
  private readonly input: Supplier1688ScanInput;
  private readonly selectorRuntime: Supplier1688SelectorRuntime;

  private readonly DEFAULT_1688_IMAGE_SEARCH_START_URL =
    'https://s.1688.com/youyuan/index.htm?tab=imageSearch';
  private readonly PRICE_TEXT_PATTERN: RegExp;
  private readonly SEARCH_BODY_SIGNAL: RegExp;
  private readonly SUPPLIER_BODY_SIGNAL: RegExp;
  private readonly supplierVerificationState = createProductScanVerificationState<
    ProductScanVerificationReview,
    Supplier1688VerificationObservation
  >();

  private get scannerStartUrl(): string {
    return this.resolve1688ImageSearchStartUrl(this.input.scanner1688StartUrl);
  }

  private get candidateResultLimit(): number {
    const v = this.input.candidateResultLimit;
    return typeof v === 'number' && Number.isFinite(v) && v > 0
      ? Math.min(20, Math.max(1, Math.trunc(v)))
      : 8;
  }

  constructor(context: ProductScanSequencerContext, input: Supplier1688ScanInput = {}) {
    super(context);
    this.input = input;
    this.selectorRuntime = normalizeSupplier1688SelectorRuntime(input.selectorRuntime);
    this.PRICE_TEXT_PATTERN = new RegExp(this.selectorRuntime.priceTextPatternSource);
    this.SEARCH_BODY_SIGNAL = new RegExp(this.selectorRuntime.searchBodySignalPattern);
    this.SUPPLIER_BODY_SIGNAL = new RegExp(this.selectorRuntime.supplierBodySignalPattern);
  }

  protected override async emitResult(payload: Record<string, unknown>): Promise<void> {
    await super.emitResult({
      ...buildProductScanVerificationDiagnosticsPayloadFromState({
        reviewKey: 'supplierVerificationReview',
        observationsKey: 'supplierVerificationObservations',
        state: this.supplierVerificationState,
      }),
      ...payload,
    });
  }

  // ─── Abstract implementation ─────────────────────────────────────────────────

  async scan(): Promise<void> {
    const imageCandidates = Array.isArray(this.input.imageCandidates)
      ? this.input.imageCandidates
      : [];

    const directCandidateUrls = Array.isArray(this.input.directSupplierCandidateUrls)
      ? this.input.directSupplierCandidateUrls.filter(Boolean)
      : this.input.directSupplierCandidateUrl
        ? [this.input.directSupplierCandidateUrl]
        : [];

    this.seedStepSequence({
      defaultSequenceKey:
        directCandidateUrls.length > 0
          ? 'supplier_direct_candidate_followup'
          : 'supplier_reverse_image_scan_browser',
      sequenceKey: this.normalizeText(this.input.stepSequenceKey),
      customSequence: Array.isArray(this.input.stepSequence)
        ? this.input.stepSequence
        : null,
    });

    // ── Validate ──────────────────────────────────────────────────────────────
    this.upsertScanStep({ key: 'validate', status: 'running' });

    if (imageCandidates.length === 0 && directCandidateUrls.length === 0) {
      this.upsertScanStep({
        key: 'validate',
        status: 'failed',
        resultCode: 'missing_image_source',
        message: 'No image candidates or direct supplier URLs were provided.',
      });
      await this.emitResult({
        status: 'failed',
        title: null, price: null, url: null, description: null,
        message: 'No image candidates or direct supplier URLs were provided.',
        stage: 'validate',
      });
      return;
    }

    this.upsertScanStep({ key: 'validate', status: 'completed', resultCode: 'ok' });

    // ── Direct URL shortcut ───────────────────────────────────────────────────
    if (directCandidateUrls.length > 0) {
      await this.processSupplierCandidateUrls(directCandidateUrls, {
        matchedImageId: this.normalizeText(this.input.directMatchedImageId),
        firstCandidateRank: this.input.directSupplierCandidateRank ?? 1,
      });
      return;
    }

    // ── Apply natural browser setup ────────────────────────────────────────────
    await this.applyNaturalBrowserSetup();

    // ── Select image candidate ────────────────────────────────────────────────
    const selectedCandidate = imageCandidates[0]!;
    const candidateId = this.normalizeText(selectedCandidate.id) ?? 'candidate_1';
    const candidateRank = typeof selectedCandidate.rank === 'number' ? selectedCandidate.rank : 1;

    // ── Open 1688 image search ────────────────────────────────────────────────
    const openResult = await this.open1688ImageSearch({ candidateId, candidateRank });
    if (!openResult.success) {
      await this.emitResult({
        status: 'failed',
        title: null, price: null, url: null, description: null,
        message: openResult.message,
        stage: '1688_open',
      });
      return;
    }

    // ── Upload image ──────────────────────────────────────────────────────────
    let uploadSucceeded = false;

    const uploadResult = await this.upload1688Image({ candidate: selectedCandidate, candidateId, candidateRank });

    if (uploadResult.captchaRequired) {
      const captchaResult = await this.handle1688Captcha('1688_upload', { candidateId, candidateRank }, null);
      if (!captchaResult.resolved) {
        await this.emitResult({
          status: captchaResult.captchaRequired ? 'captcha_required' : 'failed',
          title: null, price: null, url: null, description: null,
          message: captchaResult.message,
          stage: '1688_upload',
        });
        return;
      }

      // Captcha resolved. Check whether the search already produced results
      // (1688 sometimes auto-searches when captcha is cleared), or re-upload.
      const earlyUrls = await this.collect1688CandidateUrls().catch(() => [] as string[]);
      if (earlyUrls.length > 0) {
        uploadSucceeded = true;
      } else {
        const retryUpload = await this.upload1688Image({ candidate: selectedCandidate, candidateId, candidateRank });
        if (!retryUpload.success) {
          await this.emitResult({
            status: retryUpload.captchaRequired ? 'captcha_required' : 'failed',
            title: null, price: null, url: null, description: null,
            message: retryUpload.message ?? '1688 image upload failed after captcha recovery.',
            stage: '1688_upload',
          });
          return;
        }
        uploadSucceeded = true;
      }
    } else {
      uploadSucceeded = uploadResult.success;
    }

    if (!uploadSucceeded) {
      await this.emitResult({
        status: 'failed',
        title: null, price: null, url: null, description: null,
        message: uploadResult.message ?? '1688 image upload did not succeed.',
        stage: '1688_upload',
      });
      return;
    }

    // ── Collect candidates ────────────────────────────────────────────────────
    const collectResult = await this.collect1688Candidates({ candidateId, candidateRank });
    if (collectResult.urls.length === 0) {
      await this.emitResult({
        status: 'failed',
        title: null, price: null, url: null, description: null,
        message: collectResult.message ?? 'No 1688 supplier candidate URLs were found.',
        stage: '1688_collect_candidates',
        candidateUrls: [],
      });
      return;
    }

    // ── Process supplier candidates ───────────────────────────────────────────
    await this.processSupplierCandidateUrls(collectResult.urls, { matchedImageId: candidateId });
  }

  // ─── 1688 image search: open ─────────────────────────────────────────────────

  protected async open1688ImageSearch(params: {
    candidateId: string;
    candidateRank: number;
  }): Promise<{ success: boolean; message: string | null }> {
    const { candidateId, candidateRank } = params;

    this.upsertScanStep({
      key: '1688_open',
      status: 'running',
      candidateId,
      candidateRank,
      message: 'Opening 1688 image search.',
    });

    try {
      await this.page.goto(this.scannerStartUrl, {
        waitUntil: 'commit',
        timeout: 30_000,
      });
    } catch {
      this.log('1688 image search navigation timed out; continuing with the partially loaded page.', {
        url: this.page.url(),
      });
    }

    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);

    if (this.isChromeNavigationErrorUrl(this.page.url())) {
      const message = '1688 image search page could not be opened in the browser runtime.';
      this.upsertScanStep({
        key: '1688_open',
        status: 'failed',
        candidateId,
        candidateRank,
        resultCode: 'navigation_failed',
        message,
        url: this.page.url(),
      });
      return { success: false, message };
    }

    const captchaState = await this.handle1688Captcha('1688_open', { candidateId, candidateRank }, null);
    if (!captchaState.resolved) {
      this.upsertScanStep({
        key: '1688_open',
        status: captchaState.captchaRequired ? 'running' : 'failed',
        candidateId,
        candidateRank,
        resultCode: captchaState.failureCode ?? 'captcha_required',
        message: captchaState.message,
        url: this.page.url(),
      });
      return { success: false, message: captchaState.message };
    }

    this.upsertScanStep({
      key: '1688_open',
      status: 'completed',
      candidateId,
      candidateRank,
      resultCode: 'ok',
      message: '1688 image search opened.',
      url: this.page.url(),
    });

    return { success: true, message: null };
  }

  // ─── 1688 image search: upload ───────────────────────────────────────────────

  protected async upload1688Image(params: {
    candidate: Supplier1688ScanImageCandidate;
    candidateId: string;
    candidateRank: number;
  }): Promise<{ success: boolean; captchaRequired: boolean; message: string | null }> {
    const { candidate, candidateId, candidateRank } = params;

    this.upsertScanStep({
      key: '1688_upload',
      status: 'running',
      candidateId,
      candidateRank,
      message: 'Uploading image to 1688 search.',
    });

    // Find file input — on 1688 it is often hidden behind the image-search entry trigger.
    // Try clicking the entry trigger first if no file input is immediately visible.
    let fileInput = await this.findFirstVisibleFileInput();

    if (!fileInput) {
      const entryClicked = await this.clickFirstVisible(this.selectorRuntime.imageSearchEntrySelectors);
      if (entryClicked) {
        await this.humanWait(800, 1_600);
        fileInput = await this.findFirstVisibleFileInput() ?? await this.findFirstAccessibleFileInput();
      }
    }

    if (!fileInput) {
      const message = '1688 image upload control did not become available after opening image search.';
      this.upsertScanStep({
        key: '1688_upload',
        status: 'failed',
        candidateId,
        candidateRank,
        resultCode: 'file_input_missing',
        message,
        url: this.page.url(),
      });
      return { success: false, captchaRequired: false, message };
    }

    try {
      if (candidate.localPath) {
        await fileInput.setInputFiles(candidate.localPath);
      } else if (candidate.buffer) {
        await fileInput.setInputFiles({
          name: `image_${candidateId}.jpg`,
          mimeType: 'image/jpeg',
          buffer: candidate.buffer,
        });
      } else if (candidate.url) {
        // URL-based fallback: use entry selector if available
        const entrySelector = await this.findFirstVisibleSelector(
          this.selectorRuntime.imageSearchEntrySelectors
        );
        if (!entrySelector) {
          const message = 'Could not find 1688 image search entry for URL-based upload.';
          this.upsertScanStep({
            key: '1688_upload',
            status: 'failed',
            candidateId,
            candidateRank,
            resultCode: 'missing_image_source',
            message,
          });
          return { success: false, captchaRequired: false, message };
        }
        await this.clickFirstVisible(this.selectorRuntime.imageSearchEntrySelectors);
        await this.humanWait(600, 1_200);
      } else {
        const message = 'No usable image source provided for 1688 upload.';
        this.upsertScanStep({
          key: '1688_upload',
          status: 'failed',
          candidateId,
          candidateRank,
          resultCode: 'missing_image_source',
          message,
        });
        return { success: false, captchaRequired: false, message };
      }
    } catch {
      const message = 'Failed to supply image file to 1688 upload input.';
      this.upsertScanStep({
        key: '1688_upload',
        status: 'failed',
        candidateId,
        candidateRank,
        resultCode: 'set_input_files_failed',
        message,
      });
      return { success: false, captchaRequired: false, message };
    }

    // Wait for upload confirmation and submit (or auto-search detection)
    await this.humanWait(1_200, 2_400);
    const submitted = await this.submit1688UploadedImageSearch();

    if (!submitted) {
      this.upsertScanStep({
        key: '1688_upload',
        status: 'failed',
        candidateId,
        candidateRank,
        resultCode: 'submit_failed',
        message: '1688 image upload did not trigger a search — no submit button found and no early results detected.',
        url: this.page.url(),
      });
      return { success: false, captchaRequired: false, message: '1688 image search submit failed.' };
    }

    // Check for barriers after submit
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
    const barrier = await this.detect1688AccessBarrier('1688_upload');

    if (barrier.blocked) {
      if (barrier.barrierKind === 'captcha' || barrier.barrierKind === 'login') {
        this.upsertScanStep({
          key: '1688_upload',
          status: 'running',
          candidateId,
          candidateRank,
          resultCode: barrier.barrierKind === 'captcha' ? 'captcha_required' : 'login_required',
          message: barrier.message,
          url: barrier.currentUrl,
        });
        return { success: false, captchaRequired: true, message: barrier.message };
      }

      const message = barrier.message ?? '1688 blocked access after image upload.';
      this.upsertScanStep({
        key: '1688_upload',
        status: 'failed',
        candidateId,
        candidateRank,
        resultCode: 'blocked',
        message,
        url: barrier.currentUrl,
      });
      return { success: false, captchaRequired: false, message };
    }

    this.upsertScanStep({
      key: '1688_upload',
      status: 'completed',
      candidateId,
      candidateRank,
      resultCode: 'ok',
      message: 'Image uploaded and 1688 search submitted.',
      url: this.page.url(),
    });

    return { success: true, captchaRequired: false, message: null };
  }

  // ─── 1688: collect candidates ────────────────────────────────────────────────

  protected async collect1688Candidates(params: {
    candidateId: string;
    candidateRank: number;
  }): Promise<{ urls: string[]; message: string | null }> {
    const { candidateId, candidateRank } = params;

    this.upsertScanStep({
      key: '1688_collect_candidates',
      status: 'running',
      candidateId,
      candidateRank,
      message: 'Collecting 1688 supplier candidate URLs.',
      url: this.page.url(),
    });

    await this.page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
    await this.humanWait(800, 1_800);

    // 1688 SPA may render results incrementally — retry a few times before giving up.
    let urls = await this.collect1688CandidateUrls();
    if (urls.length === 0) {
      for (let attempt = 0; attempt < 3; attempt++) {
        await this.humanWait(2_000, 3_000);
        await this.page.waitForLoadState('domcontentloaded', { timeout: 8_000 }).catch(() => undefined);
        urls = await this.collect1688CandidateUrls();
        if (urls.length > 0) break;
      }
    }

    if (urls.length === 0) {
      this.upsertScanStep({
        key: '1688_collect_candidates',
        status: 'failed',
        candidateId,
        candidateRank,
        resultCode: 'no_candidates',
        message: '1688 search results did not yield any supplier offer URLs.',
        url: this.page.url(),
      });
      return { urls: [], message: 'No 1688 supplier candidates found.' };
    }

    this.upsertScanStep({
      key: '1688_collect_candidates',
      status: 'completed',
      candidateId,
      candidateRank,
      resultCode: 'ok',
      message: `Found ${urls.length} supplier candidate URL(s).`,
      url: this.page.url(),
      details: urls.slice(0, 5).map((url, i) => ({ label: `Candidate ${i + 1}`, value: url })),
    });

    return { urls, message: null };
  }

  // ─── Supplier candidate processing ─────────────────────────────────────────

  protected async processSupplierCandidateUrls(
    urls: string[],
    meta: { matchedImageId: string | null; firstCandidateRank?: number }
  ): Promise<void> {
    const candidateResults: Array<{ url: string; rank: number }> = [];
    let bestResult: SupplierProductData | null = null;
    let bestScore = -1;

    const limit = Math.min(urls.length, this.candidateResultLimit);

    for (let i = 0; i < limit; i++) {
      const url = urls[i]!;
      const candidateRank = (meta.firstCandidateRank ?? 1) + i;
      const candidateId = `supplier_${i + 1}`;

      candidateResults.push({ url, rank: candidateRank });

      const result = await this.probeSupplierCandidate({ url, candidateId, candidateRank });
      if (!result) continue;

      const score = this.scoreSupplierResult(result);
      if (score > bestScore) {
        bestScore = score;
        bestResult = result;
      }
    }

    if (!bestResult) {
      await this.emitResult({
        status: 'no_match',
        title: null, price: null, url: null, description: null,
        message: 'None of the 1688 supplier candidates yielded usable product data.',
        stage: 'supplier_extract',
        matchedImageId: meta.matchedImageId,
        candidateUrls: urls,
        candidateResults,
      });
      return;
    }

    await this.emitResult({
      status: 'matched',
      title: bestResult.title,
      price: bestResult.price,
      url: bestResult.url,
      description: bestResult.description,
      imageUrls: bestResult.imageUrls,
      supplierDetails: bestResult.supplierDetails,
      matchedImageId: meta.matchedImageId,
      candidateUrls: urls,
      candidateResults,
      stage: 'supplier_extract',
    });
  }

  // ─── Supplier: probe a single candidate ────────────────────────────────────

  protected async probeSupplierCandidate(params: {
    url: string;
    candidateId: string;
    candidateRank: number;
  }): Promise<SupplierProductData | null> {
    const { url, candidateId, candidateRank } = params;

    // ── Open ──────────────────────────────────────────────────────────────────
    this.upsertScanStep({
      key: 'supplier_open',
      status: 'running',
      candidateId,
      candidateRank,
      message: 'Opening 1688 supplier product page.',
      url,
    });

    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    } catch {
      this.upsertScanStep({
        key: 'supplier_open',
        status: 'failed',
        candidateId,
        candidateRank,
        resultCode: 'navigation_failed',
        message: '1688 supplier page could not be opened.',
        url: this.page.url(),
      });
      return null;
    }

    await this.page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
    await this.humanWait(600, 1_400);

    // ── Overlays / barriers ───────────────────────────────────────────────────
    this.upsertScanStep({
      key: 'supplier_overlays',
      status: 'running',
      candidateId,
      candidateRank,
      message: 'Checking for 1688 access barriers on supplier page.',
      url: this.page.url(),
    });

    const captchaState = await this.handle1688Captcha('supplier_open', { candidateId, candidateRank }, url);

    if (!captchaState.resolved) {
      this.upsertScanStep({
        key: 'supplier_overlays',
        status: captchaState.captchaRequired ? 'running' : 'failed',
        candidateId,
        candidateRank,
        resultCode: captchaState.failureCode ?? 'blocked',
        message: captchaState.message,
        url: this.page.url(),
      });
      return null;
    }

    this.upsertScanStep({
      key: 'supplier_overlays',
      status: 'completed',
      candidateId,
      candidateRank,
      resultCode: 'ok',
      message: 'No blocking barriers on 1688 supplier page.',
      url: this.page.url(),
    });

    // ── Content ready ─────────────────────────────────────────────────────────
    this.upsertScanStep({
      key: 'supplier_content_ready',
      status: 'running',
      candidateId,
      candidateRank,
      message: 'Waiting for 1688 supplier content.',
      url: this.page.url(),
    });

    const contentReady = await this.waitForSupplierContent(url);

    if (!contentReady) {
      this.upsertScanStep({
        key: 'supplier_content_ready',
        status: 'failed',
        candidateId,
        candidateRank,
        resultCode: 'content_timeout',
        message: '1688 supplier product content did not become visible.',
        url: this.page.url(),
      });
      return null;
    }

    this.upsertScanStep({
      key: 'supplier_content_ready',
      status: 'completed',
      candidateId,
      candidateRank,
      resultCode: 'ok',
      message: '1688 supplier product content is visible.',
      url: this.page.url(),
    });

    // ── Probe ─────────────────────────────────────────────────────────────────
    this.upsertScanStep({
      key: 'supplier_probe',
      status: 'running',
      candidateId,
      candidateRank,
      message: 'Probing 1688 supplier product page.',
      url: this.page.url(),
    });

    const normalizedUrl = this.normalize1688OfferUrl(this.page.url());

    this.upsertScanStep({
      key: 'supplier_probe',
      status: 'completed',
      candidateId,
      candidateRank,
      resultCode: normalizedUrl ? 'ok' : 'url_not_offer',
      message: normalizedUrl ? 'Confirmed 1688 offer page.' : 'Page URL does not look like a 1688 offer.',
      url: this.page.url(),
    });

    // ── Extract ───────────────────────────────────────────────────────────────
    this.upsertScanStep({
      key: 'supplier_extract',
      status: 'running',
      candidateId,
      candidateRank,
      message: 'Extracting 1688 supplier product details.',
      url: this.page.url(),
    });

    const productData = await this.extractSupplierData(url);

    if (!productData.title && !productData.price) {
      this.upsertScanStep({
        key: 'supplier_extract',
        status: 'failed',
        candidateId,
        candidateRank,
        resultCode: 'extract_empty',
        message: 'Could not extract any usable product data from the 1688 supplier page.',
        url: this.page.url(),
      });
      return null;
    }

    this.upsertScanStep({
      key: 'supplier_extract',
      status: 'completed',
      candidateId,
      candidateRank,
      resultCode: 'ok',
      message: '1688 supplier details extracted.',
      url: this.page.url(),
      details: [
        { label: 'Title', value: productData.title?.slice(0, 80) ?? undefined },
        { label: 'Price', value: productData.price ?? undefined },
      ].filter((d) => d.value != null) as Array<{ label: string; value: string }>,
    });

    return productData;
  }

  // ─── Supplier content wait ───────────────────────────────────────────────────

  protected async waitForSupplierContent(_url: string): Promise<boolean> {
    const currentUrl = this.page.url();
    const offerUrl = this.normalize1688OfferUrl(currentUrl);
    if (!offerUrl) return false;

    const visible = await Promise.any(
      this.selectorRuntime.supplierReadySelectors.map(async (selector) => {
        const locator = this.page.locator(selector).first();
        await locator.waitFor({ state: 'visible', timeout: 8_000 });
        return selector;
      })
    ).catch(() => null);

    if (visible) return true;

    // Fallback: check body text for supplier signals
    const bodyText = (
      await this.page.locator('body').first().textContent().catch(() => '')
    )?.toLowerCase() ?? '';
    return this.PRICE_TEXT_PATTERN.test(bodyText) || this.SUPPLIER_BODY_SIGNAL.test(bodyText);
  }

  // ─── Supplier data extraction ────────────────────────────────────────────────

  protected async extractSupplierData(originalUrl: string): Promise<SupplierProductData> {
    const currentUrl = this.page.url();

    const [title, price, description] = await Promise.all([
      this.readFirstText([
        'h1',
        '[class*="product-name"]',
        '[class*="productName"]',
        '[class*="mod-product-name"]',
        '[data-spm*="title"] h1',
        '[class*="title"]',
        '[data-testid*="title"]',
      ]),
      this.readFirstText([
        '[class*="priceText"]',
        '[class*="priceNum"]',
        '[class*="price-original"]',
        '[class*="price-text"]',
        '[class*="price"]',
        '[data-testid*="price"]',
        '[data-spm*="price"]',
        'span[class*="价格"]',
        '.price',
      ]),
      this.readFirstText([
        '[class*="detail-desc"]',
        '[class*="product-desc"]',
        '[class*="productDesc"]',
        '[class*="description"]',
        '#description',
        '[data-testid*="description"]',
      ]),
    ]);

    const imageUrls = await this.extractSupplierImageUrls();
    const supplierDetails = await this.extractSupplierDetails();

    return {
      url: currentUrl || originalUrl,
      title,
      price,
      description,
      imageUrls,
      supplierDetails,
    };
  }

  private async extractSupplierImageUrls(): Promise<string[]> {
    const raw = await this.page
      .locator('img[src], img[data-src], img[data-original]')
      .evaluateAll((imgs) =>
        imgs
          .map(
            (img) =>
              img.getAttribute('data-original') ??
              img.getAttribute('data-src') ??
              img.getAttribute('src') ??
              null
          )
          .filter((src): src is string => typeof src === 'string' && src.startsWith('http'))
      )
      .catch(() => [] as string[]);

    const seen = new Set<string>();
    const result: string[] = [];
    const maxImages = typeof this.input.maxExtractedImages === 'number'
      ? Math.min(20, this.input.maxExtractedImages)
      : 12;

    for (const url of raw) {
      if (seen.has(url)) continue;
      seen.add(url);
      result.push(url);
      if (result.length >= maxImages) break;
    }
    return result;
  }

  private async extractSupplierDetails(): Promise<SupplierDetails | null> {
    try {
      const shopName = await this.readFirstText([
        'a[href*="shop.1688.com"]',
        'a[href*="winport"]',
        '[class*="shopName"]',
        '[class*="shop-name"]',
        '[class*="storeName"]',
        '[class*="store-name"]',
        '[class*="shop"]',
        '[class*="store"]',
      ]);

      const location = await this.readFirstText([
        '[class*="location"]',
        '[class*="address"]',
        '[class*="areaText"]',
        '[data-testid*="location"]',
        'td:has-text("所在地"), td:has-text("发货地")',
      ]);

      const minOrderQuantity = await this.readFirstText([
        '[class*="minOrder"]',
        '[class*="min-order"]',
        '[class*="minNum"]',
        'td:has-text("起订量")',
        'td:has-text("最小起订量")',
        '[class*="起订"]',
      ]);

      const attributes = await this.page
        .evaluate(() => {
          const pairs: Array<{ label: string; value: string }> = [];
          document.querySelectorAll('table tr, [class*="attr"] li').forEach((row) => {
            const cells = row.querySelectorAll('td, th, span');
            if (cells.length >= 2) {
              const label = (cells[0]?.textContent ?? '').replace(/\s+/g, ' ').trim();
              const value = (cells[1]?.textContent ?? '').replace(/\s+/g, ' ').trim();
              if (label && value && label.length < 80) {
                pairs.push({ label, value });
              }
            }
          });
          return pairs.slice(0, 30);
        })
        .catch(() => [] as Array<{ label: string; value: string }>);

      if (!shopName && !location && !minOrderQuantity && attributes.length === 0) {
        return null;
      }

      return { shopName, location, minOrderQuantity, attributes };
    } catch {
      return null;
    }
  }

  // ─── Candidate URL collection ────────────────────────────────────────────────

  protected async collect1688CandidateUrls(): Promise<string[]> {
    const raw = await this.page
      .locator(this.selectorRuntime.searchResultReadySelectors.join(', '))
      .evaluateAll((nodes) =>
        nodes
          .map((node) => (node instanceof HTMLAnchorElement ? node.href : null))
          .filter((href): href is string => typeof href === 'string' && href.startsWith('http'))
      )
      .catch(() => [] as string[]);

    const seen = new Set<string>();
    const result: string[] = [];

    for (const href of raw) {
      const normalized = this.normalize1688OfferUrl(href);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(normalized);
      if (result.length >= this.candidateResultLimit) break;
    }

    return result;
  }

  // ─── Access barrier detection ────────────────────────────────────────────────

  protected async detect1688AccessBarrier(stage: ScanStage): Promise<BarrierState> {
    const currentUrl = this.page.url();
    const normalizedUrl = currentUrl.toLowerCase();
    const pageTitleText = (
      await this.page.title().catch(() => '')
    ).toLowerCase();
    const bodyText = (
      await this.page.locator('body').first().innerText().catch(() => '')
    ).toLowerCase();

    const candidateUrls = await this.collect1688CandidateUrls().catch(() => [] as string[]);
    const normalizedOfferUrl = this.normalize1688OfferUrl(currentUrl);
    const fileInput = await this.findFirstVisibleFileInput();
    const entrySelector = await this.findFirstVisibleSelector(
      this.selectorRuntime.imageSearchEntrySelectors
    );
    const resultShellSelector = await this.findFirstVisibleSelector(
      this.selectorRuntime.searchResultReadySelectors
    );
    const supplierReadySelector = await this.findFirstVisibleSelector(
      this.selectorRuntime.supplierReadySelectors
    );
    const hasPriceSignal = this.PRICE_TEXT_PATTERN.test(bodyText);
    const searchBodySignal = this.SEARCH_BODY_SIGNAL.test(bodyText);
    const supplierBodySignal = this.SUPPLIER_BODY_SIGNAL.test(bodyText);

    const expectsSearchReady = stage === '1688_open' || stage === '1688_upload' || stage == null;
    const expectsSupplierReady = stage === 'supplier_open' || stage == null;

    const hasStrongReadySignal =
      Boolean(resultShellSelector) ||
      candidateUrls.length > 0 ||
      (expectsSearchReady && Boolean(searchBodySignal || fileInput || entrySelector)) ||
      (expectsSupplierReady &&
        Boolean(normalizedOfferUrl) &&
        Boolean(supplierReadySelector || hasPriceSignal || supplierBodySignal));

    const urlSuggestsLogin = normalizedUrl.includes('login') || normalizedUrl.includes('signin');
    const urlSuggestsCaptcha = normalizedUrl.includes('captcha');
    const bodyHasLoginText = this.selectorRuntime.loginTextHints.some((h) =>
      bodyText.includes(h.toLowerCase())
    );
    const bodyHasCaptchaText = this.selectorRuntime.captchaTextHints.some((h) =>
      bodyText.includes(h.toLowerCase())
    );
    const bodyHasBlockText = this.selectorRuntime.accessBlockTextHints.some((h) =>
      bodyText.includes(h.toLowerCase())
    );
    const textSuggestsBarrier = bodyHasLoginText || bodyHasCaptchaText || bodyHasBlockText;

    const resolveBarrierKind = (): Exclude<BarrierKind, null | 'page_closed'> => {
      if (urlSuggestsLogin || bodyHasLoginText) return 'login';
      if (urlSuggestsCaptcha || bodyHasCaptchaText) return 'captcha';
      return 'unknown';
    };

    const resolveBarrierMessage = (kind: BarrierKind): string =>
      kind === 'login'
        ? '1688 requested login before the scan could continue. Log in using the opened browser window.'
        : '1688 requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.';

    const titleSuggestsBarrier = this.selectorRuntime.barrierTitleHints.some(
      (h) => pageTitleText.includes(h.toLowerCase())
    );

    if (titleSuggestsBarrier && candidateUrls.length === 0) {
      const kind = resolveBarrierKind();
      return { blocked: true, barrierKind: kind, currentUrl, message: resolveBarrierMessage(kind) };
    }

    const visibleHardSelector = await this.findFirstVisibleSelector(
      this.selectorRuntime.hardBlockingSelectors
    );
    if (visibleHardSelector && !hasStrongReadySignal) {
      return { blocked: true, barrierKind: 'login', currentUrl, message: resolveBarrierMessage('login') };
    }

    const visibleSoftSelector = await this.findFirstVisibleSelector(
      this.selectorRuntime.softBlockingSelectors
    );
    if (visibleSoftSelector && !hasStrongReadySignal) {
      return { blocked: true, barrierKind: 'captcha', currentUrl, message: resolveBarrierMessage('captcha') };
    }

    if (textSuggestsBarrier && candidateUrls.length === 0) {
      const kind = resolveBarrierKind();
      return { blocked: true, barrierKind: kind, currentUrl, message: resolveBarrierMessage(kind) };
    }

    if ((urlSuggestsLogin || urlSuggestsCaptcha) && !hasStrongReadySignal) {
      const kind = resolveBarrierKind();
      return { blocked: true, barrierKind: kind, currentUrl, message: resolveBarrierMessage(kind) };
    }

    return { blocked: false, barrierKind: null, currentUrl, message: null };
  }

  protected async detect1688ReadyState(stage: ScanStage): Promise<ReadyState> {
    const currentUrl = this.page.url();
    const normalizedOfferUrl = this.normalize1688OfferUrl(currentUrl);
    const candidateUrls = await this.collect1688CandidateUrls().catch(() => [] as string[]);
    const fileInput = await this.findFirstVisibleFileInput();
    const entrySelector = await this.findFirstVisibleSelector(
      this.selectorRuntime.imageSearchEntrySelectors
    );
    const resultShellSelector = await this.findFirstVisibleSelector(
      this.selectorRuntime.searchResultReadySelectors
    );
    const supplierReadySelector = await this.findFirstVisibleSelector(
      this.selectorRuntime.supplierReadySelectors
    );
    const bodyText = (
      await this.page.locator('body').first().textContent().catch(() => '')
    )?.toLowerCase() ?? '';
    const hasPriceSignal = this.PRICE_TEXT_PATTERN.test(bodyText);

    if (stage === '1688_open') {
      if (candidateUrls.length > 0 || normalizedOfferUrl || resultShellSelector) {
        return { ready: true, currentUrl, reason: 'search_results_ready', message: '1688 image search is ready.', entrySelector, resultShellSelector };
      }
      if (fileInput || entrySelector) {
        return { ready: true, currentUrl, reason: fileInput ? 'file_input_ready' : 'search_entry_ready', message: '1688 image search is ready.', entrySelector, resultShellSelector };
      }
      return { ready: false, currentUrl, reason: 'search_entry_not_ready', message: 'Captcha cleared, but 1688 is not back on a usable search page.', entrySelector, resultShellSelector };
    }

    if (stage === '1688_upload') {
      if (candidateUrls.length > 0 || normalizedOfferUrl || resultShellSelector) {
        return { ready: true, currentUrl, reason: 'search_results_ready', message: '1688 image search results are ready.', entrySelector, resultShellSelector };
      }
      if (fileInput || entrySelector) {
        return { ready: true, currentUrl, reason: 'returned_to_search_entry', message: '1688 returned to the image-search entry page after captcha. Re-uploading the product image.', entrySelector, resultShellSelector };
      }
      return { ready: false, currentUrl, reason: 'post_captcha_not_ready', message: 'Captcha cleared, but 1688 search results are still not ready.', entrySelector, resultShellSelector };
    }

    if (stage === 'supplier_open') {
      if (normalizedOfferUrl && (supplierReadySelector || hasPriceSignal)) {
        return { ready: true, currentUrl, reason: 'supplier_page_ready', message: '1688 supplier page is ready.', supplierReadySelector };
      }
      return { ready: false, currentUrl, reason: 'supplier_page_not_ready', message: 'Captcha cleared, but the supplier page is still not ready.', supplierReadySelector };
    }

    return { ready: false, currentUrl, reason: 'stage_unknown', message: '1688 page state is not ready.' };
  }

  // ─── Captcha handling ────────────────────────────────────────────────────────

  protected async handle1688Captcha(
    stage: ScanStage,
    stepMeta: { candidateId: string; candidateRank: number },
    recoveryUrl: string | null
  ): Promise<CaptchaHandleResult> {
    const barrier = await this.detect1688AccessBarrier(stage);

    if (!barrier.blocked) {
      return { resolved: true, captchaEncountered: false, captchaRequired: false, currentUrl: barrier.currentUrl, message: null, failureCode: null };
    }

    if (!this.input.allowManualVerification) {
      await this.captureSupplierVerificationObservation({
        stage,
        candidateId: stepMeta.candidateId,
        candidateRank: stepMeta.candidateRank,
        iteration: 1,
        loopDecision: 'blocked',
        blocked: true,
        barrierKind: barrier.barrierKind,
        barrierMessage: barrier.message,
        stableForMs: null,
        currentUrl: barrier.currentUrl,
        recoveryReason: null,
        recoveryMessage: null,
      });
      return { resolved: false, captchaEncountered: true, captchaRequired: true, currentUrl: barrier.currentUrl, message: barrier.message, failureCode: 'captcha_required' };
    }

    const waitMessage = barrier.barrierKind === 'login'
      ? barrier.message
      : '1688 captcha verification required. Solve it in the opened browser window and the scan will continue automatically.';

    const timeoutMs = typeof this.input.manualVerificationTimeoutMs === 'number'
      ? this.input.manualVerificationTimeoutMs
      : 240_000;

    this.log('1688.captcha.waiting', { stage, message: waitMessage, timeoutMs });
    const loopResult =
      await runPlaywrightVerificationObservationLoopWithProfile<
        Supplier1688VerificationSnapshotState,
        Supplier1688VerificationObservation,
        SupplierVerificationLoopBaseParams,
        SupplierVerificationObservationCaptureParams,
        Supplier1688VerificationObservation
      >({
        timeoutMs,
        intervalMs: 3_000,
        stableClearWindowMs: 0,
        initialSnapshot: {
          state: {
            barrier,
            readyState: null,
            recoveryReady: false,
            reuploadRequired: false,
          },
          blocked: true,
          currentUrl: barrier.currentUrl,
        },
        isPageClosed: () => this.isPageClosed(),
        wait: (ms) => this.wait(ms),
        readSnapshot: async () => {
          const currentBarrier = await this.detect1688AccessBarrier(stage);
          if (currentBarrier.blocked) {
            return {
              state: {
                barrier: currentBarrier,
                readyState: null,
                recoveryReady: false,
                reuploadRequired: false,
              },
              blocked: true,
              currentUrl: currentBarrier.currentUrl,
            };
          }

          const readyState = await this.attempt1688PostCaptchaRecovery(stage, recoveryUrl);
          const recoveryReady = readyState?.ready === true;
          const reuploadRequired = readyState?.reason === 'returned_to_search_entry';
          return {
            state: {
              barrier: currentBarrier,
              readyState,
              recoveryReady,
              reuploadRequired,
            },
            blocked: !(recoveryReady || reuploadRequired),
            currentUrl: readyState?.currentUrl ?? currentBarrier.currentUrl,
          };
        },
        profile: SUPPLIER_VERIFICATION_LOOP_PROFILE,
        baseParams: {
          stage,
          candidateId: stepMeta.candidateId,
          candidateRank: stepMeta.candidateRank,
          resolveFallbackUrl: () => this.page.url(),
        },
        captureObservation: (captureParams) =>
          this.captureSupplierVerificationObservation(captureParams),
      });

    if (loopResult.resolved) {
      const snapshot = loopResult.finalSnapshot?.state;
      const readyState = snapshot?.readyState ?? null;
      if (snapshot?.reuploadRequired) {
      return {
        resolved: true,
        captchaEncountered: true,
        captchaRequired: false,
        currentUrl: readyState?.currentUrl ?? this.safePageUrl() ?? '',
        message: readyState?.message ?? '1688 returned to the image-search entry page after captcha.',
        failureCode: 'post_captcha_reupload_required',
      };
      }

      this.log('1688.captcha.resolved', { stage, reason: readyState?.reason ?? null });
      return {
        resolved: true,
        captchaEncountered: true,
        captchaRequired: false,
        currentUrl: readyState?.currentUrl ?? this.safePageUrl() ?? '',
        message: '1688 captcha was resolved and the page is ready again.',
        failureCode: null,
      };
    }

    if (loopResult.finalDecision === 'page_closed') {
      return {
        resolved: false,
        captchaEncountered: true,
        captchaRequired: false,
        currentUrl: loopResult.finalSnapshot?.currentUrl ?? this.safePageUrl() ?? '',
        message: '1688 browser page closed before the verification barrier was resolved.',
        failureCode: 'page_closed',
      };
    }

    return { resolved: false, captchaEncountered: true, captchaRequired: true, currentUrl: this.safePageUrl() ?? '', message: '1688 captcha or barrier was not resolved within the allowed time.', failureCode: 'captcha_timeout' };
  }

  private async captureSupplierVerificationObservation(
    params: SupplierVerificationObservationCaptureParams
  ): Promise<Supplier1688VerificationObservation | null> {
    const currentUrl = params.currentUrl ?? this.safePageUrl();
    return runProductScanVerificationBarrierReviewCaptureWithState({
      profile: SUPPLIER_VERIFICATION_LOOP_PROFILE,
      verificationState: this.supplierVerificationState,
      params,
      currentUrl,
      page: this.page,
      artifacts: this.artifacts,
      log: this.log,
      upsertStep: (step) => this.upsertScanStep(step),
      injectOnEvaluation: createProductScanVerificationBarrierAutoInjectionConfig({
        provider: '1688',
      }),
    });
  }

  protected async attempt1688PostCaptchaRecovery(
    stage: ScanStage,
    recoveryUrl: string | null
  ): Promise<ReadyState | null> {
    const recoveryTargets: Array<{ kind: 'reload' | 'goto_start' | 'goto_url'; label: string }> =
      stage === '1688_open'
        ? [
            { kind: 'reload', label: 'Reload 1688 image search after captcha.' },
            { kind: 'goto_start', label: 'Reopen 1688 image search after captcha.' },
          ]
        : recoveryUrl
          ? [
              { kind: 'reload', label: 'Reload 1688 page after captcha.' },
              { kind: 'goto_url', label: stage === 'supplier_open' ? 'Reopen 1688 supplier page after captcha.' : 'Reopen 1688 image search after captcha.' },
            ]
          : [{ kind: 'reload', label: 'Reload 1688 page after captcha.' }];

    for (const target of recoveryTargets) {
      const navUrl =
        target.kind === 'goto_start'
          ? this.scannerStartUrl
          : target.kind === 'goto_url' && recoveryUrl
            ? recoveryUrl
            : null;

      this.log('1688.recovery.attempt', { stage, kind: target.kind, label: target.label });

      if (navUrl) {
        await this.page.goto(navUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => undefined);
      } else {
        await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => undefined);
      }

      // Give the 1688 SPA time to render after navigation/reload.
      await this.page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
      await this.wait(2_000);

      const barrier = await this.detect1688AccessBarrier(stage);
      if (barrier.blocked) continue;

      const readyState = await this.detect1688ReadyState(stage);
      if (readyState.ready || readyState.reason === 'returned_to_search_entry') {
        return readyState;
      }

      // If not ready yet, give one more chance — the SPA may still be rendering.
      await this.wait(2_500);
      const retryReadyState = await this.detect1688ReadyState(stage);
      if (retryReadyState.ready || retryReadyState.reason === 'returned_to_search_entry') {
        return retryReadyState;
      }
    }

    return null;
  }

  // ─── Natural browser setup ───────────────────────────────────────────────────

  protected async applyNaturalBrowserSetup(): Promise<void> {
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      'Upgrade-Insecure-Requests': '1',
    }).catch(() => undefined);

    const width = 1_366 + Math.floor(Math.random() * 147);
    const height = 820 + Math.floor(Math.random() * 121);
    await this.page.setViewportSize({ width, height }).catch(() => undefined);

    await this.page.addInitScript(() => {
      try {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
      } catch { /* ignore */ }
      try {
        Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en-US', 'en'], configurable: true });
      } catch { /* ignore */ }
      try {
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8, configurable: true });
      } catch { /* ignore */ }
      try {
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 8, configurable: true });
      } catch { /* ignore */ }
    }).catch(() => undefined);

    await this.moveMouseNaturally();
  }

  private async moveMouseNaturally(): Promise<void> {
    const points = [
      [120 + Math.floor(Math.random() * 140), 120 + Math.floor(Math.random() * 120)],
      [320 + Math.floor(Math.random() * 220), 180 + Math.floor(Math.random() * 180)],
      [620 + Math.floor(Math.random() * 280), 220 + Math.floor(Math.random() * 300)],
    ] as const;
    for (const [x, y] of points) {
      await this.page.mouse.move(x, y, { steps: 8 + Math.floor(Math.random() * 10) }).catch(() => undefined);
      await this.humanWait(180, 520);
    }
  }

  // ─── Submit 1688 image search ────────────────────────────────────────────────

  protected async submit1688UploadedImageSearch(): Promise<boolean> {
    // 1688 can either show a preview+submit button, or auto-navigate to results.
    // Check for upload confirmation via text OR an image thumbnail appearing in the UI.
    const hasUploadedImage = await this.page
      .evaluate(() =>
        /File uploaded|已上传|图片预览|Search for Image|搜图|搜索图片|正在搜索/i.test(
          document.body?.innerText ?? ''
        ) ||
        document.querySelector(
          '[class*="preview"] img, [class*="uploaded"] img, [class*="imgPreview"] img, img[src*="blob:"]'
        ) !== null
      )
      .catch(() => false);

    // Patch window.open so new tabs navigate in-place regardless of upload state
    await this.page.evaluate(() => {
      try {
        window.open = (url) => {
          if (typeof url === 'string' && url.trim()) window.location.assign(url);
          return null;
        };
      } catch { /* ignore */ }
      try {
        document.querySelectorAll('form[target="_blank"], a[target="_blank"]').forEach((el) => {
          el.setAttribute('target', '_self');
        });
      } catch { /* ignore */ }
    }).catch(() => undefined);

    // If upload confirmation was detected, click the submit button.
    if (hasUploadedImage) {
      const clicked = await this.clickFirstVisible(this.selectorRuntime.submitSearchSelectors);
      if (clicked) {
        await this.humanWait(1_800, 3_600);
        await this.page.waitForLoadState('domcontentloaded', { timeout: 8_000 }).catch(() => undefined);
        await this.page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
        return true;
      }
      // Submit button not found — 1688 may have auto-searched after file set.
    }

    // Fallback: poll for results — 1688 often auto-searches and takes 3–8 s to render them.
    for (let attempt = 0; attempt < 4; attempt++) {
      await this.humanWait(1_500, 2_500);
      await this.page.waitForLoadState('domcontentloaded', { timeout: 8_000 }).catch(() => undefined);
      const earlyResults = await this.collect1688CandidateUrls().catch(() => [] as string[]);
      if (earlyResults.length > 0) return true;
      // Also check body signal in case links aren't rendered yet but search started
      const bodyText = await this.page.locator('body').first().textContent().catch(() => '');
      if (bodyText && this.SEARCH_BODY_SIGNAL.test(bodyText)) return true;
    }
    return false;
  }

  // ─── Utility helpers ─────────────────────────────────────────────────────────

  protected async findFirstVisibleFileInput(): Promise<Locator | null> {
    for (const selector of this.selectorRuntime.fileInputSelectors) {
      const locator = this.page.locator(selector).first();
      if ((await locator.count().catch(() => 0)) === 0) continue;
      if (await locator.isVisible().catch(() => false)) return locator;
    }
    return null;
  }

  protected async findFirstAccessibleFileInput(): Promise<Locator | null> {
    for (const selector of this.selectorRuntime.fileInputSelectors) {
      const locator = this.page.locator(selector).first();
      if ((await locator.count().catch(() => 0)) > 0) return locator;
    }
    return null;
  }

  protected normalize1688OfferUrl(value: string | null | undefined): string | null {
    const href = this.toAbsoluteUrl(value);
    if (!href) return null;
    try {
      const parsed = new URL(href);
      if (!parsed.hostname.includes('1688.com')) return null;
      if (!/\/offer\/\d+\.html/.test(parsed.pathname.toLowerCase())) return null;
      parsed.search = '';
      parsed.hash = '';
      return parsed.toString();
    } catch {
      return null;
    }
  }

  private resolve1688ImageSearchStartUrl(value: string | undefined): string {
    const raw = typeof value === 'string' && value.trim() ? value.trim() : this.DEFAULT_1688_IMAGE_SEARCH_START_URL;
    try {
      const parsed = new URL(raw);
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname.toLowerCase();
      if (host === '1688.com' || host === 'www.1688.com' || (host.endsWith('.1688.com') && (path === '' || path === '/'))) {
        return this.DEFAULT_1688_IMAGE_SEARCH_START_URL;
      }
    } catch {
      return this.DEFAULT_1688_IMAGE_SEARCH_START_URL;
    }
    return raw;
  }

  private isChromeNavigationErrorUrl(url: string): boolean {
    return typeof url === 'string' && url.toLowerCase().startsWith('chrome-error://');
  }

  private scoreSupplierResult(result: SupplierProductData): number {
    let score = 0;
    if (result.title) score += 30;
    if (result.price) score += 20;
    if (result.description) score += 10;
    if (result.imageUrls.length > 0) score += Math.min(10, result.imageUrls.length);
    if (result.supplierDetails?.shopName) score += 8;
    if (result.supplierDetails?.minOrderQuantity) score += 6;
    if (result.supplierDetails?.attributes?.length) score += Math.min(15, result.supplierDetails.attributes.length);
    return score;
  }
}
