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

const { makeDefaultVerificationReview, mocks } = vi.hoisted(() => {
  const makeDefaultVerificationReview = () => ({
    status: 'analyzed' as const,
    provider: 'google_lens',
    stage: 'google_captcha',
    currentUrl: 'https://www.google.com/sorry/index',
    pageTitle: null,
    pageTextSnippet: null,
    challengeType: 'captcha',
    visibleQuestion: 'Verify you are human',
    visibleInstructions: [],
    uiElements: ['captcha form'],
    pageSummary: 'Verification barrier detected.',
    manualActionRequired: true,
    confidence: 0.9,
    screenshotArtifactName: 'google-verification-review.png',
    htmlArtifactName: 'google-verification-review.html',
    modelId: 'gemma',
    brainApplied: { capability: 'playwright.ai_evaluator_step' },
    error: null,
    evaluatedAt: '2026-04-18T00:00:00.000Z',
  });

  return {
    makeDefaultVerificationReview,
    mocks: {
      evaluateProductScanVerificationBarrier: vi
        .fn()
        .mockResolvedValue(makeDefaultVerificationReview()),
    },
  };
});

vi.mock('@/features/products/server/product-scan-ai-evaluator', async () => {
  const actual = await vi.importActual<typeof import('@/features/products/server/product-scan-ai-evaluator')>(
    '@/features/products/server/product-scan-ai-evaluator'
  );
  const aiStep = await vi.importActual<typeof import('@/features/playwright/server/ai-step-service')>(
    '@/features/playwright/server/ai-step-service'
  );

  return {
    ...actual,
    createProductScanVerificationBarrierAutoInjectionConfig: () => ({
      shouldInject: () => false,
      goal: 'No-op verification injection',
      maxIterations: 0,
    }),
    createProductScanVerificationBarrierRuntime: (options: Parameters<
      typeof actual.createProductScanVerificationBarrierRuntime
    >[0]) => {
      const runtime = actual.createProductScanVerificationBarrierRuntime(options);
      const mockedRuntime = {
        ...runtime,
        captureWithState: (captureOptions: Parameters<typeof runtime.captureWithState>[0]) =>
          aiStep.runPlaywrightVerificationReviewCapture({
            ...captureOptions,
            profile: runtime.profile.review,
            previousObservation: actual.getLastProductScanVerificationObservation(
              captureOptions.verificationState
            ),
            evaluate: (capture, params) =>
              mocks.evaluateProductScanVerificationBarrier(
                actual.createProductScanVerificationBarrierEvaluationInputFromProfile({
                  profile: runtime.profile,
                  params,
                  capture,
                })
              ),
            commitObservation: ({ review, observation }) =>
              actual.commitProductScanVerificationObservation(
                captureOptions.verificationState,
                {
                  review,
                  observation,
                }
              ),
          }),
        captureWithStateFromPage: (
          captureOptions: Parameters<typeof runtime.captureWithStateFromPage>[0]
        ) =>
          aiStep.runPlaywrightVerificationReviewCapture({
            ...captureOptions,
            currentUrl:
              ('currentUrl' in captureOptions.params &&
              typeof captureOptions.params.currentUrl === 'string'
                ? captureOptions.params.currentUrl
                : captureOptions.resolveCurrentUrl?.()) ?? null,
            profile: runtime.profile.review,
            previousObservation: actual.getLastProductScanVerificationObservation(
              captureOptions.verificationState
            ),
            evaluate: (capture, params) =>
              mocks.evaluateProductScanVerificationBarrier(
                actual.createProductScanVerificationBarrierEvaluationInputFromProfile({
                  profile: runtime.profile,
                  params,
                  capture,
                })
              ),
            commitObservation: ({ review, observation }) =>
              actual.commitProductScanVerificationObservation(
                captureOptions.verificationState,
                {
                  review,
                  observation,
                }
              ),
          }),
        observeLoopWithPage: (loopOptions: Parameters<typeof runtime.observeLoopWithPage>[0]) =>
          aiStep.runPlaywrightVerificationObservationLoopWithProfile({
            timeoutMs: loopOptions.timeoutMs,
            stableClearWindowMs: loopOptions.stableClearWindowMs,
            intervalMs: loopOptions.intervalMs,
            initialSnapshot: loopOptions.initialSnapshot,
            isPageClosed: loopOptions.isPageClosed,
            wait: loopOptions.wait,
            readSnapshot: loopOptions.readSnapshot,
            profile: runtime.profile,
            baseParams: loopOptions.baseParams,
            captureObservation: (params) =>
              aiStep.runPlaywrightVerificationReviewCapture({
                verificationState: loopOptions.verificationState,
                params,
                currentUrl:
                  ('currentUrl' in params && typeof params.currentUrl === 'string'
                    ? params.currentUrl
                    : loopOptions.resolveCurrentUrl?.()) ?? null,
                page: loopOptions.page,
                artifacts: loopOptions.artifacts,
                log: loopOptions.log,
                upsertStep: loopOptions.upsertStep,
                profile: runtime.profile.review,
                previousObservation: actual.getLastProductScanVerificationObservation(
                  loopOptions.verificationState
                ),
                evaluate: (capture, nextParams) =>
                  mocks.evaluateProductScanVerificationBarrier(
                    actual.createProductScanVerificationBarrierEvaluationInputFromProfile({
                      profile: runtime.profile,
                      params: nextParams,
                      capture,
                    })
                  ),
                commitObservation: ({ review, observation }) =>
                  actual.commitProductScanVerificationObservation(
                    loopOptions.verificationState,
                    {
                      review,
                      observation,
                    }
                  ),
              }),
          }),
      };
      return {
        ...mockedRuntime,
        createPageSession: (
          sessionOptions: Parameters<typeof runtime.createPageSession>[0]
        ) => {
          const verificationState = mockedRuntime.createState();
          return {
            state: verificationState,
            buildDiagnosticsPayload: () =>
              mockedRuntime.buildDiagnosticsPayload(verificationState),
            augmentPayload: (payload: Record<string, unknown>) => ({
              ...mockedRuntime.buildDiagnosticsPayload(verificationState),
              ...payload,
            }),
            capture: (captureOptions: {
              params: Parameters<typeof mockedRuntime.captureWithStateFromPage>[0]['params'];
            }) =>
              mockedRuntime.captureWithStateFromPage({
                ...sessionOptions,
                verificationState,
                params: captureOptions.params,
              }),
            observeLoop: (
              loopOptions: Omit<
                Parameters<typeof mockedRuntime.observeLoopWithPage>[0],
                'verificationState' | 'resolveCurrentUrl' | 'page' | 'artifacts' | 'log' | 'upsertStep'
              >
            ) =>
              mockedRuntime.observeLoopWithPage({
                ...loopOptions,
                ...sessionOptions,
                verificationState,
              }),
            bindBaseParams: (baseParams: Record<string, unknown>) => ({
              capture: (params: Record<string, unknown>) =>
                mockedRuntime.captureWithStateFromPage({
                  ...sessionOptions,
                  verificationState,
                  params: {
                    ...baseParams,
                    ...params,
                  },
                }),
              observeLoop: (
                loopOptions: Omit<
                  Parameters<typeof mockedRuntime.observeLoopWithPage>[0],
                  | 'verificationState'
                  | 'resolveCurrentUrl'
                  | 'page'
                  | 'artifacts'
                  | 'log'
                  | 'upsertStep'
                  | 'baseParams'
                >
              ) =>
                mockedRuntime.observeLoopWithPage({
                  ...loopOptions,
                  ...sessionOptions,
                  verificationState,
                  baseParams,
                }),
            }),
          };
        },
      };
    },
    runProductScanVerificationBarrierReviewCapture: (options: Parameters<
      typeof actual.runProductScanVerificationBarrierReviewCapture
    >[0]) =>
      aiStep.runPlaywrightVerificationReviewCapture({
        ...options,
        profile: options.profile.review,
        evaluate: (capture, params) =>
          mocks.evaluateProductScanVerificationBarrier(
            actual.createProductScanVerificationBarrierEvaluationInputFromProfile({
              profile: options.profile,
              params,
              capture,
            })
          ),
      }),
    runProductScanVerificationBarrierReviewCaptureWithState: (options: Parameters<
      typeof actual.runProductScanVerificationBarrierReviewCaptureWithState
    >[0]) =>
      aiStep.runPlaywrightVerificationReviewCapture({
        ...options,
        profile: options.profile.review,
        previousObservation: actual.getLastProductScanVerificationObservation(
          options.verificationState
        ),
        evaluate: (capture, params) =>
          mocks.evaluateProductScanVerificationBarrier(
            actual.createProductScanVerificationBarrierEvaluationInputFromProfile({
              profile: options.profile,
              params,
              capture,
            })
          ),
        commitObservation: ({ review, observation }) =>
          actual.commitProductScanVerificationObservation(options.verificationState, {
            review,
            observation,
          }),
      }),
  };
});

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
    content: vi.fn().mockResolvedValue('<html><body></body></html>'),
    title: vi.fn().mockResolvedValue(''),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue(Buffer.from('mock-screenshot')),
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
      file: vi.fn().mockResolvedValue('/tmp/google-verification-review.png'),
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

  it('createPageSession binds the shared page, artifacts, logger, URL resolver, and step upsert', () => {
    const ctx = makeContext({
      url: vi.fn().mockReturnValue('https://example.com/current'),
    });

    class SessionSeq extends ProductScanSequencer {
      async scan(): Promise<void> {}

      buildSession() {
        return this.createPageSession((sessionContext) => sessionContext);
      }
    }

    const seq = new SessionSeq(ctx);
    const session = seq.buildSession();
    const step = {
      key: 'google_captcha',
      status: 'running' as const,
      candidateId: 'img-1',
      candidateRank: 1,
      message: 'Waiting for captcha.',
      url: 'https://example.com/current',
    };

    session.upsertStep(step);

    expect(session.page).toBe(ctx.page);
    expect(session.artifacts).toBe(ctx.artifacts);
    expect(session.log).toBe(ctx.log);
    expect(session.resolveCurrentUrl()).toBe('https://example.com/current');
    expect((seq as any).scanSteps).toEqual([
      expect.objectContaining({
        key: 'google_captcha',
        status: 'running',
        candidateId: 'img-1',
      }),
    ]);
  });

  it('createPayloadAugmentedPageSession registers the session payload augmenter', async () => {
    const ctx = makeContext();

    class AugmentedSessionSeq extends ProductScanSequencer {
      async scan(): Promise<void> {
        this.createPayloadAugmentedPageSession(() => ({
          augmentPayload: (payload) => ({
            ...payload,
            augmentedBySession: true,
            title: 'Session-augmented product',
          }),
        }));
        await this.emitResult({
          status: 'completed',
          currentUrl: 'https://example.com/item',
          imageUrls: ['https://example.com/image.jpg'],
        });
      }
    }

    const seq = new AugmentedSessionSeq(ctx);
    await seq.scan();

    expect(ctx.emit).toHaveBeenCalledWith(
      'result',
      expect.objectContaining({
        augmentedBySession: true,
        title: 'Session-augmented product',
        scrapedItems: expect.arrayContaining([
          expect.objectContaining({
            title: 'Session-augmented product',
          }),
        ]),
      })
    );
  });

  it('createPayloadAugmentedRuntimePageSession registers a runtime-backed session payload augmenter', async () => {
    const ctx = makeContext();

    class RuntimeAugmentedSessionSeq extends ProductScanSequencer {
      async scan(): Promise<void> {
        this.createPayloadAugmentedRuntimePageSession(
          {
            createPageSession: () => ({
              augmentPayload: (payload) => ({
                ...payload,
                augmentedByRuntimeSession: true,
                title: 'Runtime-session product',
              }),
            }),
          }
        );
        await this.emitResult({
          status: 'completed',
          currentUrl: 'https://example.com/item',
          imageUrls: ['https://example.com/image.jpg'],
        });
      }
    }

    const seq = new RuntimeAugmentedSessionSeq(ctx);
    await seq.scan();

    expect(ctx.emit).toHaveBeenCalledWith(
      'result',
      expect.objectContaining({
        augmentedByRuntimeSession: true,
        title: 'Runtime-session product',
        scrapedItems: expect.arrayContaining([
          expect.objectContaining({
            title: 'Runtime-session product',
          }),
        ]),
      })
    );
  });

  it('resolveManualVerificationTimeoutMs normalizes positive values and falls back otherwise', () => {
    const ctx = makeContext();

    class TimeoutSeq extends ProductScanSequencer {
      async scan(): Promise<void> {}

      resolveTimeout(value: unknown, fallbackMs?: number) {
        return this.resolveManualVerificationTimeoutMs(value, fallbackMs);
      }
    }

    const seq = new TimeoutSeq(ctx);

    expect(seq.resolveTimeout(180_500)).toBe(180_500);
    expect(seq.resolveTimeout(180_500.8)).toBe(180_500);
    expect(seq.resolveTimeout(0)).toBe(240_000);
    expect(seq.resolveTimeout(-1)).toBe(240_000);
    expect(seq.resolveTimeout(null)).toBe(240_000);
    expect(seq.resolveTimeout(undefined, 90_000)).toBe(90_000);
  });

  it('resolveManualVerificationPolicy derives enabled state and normalized timeout together', () => {
    const ctx = makeContext();

    class ManualVerificationSeq extends ProductScanSequencer {
      async scan(): Promise<void> {}

      resolvePolicy(input: {
        allowManualVerification?: unknown;
        manualVerificationTimeoutMs?: unknown;
      }) {
        return this.resolveManualVerificationPolicy(input);
      }
    }

    const seq = new ManualVerificationSeq(ctx);

    expect(
      seq.resolvePolicy({
        allowManualVerification: true,
        manualVerificationTimeoutMs: 180_500.8,
      })
    ).toEqual({
      enabled: true,
      timeoutMs: 180_500,
    });
    expect(
      seq.resolvePolicy({
        allowManualVerification: false,
        manualVerificationTimeoutMs: 0,
      })
    ).toEqual({
      enabled: false,
      timeoutMs: 240_000,
    });
  });

  it('runManualVerificationFlow captures once when manual verification is disabled', async () => {
    const ctx = makeContext();
    const capture = vi.fn().mockResolvedValue(undefined);
    const observeLoop = vi.fn();

    class ManualVerificationFlowSeq extends ProductScanSequencer {
      async scan(): Promise<void> {}

      runFlow(input: {
        allowManualVerification?: unknown;
        manualVerificationTimeoutMs?: unknown;
      }) {
        return this.runManualVerificationFlow({
          input,
          session: {
            capture,
            observeLoop,
          },
          captureParams: { iteration: 1 },
          buildObserveLoopOptions: (manualVerification) => ({
            timeoutMs: manualVerification.timeoutMs,
          }),
        });
      }
    }

    const seq = new ManualVerificationFlowSeq(ctx);
    const result = await seq.runFlow({
      allowManualVerification: false,
      manualVerificationTimeoutMs: 0,
    });

    expect(capture).toHaveBeenCalledWith({ iteration: 1 });
    expect(observeLoop).not.toHaveBeenCalled();
    expect(result).toEqual({
      manualVerification: {
        enabled: false,
        timeoutMs: 240_000,
      },
      loopResult: null,
    });
  });

  it('runManualVerificationFlow observes the loop when manual verification is enabled', async () => {
    const ctx = makeContext();
    const capture = vi.fn();
    const observeLoop = vi.fn().mockResolvedValue({ resolved: true });

    class ManualVerificationFlowSeq extends ProductScanSequencer {
      async scan(): Promise<void> {}

      runFlow(input: {
        allowManualVerification?: unknown;
        manualVerificationTimeoutMs?: unknown;
      }) {
        return this.runManualVerificationFlow({
          input,
          session: {
            capture,
            observeLoop,
          },
          captureParams: { iteration: 1 },
          buildObserveLoopOptions: (manualVerification) => ({
            timeoutMs: manualVerification.timeoutMs,
            tag: 'observe',
          }),
        });
      }
    }

    const seq = new ManualVerificationFlowSeq(ctx);
    const result = await seq.runFlow({
      allowManualVerification: true,
      manualVerificationTimeoutMs: 180_500.8,
    });

    expect(capture).not.toHaveBeenCalled();
    expect(observeLoop).toHaveBeenCalledWith({
      timeoutMs: 180_500,
      tag: 'observe',
    });
    expect(result).toEqual({
      manualVerification: {
        enabled: true,
        timeoutMs: 180_500,
      },
      loopResult: { resolved: true },
    });
  });

  it('bindCandidatePageSession binds candidate meta with optional extra base params', () => {
    const ctx = makeContext();
    const bindBaseParams = vi.fn().mockReturnValue({ bound: true });

    class CandidateBindingSeq extends ProductScanSequencer {
      async scan(): Promise<void> {}

      bindCandidate() {
        return this.bindCandidatePageSession(
          { bindBaseParams },
          {
            candidateId: 'img-1',
            candidateRank: 2,
          },
          {
            stage: '1688_open' as const,
          }
        );
      }
    }

    const seq = new CandidateBindingSeq(ctx);
    const result = seq.bindCandidate();

    expect(bindBaseParams).toHaveBeenCalledWith({
      candidateId: 'img-1',
      candidateRank: 2,
      stage: '1688_open',
    });
    expect(result).toEqual({ bound: true });
  });

  it('emitResult applies registered result payload augmenters before adding scraped items', async () => {
    const ctx = makeContext();

    class AugmentingSeq extends ProductScanSequencer {
      async scan(): Promise<void> {
        this.registerResultPayloadAugmenter((payload) => ({
          ...payload,
          augmented: true,
          title: 'Augmented product',
        }));
        await this.emitResult({
          status: 'completed',
          currentUrl: 'https://example.com/item',
          imageUrls: ['https://example.com/image.jpg'],
        });
      }
    }

    const seq = new AugmentingSeq(ctx);
    await seq.scan();

    expect(ctx.emit).toHaveBeenCalledWith(
      'result',
      expect.objectContaining({
        augmented: true,
        title: 'Augmented product',
        scrapedItems: expect.arrayContaining([
          expect.objectContaining({
            title: 'Augmented product',
          }),
        ]),
      })
    );
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

beforeEach(() => {
  mocks.evaluateProductScanVerificationBarrier.mockReset();
  mocks.evaluateProductScanVerificationBarrier.mockResolvedValue(
    makeDefaultVerificationReview()
  );
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

  it('captures verification observations across the captcha loop and dedupes identical screens', async () => {
    const dateSpy = vi.spyOn(Date, 'now');
    let fakeNow = 1_000_000;
    dateSpy.mockImplementation(() => fakeNow);

    const captchaUrl = 'https://www.google.com/sorry/index';
    const clearUrl = 'https://lens.google.com/search?p=cleared';
    let currentUrl = captchaUrl;
    const makeLocator = (textContent: string | null) => ({
      count: vi.fn().mockResolvedValue(1),
      isVisible: vi.fn().mockResolvedValue(true),
      click: vi.fn().mockResolvedValue(undefined),
      first: vi.fn().mockReturnThis(),
      nth: vi.fn().mockReturnThis(),
      evaluateAll: vi.fn().mockResolvedValue([]),
      setInputFiles: vi.fn().mockResolvedValue(undefined),
      waitFor: vi.fn().mockRejectedValue(new Error('timeout')),
      textContent: vi.fn().mockResolvedValue(textContent),
    });
    const ctx = makeContext({
      url: vi.fn(() => currentUrl),
      title: vi.fn().mockImplementation(async () =>
        currentUrl === captchaUrl ? 'Google verification' : 'Google Lens results'
      ),
      locator: vi.fn().mockImplementation((selector: string) => {
        if (selector === 'body') {
          return makeLocator(
            currentUrl === captchaUrl
              ? 'Verify you are human before continuing.'
              : 'Lens results are ready.'
          );
        }
        return makeLocator(null);
      }),
    });
    ctx.helpers.sleep = vi.fn().mockImplementation(async (ms: number) => {
      fakeNow += ms;
    });

    mocks.evaluateProductScanVerificationBarrier.mockImplementation(
      async (input: {
        currentUrl: string | null;
        pageTitle: string | null;
        pageTextSnippet: string | null;
        screenshotArtifactName?: string | null;
        htmlArtifactName?: string | null;
      }) => ({
        ...makeDefaultVerificationReview(),
        currentUrl: input.currentUrl,
        pageTitle: input.pageTitle,
        pageTextSnippet: input.pageTextSnippet,
        visibleQuestion:
          input.currentUrl === captchaUrl ? 'Verify you are human' : 'Search results ready',
        pageSummary:
          input.currentUrl === captchaUrl
            ? 'Captcha is still visible.'
            : 'Captcha is gone and Lens results are visible.',
        screenshotArtifactName: input.screenshotArtifactName ?? null,
        htmlArtifactName: input.htmlArtifactName ?? null,
      })
    );

    try {
      const seq = new AmazonScanSequencer(ctx, {
        allowManualVerification: true,
        manualVerificationTimeoutMs: 12_000,
      });
      Object.defineProperty(seq, 'CAPTCHA_STABLE_CLEAR_WINDOW_MS', {
        value: 2_000,
        configurable: true,
      });

      (seq as any).detectGoogleLensCaptcha = vi
        .fn()
        .mockImplementationOnce(async () => ({ detected: true, currentUrl }))
        .mockImplementationOnce(async () => {
          currentUrl = clearUrl;
          return { detected: false, currentUrl };
        })
        .mockImplementationOnce(async () => ({ detected: false, currentUrl }));

      const result = await (seq as any).handleGoogleCaptcha({
        candidateId: 'img-1',
        candidateRank: 1,
        waitForClear: true,
      });

      expect(result).toEqual({ resolved: true });
      expect(mocks.evaluateProductScanVerificationBarrier).toHaveBeenCalledTimes(3);
      expect(ctx.artifacts.file).toHaveBeenCalledTimes(3);
      expect(ctx.artifacts.html).toHaveBeenCalledTimes(3);
      expect(ctx.artifacts.json).toHaveBeenCalledWith(
        'google-verification-review-history',
        expect.arrayContaining([
          expect.objectContaining({ loopDecision: 'captcha_present', iteration: 1 }),
          expect.objectContaining({ loopDecision: 'awaiting_stable_clear' }),
          expect.objectContaining({ loopDecision: 'resolved' }),
        ])
      );

      const observations = (
        (seq as any).googleVerification.augmentPayload({}) as {
          googleVerificationObservations: Array<{
            loopDecision: string;
            iteration: number;
            captchaDetected: boolean;
          }>;
        }
      ).googleVerificationObservations;
      expect(observations).toHaveLength(3);
      expect(observations.map((entry) => entry.loopDecision)).toEqual([
        'captcha_present',
        'awaiting_stable_clear',
        'resolved',
      ]);
      expect(observations[0]).toEqual(
        expect.objectContaining({ iteration: 1, captchaDetected: true })
      );
      expect(observations[2]).toEqual(
        expect.objectContaining({ captchaDetected: false })
      );
    } finally {
      dateSpy.mockRestore();
    }
  });

  it('records a timeout observation and emits the observation history in the result payload', async () => {
    const dateSpy = vi.spyOn(Date, 'now');
    let fakeNow = 2_000_000;
    dateSpy.mockImplementation(() => fakeNow);

    const currentUrl = 'https://www.google.com/sorry/index';
    const makeLocator = (textContent: string | null) => ({
      count: vi.fn().mockResolvedValue(1),
      isVisible: vi.fn().mockResolvedValue(true),
      click: vi.fn().mockResolvedValue(undefined),
      first: vi.fn().mockReturnThis(),
      nth: vi.fn().mockReturnThis(),
      evaluateAll: vi.fn().mockResolvedValue([]),
      setInputFiles: vi.fn().mockResolvedValue(undefined),
      waitFor: vi.fn().mockRejectedValue(new Error('timeout')),
      textContent: vi.fn().mockResolvedValue(textContent),
    });
    const ctx = makeContext({
      url: vi.fn().mockReturnValue(currentUrl),
      title: vi.fn().mockResolvedValue('Google verification'),
      locator: vi.fn().mockImplementation((selector: string) => {
        if (selector === 'body') {
          return makeLocator('Verify you are human before continuing.');
        }
        return makeLocator(null);
      }),
    });
    ctx.helpers.sleep = vi.fn().mockImplementation(async (ms: number) => {
      fakeNow += ms;
    });

    mocks.evaluateProductScanVerificationBarrier.mockImplementation(
      async (input: {
        currentUrl: string | null;
        pageTitle: string | null;
        pageTextSnippet: string | null;
        screenshotArtifactName?: string | null;
        htmlArtifactName?: string | null;
      }) => ({
        ...makeDefaultVerificationReview(),
        currentUrl: input.currentUrl,
        pageTitle: input.pageTitle,
        pageTextSnippet: input.pageTextSnippet,
        screenshotArtifactName: input.screenshotArtifactName ?? null,
        htmlArtifactName: input.htmlArtifactName ?? null,
      })
    );

    try {
      const seq = new AmazonScanSequencer(ctx, {
        allowManualVerification: true,
        manualVerificationTimeoutMs: 4_000,
      });

      (seq as any).detectGoogleLensCaptcha = vi
        .fn()
        .mockResolvedValue({ detected: true, currentUrl });

      const result = await (seq as any).handleGoogleCaptcha({
        candidateId: 'img-1',
        candidateRank: 1,
        waitForClear: true,
      });

      expect(result).toEqual({ resolved: false });
      expect(mocks.evaluateProductScanVerificationBarrier).toHaveBeenCalledTimes(2);
      expect(ctx.artifacts.file).toHaveBeenCalledTimes(2);

      await (seq as any).emitResult({
        status: 'captcha_required',
        stage: 'google_captcha',
      });

      const payload = (ctx.emit as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
        googleVerificationReview: { loopDecision?: string } | null;
        googleVerificationObservations: Array<{ loopDecision: string }>;
      };
      expect(payload.googleVerificationReview).toEqual(
        expect.objectContaining({})
      );
      expect(payload.googleVerificationObservations).toHaveLength(2);
      expect(payload.googleVerificationObservations.map((entry) => entry.loopDecision)).toEqual([
        'captcha_present',
        'timeout',
      ]);
      expect(payload.googleVerificationObservations[1]).toEqual(
        expect.objectContaining({ loopDecision: 'timeout' })
      );
    } finally {
      dateSpy.mockRestore();
    }
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

  describe('handle1688Captcha', () => {
    it('captures one supplier verification observation when manual verification is disabled', async () => {
      const blockedUrl = 'https://s.1688.com/youyuan/index.htm?tab=imageSearch';
      const ctx = makeContext({
        url: vi.fn().mockReturnValue(blockedUrl),
        title: vi.fn().mockResolvedValue('1688 verification'),
        locator: vi.fn().mockImplementation((selector: string) => {
          if (selector === 'body') {
            return {
              count: vi.fn().mockResolvedValue(1),
              isVisible: vi.fn().mockResolvedValue(true),
              click: vi.fn().mockResolvedValue(undefined),
              first: vi.fn().mockReturnThis(),
              nth: vi.fn().mockReturnThis(),
              evaluateAll: vi.fn().mockResolvedValue([]),
              setInputFiles: vi.fn().mockResolvedValue(undefined),
              waitFor: vi.fn().mockRejectedValue(new Error('timeout')),
              textContent: vi.fn().mockResolvedValue('请完成验证后继续访问'),
              innerText: vi.fn().mockResolvedValue('请完成验证后继续访问'),
            };
          }
          return {
            count: vi.fn().mockResolvedValue(0),
            isVisible: vi.fn().mockResolvedValue(false),
            click: vi.fn().mockResolvedValue(undefined),
            first: vi.fn().mockReturnThis(),
            nth: vi.fn().mockReturnThis(),
            evaluateAll: vi.fn().mockResolvedValue([]),
            setInputFiles: vi.fn().mockResolvedValue(undefined),
            waitFor: vi.fn().mockRejectedValue(new Error('timeout')),
            textContent: vi.fn().mockResolvedValue(null),
            innerText: vi.fn().mockResolvedValue(null),
          };
        }),
      });

      mocks.evaluateProductScanVerificationBarrier.mockImplementation(
        async (input: {
          provider: string;
          stage: string;
          currentUrl: string | null;
          pageTitle: string | null;
          pageTextSnippet: string | null;
          screenshotArtifactName?: string | null;
          htmlArtifactName?: string | null;
        }) => ({
          ...makeDefaultVerificationReview(),
          provider: input.provider,
          stage: input.stage,
          currentUrl: input.currentUrl,
          pageTitle: input.pageTitle,
          pageTextSnippet: input.pageTextSnippet,
          challengeType: 'captcha',
          visibleQuestion: '请完成验证后继续访问',
          pageSummary: '1688 verification barrier is visible.',
          screenshotArtifactName: input.screenshotArtifactName ?? null,
          htmlArtifactName: input.htmlArtifactName ?? null,
        })
      );

      const seq = new Supplier1688ScanSequencer(ctx, {
        allowManualVerification: false,
      });

      (seq as any).detect1688AccessBarrier = vi.fn().mockResolvedValue({
        blocked: true,
        barrierKind: 'captcha',
        currentUrl: blockedUrl,
        message:
          '1688 requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
      });
      (seq as any).attempt1688PostCaptchaRecovery = vi.fn();

      const result = await (seq as any).handle1688Captcha(
        'supplier_open',
        { candidateId: 'img-1', candidateRank: 1 },
        blockedUrl
      );

      expect(result).toEqual(
        expect.objectContaining({
          resolved: false,
          captchaEncountered: true,
          captchaRequired: true,
          currentUrl: blockedUrl,
          failureCode: 'captcha_required',
        })
      );
      expect(mocks.evaluateProductScanVerificationBarrier).toHaveBeenCalledTimes(1);
      expect(ctx.artifacts.file).toHaveBeenCalledTimes(1);
      expect(ctx.artifacts.html).toHaveBeenCalledTimes(1);
      expect((seq as any).attempt1688PostCaptchaRecovery).not.toHaveBeenCalled();

      await (seq as any).emitResult({
        status: 'captcha_required',
        stage: 'supplier_open',
      });

      const payload = (ctx.emit as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
        supplierVerificationReview: { provider: string; stage: string } | null;
        supplierVerificationObservations: Array<{
          loopDecision: string;
          barrierKind: string | null;
        }>;
      };
      expect(payload.supplierVerificationReview).toEqual(
        expect.objectContaining({ provider: '1688', stage: 'supplier_open' })
      );
      expect(payload.supplierVerificationObservations).toEqual([
        expect.objectContaining({
          loopDecision: 'blocked',
          barrierKind: 'captcha',
        }),
      ]);
    });

    it('uses the shared observation loop and emits supplier verification observations when recovery succeeds', async () => {
      const dateSpy = vi.spyOn(Date, 'now');
      let fakeNow = 3_000_000;
      dateSpy.mockImplementation(() => fakeNow);

      const blockedUrl = 'https://s.1688.com/youyuan/index.htm?tab=imageSearch';
      const recoveredUrl = 'https://detail.1688.com/offer/123456789.html';
      let currentUrl = blockedUrl;
      const makeLocator = (textContent: string | null) => ({
        count: vi.fn().mockResolvedValue(1),
        isVisible: vi.fn().mockResolvedValue(true),
        click: vi.fn().mockResolvedValue(undefined),
        first: vi.fn().mockReturnThis(),
        nth: vi.fn().mockReturnThis(),
        evaluateAll: vi.fn().mockResolvedValue([]),
        setInputFiles: vi.fn().mockResolvedValue(undefined),
        waitFor: vi.fn().mockRejectedValue(new Error('timeout')),
        textContent: vi.fn().mockResolvedValue(textContent),
        innerText: vi.fn().mockResolvedValue(textContent),
      });
      const ctx = makeContext({
        url: vi.fn(() => currentUrl),
        title: vi.fn().mockImplementation(async () =>
          currentUrl === blockedUrl ? '1688 verification' : '1688 supplier page'
        ),
        locator: vi.fn().mockImplementation((selector: string) => {
          if (selector === 'body') {
            return makeLocator(
              currentUrl === blockedUrl
                ? '请完成验证后继续访问'
                : '商品信息 起订量 供应商'
            );
          }
          return makeLocator(null);
        }),
      });
      ctx.helpers.sleep = vi.fn().mockImplementation(async (ms: number) => {
        fakeNow += ms;
      });

      mocks.evaluateProductScanVerificationBarrier.mockImplementation(
        async (input: {
          provider: string;
          stage: string;
          currentUrl: string | null;
          pageTitle: string | null;
          pageTextSnippet: string | null;
          screenshotArtifactName?: string | null;
          htmlArtifactName?: string | null;
        }) => ({
          ...makeDefaultVerificationReview(),
          provider: input.provider,
          stage: input.stage,
          currentUrl: input.currentUrl,
          pageTitle: input.pageTitle,
          pageTextSnippet: input.pageTextSnippet,
          challengeType: input.currentUrl === blockedUrl ? 'captcha' : 'clear_page',
          visibleQuestion:
            input.currentUrl === blockedUrl ? '请完成验证后继续访问' : 'Barrier appears cleared',
          pageSummary:
            input.currentUrl === blockedUrl
              ? '1688 verification barrier is visible.'
              : '1688 barrier appears cleared and the supplier page is ready.',
          screenshotArtifactName: input.screenshotArtifactName ?? null,
          htmlArtifactName: input.htmlArtifactName ?? null,
        })
      );

      try {
        const seq = new Supplier1688ScanSequencer(ctx, {
          allowManualVerification: true,
          manualVerificationTimeoutMs: 12_000,
        });

        (seq as any).detect1688AccessBarrier = vi
          .fn()
          .mockResolvedValueOnce({
            blocked: true,
            barrierKind: 'captcha',
            currentUrl: blockedUrl,
            message:
              '1688 requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
          })
          .mockResolvedValueOnce({
            blocked: true,
            barrierKind: 'captcha',
            currentUrl: blockedUrl,
            message:
              '1688 requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
          })
          .mockResolvedValueOnce({
            blocked: false,
            barrierKind: null,
            currentUrl: blockedUrl,
            message: null,
          });
        (seq as any).attempt1688PostCaptchaRecovery = vi.fn().mockImplementation(async () => {
          currentUrl = recoveredUrl;
          return {
            ready: true,
            currentUrl: recoveredUrl,
            reason: 'supplier_page_ready',
            message: '1688 supplier page is ready.',
            supplierReadySelector: '.offer-detail',
          };
        });

        const result = await (seq as any).handle1688Captcha(
          'supplier_open',
          { candidateId: 'img-1', candidateRank: 1 },
          recoveredUrl
        );

        expect(result).toEqual(
          expect.objectContaining({
            resolved: true,
            captchaEncountered: true,
            captchaRequired: false,
            currentUrl: recoveredUrl,
            failureCode: null,
          })
        );
        expect(ctx.artifacts.file).toHaveBeenCalledTimes(2);

        await (seq as any).emitResult({
          status: 'running',
          stage: 'supplier_open',
        });
        const payload = (ctx.emit as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
          supplierVerificationReview: { provider: string } | null;
          supplierVerificationObservations: Array<{ loopDecision: string; barrierKind: string | null }>;
        };
        expect(payload.supplierVerificationReview).toEqual(
          expect.objectContaining({ provider: '1688' })
        );
        expect(payload.supplierVerificationObservations).toHaveLength(2);
        expect(payload.supplierVerificationObservations.map((entry) => entry.loopDecision)).toEqual([
          'blocked',
          'resolved',
        ]);
        expect(payload.supplierVerificationObservations[0]).toEqual(
          expect.objectContaining({ barrierKind: 'captcha' })
        );
      } finally {
        dateSpy.mockRestore();
      }
    });

    it('returns post_captcha_reupload_required when 1688 recovery lands back on the search entry page', async () => {
      const dateSpy = vi.spyOn(Date, 'now');
      let fakeNow = 4_000_000;
      dateSpy.mockImplementation(() => fakeNow);

      const blockedUrl = 'https://s.1688.com/youyuan/index.htm?tab=imageSearch';
      const recoveryUrl = blockedUrl;
      const makeLocator = (textContent: string | null) => ({
        count: vi.fn().mockResolvedValue(1),
        isVisible: vi.fn().mockResolvedValue(true),
        click: vi.fn().mockResolvedValue(undefined),
        first: vi.fn().mockReturnThis(),
        nth: vi.fn().mockReturnThis(),
        evaluateAll: vi.fn().mockResolvedValue([]),
        setInputFiles: vi.fn().mockResolvedValue(undefined),
        waitFor: vi.fn().mockRejectedValue(new Error('timeout')),
        textContent: vi.fn().mockResolvedValue(textContent),
        innerText: vi.fn().mockResolvedValue(textContent),
      });
      const ctx = makeContext({
        url: vi.fn().mockReturnValue(blockedUrl),
        title: vi.fn().mockResolvedValue('1688 verification'),
        locator: vi.fn().mockImplementation((selector: string) => {
          if (selector === 'body') {
            return makeLocator('请完成验证后继续访问');
          }
          return makeLocator(null);
        }),
      });
      ctx.helpers.sleep = vi.fn().mockImplementation(async (ms: number) => {
        fakeNow += ms;
      });

      try {
        const seq = new Supplier1688ScanSequencer(ctx, {
          allowManualVerification: true,
          manualVerificationTimeoutMs: 12_000,
        });

        (seq as any).detect1688AccessBarrier = vi
          .fn()
          .mockResolvedValueOnce({
            blocked: true,
            barrierKind: 'captcha',
            currentUrl: blockedUrl,
            message:
              '1688 requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
          })
          .mockResolvedValueOnce({
            blocked: false,
            barrierKind: null,
            currentUrl: blockedUrl,
            message: null,
          });
        (seq as any).attempt1688PostCaptchaRecovery = vi.fn().mockResolvedValue({
          ready: true,
          currentUrl: recoveryUrl,
          reason: 'returned_to_search_entry',
          message:
            '1688 returned to the image-search entry page after captcha. Re-uploading the product image.',
          entrySelector: '.upload-entry',
        });

        const result = await (seq as any).handle1688Captcha(
          '1688_upload',
          { candidateId: 'img-1', candidateRank: 1 },
          null
        );

        expect(result).toEqual(
          expect.objectContaining({
            resolved: true,
            captchaEncountered: true,
            captchaRequired: false,
            failureCode: 'post_captcha_reupload_required',
            currentUrl: recoveryUrl,
          })
        );
      } finally {
        dateSpy.mockRestore();
      }
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
