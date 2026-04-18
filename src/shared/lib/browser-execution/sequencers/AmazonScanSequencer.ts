import type { Frame, Locator, Page } from 'playwright';
import {
  GOOGLE_LENS_FILE_INPUT_SELECTORS,
  GOOGLE_LENS_ENTRY_TRIGGER_SELECTORS,
  GOOGLE_LENS_UPLOAD_TAB_SELECTORS,
  GOOGLE_LENS_RESULT_HINT_SELECTORS,
  GOOGLE_LENS_RESULT_SHELL_SELECTORS,
  GOOGLE_LENS_PROCESSING_INDICATOR_SELECTORS,
  GOOGLE_LENS_PROCESSING_TEXT_HINTS,
  GOOGLE_LENS_RESULT_TEXT_HINTS,
  GOOGLE_LENS_CANDIDATE_HINT_SELECTORS,
  GOOGLE_CONSENT_CONTROL_SELECTOR,
  GOOGLE_CONSENT_ACCEPT_SELECTORS,
  GOOGLE_CONSENT_SURFACE_TEXT_HINTS,
  GOOGLE_CONSENT_ACCEPT_TEXT_HINTS,
  GOOGLE_CONSENT_REJECT_TEXT_HINTS,
  GOOGLE_REDIRECT_INTERSTITIAL_SELECTORS,
  AMAZON_COOKIE_ACCEPT_SELECTORS,
  AMAZON_COOKIE_DISMISS_SELECTORS,
  AMAZON_ADDRESS_DISMISS_SELECTORS,
  AMAZON_PRODUCT_CONTENT_SELECTORS,
  AMAZON_TITLE_SELECTORS,
  AMAZON_PRICE_SELECTORS,
  AMAZON_DESCRIPTION_SELECTORS,
  AMAZON_HERO_IMAGE_SELECTORS,
} from '../selectors/amazon';
import {
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
  resolveAmazonRuntimeOperationLabel,
} from '../amazon-runtime-constants';
import type { ProductScanSequenceEntry } from '../product-scan-step-sequencer';
import { buildProductScanVerificationDiagnosticsPayload } from '@/features/products/server/product-scan-ai-evaluator';
import {
  GoogleLensSearchSequencer,
  type GoogleLensSearchImageCandidate,
  type GoogleLensSearchInput,
} from './GoogleLensSearchSequencer';
import type { ProductScanSequencerContext } from './ProductScanSequencer';

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

// ─── Input types ───────────────────────────────────────────────────────────────

export type AmazonImageSearchProvider = GoogleLensSearchInput['imageSearchProvider'];

export interface AmazonScanImageCandidate extends GoogleLensSearchImageCandidate {
  rank?: number | null;
}

export interface AmazonScanInput extends GoogleLensSearchInput {
  imageCandidates?: AmazonScanImageCandidate[];
  runtimeKey?: string | null;
  triageOnlyOnAmazonCandidates?: boolean;
  collectAmazonCandidatePreviews?: boolean;
  probeOnlyOnAmazonMatch?: boolean;
  skipAmazonProbe?: boolean;
  directAmazonCandidateUrl?: string | null;
  directAmazonCandidateUrls?: string[] | null;
  directMatchedImageId?: string | null;
  directAmazonCandidateRank?: number | null;
  stepSequenceKey?: string | null;
  stepSequence?: ProductScanSequenceEntry[] | null;
}

// ─── Internal state types ─────────────────────────────────────────────────────

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

interface AmazonOverlayState {
  cookieVisible: boolean;
  addressVisible: boolean;
  productContentReady: boolean;
}

interface AmazonProductData {
  asin: string | null;
  title: string | null;
  price: string | null;
  url: string | null;
  description: string | null;
  heroImageUrl: string | null;
  amazonDetails: AmazonDetails | null;
}

interface AmazonProbeData {
  asin: string | null;
  pageTitle: string | null;
  descriptionSnippet: string | null;
  pageLanguage: string | null;
  pageLanguageSource: string | null;
  marketplaceDomain: string | null;
  candidateUrl: string | null;
  canonicalUrl: string | null;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  heroImageArtifactName: string | null;
  artifactKey: string | null;
  bulletPoints: string[];
  bulletCount: number | null;
  attributeCount: number | null;
}

interface AmazonCandidateResult {
  url: string;
  score: number | null;
  asin: string | null;
  marketplaceDomain: string | null;
  title: string | null;
  snippet: string | null;
  rank: number | null;
}

interface AmazonCandidatePreview {
  id: string | null;
  matchedImageId: string | null;
  url: string;
  asin: string | null;
  marketplaceDomain: string | null;
  title: string | null;
  snippet: string | null;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  heroImageArtifactName: string | null;
  artifactKey: string | null;
  rank: number | null;
}

interface AmazonCandidateOutcome {
  status: 'matched' | 'probe_ready' | 'failed' | 'no_match';
  asin: string | null;
  title: string | null;
  price: string | null;
  url: string | null;
  description: string | null;
  heroImageUrl: string | null;
  amazonDetails: AmazonDetails | null;
  amazonProbe: AmazonProbeData | null;
  candidatePreview: AmazonCandidatePreview | null;
  message: string | null;
  stage: string;
}

interface AmazonDetails {
  brand: string | null;
  manufacturer: string | null;
  modelNumber: string | null;
  partNumber: string | null;
  color: string | null;
  style: string | null;
  material: string | null;
  size: string | null;
  pattern: string | null;
  finish: string | null;
  itemDimensions: string | null;
  packageDimensions: string | null;
  itemWeight: string | null;
  packageWeight: string | null;
  bestSellersRank: string | null;
  ean: string | null;
  gtin: string | null;
  upc: string | null;
  isbn: string | null;
  bulletPoints: string[];
  attributes: AmazonAttributePair[];
  rankings: AmazonRanking[];
}

interface AmazonAttributePair {
  key: string;
  label: string;
  value: string;
  source: string | null;
}

interface AmazonRanking {
  rank: string;
  category: string | null;
  source: string;
}

// ─── Main sequencer ────────────────────────────────────────────────────────────

export class AmazonScanSequencer extends GoogleLensSearchSequencer<AmazonScanInput> {
  private readonly MAX_AMAZON_PREVIEW_CANDIDATES = 5;

  constructor(context: ProductScanSequencerContext, input: AmazonScanInput = {}) {
    super(context, input);
  }

  protected override async emitResult(payload: Record<string, unknown>): Promise<void> {
    await super.emitResult({
      imageSearchProvider: this.resolveImageSearchProvider(),
      imageSearchPageUrl: this.resolveConfiguredImageSearchPageUrl(),
      ...buildProductScanVerificationDiagnosticsPayload({
        reviewKey: 'googleVerificationReview',
        observationsKey: 'googleVerificationObservations',
        review: this.getGoogleVerificationReview(),
        observations: this.getGoogleVerificationObservations(),
      }),
      ...payload,
    });
  }

  // ─── Abstract implementation ────────────────────────────────────────────────

  async scan(): Promise<void> {
    const imageCandidates = Array.isArray(this.input.imageCandidates)
      ? this.input.imageCandidates
      : [];
    const directCandidateUrls = this.resolveDirectAmazonCandidateUrls();
    const runtimeKey = this.resolveRuntimeKey();
    const isCandidateSearchRuntime =
      runtimeKey === AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY;
    const shouldCollectCandidatePreviews =
      isCandidateSearchRuntime || this.input.collectAmazonCandidatePreviews === true;
    const shouldStopAtCandidateTriage = this.input.triageOnlyOnAmazonCandidates === true;
    const shouldReturnProbeOnly = this.input.probeOnlyOnAmazonMatch === true;

    this.seedStepSequence({
      defaultSequenceKey: this.resolveDefaultSequenceKey(runtimeKey, directCandidateUrls.length > 0),
      sequenceKey: this.normalizeText(this.input.stepSequenceKey),
      customSequence: Array.isArray(this.input.stepSequence)
        ? this.input.stepSequence
        : null,
    });

    // ── Validate ──────────────────────────────────────────────────────────────
    this.upsertScanStep({ key: 'validate', status: 'running' });

    if (imageCandidates.length === 0 && directCandidateUrls.length === 0) {
      const operationLabel = resolveAmazonRuntimeOperationLabel(runtimeKey);
      this.upsertScanStep({
        key: 'validate',
        status: 'failed',
        resultCode: 'missing_image_source',
        message: `No image candidates or direct Amazon candidate URLs were provided for the ${operationLabel}.`,
      });
      await this.emitResult({
        status: 'failed',
        asin: null,
        title: null,
        price: null,
        url: null,
        description: null,
        amazonDetails: null,
        amazonProbe: null,
        matchedImageId: null,
        candidateUrls: [],
        candidateResults: [],
        candidatePreviews: [],
        currentUrl: this.page.url(),
        message: 'No image candidates or direct Amazon candidate URLs were provided.',
        stage: 'validate',
      });
      return;
    }

    this.upsertScanStep({ key: 'validate', status: 'completed', resultCode: 'ok' });

    if (directCandidateUrls.length > 0) {
      const directCandidateUrl = directCandidateUrls[0]!;
      const directCandidateRank =
        typeof this.input.directAmazonCandidateRank === 'number' &&
        Number.isFinite(this.input.directAmazonCandidateRank) &&
        this.input.directAmazonCandidateRank > 0
          ? Math.trunc(this.input.directAmazonCandidateRank)
          : 1;
      const matchedImageId = this.normalizeText(this.input.directMatchedImageId);
      const directOutcome = await this.processAmazonCandidate({
        url: directCandidateUrl,
        candidateId: matchedImageId ?? 'direct_candidate',
        candidateRank: directCandidateRank,
        attempt: 1,
        candidateResult: this.buildCandidateResultFromUrl(directCandidateUrl, directCandidateRank),
        skipProbe: this.input.skipAmazonProbe === true,
        returnProbeOnly: shouldReturnProbeOnly,
      });

      await this.emitResult({
        status: directOutcome.status,
        asin: directOutcome.asin,
        title: directOutcome.title,
        price: directOutcome.price,
        url: directOutcome.url,
        description: directOutcome.description,
        heroImageUrl: directOutcome.heroImageUrl,
        amazonDetails: directOutcome.amazonDetails,
        amazonProbe: directOutcome.amazonProbe,
        matchedImageId,
        candidateUrls: directCandidateUrls,
        candidateResults: directCandidateUrls.map((url, index) =>
          this.buildCandidateResultFromUrl(url, index === 0 ? directCandidateRank : index + 1)
        ),
        candidatePreviews:
          directOutcome.candidatePreview !== null ? [directOutcome.candidatePreview] : [],
        currentUrl: this.page.url(),
        message: directOutcome.message,
        stage: directOutcome.stage,
      });
      return;
    }

    const selectedCandidate = imageCandidates[0]!;
    const candidateId = this.normalizeText(selectedCandidate.id) ?? 'candidate_1';
    const candidateRank = typeof selectedCandidate.rank === 'number' ? selectedCandidate.rank : 1;
    const imageSearchProvider = this.resolveImageSearchProvider();

    // ── Google Lens: open ─────────────────────────────────────────────────────
    if (imageSearchProvider === 'google_images_url') {
      this.upsertScanStep({
        key: 'google_lens_open',
        status: 'completed',
        candidateId,
        candidateRank,
        resultCode: 'skipped_url_mode',
        message: 'URL image-search mode submits the image URL directly without opening a file upload page.',
        details: [{ label: 'Image search provider', value: imageSearchProvider }],
      });
    } else {
      const openResult = await this.openGoogleLens({ candidateId, candidateRank });
      if (!openResult.success) {
        await this.emitResult({
          status: 'failed',
          asin: null, title: null, price: null, url: null, description: null,
          amazonDetails: null,
          amazonProbe: null,
          matchedImageId: candidateId,
          candidateUrls: [],
          candidateResults: [],
          candidatePreviews: [],
          currentUrl: this.page.url(),
          message: openResult.message,
          stage: 'google_lens_open',
        });
        return;
      }
    }

    // ── Google Lens: upload ───────────────────────────────────────────────────
    let uploadResult = await this.uploadToGoogleLens({
      candidate: selectedCandidate,
      candidateId,
      candidateRank,
    });

    if (uploadResult.captchaRequired) {
      if (this.isPageClosed()) {
        const currentUrl = this.safePageUrl();
        await this.emitResult({
          status: 'captcha_required',
          asin: null,
          title: null,
          price: null,
          url: null,
          description: null,
          amazonDetails: null,
          amazonProbe: null,
          matchedImageId: candidateId,
          candidateUrls: [],
          candidateResults: [],
          candidatePreviews: [],
          currentUrl,
          message: uploadResult.error ?? this.CAPTCHA_REQUIRED_MESSAGE,
          stage: 'google_captcha',
        });
        return;
      }

      const captchaResult = await this.handleGoogleCaptcha({
        candidateId,
        candidateRank,
        waitForClear: true,
      });

      if (!captchaResult.resolved) {
        const currentUrl = this.safePageUrl();
        await this.emitResult({
          status: 'captcha_required',
          asin: null,
          title: null,
          price: null,
          url: null,
          description: null,
          amazonDetails: null,
          amazonProbe: null,
          matchedImageId: candidateId,
          candidateUrls: [],
          candidateResults: [],
          candidatePreviews: [],
          currentUrl,
          message: uploadResult.error ?? this.CAPTCHA_REQUIRED_MESSAGE,
          stage: 'google_captcha',
        });
        return;
      }

      uploadResult = await this.continueGoogleLensUploadAfterCaptcha({
        candidate: selectedCandidate,
        candidateId,
        candidateRank,
      });
    }

    if (!uploadResult.advanced) {
      await this.emitResult({
        status: 'failed',
        asin: null, title: null, price: null, url: null, description: null,
        amazonDetails: null,
        amazonProbe: null,
        matchedImageId: candidateId,
        candidateUrls: [],
        candidateResults: [],
        candidatePreviews: [],
        currentUrl: this.page.url(),
        message: uploadResult.error ?? 'Google Lens did not accept the image upload.',
        stage: 'google_upload',
      });
      return;
    }

    // ── Google Lens: collect Amazon candidates ────────────────────────────────
    const candidatesResult = await this.collectAmazonCandidates({ candidateId, candidateRank });

    if (candidatesResult.urls.length === 0) {
      await this.emitResult({
        status: 'failed',
        asin: null, title: null, price: null, url: null, description: null,
        amazonDetails: null,
        amazonProbe: null,
        matchedImageId: candidateId,
        candidateUrls: [],
        candidateResults: [],
        candidatePreviews: [],
        currentUrl: this.page.url(),
        message: candidatesResult.message ?? 'No Amazon candidate URLs were found in the Google Lens results.',
        stage: 'google_candidates',
      });
      return;
    }

    if (shouldCollectCandidatePreviews) {
      const candidatePreviews: AmazonCandidatePreview[] = [];
      const candidateResults: AmazonCandidateResult[] = [];

      for (const candidateResult of candidatesResult.results.slice(0, this.MAX_AMAZON_PREVIEW_CANDIDATES)) {
        const previewOutcome = await this.processAmazonCandidate({
          url: candidateResult.url,
          candidateId,
          candidateRank: candidateResult.rank ?? candidateRank,
          attempt: candidateResult.rank ?? candidateResults.length + 1,
          candidateResult,
          skipProbe: false,
          returnProbeOnly: true,
        });

        if (previewOutcome.candidatePreview !== null) {
          candidatePreviews.push(previewOutcome.candidatePreview);
          candidateResults.push(this.buildCandidateResultFromPreview(previewOutcome.candidatePreview));
          continue;
        }

        candidateResults.push(candidateResult);
      }

      const resolvedCandidateResults =
        candidateResults.length > 0 ? candidateResults : candidatesResult.results;
      await this.emitResult({
        status: 'triage_ready',
        asin: null,
        title: null,
        price: null,
        url:
          candidatePreviews[0]?.url ??
          resolvedCandidateResults[0]?.url ??
          candidatesResult.urls[0] ??
          this.page.url(),
        description: null,
        amazonDetails: null,
        amazonProbe: null,
        matchedImageId: candidateId,
        candidateUrls: candidatesResult.urls,
        candidateResults: resolvedCandidateResults,
        candidatePreviews,
        currentUrl: this.page.url(),
        message:
          candidatePreviews.length > 0
            ? 'Collected Amazon candidate previews for manual selection.'
            : 'Collected Amazon candidates for manual selection.',
        stage: 'amazon_probe',
      });
      return;
    }

    if (shouldStopAtCandidateTriage) {
      await this.emitResult({
        status: 'triage_ready',
        asin: null,
        title: null,
        price: null,
        url: candidatesResult.urls[0] ?? this.page.url(),
        description: null,
        amazonDetails: null,
        amazonProbe: null,
        matchedImageId: candidateId,
        candidateUrls: candidatesResult.urls,
        candidateResults: candidatesResult.results,
        candidatePreviews: [],
        currentUrl: this.page.url(),
        message: 'Collected Amazon candidates for AI triage before opening Amazon.',
        stage: 'google_candidates',
      });
      return;
    }

    // ── Amazon: probe candidates ──────────────────────────────────────────────
    let bestResult: AmazonCandidateOutcome | null = null;
    let bestScore = -1;

    for (const candidateResult of candidatesResult.results) {
      const url = candidateResult.url;
      const rank = candidateResult.rank ?? 1;

      const outcome = await this.processAmazonCandidate({
        url,
        candidateId,
        candidateRank: rank,
        attempt: rank,
        candidateResult,
        skipProbe: this.input.skipAmazonProbe === true,
        returnProbeOnly: shouldReturnProbeOnly,
      });

      if (outcome.status === 'probe_ready') {
        await this.emitResult({
          status: 'probe_ready',
          asin: outcome.asin,
          title: outcome.title,
          price: null,
          url: outcome.url,
          description: outcome.description,
          amazonDetails: null,
          amazonProbe: outcome.amazonProbe,
          matchedImageId: candidateId,
          candidateUrls: candidatesResult.urls,
          candidateResults: candidatesResult.results,
          candidatePreviews:
            outcome.candidatePreview !== null ? [outcome.candidatePreview] : [],
          currentUrl: this.page.url(),
          message: outcome.message,
          stage: outcome.stage,
        });
        return;
      }

      if (outcome.status !== 'matched') {
        continue;
      }

      const score = this.scoreAmazonResult({
        asin: outcome.asin,
        title: outcome.title,
        price: outcome.price,
        url: outcome.url,
        description: outcome.description,
        heroImageUrl: outcome.heroImageUrl,
        amazonDetails: outcome.amazonDetails,
      });
      if (score > bestScore) {
        bestScore = score;
        bestResult = outcome;
      }

      if (this.isStrongAmazonMatch({
        asin: outcome.asin,
        title: outcome.title,
        price: outcome.price,
        url: outcome.url,
        description: outcome.description,
        heroImageUrl: outcome.heroImageUrl,
        amazonDetails: outcome.amazonDetails,
      })) break;
    }

    if (!bestResult) {
      await this.emitResult({
        status: 'no_match',
        asin: null, title: null, price: null, url: null, description: null,
        amazonDetails: null,
        amazonProbe: null,
        matchedImageId: candidateId,
        candidateUrls: candidatesResult.urls,
        candidateResults: candidatesResult.results,
        candidatePreviews: [],
        currentUrl: this.page.url(),
        message: 'None of the Amazon candidates yielded usable product data.',
        stage: 'amazon_extract',
      });
      return;
    }

    await this.emitResult({
      status: 'matched',
      asin: bestResult.asin,
      title: bestResult.title,
      price: bestResult.price,
      url: bestResult.url,
      description: bestResult.description,
      heroImageUrl: bestResult.heroImageUrl,
      amazonDetails: bestResult.amazonDetails,
      amazonProbe: bestResult.amazonProbe,
      matchedImageId: candidateId,
      candidateUrls: candidatesResult.urls,
      candidateResults: candidatesResult.results,
      candidatePreviews:
        bestResult.candidatePreview !== null ? [bestResult.candidatePreview] : [],
      currentUrl: this.page.url(),
      stage: 'amazon_extract',
    });
  }

  // ─── Google Lens: open ──────────────────────────────────────────────────────

  protected async openGoogleLens(params: {
    candidateId: string;
    candidateRank: number;
  }): Promise<{ success: boolean; message: string | null }> {
    return await super.openGoogleLens(params);
  }

  // ─── Google Lens: upload ────────────────────────────────────────────────────

  protected async uploadToGoogleLens(params: {
    candidate: AmazonScanImageCandidate;
    candidateId: string;
    candidateRank: number;
  }): Promise<{
    advanced: boolean;
    captchaRequired: boolean;
    error: string | null;
    failureCode: string | null;
  }> {
    return await super.uploadToGoogleLens(params);
  }

  protected async continueGoogleLensUploadAfterCaptcha(params: {
    candidate: AmazonScanImageCandidate;
    candidateId: string;
    candidateRank: number;
  }): Promise<{
    advanced: boolean;
    captchaRequired: boolean;
    error: string | null;
    failureCode: string | null;
  }> {
    return await super.continueGoogleLensUploadAfterCaptcha(params);
  }

  // ─── Google Lens: captcha ────────────────────────────────────────────────────

  protected async handleGoogleCaptcha(params: {
    candidateId: string;
    candidateRank: number;
    waitForClear: boolean;
  }): Promise<{ resolved: boolean }> {
    return await super.handleGoogleCaptcha(params);
  }

  // ─── Google Lens: collect Amazon candidates ──────────────────────────────────

  protected async collectAmazonCandidates(params: {
    candidateId: string;
    candidateRank: number;
  }): Promise<{ urls: string[]; results: AmazonCandidateResult[]; message: string | null }> {
    const { candidateId, candidateRank } = params;

    this.upsertScanStep({
      key: 'google_candidates',
      status: 'running',
      candidateId,
      candidateRank,
      message: 'Collecting Amazon product candidates from Google Lens results.',
      url: this.page.url(),
    });

    // Wait for result page to stabilise
    await this.page.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => undefined);
    await this.wait(1_500);

    const urls = await this.extractAmazonCandidateUrls();

    if (urls.length === 0) {
      this.upsertScanStep({
        key: 'google_candidates',
        status: 'failed',
        candidateId,
        candidateRank,
        resultCode: 'no_candidates',
        message: 'Google Lens results did not contain any Amazon product URLs.',
        url: this.page.url(),
      });
      return { urls: [], results: [], message: 'No Amazon candidates found in Google Lens results.' };
    }

    const results = urls.map((url, index) => this.buildCandidateResultFromUrl(url, index + 1));

    this.upsertScanStep({
      key: 'google_candidates',
      status: 'completed',
      candidateId,
      candidateRank,
      resultCode: 'ok',
      message: `Found ${urls.length} Amazon candidate URL(s).`,
      url: this.page.url(),
      details: urls.slice(0, 5).map((url, i) => ({ label: `Candidate ${i + 1}`, value: url })),
    });

    return { urls, results, message: null };
  }

  private async extractAmazonCandidateUrls(): Promise<string[]> {
    const rawUrls = await this.page
      .locator(GOOGLE_LENS_CANDIDATE_HINT_SELECTORS.join(', '))
      .evaluateAll((nodes) =>
        nodes
          .map((node) => (node instanceof HTMLAnchorElement ? node.href : null))
          .filter((href): href is string => typeof href === 'string' && href.startsWith('http'))
      )
      .catch(() => [] as string[]);

    const amazonUrls: string[] = [];
    const seen = new Set<string>();

    for (const raw of rawUrls) {
      const resolved = this.resolveDirectUrl(raw);
      const normalized = this.normalizeText(resolved);
      if (!normalized) continue;

      try {
        const parsed = new URL(normalized);
        if (!this.isAmazonHost(parsed.hostname)) continue;
        const key = parsed.hostname + parsed.pathname;
        if (seen.has(key)) continue;
        seen.add(key);
        amazonUrls.push(normalized);
        if (amazonUrls.length >= 10) break;
      } catch {
        // skip
      }
    }

    return amazonUrls;
  }

  private resolveDirectUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (this.isGoogleRedirectHost(parsed.hostname) && parsed.pathname === '/url') {
        const direct = parsed.searchParams.get('q') ?? parsed.searchParams.get('url');
        if (direct?.startsWith('http')) return direct;
      }
    } catch { /* fall through */ }
    return url;
  }

  private isAmazonHost(hostname: string): boolean {
    return hostname === 'amazon.com' ||
      hostname.endsWith('.amazon.com') ||
      hostname.startsWith('amazon.');
  }

  private isGoogleRedirectHost(hostname: string): boolean {
    return hostname === 'google.com' ||
      hostname.endsWith('.google.com') ||
      hostname === 'www.google.com';
  }

  // ─── Amazon: probe a single candidate ──────────────────────────────────────

  protected async processAmazonCandidate(params: {
    url: string;
    candidateId: string;
    candidateRank: number;
    attempt: number;
    candidateResult?: AmazonCandidateResult | null;
    skipProbe: boolean;
    returnProbeOnly: boolean;
  }): Promise<AmazonCandidateOutcome> {
    const { url, candidateId, candidateRank, attempt, candidateResult, skipProbe, returnProbeOnly } = params;

    // ── Open ──────────────────────────────────────────────────────────────────
    this.upsertScanStep({
      key: 'amazon_open',
      status: 'running',
      attempt,
      candidateId,
      candidateRank,
      message: 'Opening Amazon product page.',
      url,
    });

    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await this.dismissGoogleRedirectInterstitialIfPresent();
    } catch {
      this.upsertScanStep({
        key: 'amazon_open',
        status: 'failed',
        attempt,
        candidateId,
        candidateRank,
        resultCode: 'navigation_failed',
        message: 'Amazon product page could not be opened.',
        url: this.page.url(),
      });
      return {
        status: 'failed',
        asin: null,
        title: null,
        price: null,
        url,
        description: null,
        heroImageUrl: null,
        amazonDetails: null,
        amazonProbe: null,
        candidatePreview: null,
        message: 'Amazon product page could not be opened.',
        stage: 'amazon_open',
      };
    }

    this.upsertScanStep({
      key: 'amazon_open',
      status: 'completed',
      attempt,
      candidateId,
      candidateRank,
      resultCode: 'ok',
      message: 'Amazon product page opened.',
      url: this.page.url(),
    });

    // ── Overlays ──────────────────────────────────────────────────────────────
    this.upsertScanStep({
      key: 'amazon_overlays',
      status: 'running',
      attempt,
      candidateId,
      candidateRank,
      message: 'Dismissing Amazon overlays.',
      url: this.page.url(),
    });

    const overlayResult = await this.dismissAmazonOverlays();

    this.upsertScanStep({
      key: 'amazon_overlays',
      status: overlayResult.cleared ? 'completed' : 'skipped',
      attempt,
      candidateId,
      candidateRank,
      resultCode: overlayResult.cleared ? 'ok' : 'overlay_persisted',
      message: overlayResult.message ?? (overlayResult.cleared ? 'Amazon overlays dismissed.' : null),
      url: this.page.url(),
    });

    // ── Content ready ─────────────────────────────────────────────────────────
    this.upsertScanStep({
      key: 'amazon_content_ready',
      status: 'running',
      attempt,
      candidateId,
      candidateRank,
      message: 'Waiting for Amazon product content.',
      url: this.page.url(),
    });

    const contentReady = await this.waitForAmazonProductContent();

    if (!contentReady) {
      this.upsertScanStep({
        key: 'amazon_content_ready',
        status: 'failed',
        attempt,
        candidateId,
        candidateRank,
        resultCode: 'content_timeout',
        message: 'Amazon product content did not become visible.',
        url: this.page.url(),
      });
      return {
        status: 'failed',
        asin: null,
        title: null,
        price: null,
        url,
        description: null,
        heroImageUrl: null,
        amazonDetails: null,
        amazonProbe: null,
        candidatePreview: null,
        message: 'Amazon product content did not become visible.',
        stage: 'amazon_content_ready',
      };
    }

    this.upsertScanStep({
      key: 'amazon_content_ready',
      status: 'completed',
      attempt,
      candidateId,
      candidateRank,
      resultCode: 'ok',
      message: 'Amazon product content is visible.',
      url: this.page.url(),
    });

    let amazonProbe: AmazonProbeData | null = null;
    if (skipProbe) {
      this.upsertScanStep({
        key: 'amazon_probe',
        status: 'skipped',
        attempt,
        candidateId,
        candidateRank,
        resultCode: 'probe_reused',
        message: 'Reused earlier Amazon probe evidence for approved direct extraction.',
        url: this.page.url(),
      });
    } else {
      amazonProbe = await this.collectAmazonProbeData({
        url,
        candidateId,
        candidateRank,
        attempt,
      });

      if (amazonProbe === null) {
        return {
          status: 'failed',
          asin: null,
          title: null,
          price: null,
          url,
          description: null,
          heroImageUrl: null,
          amazonDetails: null,
          amazonProbe: null,
          candidatePreview: null,
          message: 'Could not collect Amazon candidate probe evidence.',
          stage: 'amazon_probe',
        };
      }
    }

    const candidatePreview =
      amazonProbe !== null
        ? this.buildCandidatePreview({
            amazonProbe,
            candidateId,
            candidateRank,
            candidateResult,
            fallbackUrl: url,
          })
        : null;

    if (returnProbeOnly) {
      return {
        status: 'probe_ready',
        asin: amazonProbe?.asin ?? candidateResult?.asin ?? null,
        title: amazonProbe?.pageTitle ?? candidateResult?.title ?? null,
        price: null,
        url:
          amazonProbe?.canonicalUrl ??
          amazonProbe?.candidateUrl ??
          url,
        description: amazonProbe?.descriptionSnippet ?? candidateResult?.snippet ?? null,
        heroImageUrl: amazonProbe?.heroImageUrl ?? null,
        amazonDetails: null,
        amazonProbe,
        candidatePreview,
        message: 'Collected Amazon candidate evidence for AI evaluation.',
        stage: 'amazon_probe',
      };
    }

    // ── Extract ───────────────────────────────────────────────────────────────
    this.upsertScanStep({
      key: 'amazon_extract',
      status: 'running',
      attempt,
      candidateId,
      candidateRank,
      message: 'Extracting Amazon product details.',
      url: this.page.url(),
    });

    const productData = await this.extractAmazonProductData(amazonProbe?.asin ?? null);

    if (!productData.title && !productData.asin) {
      this.upsertScanStep({
        key: 'amazon_extract',
        status: 'failed',
        attempt,
        candidateId,
        candidateRank,
        resultCode: 'extract_empty',
        message: 'Could not extract any usable product data from the Amazon page.',
        url: this.page.url(),
      });
      return {
        status: 'no_match',
        asin: null,
        title: null,
        price: null,
        url,
        description: null,
        heroImageUrl: null,
        amazonDetails: null,
        amazonProbe,
        candidatePreview,
        message: 'Could not extract any usable product data from the Amazon page.',
        stage: 'amazon_extract',
      };
    }

    this.upsertScanStep({
      key: 'amazon_extract',
      status: 'completed',
      attempt,
      candidateId,
      candidateRank,
      resultCode: 'ok',
      message: 'Amazon product details extracted.',
      url: this.page.url(),
      details: [
        { label: 'ASIN', value: productData.asin ?? undefined },
        { label: 'Title', value: productData.title?.slice(0, 80) ?? undefined },
        { label: 'Price', value: productData.price ?? undefined },
      ].filter((d) => d.value != null) as Array<{ label: string; value: string }>,
    });

    return {
      status: 'matched',
      asin: productData.asin,
      title: productData.title,
      price: productData.price,
      url: productData.url,
      description: productData.description,
      heroImageUrl: productData.heroImageUrl,
      amazonDetails: productData.amazonDetails,
      amazonProbe,
      candidatePreview,
      message: 'Amazon product details extracted.',
      stage: 'amazon_extract',
    };
  }

  // ─── Amazon overlay helpers ─────────────────────────────────────────────────

  protected async detectAmazonOverlayState(): Promise<AmazonOverlayState> {
    const cookieVisible = await this.hasVisibleSelector(AMAZON_COOKIE_ACCEPT_SELECTORS);
    const addressVisible = await this.hasVisibleSelector(AMAZON_ADDRESS_DISMISS_SELECTORS);
    const productContentReady = await this.hasVisibleSelector(AMAZON_PRODUCT_CONTENT_SELECTORS);
    return { cookieVisible, addressVisible, productContentReady };
  }

  protected async dismissAmazonOverlays(): Promise<{ cleared: boolean; message: string | null }> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const state = await this.detectAmazonOverlayState();
      if (!state.cookieVisible && (!state.addressVisible || state.productContentReady)) {
        return { cleared: true, message: null };
      }

      let changed = false;
      if (state.cookieVisible) {
        changed = (await this.clickFirstVisible(AMAZON_COOKIE_ACCEPT_SELECTORS)) || changed;
        if (!changed) changed = (await this.clickFirstVisible(AMAZON_COOKIE_DISMISS_SELECTORS)) || changed;
      }
      if (state.addressVisible) {
        changed = (await this.clickFirstVisible(AMAZON_ADDRESS_DISMISS_SELECTORS)) || changed;
      }

      if (changed) {
        await this.page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
        await this.wait(1_200);
      } else {
        await this.wait(1_000);
      }
    }

    const finalState = await this.detectAmazonOverlayState();
    if (!finalState.cookieVisible && (!finalState.addressVisible || finalState.productContentReady)) {
      return { cleared: true, message: null };
    }

    const messages: string[] = [];
    if (finalState.cookieVisible) messages.push('Amazon cookie preferences dialog remained open.');
    if (finalState.addressVisible && !finalState.productContentReady)
      messages.push('Amazon delivery destination banner remained open.');

    return {
      cleared: false,
      message: messages.join(' ') || 'Amazon page remained blocked before product content.',
    };
  }

  protected async waitForAmazonProductContent(): Promise<boolean> {
    const visible = await Promise.any(
      AMAZON_PRODUCT_CONTENT_SELECTORS.map(async (selector) => {
        const locator = this.page.locator(selector).first();
        await locator.waitFor({ state: 'visible', timeout: 10_000 });
        return selector;
      })
    ).catch(() => null);
    return visible !== null;
  }

  // ─── Amazon data extraction ─────────────────────────────────────────────────

  protected async extractAmazonAsin(): Promise<string | null> {
    const url = this.page.url();
    const asinFromUrl = url.match(/\/dp\/([A-Z0-9]{10})/)?.[1] ?? null;
    if (asinFromUrl) return asinFromUrl;

    return await this.page
      .locator('input[name="ASIN"]')
      .first()
      .getAttribute('value')
      .catch(() => null);
  }

  protected async extractAmazonProductData(asin: string | null): Promise<AmazonProductData> {
    const url = this.page.url();

    const heroImageLocator = this.page.locator(AMAZON_HERO_IMAGE_SELECTORS.join(', ')).first();
    const [title, price, description, heroImageUrl] = await Promise.all([
      this.readFirstText(AMAZON_TITLE_SELECTORS),
      this.readFirstText(AMAZON_PRICE_SELECTORS),
      this.readFirstText(AMAZON_DESCRIPTION_SELECTORS),
      heroImageLocator
        .evaluate((el) => el.getAttribute('data-old-hires') || el.getAttribute('src') || null)
        .catch(() => null),
    ]);

    const amazonDetails = await this.buildAmazonDetails();

    return {
      asin,
      title,
      price,
      url,
      description,
      heroImageUrl: this.normalizeText(heroImageUrl),
      amazonDetails,
    };
  }

  protected async collectAmazonProbeData(params: {
    url: string;
    candidateId: string;
    candidateRank: number;
    attempt: number;
  }): Promise<AmazonProbeData | null> {
    const { url, candidateId, candidateRank, attempt } = params;

    this.upsertScanStep({
      key: 'amazon_probe',
      status: 'running',
      attempt,
      candidateId,
      candidateRank,
      message: 'Collecting candidate page evidence before detailed extraction.',
      url: this.page.url(),
    });

    try {
      const currentUrl = this.page.url();
      const artifactKey = this.buildProbeArtifactKey({
        candidateId,
        attempt,
        candidateRank,
      });
      const canonicalHref = await this.page
        .locator('link[rel="canonical"]')
        .first()
        .getAttribute('href')
        .catch(() => null);
      const canonicalUrl = this.toAbsoluteUrl(canonicalHref, currentUrl) ?? currentUrl;
      const pageLanguage = this.normalizeText(
        await this.page
          .evaluate(() => document.documentElement?.lang || null)
          .catch(() => null)
      );
      const marketplaceDomain = this.resolveMarketplaceDomain(canonicalUrl);
      const asin =
        this.extractAmazonAsinFromValue(currentUrl) ??
        this.extractAmazonAsinFromValue(canonicalUrl) ??
        this.extractAmazonAsinFromValue(
          await this.page.locator('[data-asin]').first().getAttribute('data-asin').catch(() => null)
        ) ??
        (await this.extractAmazonAsin());
      const pageTitle =
        await this.readFirstText(AMAZON_TITLE_SELECTORS);
      const descriptionSnippet =
        await this.readFirstText(AMAZON_DESCRIPTION_SELECTORS);
      const heroImage = await this.captureAmazonHeroImageArtifact(artifactKey);
      const bulletPoints = (await this.readAmazonBulletPoints()).slice(0, 8);
      const attributeCount = (await this.readAmazonAttributePairs()).length;

      await this.captureArtifacts(artifactKey);

      const amazonProbe: AmazonProbeData = {
        asin,
        pageTitle,
        descriptionSnippet,
        pageLanguage,
        pageLanguageSource:
          pageLanguage !== null
            ? 'html_lang'
            : marketplaceDomain !== null
              ? 'marketplace_domain'
              : null,
        marketplaceDomain,
        candidateUrl: url,
        canonicalUrl,
        heroImageUrl: heroImage.url,
        heroImageAlt: heroImage.alt,
        heroImageArtifactName: heroImage.artifactName,
        artifactKey,
        bulletPoints,
        bulletCount: bulletPoints.length,
        attributeCount,
      };

      this.upsertScanStep({
        key: 'amazon_probe',
        status: 'completed',
        attempt,
        candidateId,
        candidateRank,
        resultCode: asin ? 'probe_ready' : 'asin_missing',
        message: 'Collected Amazon candidate page evidence before extraction.',
        url: currentUrl,
        details: [
          { label: 'ASIN', value: asin },
          { label: 'Title', value: pageTitle },
          { label: 'Description', value: descriptionSnippet },
          { label: 'Page language', value: pageLanguage },
          { label: 'Language source', value: amazonProbe.pageLanguageSource },
          { label: 'Marketplace domain', value: marketplaceDomain },
          { label: 'Canonical URL', value: canonicalUrl },
          { label: 'Hero image URL', value: heroImage.url },
          { label: 'Hero image artifact', value: heroImage.artifactName },
          { label: 'Artifact key', value: artifactKey },
          { label: 'Bullet count', value: String(bulletPoints.length) },
          { label: 'Attribute count', value: String(attributeCount) },
        ],
      });

      return amazonProbe;
    } catch {
      this.upsertScanStep({
        key: 'amazon_probe',
        status: 'failed',
        attempt,
        candidateId,
        candidateRank,
        resultCode: 'probe_failed',
        message: 'Could not collect Amazon candidate probe evidence.',
        url: this.page.url(),
      });
      return null;
    }
  }

  private async buildAmazonDetails(): Promise<AmazonDetails | null> {
    const [attributes, bulletPoints] = await Promise.all([
      this.readAmazonAttributePairs(),
      this.readAmazonBulletPoints(),
    ]);

    const find = (labels: string[]) => this.findAmazonAttributeValue(attributes, labels);

    const bestSellersRank = find(['Best Sellers Rank', 'Amazon Best Sellers Rank', 'Bestsellers Rank']);
    const sharedEanGtin = find(['EAN / GTIN', 'EAN/GTIN']);

    const details: AmazonDetails = {
      brand: find(['Brand']),
      manufacturer: find(['Manufacturer']),
      modelNumber: find(['Item model number', 'Model Number', 'Model number', 'Model']),
      partNumber: find(['Manufacturer Part Number', 'Part Number', 'MPN']),
      color: find(['Color']),
      style: find(['Style']),
      material: find(['Material', 'Material Type']),
      size: find(['Size']),
      pattern: find(['Pattern']),
      finish: find(['Finish', 'Finish Type']),
      itemDimensions: find(['Product Dimensions', 'Item Dimensions LxWxH', 'Item Dimensions']),
      packageDimensions: find(['Package Dimensions']),
      itemWeight: find(['Item Weight', 'Product Weight']),
      packageWeight: find(['Shipping Weight', 'Package Weight']),
      bestSellersRank,
      ean: find(['EAN']) ?? sharedEanGtin,
      gtin: find(['GTIN', 'GTIN-14']) ?? sharedEanGtin,
      upc: find(['UPC']),
      isbn: find(['ISBN-13', 'ISBN-10', 'ISBN']),
      bulletPoints,
      attributes,
      rankings: this.parseAmazonRankings(bestSellersRank),
    };

    const hasData = [
      details.brand, details.manufacturer, details.modelNumber, details.partNumber,
      details.color, details.style, details.material, details.size,
      details.pattern, details.finish, details.itemDimensions, details.packageDimensions,
      details.itemWeight, details.packageWeight, details.bestSellersRank,
      details.ean, details.gtin, details.upc, details.isbn,
    ].some(Boolean) || bulletPoints.length > 0 || attributes.length > 0;

    return hasData ? details : null;
  }

  private async readAmazonBulletPoints(): Promise<string[]> {
    const raw = await this.page
      .locator('#feature-bullets li span, #feature-bullets li')
      .evaluateAll((nodes) =>
        nodes.map((n) => (n instanceof HTMLElement ? n.innerText : n.textContent ?? '')).filter(Boolean)
      )
      .catch(() => [] as string[]);

    return this.dedupeTextList(raw, 30);
  }

  private async readAmazonAttributePairs(): Promise<AmazonAttributePair[]> {
    const raw = await this.page
      .evaluate(() => {
        const normalizeText = (value: unknown): string =>
          typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
        const pairs: Array<{ label: string; value: string; source: string | null }> = [];
        const seen = new Set<string>();

        const pushPair = (label: string, value: string, source: string) => {
          const l = normalizeText(label).replace(/[:\u200e\u200f]+$/g, '').trim();
          const v = normalizeText(value);
          if (!l || !v) return;
          const key = [l.toLowerCase(), v.toLowerCase(), source].join('::');
          if (seen.has(key)) return;
          seen.add(key);
          pairs.push({ label: l, value: v, source: source || null });
        };

        const collectTableRows = (selector: string, source: string) => {
          document.querySelectorAll(selector).forEach((row) => {
            const label = normalizeText(
              row.querySelector('th')?.textContent ??
              row.querySelector('td.a-span3 span.a-text-bold')?.textContent ??
              row.querySelector('td:first-child span.a-text-bold')?.textContent ??
              row.querySelector('td:first-child')?.textContent
            );
            const value = normalizeText(
              row.querySelector('td.a-span9 span.po-break-word')?.textContent ??
              row.querySelector('td.a-span9')?.textContent ??
              row.querySelector('td:last-child span.po-break-word')?.textContent ??
              row.querySelector('td:last-child')?.textContent
            );
            pushPair(label, value, source);
          });
        };

        const collectDetailBullets = (selector: string, source: string) => {
          document.querySelectorAll(selector).forEach((item) => {
            const boldLabel = normalizeText(
              item.querySelector('.a-text-bold')?.textContent ??
              item.querySelector('span.a-text-bold')?.textContent
            );
            const text = normalizeText(
              item instanceof HTMLElement ? item.innerText : item.textContent ?? ''
            );
            if (!text) return;
            if (boldLabel) {
              pushPair(boldLabel, text.slice(boldLabel.length).replace(/^[:\s]+/, ''), source);
              return;
            }
            const colon = text.indexOf(':');
            if (colon > 0) pushPair(text.slice(0, colon), text.slice(colon + 1), source);
          });
        };

        collectDetailBullets('#detailBullets_feature_div li', 'detail_bullets');
        collectDetailBullets('#detailBulletsWrapper_feature_div li', 'detail_bullets');
        collectTableRows('#productDetails_techSpec_section_1 tr', 'technical_details');
        collectTableRows('#productDetails_detailBullets_sections1 tr', 'product_details');
        collectTableRows('#productDetails_feature_div tr', 'product_details_alt');
        collectTableRows('#technicalSpecifications_section_1 tr', 'technical_specifications');
        collectTableRows('#tech-spec-product-overview tr', 'tech_spec_overview');
        collectTableRows('#productOverview_feature_div tr', 'product_overview');

        return pairs;
      })
      .catch(() => [] as Array<{ label: string; value: string; source: string | null }>);

    return this.dedupeAttributePairs(raw);
  }

  private normalizeAmazonAttributeKey(label: string): string {
    return label.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  private dedupeAttributePairs(
    items: Array<{ label: string; value: string; source: string | null }>
  ): AmazonAttributePair[] {
    const result: AmazonAttributePair[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      const key = this.normalizeAmazonAttributeKey(item.label);
      const dedupeKey = [key, item.value.toLowerCase(), item.source ?? ''].join('::');
      if (!key || !item.label || !item.value || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      result.push({ key, label: item.label, value: item.value, source: item.source });
      if (result.length >= 100) break;
    }
    return result;
  }

  private findAmazonAttributeValue(attributes: AmazonAttributePair[], labels: string[]): string | null {
    const keys = labels.map((l) => this.normalizeAmazonAttributeKey(l)).filter(Boolean);
    for (const key of keys) {
      const match = attributes.find((a) => a.key === key);
      if (match?.value) return match.value;
    }
    return null;
  }

  private parseAmazonRankings(raw: string | null): AmazonRanking[] {
    if (!raw) return [];
    const entries: AmazonRanking[] = [];
    const seen = new Set<string>();
    const parts = raw.replace(/\u00a0/g, ' ').split(/(?=#\s*\d)/g).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const match = part.match(/(#[\d,.\s]+)\s+in\s+(.+)/i);
      if (!match) continue;
      const rank = this.normalizeText(match[1]?.replace(/\s+/g, ' '));
      const category = this.normalizeText(match[2]?.replace(/\(.*?\)/g, '').replace(/\s+/g, ' '));
      if (!rank) continue;
      const key = [rank, category ?? ''].join('::').toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({ rank, category, source: 'best_sellers_rank' });
      if (entries.length >= 20) break;
    }
    return entries;
  }

  private dedupeTextList(values: string[], limit = 30): string[] {
    const result: string[] = [];
    const seen = new Set<string>();
    for (const value of values) {
      const normalized = this.normalizeText(value);
      if (!normalized) continue;
      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(normalized);
      if (result.length >= limit) break;
    }
    return result;
  }

  private resolveRuntimeKey():
    | typeof AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY
    | typeof AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY
    | typeof AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY {
    const runtimeKey = this.normalizeText(this.input.runtimeKey);
    if (runtimeKey === AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY) {
      return AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY;
    }
    if (runtimeKey === AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY) {
      return AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY;
    }
    return AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY;
  }

  private resolveDefaultSequenceKey(
    runtimeKey:
      | typeof AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY
      | typeof AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY
      | typeof AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
    hasDirectCandidateUrls: boolean
  ):
    | typeof AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY
    | typeof AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY
    | typeof AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY {
    if (hasDirectCandidateUrls) {
      return AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY;
    }
    return runtimeKey;
  }

  private resolveDirectAmazonCandidateUrls(): string[] {
    const directAmazonCandidateUrls = Array.isArray(this.input.directAmazonCandidateUrls)
      ? this.input.directAmazonCandidateUrls
      : [];
    const normalizedUrls = directAmazonCandidateUrls
      .map((url) => this.normalizeText(url))
      .filter((url): url is string => url !== null);
    const directAmazonCandidateUrl = this.normalizeText(this.input.directAmazonCandidateUrl);

    if (directAmazonCandidateUrl !== null) {
      return Array.from(new Set([directAmazonCandidateUrl, ...normalizedUrls]));
    }

    return Array.from(new Set(normalizedUrls));
  }

  protected override resolveImageCandidateFilepath(
    candidate: AmazonScanImageCandidate
  ): string | null {
    return this.normalizeText(candidate.localPath) ?? this.normalizeText(candidate.filepath);
  }

  private buildCandidateResultFromUrl(url: string, rank: number): AmazonCandidateResult {
    return {
      url,
      score: null,
      asin: this.extractAmazonAsinFromValue(url),
      marketplaceDomain: this.resolveMarketplaceDomain(url),
      title: null,
      snippet: null,
      rank,
    };
  }

  private buildCandidateResultFromPreview(preview: AmazonCandidatePreview): AmazonCandidateResult {
    return {
      url: preview.url,
      score: null,
      asin: preview.asin,
      marketplaceDomain: preview.marketplaceDomain,
      title: preview.title,
      snippet: preview.snippet,
      rank: preview.rank,
    };
  }

  private buildCandidatePreview(input: {
    amazonProbe: AmazonProbeData;
    candidateId: string;
    candidateRank: number;
    candidateResult?: AmazonCandidateResult | null;
    fallbackUrl: string;
  }): AmazonCandidatePreview {
    const { amazonProbe, candidateId, candidateRank, candidateResult, fallbackUrl } = input;
    return {
      id:
        amazonProbe.asin ??
        candidateResult?.asin ??
        this.normalizeText(candidateId) ??
        fallbackUrl,
      matchedImageId: this.normalizeText(candidateId),
      url: amazonProbe.canonicalUrl ?? amazonProbe.candidateUrl ?? fallbackUrl,
      asin: amazonProbe.asin ?? candidateResult?.asin ?? null,
      marketplaceDomain:
        amazonProbe.marketplaceDomain ?? candidateResult?.marketplaceDomain ?? null,
      title: amazonProbe.pageTitle ?? candidateResult?.title ?? null,
      snippet: amazonProbe.descriptionSnippet ?? candidateResult?.snippet ?? null,
      heroImageUrl: amazonProbe.heroImageUrl,
      heroImageAlt: amazonProbe.heroImageAlt,
      heroImageArtifactName: amazonProbe.heroImageArtifactName,
      artifactKey: amazonProbe.artifactKey,
      rank: candidateRank,
    };
  }

  private buildProbeArtifactKey(input: {
    candidateId: string;
    attempt: number;
    candidateRank: number;
  }): string {
    const candidateFragment =
      this.normalizeText(input.candidateId)
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) ?? 'candidate';
    return [
      'amazon-scan-probe',
      candidateFragment,
      `attempt-${String(Math.trunc(input.attempt))}`,
      `rank-${String(Math.trunc(input.candidateRank))}`,
    ].join('-');
  }

  private async captureAmazonHeroImageArtifact(
    artifactKey: string
  ): Promise<{ url: string | null; alt: string | null; artifactName: string | null }> {
    for (const selector of AMAZON_HERO_IMAGE_SELECTORS) {
      const locator = this.page.locator(selector).first();
      const nextUrl = this.normalizeText(
        await locator.evaluate((el) => el.getAttribute('data-old-hires') || el.getAttribute('src') || null).catch(() => null)
      );
      const nextAlt = this.normalizeText(await locator.getAttribute('alt').catch(() => null));
      if (nextUrl === null && nextAlt === null) {
        continue;
      }

      let artifactName: string | null = null;
      const screenshotFn = (locator as unknown as {
        screenshot?: () => Promise<Buffer>;
      }).screenshot;
      if (typeof screenshotFn === 'function' && typeof this.artifacts.file === 'function') {
        const artifactPath = await screenshotFn
          .call(locator)
          .then((value) =>
            this.artifacts.file?.(artifactKey + '-hero', value, {
              extension: 'png',
              mimeType: 'image/png',
              kind: 'screenshot',
            })
          )
          .catch(() => null);
        artifactName = this.normalizeText(artifactPath?.split('/').pop());
      }

      return {
        url: nextUrl,
        alt: nextAlt,
        artifactName,
      };
    }

    return { url: null, alt: null, artifactName: null };
  }

  private resolveMarketplaceDomain(url: string | null): string | null {
    if (url === null) {
      return null;
    }
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return null;
    }
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

  private resolveImageSearchProvider(): AmazonImageSearchProvider {
    return this.input.imageSearchProvider === 'google_images_url' ||
      this.input.imageSearchProvider === 'google_lens_upload'
      ? this.input.imageSearchProvider
      : 'google_images_upload';
  }

  private resolveConfiguredImageSearchPageUrl(): string | null {
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

  private extractAmazonAsinFromValue(value: unknown): string | null {
    const text = this.normalizeText(value);
    if (text === null) {
      return null;
    }
    return text.match(/([A-Z0-9]{10})/)?.[1] ?? null;
  }

  // ─── Google consent helpers ─────────────────────────────────────────────────

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

    // Fallback: heuristic scoring via evaluateAll
    const bestIndex = await frame
      .locator(GOOGLE_CONSENT_CONTROL_SELECTOR)
      .evaluateAll(
        (elements, hints) => {
          const normalize = (v: unknown): string =>
            (typeof v === 'string' ? v : '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
          const acceptHints = Array.isArray(hints?.accept) ? hints.accept : [];
          const rejectHints = Array.isArray(hints?.reject) ? hints.reject : [];
          let bestIdx = -1, bestScore = -1;
          elements.forEach((el, idx) => {
            if (!(el instanceof HTMLElement)) return;
            const text = normalize([el.innerText, el.textContent, el.getAttribute('aria-label'), el.getAttribute('title')].filter(Boolean).join(' '));
            if (!text || rejectHints.some((h) => text.includes(h))) return;
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            if (style.display === 'none' || style.visibility === 'hidden' || !rect.width || !rect.height) return;
            let score = 0;
            if (text.includes('accept all')) score += 8;
            if (text.includes('i agree')) score += 7;
            if (acceptHints.some((h) => text.includes(h))) score += 4;
            const formAction = normalize(el.closest('form')?.getAttribute('action') ?? '');
            if (formAction.includes('consent') || formAction.includes('save')) score += 2;
            if (score > bestScore) { bestIdx = idx; bestScore = score; }
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

  // ─── Google Lens captcha detection ──────────────────────────────────────────

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

  private isGoogleCaptchaUrl(url: string | null): boolean {
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
    } catch { /* ignore */ }

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

  // ─── Google Lens processing state ───────────────────────────────────────────

  private listSearchScopes(): GoogleLensSearchScope[] {
    const mainFrame = this.page.mainFrame();
    const childFrames = this.page.frames()
      .filter((f) => f !== mainFrame)
      .map((f) => ({ target: f as unknown as Page, scopeType: 'frame' as const, frameUrl: f.url() }));

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
    const progressState = await this.findFirstVisibleInScopes(GOOGLE_LENS_PROCESSING_INDICATOR_SELECTORS);
    const resultShellState = await this.findFirstVisibleInScopes(GOOGLE_LENS_RESULT_SHELL_SELECTORS);

    // Check body text for processing / result hints
    let processingText: string | null = null;
    let resultText: string | null = null;
    for (const scope of this.listSearchScopes()) {
      const bodyText = (
        await scope.target.locator('body').first().textContent().catch(() => '')
      )?.toLowerCase() ?? '';
      if (!processingText) processingText = GOOGLE_LENS_PROCESSING_TEXT_HINTS.find((h) => bodyText.includes(h)) ?? null;
      if (!resultText) resultText = GOOGLE_LENS_RESULT_TEXT_HINTS.find((h) => bodyText.includes(h)) ?? null;
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

  // ─── Google Lens file input ──────────────────────────────────────────────────

  private async waitForGoogleLensFileInput(): Promise<FileInputState> {
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
    return state ?? { ready: false, inputLocator: null, currentUrl: this.page.url(), selector: null, scopeType: null, frameUrl: null, inputCount: 0 };
  }

  private async clickGoogleLensSafeImageSearchEntryIfPresent(): Promise<boolean> {
    return await this.clickFirstVisible(GOOGLE_LENS_SAFE_ENTRY_TRIGGER_SELECTORS);
  }

  private async resolveGoogleLensFileInput(): Promise<FileInputState> {
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
            let bestIdx = -1, bestScore = -1;
            nodes.forEach((node, idx) => {
              if (!(node instanceof HTMLInputElement) || node.disabled) return;
              if (node.type.toLowerCase() !== 'file') return;
              const style = window.getComputedStyle(node);
              const rect = node.getBoundingClientRect();
              const visible = style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
              const parentVisible = node.parentElement
                ? (() => {
                    const ps = window.getComputedStyle(node.parentElement);
                    const pr = node.parentElement.getBoundingClientRect();
                    return ps.visibility !== 'hidden' && ps.display !== 'none' && pr.width > 0 && pr.height > 0;
                  })()
                : false;
              // Google Lens frequently hides the raw file input behind a styled
              // upload surface. Playwright can still attach files to enabled
              // hidden file inputs, so visibility is a preference, not a gate.
              let score = visible ? 8 : parentVisible ? 4 : 0;
              const accept = (typeof node.accept === 'string' ? node.accept : '').toLowerCase();
              if (!accept || accept.includes('image')) score += 4;
              if (node.closest('[role="dialog"]') || node.closest('c-wiz') || node.closest('form')) score += 2;
              if (score > bestScore) { bestIdx = idx; bestScore = score; }
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

    return fallbackState ?? { ready: false, inputLocator: null, currentUrl: this.page.url(), selector: null, scopeType: null, frameUrl: null, inputCount: 0 };
  }

  private async attachImageToGoogleLensInput(
    inputLocator: Locator,
    uploadFile: GoogleLensUploadFile
  ): Promise<GoogleLensFileAttachResult> {
    const setInputFilesError = await inputLocator
      .setInputFiles(uploadFile)
      .then(() => null)
      .catch((error) =>
        error instanceof Error
          ? error.message
          : 'Google Lens rejected the selected image file.'
      );

    if (setInputFilesError !== null) {
      return { success: false, method: null, message: setInputFilesError };
    }

    await inputLocator.dispatchEvent?.('change').catch(() => undefined);
    await inputLocator.dispatchEvent?.('input').catch(() => undefined);
    return { success: true, method: 'set_input_files', message: null };
  }

  private async clickGoogleLensSearchSubmitIfPresent(): Promise<boolean> {
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
    const searchTrigger = await this.findFirstVisibleInScopes(GOOGLE_LENS_ENTRY_TRIGGER_SELECTORS);
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

  // ─── Google Lens result wait ─────────────────────────────────────────────────

  private async waitForGoogleLensResultState(
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
        return { advanced: true, currentUrl: captchaState.currentUrl, reason: 'captcha', processingState };
      }

      if (currentUrl !== startingUrl && !this.isGoogleImagesUploadEntryUrl(currentUrl)) {
        return { advanced: true, currentUrl, reason: 'url_changed', processingState: lastProcessingState };
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
    const finalProcessingState = await this.readGoogleLensProcessingState().catch(() => lastProcessingState);
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

  private async hasGoogleLensResultHints(): Promise<boolean> {
    return await Promise.any(
      GOOGLE_LENS_RESULT_HINT_SELECTORS.map(async (selector) => {
        const locator = this.page.locator(selector).first();
        if ((await locator.count().catch(() => 0)) === 0) throw new Error('nf');
        if (!(await locator.isVisible().catch(() => false))) throw new Error('nv');
        return true;
      })
    ).catch(() => false);
  }

  private isGoogleImagesUploadEntryUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname;
      if (host === 'images.google.com' && (path === '/' || path === '')) return true;
      if (host === 'lens.google.com' && (path.startsWith('/upload') || path === '/' || path === '')) return true;
      if (host.startsWith('www.google.') && (path === '/imghp' || path === '/images')) return true;
    } catch { /* ignore */ }
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

  // ─── Google redirect interstitial ───────────────────────────────────────────

  protected async dismissGoogleRedirectInterstitialIfPresent(): Promise<boolean> {
    const currentUrl = this.page.url();
    let host = '';
    try { host = new URL(currentUrl).hostname.toLowerCase(); } catch { /* ignore */ }
    if (!this.isGoogleRedirectHost(host)) return false;

    for (const selector of GOOGLE_REDIRECT_INTERSTITIAL_SELECTORS) {
      const locator = this.page.locator(selector).first();
      if ((await locator.count().catch(() => 0)) === 0) continue;
      if (!(await locator.isVisible().catch(() => false))) continue;
      await this.clickLocator(locator, { timeout: 5_000 });
      await this.page.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => undefined);
      await this.wait(500);
      return true;
    }
    return false;
  }

  // ─── Score helpers ───────────────────────────────────────────────────────────

  private scoreAmazonResult(result: AmazonProductData): number {
    let score = 0;
    if (result.asin) score += 100;
    if (result.title) score += 30;
    if (result.price) score += 18;
    if (result.description) score += 10;
    if (result.url) score += 8;
    if (result.amazonDetails?.brand) score += 6;
    if (result.amazonDetails?.manufacturer) score += 6;
    if (result.amazonDetails?.bestSellersRank) score += 4;
    if (result.amazonDetails?.attributes?.length) score += Math.min(20, result.amazonDetails.attributes.length);
    if (result.amazonDetails?.bulletPoints?.length) score += Math.min(12, result.amazonDetails.bulletPoints.length);
    return score;
  }

  private isStrongAmazonMatch(result: AmazonProductData): boolean {
    return Boolean(
      result.asin &&
      result.title &&
      (result.price || result.amazonDetails?.brand || result.amazonDetails?.manufacturer ||
        (result.amazonDetails?.attributes && result.amazonDetails.attributes.length >= 3))
    );
  }
}
