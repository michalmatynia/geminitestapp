import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Page } from 'playwright';
import {
  ProductScanSequencer,
  type ProductScanSequencerContext,
} from '../sequencers/ProductScanSequencer';
import {
  AmazonScanSequencer,
  type AmazonScanInput,
} from '../sequencers/AmazonScanSequencer';
import {
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
} from '../amazon-runtime-constants';
import {
  Supplier1688ScanSequencer,
  type Supplier1688ScanInput,
} from '../sequencers/Supplier1688ScanSequencer';

// ─── Shared mock page factory ─────────────────────────────────────────────────

function makeMockPage(overrides: Partial<Page> = {}): Page {
  const locatorMock = (selector: string) => {
    const inner = {
      count: vi.fn().mockResolvedValue(0),
      isVisible: vi.fn().mockResolvedValue(false),
      click: vi.fn().mockResolvedValue(undefined),
      fill: vi.fn().mockResolvedValue(undefined),
      textContent: vi.fn().mockResolvedValue(null),
      innerText: vi.fn().mockResolvedValue(null),
      getAttribute: vi.fn().mockResolvedValue(null),
      waitFor: vi.fn().mockResolvedValue(undefined),
      setInputFiles: vi.fn().mockResolvedValue(undefined),
      nth: vi.fn().mockReturnThis(),
      first: vi.fn().mockReturnThis(),
      evaluateAll: vi.fn().mockResolvedValue([]),
      evaluate: vi.fn().mockResolvedValue(null),
    };
    return inner;
  };

  return {
    url: vi.fn().mockReturnValue('https://images.google.com/'),
    isClosed: vi.fn().mockReturnValue(false),
    goto: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
    title: vi.fn().mockResolvedValue(''),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    mainFrame: vi.fn().mockReturnValue({ url: () => 'https://images.google.com/' }),
    frames: vi.fn().mockReturnValue([]),
    locator: vi.fn().mockImplementation(locatorMock),
    evaluate: vi.fn().mockResolvedValue(null),
    evaluateAll: vi.fn().mockResolvedValue([]),
    setExtraHTTPHeaders: vi.fn().mockResolvedValue(undefined),
    setViewportSize: vi.fn().mockResolvedValue(undefined),
    addInitScript: vi.fn().mockResolvedValue(undefined),
    mouse: {
      move: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  } as unknown as Page;
}

function makeContext(pageOverrides: Partial<Page> = {}): ProductScanSequencerContext & { emitted: unknown[] } {
  const emitted: unknown[] = [];
  return {
    page: makeMockPage(pageOverrides),
    emit: vi.fn((type, payload) => { emitted.push({ type, payload }); }),
    log: vi.fn(),
    artifacts: {
      json: vi.fn().mockResolvedValue(undefined),
      screenshot: vi.fn().mockResolvedValue(undefined),
      html: vi.fn().mockResolvedValue(undefined),
    },
    helpers: {
      sleep: vi.fn().mockResolvedValue(undefined),
    },
    emitted,
  };
}

// ─── ProductScanSequencer (abstract base) ────────────────────────────────────

describe('ProductScanSequencer', () => {
  // Minimal concrete subclass for base-class testing
  class MinimalSequencer extends ProductScanSequencer {
    async scan(): Promise<void> {
      this.seedStepSequence({ defaultSequenceKey: 'amazon_reverse_image_scan' });
      this.upsertScanStep({ key: 'validate', status: 'running' });
      this.upsertScanStep({ key: 'validate', status: 'completed', resultCode: 'ok' });
      await this.emitResult({ status: 'completed', stage: 'validate' });
    }
  }

  it('seedStepSequence seeds pending steps from a known sequence key', async () => {
    const ctx = makeContext();
    const seq = new MinimalSequencer(ctx);
    await seq.scan();

    const { payload } = ctx.emitted[0] as { payload: { steps: Array<{ key: string; status: string }> } };
    const keys = payload.steps.map((s) => s.key);
    expect(keys).toContain('google_lens_open');
    expect(keys).toContain('amazon_open');
    expect(keys).toContain('amazon_extract');
  });

  it('upsertScanStep replaces a pending template when first concrete update arrives', async () => {
    const ctx = makeContext();
    const seq = new MinimalSequencer(ctx);
    await seq.scan();

    const { payload } = ctx.emitted[0] as { payload: { steps: Array<{ key: string; status: string }> } };
    const validateSteps = payload.steps.filter((s) => s.key === 'validate');
    // Should only be one — the seeded pending template was replaced by the concrete upsert
    expect(validateSteps).toHaveLength(1);
    expect(validateSteps[0]!.status).toBe('completed');
  });

  it('seedStepSequence preserves custom labels from custom sequence entries', async () => {
    const ctx = makeContext();
    class CustomSequenceLabelSeq extends ProductScanSequencer {
      async scan(): Promise<void> {
        this.seedStepSequence({
          customSequence: [
            { key: 'validate', label: 'Validate AI-path trigger' },
            { key: 'supplier_probe', label: 'Probe supplier listing' },
          ],
        });
        await this.emitResult({ status: 'done' });
      }
    }
    const seq = new CustomSequenceLabelSeq(ctx);
    await seq.scan();

    const { payload } = ctx.emitted[0] as {
      payload: { steps: Array<{ key: string; label: string }> };
    };
    expect(payload.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'validate', label: 'Validate AI-path trigger' }),
        expect.objectContaining({ key: 'supplier_probe', label: 'Probe supplier listing' }),
      ])
    );
  });

  it('emitResult includes all scanSteps in the payload', async () => {
    const ctx = makeContext();
    const seq = new MinimalSequencer(ctx);
    await seq.scan();

    expect(ctx.emit).toHaveBeenCalledWith('result', expect.objectContaining({ steps: expect.any(Array) }));
  });

  it('emitResult adds canonical scrapedItems for direct product payloads', async () => {
    const ctx = makeContext();
    class DirectProductSeq extends ProductScanSequencer {
      async scan(): Promise<void> {
        await this.emitResult({
          status: 'matched',
          title: 'Mapped product',
          price: '19.99',
          url: 'https://example.com/product',
          description: 'Captured description',
        });
      }
    }

    const seq = new DirectProductSeq(ctx);
    await seq.scan();

    const payload = (ctx.emit as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      scrapedItems: Array<{ title?: string; url?: string }>;
    };

    expect(payload.scrapedItems).toEqual([
      expect.objectContaining({
        title: 'Mapped product',
        url: 'https://example.com/product',
      }),
    ]);
  });

  it('emitResult calls artifacts.json when available', async () => {
    const ctx = makeContext();
    const seq = new MinimalSequencer(ctx);
    await seq.scan();

    expect(ctx.artifacts!.json).toHaveBeenCalled();
  });

  it('clickFirstVisible uses runtime helper clicks so action humanization settings apply', async () => {
    class ClickSeq extends ProductScanSequencer {
      async scan(): Promise<void> {}
      async clickVisible(selectors: readonly string[]): Promise<boolean> {
        return this.clickFirstVisible(selectors);
      }
    }
    const locator = {
      count: vi.fn().mockResolvedValue(1),
      isVisible: vi.fn().mockResolvedValue(true),
      click: vi.fn().mockResolvedValue(undefined),
      first: vi.fn().mockReturnThis(),
    };
    const helperClick = vi.fn().mockResolvedValue(undefined);
    const ctx = makeContext({
      locator: vi.fn().mockReturnValue(locator),
    } as unknown as Partial<Page>);
    ctx.helpers.click = helperClick;
    const seq = new ClickSeq(ctx);

    const clicked = await seq.clickVisible(['button.safe']);

    expect(clicked).toBe(true);
    expect(helperClick).toHaveBeenCalledWith(locator, {
      clickOptions: { timeout: 5_000 },
    });
    expect(locator.click).not.toHaveBeenCalled();
  });

  it('normalizeText trims whitespace and returns null for empty strings', () => {
    const ctx = makeContext();
    // Access normalizeText via a concrete subclass that exposes it
    class ExposedSeq extends ProductScanSequencer {
      async scan() {}
      public exposed_normalizeText(v: unknown) { return this.normalizeText(v); }
    }
    const seq = new ExposedSeq(ctx);
    expect(seq.exposed_normalizeText('  hello  ')).toBe('hello');
    expect(seq.exposed_normalizeText('')).toBeNull();
    expect(seq.exposed_normalizeText('   ')).toBeNull();
    expect(seq.exposed_normalizeText(42)).toBeNull();
    expect(seq.exposed_normalizeText(null)).toBeNull();
  });

  it('upsertScanStep gives distinct identities to steps for different candidateIds', async () => {
    const ctx = makeContext();
    class MultiCandidateSeq extends ProductScanSequencer {
      async scan(): Promise<void> {
        this.upsertScanStep({ key: 'amazon_open', status: 'running', candidateId: 'cand-1', candidateRank: 1, attempt: 1 });
        this.upsertScanStep({ key: 'amazon_open', status: 'running', candidateId: 'cand-2', candidateRank: 2, attempt: 1 });
        this.upsertScanStep({ key: 'amazon_open', status: 'completed', candidateId: 'cand-1', candidateRank: 1, attempt: 1 });
        await this.emitResult({ status: 'done' });
      }
    }
    const seq = new MultiCandidateSeq(ctx);
    await seq.scan();

    const { payload } = ctx.emitted[0] as { payload: { steps: Array<{ key: string; status: string; candidateId: string | null }> } };
    const amazonOpenSteps = payload.steps.filter((s) => s.key === 'amazon_open');
    expect(amazonOpenSteps).toHaveLength(2);
    const cand1 = amazonOpenSteps.find((s) => s.candidateId === 'cand-1');
    const cand2 = amazonOpenSteps.find((s) => s.candidateId === 'cand-2');
    expect(cand1!.status).toBe('completed');
    expect(cand2!.status).toBe('running');
  });

  it('durationMs is computed for terminal steps', async () => {
    const ctx = makeContext();
    class TimedSeq extends ProductScanSequencer {
      async scan(): Promise<void> {
        this.upsertScanStep({ key: 'validate', status: 'running' });
        this.upsertScanStep({ key: 'validate', status: 'completed' });
        await this.emitResult({ status: 'done' });
      }
    }
    const seq = new TimedSeq(ctx);
    await seq.scan();

    const { payload } = ctx.emitted[0] as { payload: { steps: Array<{ key: string; durationMs: number | null }> } };
    const step = payload.steps.find((s) => s.key === 'validate');
    expect(step!.durationMs).toBeGreaterThanOrEqual(0);
  });
});

// ─── AmazonScanSequencer ──────────────────────────────────────────────────────

describe('AmazonScanSequencer', () => {
  it('fails with missing_image_source when no candidates provided', async () => {
    const ctx = makeContext();
    const seq = new AmazonScanSequencer(ctx, {});
    await seq.scan();

    expect(ctx.emit).toHaveBeenCalledWith(
      'result',
      expect.objectContaining({ status: 'failed', stage: 'validate' })
    );

    const payload = (ctx.emit as ReturnType<typeof vi.fn>).mock.calls[0][1] as { steps: Array<{ key: string; resultCode: string | null }> };
    const validateStep = payload.steps.find((s) => s.key === 'validate');
    expect(validateStep!.resultCode).toBe('missing_image_source');
  });

  it('seeds the amazon_reverse_image_scan runtime sequence on construction', async () => {
    const ctx = makeContext();
    const seq = new AmazonScanSequencer(ctx, {});
    await seq.scan();

    const payload = (ctx.emit as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      steps: Array<{ key: string; status: string }>;
    };
    // The step sequence should have been seeded (pending steps present for the full sequence)
    const keys = payload.steps.map((s) => s.key);
    expect(keys).toContain('google_lens_open');
    expect(keys).toContain('google_upload');
    expect(keys).toContain('amazon_open');
    expect(keys).toContain('amazon_extract');
  });

  it('fails at google_lens_open when page.goto throws', async () => {
    const ctx = makeContext({
      goto: vi.fn().mockRejectedValue(new Error('net::ERR_NAME_NOT_RESOLVED')),
    });
    const seq = new AmazonScanSequencer(ctx, {
      imageCandidates: [{ id: 'img-1', localPath: '/tmp/img.jpg', rank: 1 }],
    });
    await seq.scan();

    const emitCalls = (ctx.emit as ReturnType<typeof vi.fn>).mock.calls;
    const lastPayload = emitCalls[emitCalls.length - 1][1] as { status: string; stage: string };
    expect(lastPayload.status).toBe('failed');
    expect(lastPayload.stage).toBe('google_lens_open');
  });

  it('uses default sequence key amazon_reverse_image_scan', async () => {
    const ctx = makeContext({
      goto: vi.fn().mockRejectedValue(new Error('navigation_failed')),
    });
    const input: AmazonScanInput = {
      imageCandidates: [{ id: 'img-1', localPath: '/tmp/img.jpg' }],
    };
    const seq = new AmazonScanSequencer(ctx, input);
    await seq.scan();

    const payload = (ctx.emit as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      steps: Array<{ key: string }>;
    };
    // Should contain all steps from the default sequence
    const keys = new Set(payload.steps.map((s) => s.key));
    expect(keys.has('validate')).toBe(true);
    expect(keys.has('google_lens_open')).toBe(true);
    expect(keys.has('google_candidates')).toBe(true);
    expect(keys.has('amazon_open')).toBe(true);
  });

  it('google_lens_open step transitions running → failed on navigation error', async () => {
    const ctx = makeContext({
      goto: vi.fn().mockRejectedValue(new Error('failed')),
    });
    const seq = new AmazonScanSequencer(ctx, {
      imageCandidates: [{ id: 'img-1', url: 'http://example.com/img.jpg' }],
    });
    await seq.scan();

    const payload = (ctx.emit as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      steps: Array<{ key: string; status: string; resultCode: string | null }>;
    };
    const openStep = payload.steps.find((s) => s.key === 'google_lens_open');
    expect(openStep!.status).toBe('failed');
    expect(openStep!.resultCode).toBe('navigation_failed');
  });

  it('opens one stable built-in Google Lens upload page without cycling to Google Images', async () => {
    let currentUrl = 'https://images.google.com/';
    const goto = vi.fn().mockImplementation(async (url: string) => {
      currentUrl = url;
    });
    const ctx = makeContext({
      goto,
      url: vi.fn(() => currentUrl),
    });
    const seq = new AmazonScanSequencer(ctx, {
      imageSearchProvider: 'google_images_upload',
    });

    const res = await (seq as any).openGoogleLens({ candidateId: 'img', candidateRank: 1 });

    expect(res.success).toBe(true);
    expect(goto).toHaveBeenCalledTimes(1);
    expect(goto).toHaveBeenCalledWith('https://lens.google.com/?hl=en', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
  });

  it('reopens the selected image search page once when Google consent redirects away from it', async () => {
    let currentUrl = 'https://images.google.com/';
    const goto = vi.fn().mockImplementation(async (url: string) => {
      currentUrl = url;
    });
    const ctx = makeContext({
      goto,
      url: vi.fn(() => currentUrl),
    });
    const seq = new AmazonScanSequencer(ctx, {
      imageSearchProvider: 'google_images_upload',
    });
    (seq as any).clickGoogleConsentIfPresent = vi
      .fn()
      .mockImplementationOnce(async () => {
        currentUrl = 'https://www.google.com/?olud';
        return { resolved: true };
      })
      .mockResolvedValue({ resolved: false });

    const res = await (seq as any).openGoogleLens({ candidateId: 'img', candidateRank: 1 });

    expect(res.success).toBe(true);
    expect(goto).toHaveBeenCalledTimes(2);
    expect(goto).toHaveBeenNthCalledWith(1, 'https://lens.google.com/?hl=en', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    expect(goto).toHaveBeenNthCalledWith(2, 'https://lens.google.com/?hl=en', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
  });

  it('continues when Google redirects after consent but exposes a usable upload input', async () => {
    let currentUrl = 'https://images.google.com/';
    const goto = vi.fn().mockImplementation(async (url: string) => {
      currentUrl = url;
    });
    const ctx = makeContext({
      goto,
      url: vi.fn(() => currentUrl),
    });
    const seq = new AmazonScanSequencer(ctx, {
      imageSearchProvider: 'google_images_upload',
    });
    (seq as any).clickGoogleConsentIfPresent = vi
      .fn()
      .mockImplementationOnce(async () => {
        currentUrl = 'https://www.google.com/?olud';
        return { resolved: true };
      })
      .mockResolvedValue({ resolved: false });
    (seq as any).resolveGoogleLensFileInput = vi.fn().mockResolvedValue({
      ready: true,
      inputLocator: { setInputFiles: vi.fn() },
      currentUrl,
      selector: 'input[type="file"][accept*="image"]',
      scopeType: 'page',
      frameUrl: null,
      inputCount: 1,
    });

    const res = await (seq as any).openGoogleLens({ candidateId: 'img', candidateRank: 1 });

    expect(res.success).toBe(true);
    expect(goto).toHaveBeenCalledTimes(1);
    const step = (seq as any).scanSteps.find((s: any) => s.key === 'google_lens_open');
    expect(step.status).toBe('completed');
    expect(step.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Ready reason', value: 'file_input_ready' }),
      ])
    );
  });

  it('uses the Google Images upload entry fallback before page-unavailable failure', async () => {
    let currentUrl = 'https://images.google.com/';
    const goto = vi.fn().mockResolvedValue(undefined);
    const ctx = makeContext({
      goto,
      url: vi.fn(() => currentUrl),
    });
    const seq = new AmazonScanSequencer(ctx, {
      imageSearchProvider: 'google_images_upload',
    });
    (seq as any).clickGoogleConsentIfPresent = vi
      .fn()
      .mockImplementationOnce(async () => {
        currentUrl = 'https://www.google.com/?olud';
        return { resolved: true };
      })
      .mockResolvedValue({ resolved: false });

    const res = await (seq as any).openGoogleLens({ candidateId: 'img', candidateRank: 1 });

    expect(res.success).toBe(false);
    expect(goto).toHaveBeenCalledTimes(3);
    expect(goto).toHaveBeenNthCalledWith(3, 'https://www.google.com/imghp?hl=en', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    const step = (seq as any).scanSteps.find((s: any) => s.key === 'google_lens_open');
    expect(step.status).toBe('failed');
    expect(step.resultCode).toBe('image_search_page_unavailable');
    expect(step.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Image search page',
          value: 'https://www.google.com/imghp?hl=en',
        }),
        expect.objectContaining({ label: 'Ready', value: 'false' }),
      ])
    );
  });

  it('opens Google Lens through the fallback entry when the direct Lens page is bounced', async () => {
    let currentUrl = 'https://images.google.com/';
    const goto = vi.fn().mockImplementation(async (url: string) => {
      if (url === 'https://www.google.com/imghp?hl=en') {
        currentUrl = url;
      }
    });
    const ctx = makeContext({
      goto,
      url: vi.fn(() => currentUrl),
    });
    const seq = new AmazonScanSequencer(ctx, {
      imageSearchProvider: 'google_images_upload',
    });
    (seq as any).clickGoogleConsentIfPresent = vi
      .fn()
      .mockImplementationOnce(async () => {
        currentUrl = 'https://www.google.com/?olud';
        return { resolved: true };
      })
      .mockResolvedValue({ resolved: false });

    const res = await (seq as any).openGoogleLens({ candidateId: 'img', candidateRank: 1 });

    expect(res.success).toBe(true);
    expect(goto).toHaveBeenCalledTimes(3);
    const step = (seq as any).scanSteps.find((s: any) => s.key === 'google_lens_open');
    expect(step.status).toBe('completed');
    expect(step.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Image search page',
          value: 'https://www.google.com/imghp?hl=en',
        }),
        expect.objectContaining({ label: 'Ready reason', value: 'upload_entry_url' }),
      ])
    );
  });

  it('opens the configured image search page before the built-in Google fallbacks', async () => {
    let currentUrl = 'https://images.google.com/';
    const goto = vi.fn().mockImplementation(async (url: string) => {
      currentUrl = url;
    });
    const ctx = makeContext({
      goto,
      url: vi.fn(() => currentUrl),
    });
    const seq = new AmazonScanSequencer(ctx, {
      imageSearchProvider: 'google_images_upload',
      imageSearchPageUrl: 'https://www.google.com/imghp?hl=en',
    });

    const res = await (seq as any).openGoogleLens({ candidateId: 'img', candidateRank: 1 });

    expect(res.success).toBe(true);
    expect(goto).toHaveBeenCalledTimes(1);
    expect(goto).toHaveBeenCalledWith('https://www.google.com/imghp?hl=en', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
  });

  it('fails Google Lens open with google_login_required when Google keeps showing sign-in', async () => {
    const goto = vi.fn().mockResolvedValue(undefined);
    const ctx = makeContext({
      goto,
      url: vi.fn().mockReturnValue('https://accounts.google.com/ServiceLogin'),
    });
    const seq = new AmazonScanSequencer(ctx);

    const res = await (seq as any).openGoogleLens({ candidateId: 'img', candidateRank: 1 });

    expect(res.success).toBe(false);
    expect(goto).toHaveBeenCalledTimes(1);
    const step = (seq as any).scanSteps.find((s: any) => s.key === 'google_lens_open');
    expect(step.status).toBe('failed');
    expect(step.resultCode).toBe('google_login_required');
  });

  it('uses runtime helper clicks for Google consent acceptance', async () => {
    const locator = {
      click: vi.fn().mockResolvedValue(undefined),
    };
    const helperClick = vi.fn().mockResolvedValue(undefined);
    const ctx = makeContext();
    ctx.helpers.click = helperClick;
    const seq = new AmazonScanSequencer(ctx);
    (seq as any).listGoogleConsentFrames = vi
      .fn()
      .mockResolvedValue([{ frame: {}, frameUrl: 'https://consent.google.com/' }]);
    (seq as any).findGoogleConsentAcceptControl = vi.fn().mockResolvedValue({
      locator,
      label: 'accept',
      frameUrl: 'https://consent.google.com/',
    });

    const result = await (seq as any).clickGoogleConsentIfPresent();

    expect(result).toEqual({ resolved: true });
    expect(helperClick).toHaveBeenCalledWith(locator, {
      clickOptions: { timeout: 5_000 },
    });
    expect(locator.click).not.toHaveBeenCalled();
  });

  it('uses runtime helper clicks for Google redirect interstitial dismissal', async () => {
    const locator = {
      count: vi.fn().mockResolvedValue(1),
      isVisible: vi.fn().mockResolvedValue(true),
      click: vi.fn().mockResolvedValue(undefined),
      first: vi.fn().mockReturnThis(),
    };
    const helperClick = vi.fn().mockResolvedValue(undefined);
    const ctx = makeContext({
      url: vi.fn().mockReturnValue('https://www.google.com/url?q=https%3A%2F%2Fwww.amazon.com%2Fdp%2FB000000001'),
      locator: vi.fn().mockReturnValue(locator),
    } as unknown as Partial<Page>);
    ctx.helpers.click = helperClick;
    const seq = new AmazonScanSequencer(ctx);

    const result = await (seq as any).dismissGoogleRedirectInterstitialIfPresent();

    expect(result).toBe(true);
    expect(helperClick).toHaveBeenCalledWith(locator, {
      clickOptions: { timeout: 5_000 },
    });
    expect(locator.click).not.toHaveBeenCalled();
  });

  it('skips the upload-page open step for URL image-search mode', async () => {
    const ctx = makeContext();
    const seq = new AmazonScanSequencer(ctx, {
      imageSearchProvider: 'google_images_url',
      imageCandidates: [{ id: 'img-1', url: 'https://example.com/product.jpg', rank: 1 }],
    });
    (seq as any).openGoogleLens = vi.fn().mockResolvedValue({ success: true, message: null });
    (seq as any).uploadToGoogleLens = vi.fn().mockResolvedValue({
      advanced: false,
      captchaRequired: false,
      error: 'stop after upload',
      failureCode: 'test_stop',
    });

    await seq.scan();

    expect((seq as any).openGoogleLens).not.toHaveBeenCalled();
    expect((seq as any).uploadToGoogleLens).toHaveBeenCalledWith({
      candidate: expect.objectContaining({ id: 'img-1' }),
      candidateId: 'img-1',
      candidateRank: 1,
    });

    const payload = (ctx.emit as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      steps: Array<{ key: string; resultCode: string | null }>;
    };
    expect(payload.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'google_lens_open',
          resultCode: 'skipped_url_mode',
        }),
      ])
    );
  });

  it('emits triage_ready with candidate previews for the candidate-search runtime', async () => {
    const ctx = makeContext();
    const seq = new AmazonScanSequencer(ctx, {
      runtimeKey: AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
      imageCandidates: [{ id: 'img-1', filepath: '/tmp/product-source.jpg', rank: 1 }],
    });

    (seq as any).openGoogleLens = vi.fn().mockResolvedValue({ success: true, message: null });
    (seq as any).uploadToGoogleLens = vi.fn().mockResolvedValue({
      advanced: true,
      captchaRequired: false,
      error: null,
      failureCode: null,
    });
    (seq as any).collectAmazonCandidates = vi.fn().mockResolvedValue({
      urls: [
        'https://www.amazon.com/dp/B000000001',
        'https://www.amazon.com/dp/B000000002',
      ],
      results: [
        {
          url: 'https://www.amazon.com/dp/B000000001',
          score: null,
          asin: 'B000000001',
          marketplaceDomain: 'www.amazon.com',
          title: null,
          snippet: null,
          rank: 1,
        },
        {
          url: 'https://www.amazon.com/dp/B000000002',
          score: null,
          asin: 'B000000002',
          marketplaceDomain: 'www.amazon.com',
          title: null,
          snippet: null,
          rank: 2,
        },
      ],
      message: null,
    });
    (seq as any).processAmazonCandidate = vi
      .fn()
      .mockImplementation(async ({ url, candidateId, candidateRank }) => ({
        status: 'probe_ready',
        asin: `B00000000${candidateRank}`,
        title: `Candidate ${String(candidateRank)}`,
        price: null,
        url,
        description: `Snippet ${String(candidateRank)}`,
        heroImageUrl: `https://images.example/${String(candidateRank)}.jpg`,
        amazonDetails: null,
        amazonProbe: {
          asin: `B00000000${String(candidateRank)}`,
          pageTitle: `Candidate ${String(candidateRank)}`,
          descriptionSnippet: `Snippet ${String(candidateRank)}`,
          pageLanguage: 'en',
          pageLanguageSource: 'html_lang',
          marketplaceDomain: 'www.amazon.com',
          candidateUrl: url,
          canonicalUrl: url,
          heroImageUrl: `https://images.example/${String(candidateRank)}.jpg`,
          heroImageAlt: `Candidate ${String(candidateRank)}`,
          heroImageArtifactName: `candidate-${String(candidateRank)}.png`,
          artifactKey: `artifact-${String(candidateRank)}`,
          bulletPoints: [],
          bulletCount: 0,
          attributeCount: 0,
        },
        candidatePreview: {
          id: `B00000000${String(candidateRank)}`,
          matchedImageId: candidateId,
          url,
          asin: `B00000000${String(candidateRank)}`,
          marketplaceDomain: 'www.amazon.com',
          title: `Candidate ${String(candidateRank)}`,
          snippet: `Snippet ${String(candidateRank)}`,
          heroImageUrl: `https://images.example/${String(candidateRank)}.jpg`,
          heroImageAlt: `Candidate ${String(candidateRank)}`,
          heroImageArtifactName: `candidate-${String(candidateRank)}.png`,
          artifactKey: `artifact-${String(candidateRank)}`,
          rank: candidateRank,
        },
        message: 'Collected Amazon candidate preview for manual selection.',
        stage: 'amazon_probe',
      }));

    await seq.scan();

    const payload = (ctx.emit as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      status: string;
      stage: string;
      candidatePreviews: Array<{ asin: string | null; rank: number | null }>;
      candidateResults: Array<{ title: string | null }>;
      scrapedItems: Array<{ asin: string | null; rank: number | null }>;
      matchedImageId: string | null;
    };

    expect(payload.status).toBe('triage_ready');
    expect(payload.stage).toBe('amazon_probe');
    expect(payload.matchedImageId).toBe('img-1');
    expect(payload.candidatePreviews).toHaveLength(2);
    expect(payload.candidatePreviews[0]).toEqual(
      expect.objectContaining({ asin: 'B000000001', rank: 1 })
    );
    expect(payload.scrapedItems).toHaveLength(2);
    expect(payload.scrapedItems[0]).toEqual(
      expect.objectContaining({ asin: 'B000000001', rank: 1 })
    );
    expect(payload.candidateResults[0]).toEqual(
      expect.objectContaining({ title: 'Candidate 1' })
    );
  });

  it('resumes Google Lens upload after manual captcha is resolved', async () => {
    const ctx = makeContext();
    const seq = new AmazonScanSequencer(ctx, {
      runtimeKey: AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
      allowManualVerification: true,
      imageCandidates: [{ id: 'img-1', filepath: '/tmp/product-source.jpg', rank: 1 }],
    });
    const uploadToGoogleLens = vi
      .fn()
      .mockResolvedValueOnce({
        advanced: false,
        captchaRequired: true,
        error: 'Google Lens requested captcha verification.',
        failureCode: 'captcha_required',
      })
      .mockResolvedValueOnce({
        advanced: true,
        captchaRequired: false,
        error: null,
        failureCode: null,
      });

    (seq as any).openGoogleLens = vi.fn().mockResolvedValue({ success: true, message: null });
    (seq as any).uploadToGoogleLens = uploadToGoogleLens;
    (seq as any).handleGoogleCaptcha = vi.fn().mockResolvedValue({ resolved: true });
    (seq as any).readGoogleLensProcessingState = vi.fn().mockResolvedValue({
      currentUrl: 'https://images.google.com/',
      processingVisible: false,
      progressIndicatorVisible: false,
      progressIndicatorSelector: null,
      processingText: null,
      resultShellVisible: false,
      resultShellSelector: null,
    });
    (seq as any).hasGoogleLensResultHints = vi.fn().mockResolvedValue(false);
    (seq as any).collectAmazonCandidates = vi.fn().mockResolvedValue({
      urls: [],
      results: [],
      message: 'No Amazon candidate URLs were found in the Google Lens results.',
    });

    await seq.scan();

    expect(uploadToGoogleLens).toHaveBeenCalledTimes(2);
    expect((seq as any).handleGoogleCaptcha).toHaveBeenCalledWith({
      candidateId: 'img-1',
      candidateRank: 1,
      waitForClear: true,
    });
    expect((seq as any).collectAmazonCandidates).toHaveBeenCalled();
    const payload = (ctx.emit as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      stage: string;
      status: string;
    };
    expect(payload.stage).toBe('google_candidates');
    expect(payload.status).toBe('failed');
  });

  it('emits captcha_required when manual captcha cannot continue', async () => {
    const ctx = makeContext({
      url: vi.fn().mockReturnValue('https://www.google.com/sorry/index'),
    });
    const seq = new AmazonScanSequencer(ctx, {
      runtimeKey: AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
      allowManualVerification: true,
      imageCandidates: [{ id: 'img-1', filepath: '/tmp/product-source.jpg', rank: 1 }],
    });

    (seq as any).openGoogleLens = vi.fn().mockResolvedValue({ success: true, message: null });
    (seq as any).uploadToGoogleLens = vi.fn().mockResolvedValue({
      advanced: false,
      captchaRequired: true,
      error: 'Google Lens requested captcha verification.',
      failureCode: 'captcha_required',
    });
    (seq as any).handleGoogleCaptcha = vi.fn().mockResolvedValue({ resolved: false });

    await seq.scan();

    const payload = (ctx.emit as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      stage: string;
      status: string;
      currentUrl: string | null;
    };
    expect(payload.stage).toBe('google_captcha');
    expect(payload.status).toBe('captcha_required');
    expect(payload.currentUrl).toContain('google.com/sorry');
  });

  it('treats a closed Google sorry page as a captcha transition', async () => {
    const ctx = makeContext({
      url: vi.fn().mockReturnValue('https://www.google.com/sorry/index?continue=https://www.google.com/search'),
      isClosed: vi.fn().mockReturnValue(true),
    });
    const seq = new AmazonScanSequencer(ctx);

    const transition = await (seq as any).waitForGoogleLensResultState(
      'https://lens.google.com/upload',
      null,
      null
    );

    expect(transition).toMatchObject({
      advanced: true,
      reason: 'captcha',
    });
    expect(transition.currentUrl).toContain('google.com/sorry');
  });

  it('accepts hidden Google Lens file inputs for Playwright uploads', async () => {
    const hiddenInputLocator = {
      count: vi.fn().mockResolvedValue(1),
      evaluateAll: vi.fn().mockImplementation(async (callback: (nodes: Element[]) => number) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        document.body.appendChild(input);
        try {
          return callback([input]);
        } finally {
          input.remove();
        }
      }),
      nth: vi.fn().mockReturnValue({ setInputFiles: vi.fn().mockResolvedValue(undefined) }),
      first: vi.fn().mockReturnThis(),
      isVisible: vi.fn().mockResolvedValue(false),
    };
    const emptyLocator = {
      count: vi.fn().mockResolvedValue(0),
      evaluateAll: vi.fn().mockResolvedValue(-1),
      nth: vi.fn().mockReturnThis(),
      first: vi.fn().mockReturnThis(),
      isVisible: vi.fn().mockResolvedValue(false),
      textContent: vi.fn().mockResolvedValue(null),
    };
    const ctx = makeContext({
      locator: vi.fn().mockImplementation((selector: string) =>
        selector === 'input[type="file"][accept*="image"]' ? hiddenInputLocator : emptyLocator
      ),
    });
    const seq = new AmazonScanSequencer(ctx);

    const state = await (seq as any).resolveGoogleLensFileInput();

    expect(state).toMatchObject({
      ready: true,
      selector: 'input[type="file"][accept*="image"]',
      scopeType: 'page',
      inputCount: 1,
    });
    expect(hiddenInputLocator.nth).toHaveBeenCalledWith(0);
  });

  it('only clicks safe image-search entry controls while waiting for a file input', async () => {
    const ctx = makeContext();
    const seq = new AmazonScanSequencer(ctx);
    (seq as any).resolveGoogleLensFileInput = vi.fn().mockResolvedValue({
      ready: false,
      inputLocator: null,
      currentUrl: 'https://lens.google.com/',
      selector: null,
      scopeType: null,
      frameUrl: null,
      inputCount: 0,
    });
    (seq as any).clickGoogleConsentIfPresent = vi.fn().mockResolvedValue({ resolved: false });
    (seq as any).clickFirstVisible = vi.fn().mockResolvedValue(false);
    (seq as any).wait = vi.fn().mockResolvedValue(undefined);
    const nowSpy = vi.spyOn(Date, 'now');
    let now = 0;
    nowSpy.mockImplementation(() => {
      now += 1_000;
      return now;
    });

    try {
      const state = await (seq as any).waitForGoogleLensFileInput();

      expect(state.ready).toBe(false);
      expect((seq as any).clickGoogleConsentIfPresent).toHaveBeenCalled();
      expect((seq as any).clickFirstVisible).toHaveBeenCalledTimes(1);
      const clickedSelectors = ((seq as any).clickFirstVisible as ReturnType<typeof vi.fn>)
        .mock.calls[0]?.[0] as string[];
      expect(clickedSelectors).toEqual(
        expect.arrayContaining([
          'button[aria-label="Search by image"]',
          '[data-base-uri="/searchbyimage"]',
        ])
      );
      expect(clickedSelectors.some((selector) => /upload/i.test(selector))).toBe(false);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('attaches image files programmatically without opening the native file chooser', async () => {
    const waitForEvent = vi.fn();
    const inputLocator = {
      click: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue(undefined),
      setInputFiles: vi.fn().mockResolvedValue(undefined),
      dispatchEvent: vi.fn().mockResolvedValue(undefined),
    };
    const ctx = makeContext({ waitForEvent } as unknown as Partial<Page>);
    const seq = new AmazonScanSequencer(ctx);

    const result = await (seq as any).attachImageToGoogleLensInput(
      inputLocator,
      '/tmp/product-source.jpg'
    );

    expect(result).toEqual({ success: true, method: 'set_input_files', message: null });
    expect(waitForEvent).not.toHaveBeenCalled();
    expect(inputLocator.click).not.toHaveBeenCalled();
    expect(inputLocator.evaluate).not.toHaveBeenCalled();
    expect(inputLocator.setInputFiles).toHaveBeenCalledWith('/tmp/product-source.jpg');
    expect(inputLocator.dispatchEvent).toHaveBeenCalledWith('change');
    expect(inputLocator.dispatchEvent).toHaveBeenCalledWith('input');
  });

  it('uses URL mode without waiting for a file input', async () => {
    const goto = vi.fn().mockResolvedValue(undefined);
    const ctx = makeContext({ goto });
    const seq = new AmazonScanSequencer(ctx, {
      imageSearchProvider: 'google_images_url',
    });
    (seq as any).waitForGoogleLensFileInput = vi.fn().mockResolvedValue({
      ready: true,
      inputLocator: { setInputFiles: vi.fn() },
    });
    (seq as any).waitForGoogleLensResultState = vi.fn().mockResolvedValue({
      advanced: true,
      currentUrl: 'https://lens.google.com/search',
      reason: 'result_hints',
      processingState: null,
    });

    const result = await (seq as any).uploadToGoogleLens({
      candidate: { id: 'img-1', url: 'https://example.com/product.jpg' },
      candidateId: 'img-1',
      candidateRank: 1,
    });

    expect(result).toMatchObject({ advanced: true, captchaRequired: false });
    expect((seq as any).waitForGoogleLensFileInput).not.toHaveBeenCalled();
    expect(goto).toHaveBeenCalledWith(
      'https://www.google.com/searchbyimage?image_url=https%3A%2F%2Fexample.com%2Fproduct.jpg&hl=en',
      { waitUntil: 'domcontentloaded', timeout: 30_000 }
    );
  });

  it('fails URL mode before upload controls when the image URL is not public HTTP', async () => {
    const goto = vi.fn().mockResolvedValue(undefined);
    const ctx = makeContext({ goto });
    const seq = new AmazonScanSequencer(ctx, {
      imageSearchProvider: 'google_images_url',
    });
    (seq as any).waitForGoogleLensFileInput = vi.fn();

    const result = await (seq as any).uploadToGoogleLens({
      candidate: { id: 'img-1', url: '/local/product.jpg' },
      candidateId: 'img-1',
      candidateRank: 1,
    });

    expect(result).toMatchObject({
      advanced: false,
      captchaRequired: false,
      failureCode: 'provider_requires_image_url',
    });
    expect(goto).not.toHaveBeenCalled();
    expect((seq as any).waitForGoogleLensFileInput).not.toHaveBeenCalled();
  });

  it('direct candidate extraction skips Google Lens and extracts the selected Amazon page', async () => {
    const ctx = makeContext();
    const seq = new AmazonScanSequencer(ctx, {
      runtimeKey: AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
      directAmazonCandidateUrl: 'https://www.amazon.com/dp/B000DIRECT1',
      directAmazonCandidateUrls: [
        'https://www.amazon.com/dp/B000DIRECT2',
        'https://www.amazon.com/dp/B000DIRECT1',
      ],
      directMatchedImageId: 'img-1',
      directAmazonCandidateRank: 2,
    });

    (seq as any).openGoogleLens = vi.fn().mockResolvedValue({ success: true, message: null });
    (seq as any).processAmazonCandidate = vi.fn().mockImplementation(async ({ url }) => ({
      status: 'matched',
      asin: 'B000DIRECT1',
      title: 'Selected candidate',
      price: '$19.99',
      url,
      description: 'Extracted description',
      heroImageUrl: 'https://images.example/direct.jpg',
      amazonDetails: null,
      amazonProbe: null,
      candidatePreview: null,
      message: 'Amazon product details extracted.',
      stage: 'amazon_extract',
    }));

    await seq.scan();

    const payload = (ctx.emit as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      status: string;
      stage: string;
      title: string | null;
      candidateUrls: string[];
      candidateResults: Array<{ url: string; rank: number | null }>;
      scrapedItems: Array<{ title: string | null; url: string | null }>;
      steps: Array<{ key: string }>;
    };

    expect((seq as any).openGoogleLens).not.toHaveBeenCalled();
    expect(payload.status).toBe('matched');
    expect(payload.stage).toBe('amazon_extract');
    expect(payload.title).toBe('Selected candidate');
    expect(payload.candidateUrls).toEqual([
      'https://www.amazon.com/dp/B000DIRECT1',
      'https://www.amazon.com/dp/B000DIRECT2',
    ]);
    expect(payload.scrapedItems).toEqual([
      expect.objectContaining({
        title: 'Selected candidate',
        url: 'https://www.amazon.com/dp/B000DIRECT1',
      }),
    ]);
    expect(payload.candidateResults[0]).toEqual(
      expect.objectContaining({
        url: 'https://www.amazon.com/dp/B000DIRECT1',
        rank: 2,
      })
    );
    expect(payload.steps.map((step) => step.key)).not.toContain('google_lens_open');
  });

  it('uploadToGoogleLens accepts persisted filepath candidates', async () => {
    const ctx = makeContext();
    const seq = new AmazonScanSequencer(ctx);
    const setInputFiles = vi.fn().mockResolvedValue(undefined);

    (seq as any).waitForGoogleLensFileInput = vi.fn().mockResolvedValue({
      ready: true,
      inputLocator: {
        setInputFiles,
      },
      currentUrl: 'https://images.google.com/',
      selector: 'input[type="file"]',
      scopeType: 'page',
      frameUrl: null,
      inputCount: 1,
    });
    (seq as any).waitForGoogleLensResultState = vi.fn().mockResolvedValue({
      advanced: true,
      currentUrl: 'https://lens.google.com/search?p=uploaded',
      reason: 'result_ready',
      processingState: null,
    });

    const uploadResult = await (seq as any).uploadToGoogleLens({
      candidate: {
        id: 'img-1',
        filepath: '/tmp/persisted-product-image.jpg',
      },
      candidateId: 'img-1',
      candidateRank: 1,
    });

    expect(uploadResult.advanced).toBe(true);
    expect(setInputFiles).toHaveBeenCalledWith('/tmp/persisted-product-image.jpg');
  });

  describe('dismissAmazonOverlays', () => {
    it('returns cleared:true when no overlays are present', async () => {
      const ctx = makeContext();
      const seq = new AmazonScanSequencer(ctx);
      const result = await (seq as unknown as { dismissAmazonOverlays(): Promise<{ cleared: boolean }> }).dismissAmazonOverlays();
      expect(result.cleared).toBe(true);
    });
  });

  describe('detectAmazonOverlayState', () => {
    it('reports cookieVisible false when no cookie selectors match', async () => {
      const ctx = makeContext();
      const seq = new AmazonScanSequencer(ctx);
      const state = await (seq as unknown as { detectAmazonOverlayState(): Promise<{ cookieVisible: boolean; addressVisible: boolean; productContentReady: boolean }> }).detectAmazonOverlayState();
      expect(state.cookieVisible).toBe(false);
      expect(state.addressVisible).toBe(false);
    });
  });

  describe('isGoogleImagesUploadEntryUrl (via waitForGoogleLensResultState fallback)', () => {
    it('reports captcha before treating Google sorry navigation as successful advancement', async () => {
      const sorryUrl = 'https://www.google.com/sorry/index?continue=https%3A%2F%2Fwww.google.com%2Fsearch';
      const ctx = makeContext({
        url: vi.fn().mockReturnValue(sorryUrl),
      });
      const seq = new AmazonScanSequencer(ctx);
      (seq as any).isGoogleConsentPresent = vi.fn().mockResolvedValue(false);
      (seq as any).readGoogleLensProcessingState = vi.fn().mockResolvedValue({
        currentUrl: sorryUrl,
        processingVisible: false,
        progressIndicatorVisible: false,
        progressIndicatorSelector: null,
        processingText: null,
        resultShellVisible: false,
        resultShellSelector: null,
      });
      (seq as any).hasGoogleLensResultHints = vi.fn().mockResolvedValue(false);

      const result = await (seq as any).waitForGoogleLensResultState(
        'https://images.google.com/',
        null,
        null
      );

      expect(result).toEqual(
        expect.objectContaining({
          advanced: true,
          currentUrl: sorryUrl,
          reason: 'captcha',
        })
      );
    });

    it('detects captcha from page text even when Google stays off the /sorry URL', async () => {
      const currentUrl = 'https://www.google.com/?olud';
      const makeLocator = (params?: { count?: number; textContent?: string | null }) => ({
        count: vi.fn().mockResolvedValue(params?.count ?? 0),
        isVisible: vi.fn().mockResolvedValue((params?.count ?? 0) > 0),
        click: vi.fn().mockResolvedValue(undefined),
        first: vi.fn().mockReturnThis(),
        nth: vi.fn().mockReturnThis(),
        evaluateAll: vi.fn().mockResolvedValue([]),
        setInputFiles: vi.fn().mockResolvedValue(undefined),
        waitFor: vi.fn().mockRejectedValue(new Error('timeout')),
        textContent: vi.fn().mockResolvedValue(params?.textContent ?? null),
      });
      const ctx = makeContext({
        url: vi.fn().mockReturnValue(currentUrl),
        locator: vi.fn().mockImplementation((selector: string) => {
          if (selector === 'body') {
            return makeLocator({
              count: 1,
              textContent: 'Nasze systemy wykryły nietypowy ruch pochodzący z Twojej sieci komputerowej.',
            });
          }
          return makeLocator();
        }),
      });
      const seq = new AmazonScanSequencer(ctx);

      await expect((seq as any).detectGoogleLensCaptcha()).resolves.toEqual({
        detected: true,
        currentUrl,
      });
    });

    it('reclassifies a late Google upload timeout as captcha when the anti-bot page appears at the deadline', async () => {
      const currentUrl = 'https://www.google.com/?olud';
      const dateSpy = vi.spyOn(Date, 'now');
      const realDateNow = Date.now;
      let fakeNow = realDateNow();
      dateSpy.mockImplementation(() => {
        fakeNow += 30_000;
        return fakeNow;
      });

      const makeLocator = (params?: { count?: number; textContent?: string | null }) => ({
        count: vi.fn().mockResolvedValue(params?.count ?? 0),
        isVisible: vi.fn().mockResolvedValue((params?.count ?? 0) > 0),
        click: vi.fn().mockResolvedValue(undefined),
        first: vi.fn().mockReturnThis(),
        nth: vi.fn().mockReturnThis(),
        evaluateAll: vi.fn().mockResolvedValue([]),
        setInputFiles: vi.fn().mockResolvedValue(undefined),
        waitFor: vi.fn().mockRejectedValue(new Error('timeout')),
        textContent: vi.fn().mockResolvedValue(params?.textContent ?? null),
      });

      try {
        const ctx = makeContext({
          url: vi.fn().mockReturnValue(currentUrl),
          locator: vi.fn().mockImplementation((selector: string) => {
            if (selector === 'body') {
              return makeLocator({
                count: 1,
                textContent: 'Our systems have detected unusual traffic from your computer network.',
              });
            }
            return makeLocator();
          }),
        });
        const seq = new AmazonScanSequencer(ctx);

        const result = await (seq as any).waitForGoogleLensResultState(currentUrl, null, null);

        expect(result).toEqual(
          expect.objectContaining({
            advanced: true,
            currentUrl,
            reason: 'captcha',
          })
        );
      } finally {
        dateSpy.mockRestore();
      }
    });

    it('reclassifies a late Google upload timeout as advanced when Lens reaches a results URL at the deadline', async () => {
      const startingUrl = 'https://www.google.com/?olud';
      const currentUrl = 'https://www.google.com/search?vsrid=test&udm=26';
      const dateSpy = vi.spyOn(Date, 'now');
      const realDateNow = Date.now;
      let fakeNow = realDateNow();
      dateSpy.mockImplementation(() => {
        fakeNow += 30_000;
        return fakeNow;
      });

      const makeLocator = (params?: { count?: number; textContent?: string | null }) => ({
        count: vi.fn().mockResolvedValue(params?.count ?? 0),
        isVisible: vi.fn().mockResolvedValue((params?.count ?? 0) > 0),
        click: vi.fn().mockResolvedValue(undefined),
        first: vi.fn().mockReturnThis(),
        nth: vi.fn().mockReturnThis(),
        evaluateAll: vi.fn().mockResolvedValue([]),
        setInputFiles: vi.fn().mockResolvedValue(undefined),
        waitFor: vi.fn().mockRejectedValue(new Error('timeout')),
        textContent: vi.fn().mockResolvedValue(params?.textContent ?? null),
      });

      try {
        const ctx = makeContext({
          url: vi.fn().mockReturnValue(currentUrl),
          locator: vi.fn().mockImplementation((selector: string) => {
            if (selector === 'body') {
              return makeLocator({
                count: 1,
                textContent: 'Visual matches and related results.',
              });
            }
            return makeLocator();
          }),
        });
        const seq = new AmazonScanSequencer(ctx);

        const result = await (seq as any).waitForGoogleLensResultState(startingUrl, null, null);

        expect(result).toEqual(
          expect.objectContaining({
            advanced: true,
            currentUrl,
            reason: 'url_changed',
          })
        );
      } finally {
        dateSpy.mockRestore();
      }
    });

    it('scan completes when goto fails to advance to result page', async () => {
      // Use a sleep mock that fast-forwards time so the 25s wait loop terminates instantly
      let elapsed = 0;
      const sleepMock = vi.fn().mockImplementation((ms: number) => {
        elapsed += ms;
        return Promise.resolve();
      });

      // Mock Date.now to simulate time passing in chunks so the polling loop exits
      const realDateNow = Date.now;
      let fakeNow = realDateNow();
      vi.spyOn(Date, 'now').mockImplementation(() => {
        fakeNow += 30_000; // jump 30s per call so the deadline is immediately exceeded
        return fakeNow;
      });

      const ctx = makeContext({
        goto: vi.fn()
          .mockResolvedValueOnce(undefined) // google open succeeds
          .mockImplementation(() => Promise.resolve(undefined)),
        url: vi.fn().mockReturnValue('https://images.google.com/'),
        frames: vi.fn().mockReturnValue([]),
        waitForLoadState: vi.fn().mockResolvedValue(undefined),
        locator: vi.fn().mockImplementation(() => ({
          count: vi.fn().mockResolvedValue(0),
          isVisible: vi.fn().mockResolvedValue(false),
          click: vi.fn().mockResolvedValue(undefined),
          first: vi.fn().mockReturnThis(),
          nth: vi.fn().mockReturnThis(),
          evaluateAll: vi.fn().mockResolvedValue([]),
          setInputFiles: vi.fn().mockResolvedValue(undefined),
          waitFor: vi.fn().mockRejectedValue(new Error('timeout')),
          textContent: vi.fn().mockResolvedValue(null),
        })),
      });
      ctx.helpers = { sleep: sleepMock };

      const seq = new AmazonScanSequencer(ctx, {
        imageCandidates: [{ id: 'img-1', url: 'http://example.com/img.jpg', rank: 1 }],
      });
      await seq.scan();

      vi.restoreAllMocks();
      expect(ctx.emit).toHaveBeenCalled();
    });
  });
});

// ─── Supplier1688ScanSequencer ────────────────────────────────────────────────

describe('Supplier1688ScanSequencer', () => {
  it('fails with missing_image_source when no candidates or direct URLs provided', async () => {
    const ctx = makeContext();
    const seq = new Supplier1688ScanSequencer(ctx, {});
    await seq.scan();

    expect(ctx.emit).toHaveBeenCalledWith(
      'result',
      expect.objectContaining({ status: 'failed' })
    );
    const payload = (ctx.emit as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      steps: Array<{ key: string; resultCode: string | null }>;
    };
    const validateStep = payload.steps.find((s) => s.key === 'validate');
    expect(validateStep!.resultCode).toBe('missing_image_source');
  });

  it('seeds the supplier_reverse_image_scan_browser step sequence', async () => {
    const ctx = makeContext();
    const seq = new Supplier1688ScanSequencer(ctx, {});
    await seq.scan();

    const payload = (ctx.emit as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      steps: Array<{ key: string }>;
    };
    const keys = payload.steps.map((s) => s.key);
    expect(keys).toContain('1688_open');
    expect(keys).toContain('1688_upload');
    expect(keys).toContain('1688_collect_candidates');
    expect(keys).toContain('supplier_open');
    expect(keys).toContain('supplier_extract');
  });

  it('goes straight to supplier pages when direct URLs are provided (skips image search)', async () => {
    const page = makeMockPage({
      goto: vi.fn().mockResolvedValue(undefined),
      url: vi.fn().mockReturnValue('https://detail.1688.com/offer/123456789.html'),
      title: vi.fn().mockResolvedValue(''),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      locator: vi.fn().mockImplementation(() => ({
        count: vi.fn().mockResolvedValue(0),
        isVisible: vi.fn().mockResolvedValue(false),
        first: vi.fn().mockReturnThis(),
        innerText: vi.fn().mockResolvedValue(''),
        textContent: vi.fn().mockResolvedValue(''),
        getAttribute: vi.fn().mockResolvedValue(null),
        evaluateAll: vi.fn().mockResolvedValue([]),
        waitFor: vi.fn().mockResolvedValue(undefined),
      })),
    });
    const ctx = { ...makeContext(), page };

    const input: Supplier1688ScanInput = {
      directSupplierCandidateUrls: ['https://detail.1688.com/offer/123456789.html'],
    };
    const seq = new Supplier1688ScanSequencer(ctx, input);
    await seq.scan();

    // Should not have called open1688ImageSearch
    const payload = (ctx.emit as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      steps: Array<{ key: string }>;
    };
    const keys = payload.steps.map((s) => s.key);
    expect(keys).not.toContain('1688_open');
    expect(keys).not.toContain('1688_upload');
    expect(keys).toContain('supplier_open');
  });

  it('fails at 1688_open when navigation results in chrome-error:// URL', async () => {
    const ctx = makeContext({
      goto: vi.fn().mockResolvedValue(undefined),
      url: vi.fn().mockReturnValue('chrome-error://chromewebdata/'),
      title: vi.fn().mockResolvedValue(''),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      locator: vi.fn().mockImplementation(() => ({
        count: vi.fn().mockResolvedValue(0),
        isVisible: vi.fn().mockResolvedValue(false),
        first: vi.fn().mockReturnThis(),
        innerText: vi.fn().mockResolvedValue(''),
        textContent: vi.fn().mockResolvedValue(''),
        evaluateAll: vi.fn().mockResolvedValue([]),
      })),
    });
    const seq = new Supplier1688ScanSequencer(ctx, {
      imageCandidates: [{ id: 'img-1', localPath: '/tmp/img.jpg' }],
    });
    await seq.scan();

    const payload = (ctx.emit as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      status: string;
      stage: string;
      steps: Array<{ key: string; status: string; resultCode: string | null }>;
    };
    expect(payload.status).toBe('failed');
    const openStep = payload.steps.find((s) => s.key === '1688_open');
    expect(openStep!.resultCode).toBe('navigation_failed');
  });

  describe('normalize1688OfferUrl', () => {
    it('normalises a valid 1688 offer URL (strips query and hash)', () => {
      const ctx = makeContext();
      const seq = new Supplier1688ScanSequencer(ctx);
      const fn = (seq as unknown as { normalize1688OfferUrl(v: string): string | null }).normalize1688OfferUrl;
      const url = 'https://detail.1688.com/offer/123456789.html?spm=something&source=other#anchor';
      const normalized = fn.call(seq, url);
      expect(normalized).toBe('https://detail.1688.com/offer/123456789.html');
    });

    it('returns null for non-1688 URLs', () => {
      const ctx = makeContext();
      const seq = new Supplier1688ScanSequencer(ctx);
      const fn = (seq as unknown as { normalize1688OfferUrl(v: string): string | null }).normalize1688OfferUrl;
      expect(fn.call(seq, 'https://amazon.com/dp/ABC123')).toBeNull();
    });

    it('returns null for 1688 URLs that are not offer pages', () => {
      const ctx = makeContext();
      const seq = new Supplier1688ScanSequencer(ctx);
      const fn = (seq as unknown as { normalize1688OfferUrl(v: string): string | null }).normalize1688OfferUrl;
      expect(fn.call(seq, 'https://www.1688.com/')).toBeNull();
      expect(fn.call(seq, 'https://s.1688.com/youyuan/index.htm?tab=imageSearch')).toBeNull();
    });
  });

  describe('detect1688AccessBarrier', () => {
    it('reports blocked:false on a normal 1688 page', async () => {
      const ctx = makeContext({
        url: vi.fn().mockReturnValue('https://detail.1688.com/offer/123.html'),
        title: vi.fn().mockResolvedValue('Product Title'),
        locator: vi.fn().mockImplementation(() => ({
          count: vi.fn().mockResolvedValue(0),
          isVisible: vi.fn().mockResolvedValue(false),
          first: vi.fn().mockReturnThis(),
          innerText: vi.fn().mockResolvedValue('商品信息 起订 供应商'),
          textContent: vi.fn().mockResolvedValue('商品信息 起订 供应商'),
          evaluateAll: vi.fn().mockResolvedValue([]),
        })),
      });
      const seq = new Supplier1688ScanSequencer(ctx);
      const barrier = await (seq as unknown as { detect1688AccessBarrier(s: string): Promise<{ blocked: boolean }> })
        .detect1688AccessBarrier('supplier_open');
      expect(barrier.blocked).toBe(false);
    });

    it('reports blocked:true with barrierKind:login when login text is present', async () => {
      const ctx = makeContext({
        url: vi.fn().mockReturnValue('https://login.1688.com/'),
        title: vi.fn().mockResolvedValue('登录'),
        locator: vi.fn().mockImplementation(() => ({
          count: vi.fn().mockResolvedValue(0),
          isVisible: vi.fn().mockResolvedValue(false),
          first: vi.fn().mockReturnThis(),
          innerText: vi.fn().mockResolvedValue('请登录后继续'),
          textContent: vi.fn().mockResolvedValue('请登录后继续'),
          evaluateAll: vi.fn().mockResolvedValue([]),
        })),
      });
      const seq = new Supplier1688ScanSequencer(ctx);
      const barrier = await (seq as unknown as { detect1688AccessBarrier(s: string): Promise<{ blocked: boolean; barrierKind: string }> })
        .detect1688AccessBarrier('1688_open');
      expect(barrier.blocked).toBe(true);
      expect(barrier.barrierKind).toBe('login');
    });
  });

  describe('applyNaturalBrowserSetup', () => {
    it('calls setExtraHTTPHeaders with Chinese Accept-Language', async () => {
      const ctx = makeContext();
      const seq = new Supplier1688ScanSequencer(ctx);
      await (seq as unknown as { applyNaturalBrowserSetup(): Promise<void> }).applyNaturalBrowserSetup();
      expect(ctx.page.setExtraHTTPHeaders).toHaveBeenCalledWith(
        expect.objectContaining({ 'Accept-Language': expect.stringContaining('zh-CN') })
      );
    });

    it('calls setViewportSize with a resolution in the expected range', async () => {
      const ctx = makeContext();
      const seq = new Supplier1688ScanSequencer(ctx);
      await (seq as unknown as { applyNaturalBrowserSetup(): Promise<void> }).applyNaturalBrowserSetup();
      expect(ctx.page.setViewportSize).toHaveBeenCalledWith(
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number),
        })
      );
      const callArg = (ctx.page.setViewportSize as ReturnType<typeof vi.fn>).mock.calls[0][0] as { width: number; height: number };
      expect(callArg.width).toBeGreaterThanOrEqual(1_366);
      expect(callArg.width).toBeLessThanOrEqual(1_513);
      expect(callArg.height).toBeGreaterThanOrEqual(820);
      expect(callArg.height).toBeLessThanOrEqual(941);
    });
  });

  describe('collect1688CandidateUrls', () => {
    it('returns empty array when no matching links exist on the page', async () => {
      const ctx = makeContext();
      const seq = new Supplier1688ScanSequencer(ctx);
      const urls = await (seq as unknown as { collect1688CandidateUrls(): Promise<string[]> }).collect1688CandidateUrls();
      expect(urls).toEqual([]);
    });
  });
});

// ─── Selector registry: runtime injection coverage ────────────────────────────

describe('Selector registry runtime coverage', () => {
  it('AMAZON_SELECTOR_REGISTRY_RUNTIME contains all key selectors as single-quoted strings', async () => {
    const { AMAZON_SELECTOR_REGISTRY_RUNTIME } = await import('../selectors/amazon');
    expect(AMAZON_SELECTOR_REGISTRY_RUNTIME).toContain("const GOOGLE_LENS_FILE_INPUT_SELECTORS =");
    expect(AMAZON_SELECTOR_REGISTRY_RUNTIME).toContain("const AMAZON_COOKIE_ACCEPT_SELECTORS =");
    expect(AMAZON_SELECTOR_REGISTRY_RUNTIME).toContain("const AMAZON_TITLE_SELECTORS =");
    // Verify single-quote encoding (not JSON double-quote encoding)
    expect(AMAZON_SELECTOR_REGISTRY_RUNTIME).toContain("'#productTitle'");
    expect(AMAZON_SELECTOR_REGISTRY_RUNTIME).toContain("'button:has-text(\"Accept all\")'");
  });

  it('SUPPLIER_1688_DEFAULT_SELECTOR_RUNTIME exposes the native selector object', async () => {
    const { SUPPLIER_1688_DEFAULT_SELECTOR_RUNTIME } = await import('../selectors/supplier-1688');
    expect(SUPPLIER_1688_DEFAULT_SELECTOR_RUNTIME.fileInputSelectors).toContain('input[type="file"]');
    expect(SUPPLIER_1688_DEFAULT_SELECTOR_RUNTIME.hardBlockingSelectors).toContain('input[type="password"]');
    expect(SUPPLIER_1688_DEFAULT_SELECTOR_RUNTIME.priceTextPatternSource).toContain('¥');
    expect(SUPPLIER_1688_DEFAULT_SELECTOR_RUNTIME.loginTextHints).toContain('请登录');
  });

  it('generateAmazonSelectorRegistryRuntime() is stable — calling it twice produces identical output', async () => {
    const { generateAmazonSelectorRegistryRuntime } = await import('../selectors/amazon');
    expect(generateAmazonSelectorRegistryRuntime()).toBe(generateAmazonSelectorRegistryRuntime());
  });

  it('resolveSupplier1688SelectorRuntimeFromEntries() is stable', async () => {
    const {
      SUPPLIER_1688_SELECTOR_REGISTRY_SEED_ENTRIES,
      resolveSupplier1688SelectorRuntimeFromEntries,
    } = await import('../selectors/supplier-1688');
    expect(resolveSupplier1688SelectorRuntimeFromEntries(SUPPLIER_1688_SELECTOR_REGISTRY_SEED_ENTRIES)).toEqual(
      resolveSupplier1688SelectorRuntimeFromEntries(SUPPLIER_1688_SELECTOR_REGISTRY_SEED_ENTRIES)
    );
  });
});
