import { describe, expect, it, vi } from 'vitest';
import type { Page } from 'playwright';

vi.mock('server-only', () => ({}));

vi.mock('@/features/playwright/server', () => ({
  readPlaywrightEngineArtifact: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/segments/api', () => ({
  resolveBrainExecutionConfigForCapability: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  isBrainModelVisionCapable: vi.fn(),
  runBrainChatCompletion: vi.fn(),
}));

vi.mock('@/shared/lib/files/file-uploader', () => ({
  getDiskPathFromPublicPath: vi.fn(),
}));

vi.mock('@/shared/lib/security/outbound-url-policy', () => ({
  fetchWithOutboundUrlPolicy: vi.fn(),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: vi.fn(),
  },
}));

import {
  buildProductScanVerificationDiagnosticsPayloadFromState,
  buildProductScanVerificationDiagnosticsPayload,
  cloneProductScanVerificationStateObservations,
  cloneProductScanVerificationStateReview,
  cloneProductScanVerificationObservations,
  cloneProductScanVerificationReview,
  commitProductScanVerificationObservation,
  createProductScanVerificationBarrierAutoInjectionConfig,
  createProductScanVerificationState,
  createProductScanVerificationBarrierEvaluationInput,
  createProductScanVerificationBarrierEvaluationInputFromProfile,
  evaluateProductScanVerificationBarrierFromProfile,
  getLastProductScanVerificationObservation,
  runProductScanVerificationBarrierReviewCapture,
  runProductScanVerificationBarrierReviewCaptureWithState,
  type ProductScanVerificationObservationBase,
  type ProductScanVerificationReview,
} from './product-scan-ai-evaluator';
import {
  createPlaywrightVerificationReviewLoopProfile,
  createPlaywrightVerificationReviewProfile,
} from '@/features/playwright/server/ai-step-service';

describe('product scan verification diagnostics helpers', () => {
  it('clones review arrays and brain metadata without reusing the original references', () => {
    const original = {
      status: 'analyzed',
      visibleInstructions: ['Solve the puzzle'],
      uiElements: ['checkbox'],
      brainApplied: {
        modelId: 'gemma',
      },
      customField: 'preserved',
    };

    const cloned = cloneProductScanVerificationReview(original);
    cloned.visibleInstructions.push('New instruction');
    cloned.uiElements.push('button');
    cloned.brainApplied!.modelId = 'other';

    expect(cloned).toMatchObject({
      status: 'analyzed',
      customField: 'preserved',
    });
    expect(original.visibleInstructions).toEqual(['Solve the puzzle']);
    expect(original.uiElements).toEqual(['checkbox']);
    expect(original.brainApplied).toEqual({ modelId: 'gemma' });
  });

  it('builds a diagnostics payload with cloned review and history entries', () => {
    const review = {
      status: 'capture_only',
      visibleInstructions: ['Wait for manual review'],
      uiElements: ['image'],
      brainApplied: { modelId: 'gemma' },
    };
    const observations = [
      {
        ...review,
        iteration: 1,
      },
      {
        ...review,
        iteration: 2,
        visibleInstructions: ['Challenge cleared'],
      },
    ];

    const payload = buildProductScanVerificationDiagnosticsPayload({
      reviewKey: 'googleVerificationReview',
      observationsKey: 'googleVerificationObservations',
      review,
      observations,
    });

    const clonedReview = payload.googleVerificationReview as typeof review;
    const clonedObservations =
      payload.googleVerificationObservations as typeof observations;

    clonedReview.visibleInstructions.push('Mutated');
    clonedObservations[0]!.brainApplied!.modelId = 'other';

    expect(payload).toEqual({
      googleVerificationReview: expect.objectContaining({
        status: 'capture_only',
      }),
      googleVerificationObservations: expect.arrayContaining([
        expect.objectContaining({ iteration: 1 }),
        expect.objectContaining({ iteration: 2 }),
      ]),
    });
    expect(review.visibleInstructions).toEqual(['Wait for manual review']);
    expect(observations[0]!.brainApplied).toEqual({ modelId: 'gemma' });
  });

  it('manages verification review state through the shared state helper', () => {
    const state = createProductScanVerificationState<
      {
        status: 'analyzed';
        visibleInstructions: string[];
        uiElements: string[];
        brainApplied: Record<string, unknown> | null;
      },
      {
        status: 'analyzed';
        iteration: number;
        visibleInstructions: string[];
        uiElements: string[];
        brainApplied: Record<string, unknown> | null;
      }
    >();

    const review = {
      status: 'analyzed' as const,
      visibleInstructions: ['Review'],
      uiElements: ['captcha'],
      brainApplied: { modelId: 'gemma' },
    };
    const observation = {
      status: 'analyzed' as const,
      iteration: 1,
      visibleInstructions: ['Observation'],
      uiElements: ['captcha'],
      brainApplied: { modelId: 'gemma' },
    };

    const committed = commitProductScanVerificationObservation(state, {
      review,
      observation,
    });

    expect(committed).toBe(state.observations);
    expect(getLastProductScanVerificationObservation(state)).toEqual(observation);

    const clonedReview = cloneProductScanVerificationStateReview(state);
    const clonedObservations = cloneProductScanVerificationStateObservations(state);
    clonedReview!.visibleInstructions.push('Mutated');
    clonedObservations[0]!.brainApplied!.modelId = 'other';

    expect(state.review).toEqual(review);
    expect(state.observations[0]!.brainApplied).toEqual({ modelId: 'gemma' });
  });

  it('builds diagnostics payload directly from shared verification state', () => {
    const state = createProductScanVerificationState<
      {
        status: 'capture_only';
        visibleInstructions: string[];
        uiElements: string[];
        brainApplied: Record<string, unknown> | null;
      },
      {
        status: 'capture_only';
        iteration: number;
        visibleInstructions: string[];
        uiElements: string[];
        brainApplied: Record<string, unknown> | null;
      }
    >();

    commitProductScanVerificationObservation(state, {
      review: {
        status: 'capture_only',
        visibleInstructions: ['Wait'],
        uiElements: ['image'],
        brainApplied: { modelId: 'gemma' },
      },
      observation: {
        status: 'capture_only',
        iteration: 1,
        visibleInstructions: ['Wait'],
        uiElements: ['image'],
        brainApplied: { modelId: 'gemma' },
      },
    });

    const payload = buildProductScanVerificationDiagnosticsPayloadFromState({
      reviewKey: 'googleVerificationReview',
      observationsKey: 'googleVerificationObservations',
      state,
    });

    expect(payload).toEqual({
      googleVerificationReview: expect.objectContaining({
        status: 'capture_only',
      }),
      googleVerificationObservations: expect.arrayContaining([
        expect.objectContaining({ iteration: 1 }),
      ]),
    });
  });

  it('clones observation arrays item by item', () => {
    const observations = [
      {
        status: 'analyzed',
        visibleInstructions: ['Instruction 1'],
        uiElements: ['checkbox'],
        brainApplied: { modelId: 'gemma' },
      },
    ];

    const cloned = cloneProductScanVerificationObservations(observations);
    cloned[0]!.visibleInstructions.push('Instruction 2');

    expect(observations[0]!.visibleInstructions).toEqual(['Instruction 1']);
  });

  it('builds a generic verification barrier evaluation input from a Playwright capture', () => {
    expect(
      createProductScanVerificationBarrierEvaluationInput({
        provider: 'google_lens',
        stage: 'google_captcha',
        objective: 'Describe the visible barrier.',
        capture: {
          currentUrl: 'https://lens.google.com',
          pageTitle: 'Google Lens',
          pageTextSnippet: 'Verify you are human',
          screenshotBase64: 'abc123',
          screenshotArtifactName: 'shot.png',
          htmlArtifactName: 'page.html',
        },
      })
    ).toEqual({
      provider: 'google_lens',
      stage: 'google_captcha',
      currentUrl: 'https://lens.google.com',
      pageTitle: 'Google Lens',
      pageTextSnippet: 'Verify you are human',
      screenshotBase64: 'abc123',
      screenshotArtifactName: 'shot.png',
      htmlArtifactName: 'page.html',
      objective: 'Describe the visible barrier.',
    });
  });

  it('builds a verification barrier evaluation input from a shared review profile', () => {
    expect(
      createProductScanVerificationBarrierEvaluationInputFromProfile({
        profile: createPlaywrightVerificationReviewProfile({
          key: 'supplier_verification_review',
          subject: 'supplier verification barrier',
          runningMessage: 'Capturing supplier verification barrier for AI review.',
          historyArtifactKey: '1688-verification-review-history',
          artifactKeyPrefix: '1688-verification-review',
          evaluationProvider: '1688',
          resolveEvaluationStage: (params: { stage: string | null }) =>
            params.stage ?? '1688_barrier',
          evaluationObjective:
            'Describe the visible 1688 login, captcha, or access barrier.',
          buildArtifactSegments: () => [],
          buildFingerprintPartMap: () => ({}),
          detailDescriptors: [{ label: 'Blocked', value: 'challengeType' }],
        }),
        params: { stage: 'supplier_open' },
        capture: {
          currentUrl: 'https://detail.1688.com',
          pageTitle: '1688 Supplier Page',
          pageTextSnippet: 'Please verify first',
          screenshotBase64: 'xyz789',
          screenshotArtifactName: 'supplier-shot.png',
          htmlArtifactName: 'supplier-page.html',
        },
      })
    ).toEqual({
      provider: '1688',
      stage: 'supplier_open',
      currentUrl: 'https://detail.1688.com',
      pageTitle: '1688 Supplier Page',
      pageTextSnippet: 'Please verify first',
      screenshotBase64: 'xyz789',
      screenshotArtifactName: 'supplier-shot.png',
      htmlArtifactName: 'supplier-page.html',
      objective: 'Describe the visible 1688 login, captcha, or access barrier.',
    });
  });

  it('builds a verification barrier evaluation input from a shared loop profile', () => {
    expect(
      createProductScanVerificationBarrierEvaluationInputFromProfile({
        profile: createPlaywrightVerificationReviewLoopProfile({
          key: 'supplier_verification_review',
          subject: 'supplier verification barrier',
          runningMessage: 'Capturing supplier verification barrier for AI review.',
          historyArtifactKey: '1688-verification-review-history',
          artifactKeyPrefix: '1688-verification-review',
          evaluationProvider: '1688',
          resolveEvaluationStage: (params: { stage: string | null }) =>
            params.stage ?? '1688_barrier',
          evaluationObjective:
            'Describe the visible 1688 login, captcha, or access barrier.',
          buildArtifactSegments: () => [],
          buildFingerprintPartMap: () => ({}),
          detailDescriptors: [{ label: 'Blocked', value: 'challengeType' }],
          buildLoopCaptureParams: ({ iteration, decision, stableForMs }, _baseParams: {}) => ({
            stage: 'supplier_open',
            candidateId: 'supplier-1',
            candidateRank: 1,
            iteration,
            loopDecision: decision,
            stableForMs,
          }),
        }),
        params: { stage: 'supplier_open' },
        capture: {
          currentUrl: 'https://detail.1688.com',
          pageTitle: '1688 Supplier Page',
          pageTextSnippet: 'Please verify first',
          screenshotBase64: 'xyz789',
          screenshotArtifactName: 'supplier-shot.png',
          htmlArtifactName: 'supplier-page.html',
        },
      })
    ).toEqual({
      provider: '1688',
      stage: 'supplier_open',
      currentUrl: 'https://detail.1688.com',
      pageTitle: '1688 Supplier Page',
      pageTextSnippet: 'Please verify first',
      screenshotBase64: 'xyz789',
      screenshotArtifactName: 'supplier-shot.png',
      htmlArtifactName: 'supplier-page.html',
      objective: 'Describe the visible 1688 login, captcha, or access barrier.',
    });
  });

  it('evaluates a verification barrier directly from a shared review profile', async () => {
    const review = await evaluateProductScanVerificationBarrierFromProfile({
      profile: createPlaywrightVerificationReviewProfile({
        key: 'supplier_verification_review',
        subject: 'supplier verification barrier',
        runningMessage: 'Capturing supplier verification barrier for AI review.',
        historyArtifactKey: '1688-verification-review-history',
        artifactKeyPrefix: '1688-verification-review',
        evaluationProvider: '1688',
        resolveEvaluationStage: (params: { stage: string | null }) =>
          params.stage ?? '1688_barrier',
        evaluationObjective:
          'Describe the visible 1688 login, captcha, or access barrier.',
        buildArtifactSegments: () => [],
        buildFingerprintPartMap: () => ({}),
        detailDescriptors: [{ label: 'Blocked', value: 'challengeType' }],
      }),
      params: { stage: 'supplier_open' },
      capture: {
        currentUrl: 'https://detail.1688.com',
        pageTitle: '1688 Supplier Page',
        pageTextSnippet: 'Please verify first',
        screenshotBase64: null,
        screenshotArtifactName: null,
        htmlArtifactName: 'supplier-page.html',
      },
    });

    expect(review).toEqual(
      expect.objectContaining({
        status: 'failed',
        provider: '1688',
        stage: 'supplier_open',
        currentUrl: 'https://detail.1688.com',
        htmlArtifactName: 'supplier-page.html',
        error: 'Screenshot capture failed.',
      })
    );
  });

  it('evaluates a verification barrier directly from a shared loop profile', async () => {
    const review = await evaluateProductScanVerificationBarrierFromProfile({
      profile: createPlaywrightVerificationReviewLoopProfile({
        key: 'supplier_verification_review',
        subject: 'supplier verification barrier',
        runningMessage: 'Capturing supplier verification barrier for AI review.',
        historyArtifactKey: '1688-verification-review-history',
        artifactKeyPrefix: '1688-verification-review',
        evaluationProvider: '1688',
        resolveEvaluationStage: (params: { stage: string | null }) =>
          params.stage ?? '1688_barrier',
        evaluationObjective:
          'Describe the visible 1688 login, captcha, or access barrier.',
        buildArtifactSegments: () => [],
        buildFingerprintPartMap: () => ({}),
        detailDescriptors: [{ label: 'Blocked', value: 'challengeType' }],
        buildLoopCaptureParams: ({ iteration, decision, stableForMs }, _baseParams: {}) => ({
          stage: 'supplier_open',
          candidateId: 'supplier-1',
          candidateRank: 1,
          iteration,
          loopDecision: decision,
          stableForMs,
        }),
      }),
      params: { stage: 'supplier_open' },
      capture: {
        currentUrl: 'https://detail.1688.com',
        pageTitle: '1688 Supplier Page',
        pageTextSnippet: 'Please verify first',
        screenshotBase64: null,
        screenshotArtifactName: null,
        htmlArtifactName: 'supplier-page.html',
      },
    });

    expect(review).toEqual(
      expect.objectContaining({
        status: 'failed',
        provider: '1688',
        stage: 'supplier_open',
        currentUrl: 'https://detail.1688.com',
        htmlArtifactName: 'supplier-page.html',
        error: 'Screenshot capture failed.',
      })
    );
  });

  it('runs verification review capture directly from a shared loop profile', async () => {
    const page = {
      url: vi.fn().mockReturnValue('https://detail.1688.com'),
      title: vi.fn().mockResolvedValue('1688 Supplier Page'),
      screenshot: vi.fn().mockRejectedValue(new Error('capture failed')),
      locator: vi.fn().mockImplementation(() => ({
        first: vi.fn().mockReturnThis(),
        textContent: vi.fn().mockResolvedValue('Please verify first'),
      })),
    } as unknown as Page;
    const upsertStep = vi.fn();

    const observation = await runProductScanVerificationBarrierReviewCapture({
      profile: createPlaywrightVerificationReviewLoopProfile<
        { currentUrl: string },
        { fallbackUrl: string },
        {
          stage: string | null;
          candidateId: string;
          candidateRank: number;
          iteration: number;
          loopDecision: string;
          stableForMs: number | null;
          blocked: boolean;
        },
        ProductScanVerificationObservationBase & { blocked: boolean },
        { blocked: boolean }
      >({
        key: 'supplier_verification_review',
        subject: 'supplier verification barrier',
        runningMessage: 'Capturing supplier verification barrier for AI review.',
        historyArtifactKey: '1688-verification-review-history',
        artifactKeyPrefix: '1688-verification-review',
        screenshotFailureLogKey: '1688.verification.review.screenshot_failed',
        evaluationProvider: '1688',
        resolveEvaluationStage: (params) => params.stage ?? '1688_barrier',
        evaluationObjective:
          'Describe the visible 1688 login, captcha, or access barrier.',
        buildObservationExtra: (params) => ({
          blocked: params.blocked,
        }),
        buildArtifactSegments: (params) => [params.candidateId, `iter-${params.iteration}`],
        buildFingerprintPartMap: (params) => ({
          candidateId: params.candidateId,
          blocked: params.blocked,
        }),
        detailDescriptors: [{ label: 'Blocked', value: 'blocked' }],
        buildLoopCaptureParams: ({ iteration, decision, stableForMs }, _baseParams) => ({
          stage: 'supplier_open',
          candidateId: 'supplier-1',
          candidateRank: 1,
          iteration,
          loopDecision: decision,
          stableForMs,
          blocked: true,
        }),
      }),
      params: {
        stage: 'supplier_open',
        candidateId: 'supplier-1',
        candidateRank: 1,
        iteration: 1,
        loopDecision: 'blocked',
        stableForMs: null,
        blocked: true,
      },
      currentUrl: 'https://detail.1688.com',
      previousObservation: null,
      page,
      log: vi.fn(),
      commitObservation: ({ observation: nextObservation }) => [nextObservation],
      upsertStep,
    });

    expect(observation).toEqual(
      expect.objectContaining({
        status: 'failed',
        provider: '1688',
        stage: 'supplier_open',
        iteration: 1,
        loopDecision: 'blocked',
        blocked: true,
        error: 'Screenshot capture failed.',
      })
    );
    expect(upsertStep).toHaveBeenCalledTimes(2);
  });

  it('runs verification review capture through shared verification state', async () => {
    const page = {
      url: vi.fn().mockReturnValue('https://detail.1688.com'),
      title: vi.fn().mockResolvedValue('1688 Supplier Page'),
      screenshot: vi.fn().mockRejectedValue(new Error('capture failed')),
      locator: vi.fn().mockImplementation(() => ({
        first: vi.fn().mockReturnThis(),
        textContent: vi.fn().mockResolvedValue('Please verify first'),
      })),
    } as unknown as Page;
    const upsertStep = vi.fn();
    const verificationState = createProductScanVerificationState<
      ProductScanVerificationReview,
      ProductScanVerificationObservationBase & { blocked: boolean }
    >();

    const observation = await runProductScanVerificationBarrierReviewCaptureWithState({
      profile: createPlaywrightVerificationReviewLoopProfile<
        { currentUrl: string },
        { fallbackUrl: string },
        {
          stage: string | null;
          candidateId: string;
          candidateRank: number;
          iteration: number;
          loopDecision: string;
          stableForMs: number | null;
          blocked: boolean;
        },
        ProductScanVerificationObservationBase & { blocked: boolean },
        { blocked: boolean }
      >({
        key: 'supplier_verification_review',
        subject: 'supplier verification barrier',
        runningMessage: 'Capturing supplier verification barrier for AI review.',
        historyArtifactKey: '1688-verification-review-history',
        artifactKeyPrefix: '1688-verification-review',
        screenshotFailureLogKey: '1688.verification.review.screenshot_failed',
        evaluationProvider: '1688',
        resolveEvaluationStage: (params) => params.stage ?? '1688_barrier',
        evaluationObjective:
          'Describe the visible 1688 login, captcha, or access barrier.',
        buildObservationExtra: (params) => ({
          blocked: params.blocked,
        }),
        buildArtifactSegments: (params) => [params.candidateId, `iter-${params.iteration}`],
        buildFingerprintPartMap: (params) => ({
          candidateId: params.candidateId,
          blocked: params.blocked,
        }),
        detailDescriptors: [{ label: 'Blocked', value: 'blocked' }],
        buildLoopCaptureParams: ({ iteration, decision, stableForMs }, _baseParams) => ({
          stage: 'supplier_open',
          candidateId: 'supplier-1',
          candidateRank: 1,
          iteration,
          loopDecision: decision,
          stableForMs,
          blocked: true,
        }),
      }),
      verificationState,
      params: {
        stage: 'supplier_open',
        candidateId: 'supplier-1',
        candidateRank: 1,
        iteration: 1,
        loopDecision: 'blocked',
        stableForMs: null,
        blocked: true,
      },
      currentUrl: 'https://detail.1688.com',
      page,
      log: vi.fn(),
      upsertStep,
    });

    expect(observation).toEqual(
      expect.objectContaining({
        status: 'failed',
        provider: '1688',
        stage: 'supplier_open',
        iteration: 1,
        loopDecision: 'blocked',
        blocked: true,
        error: 'Screenshot capture failed.',
      })
    );
    expect(verificationState.review).toEqual(
      expect.objectContaining({
        provider: '1688',
        stage: 'supplier_open',
      })
    );
    expect(verificationState.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          iteration: 1,
          blocked: true,
        }),
      ])
    );
    expect(upsertStep).toHaveBeenCalledTimes(2);
  });
});

describe('createProductScanVerificationBarrierAutoInjectionConfig', () => {
  const makeReview = (
    overrides: Partial<ProductScanVerificationReview> = {}
  ): ProductScanVerificationReview => ({
    status: 'analyzed',
    provider: 'google',
    stage: 'google_search',
    currentUrl: 'https://google.com/sorry',
    pageTitle: 'Before you continue',
    pageTextSnippet: 'Solve this puzzle',
    challengeType: 'checkbox',
    visibleQuestion: 'Are you human?',
    visibleInstructions: ['Click the checkbox to verify you are human.'],
    uiElements: ['checkbox'],
    pageSummary: 'Google captcha challenge page.',
    manualActionRequired: true,
    confidence: 0.95,
    screenshotArtifactName: null,
    htmlArtifactName: null,
    modelId: 'claude-sonnet-4-6',
    brainApplied: null,
    error: null,
    evaluatedAt: '2026-04-18T10:00:00.000Z',
    ...overrides,
  });

  it('triggers injection when review is analyzed and manual action is required', () => {
    const config = createProductScanVerificationBarrierAutoInjectionConfig();
    expect(config.shouldInject(makeReview())).toBe(true);
  });

  it('does not trigger injection when status is not analyzed', () => {
    const config = createProductScanVerificationBarrierAutoInjectionConfig();
    expect(config.shouldInject(makeReview({ status: 'capture_only' }))).toBe(false);
    expect(config.shouldInject(makeReview({ status: 'failed' }))).toBe(false);
  });

  it('does not trigger injection when manualActionRequired is false', () => {
    const config = createProductScanVerificationBarrierAutoInjectionConfig();
    expect(config.shouldInject(makeReview({ manualActionRequired: false }))).toBe(false);
    expect(config.shouldInject(makeReview({ manualActionRequired: null }))).toBe(false);
  });

  it('builds a goal string that includes provider, challenge type and visible question', () => {
    const config = createProductScanVerificationBarrierAutoInjectionConfig({ provider: 'Google' });
    const review = makeReview();
    const goal = typeof config.goal === 'function' ? config.goal(review) : config.goal;
    expect(goal).toContain('Google');
    expect(goal).toContain('checkbox');
    expect(goal).toContain('Are you human?');
  });

  it('builds evaluator context that serialises challenge details', () => {
    const config = createProductScanVerificationBarrierAutoInjectionConfig({ provider: '1688' });
    const review = makeReview({
      provider: '1688',
      stage: '1688_open',
      challengeType: 'slider',
      visibleInstructions: ['Drag slider to complete.'],
      uiElements: ['slider-track'],
    });
    const ctx =
      typeof config.buildEvaluatorContext === 'function'
        ? config.buildEvaluatorContext(review)
        : '';
    expect(ctx).toContain('slider');
    expect(ctx).toContain('Drag slider to complete.');
    expect(ctx).toContain('slider-track');
  });

  it('uses the provided maxIterations and enables re-evaluation after injection', () => {
    const config = createProductScanVerificationBarrierAutoInjectionConfig({ maxIterations: 5 });
    expect(config.maxIterations).toBe(5);
    expect(config.reEvaluateAfterInjection).toBe(true);
  });

  it('defaults to 3 iterations when maxIterations is not provided', () => {
    const config = createProductScanVerificationBarrierAutoInjectionConfig();
    expect(config.maxIterations).toBe(3);
  });
});
