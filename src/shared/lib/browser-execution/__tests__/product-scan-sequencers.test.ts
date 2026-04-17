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
      this.seedStepSequence({ defaultSequenceKey: 'amazon_reverse_image_scan_browser' });
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

  it('emitResult calls artifacts.json when available', async () => {
    const ctx = makeContext();
    const seq = new MinimalSequencer(ctx);
    await seq.scan();

    expect(ctx.artifacts!.json).toHaveBeenCalled();
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

  it('seeds the amazon_reverse_image_scan_browser step sequence on construction', async () => {
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

  it('uses default sequence key amazon_reverse_image_scan_browser', async () => {
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
