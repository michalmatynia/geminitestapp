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
  createProductScanVerificationBarrierRuntime,
  createProductScanVerificationBarrierReviewLoopProfile,
  createProductScanVerificationBarrierAutoInjectionConfig,
  createProductScanVerificationBarrierManualOnlyInjectionConfig,
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

  it('accumulates injection attempts in state — only when attempted is true', () => {
    const state = createProductScanVerificationState<
      { status: 'analyzed'; visibleInstructions: string[]; uiElements: string[]; brainApplied: Record<string, unknown> | null },
      { status: 'analyzed'; iteration: number; visibleInstructions: string[]; uiElements: string[]; brainApplied: Record<string, unknown> | null }
    >();

    const baseReview = { status: 'analyzed' as const, visibleInstructions: [], uiElements: [], brainApplied: null };
    const baseObs = { ...baseReview, iteration: 1 };

    const attemptedInjection = {
      attempted: true,
      iterationsRun: 2,
      done: true,
      lastReasoning: 'solved',
      modelId: 'gemini',
      finalUrl: 'https://example.com/done',
      iterations: [],
      conversationHistory: [],
    };
    const notAttemptedInjection = {
      attempted: false,
      iterationsRun: 0,
      done: false,
      lastReasoning: null,
      modelId: null,
      finalUrl: null,
      iterations: [],
      conversationHistory: [],
    };

    commitProductScanVerificationObservation(state, { review: baseReview, observation: { ...baseObs, iteration: 1 }, injection: notAttemptedInjection });
    expect(state.injectionAttempts).toHaveLength(0);

    commitProductScanVerificationObservation(state, { review: baseReview, observation: { ...baseObs, iteration: 2 }, injection: attemptedInjection });
    expect(state.injectionAttempts).toHaveLength(1);
    expect(state.injectionAttempts[0]).toBe(attemptedInjection);

    commitProductScanVerificationObservation(state, { review: baseReview, observation: { ...baseObs, iteration: 3 } });
    expect(state.injectionAttempts).toHaveLength(1);
  });

  it('includes injection stats in diagnostics payload when attempts exist', () => {
    const state = createProductScanVerificationState<
      { status: 'analyzed'; visibleInstructions: string[]; uiElements: string[]; brainApplied: Record<string, unknown> | null },
      { status: 'analyzed'; iteration: number; visibleInstructions: string[]; uiElements: string[]; brainApplied: Record<string, unknown> | null }
    >();

    const review = { status: 'analyzed' as const, visibleInstructions: [], uiElements: [], brainApplied: null };
    const makeAttempt = (done: boolean) => ({
      attempted: true,
      iterationsRun: 1,
      done,
      lastReasoning: null,
      modelId: null,
      finalUrl: null,
      iterations: [],
      conversationHistory: [],
    });

    commitProductScanVerificationObservation(state, { review, observation: { ...review, iteration: 1 }, injection: makeAttempt(true) });
    commitProductScanVerificationObservation(state, { review, observation: { ...review, iteration: 2 }, injection: makeAttempt(false) });

    const payload = buildProductScanVerificationDiagnosticsPayloadFromState({
      reviewKey: 'r',
      observationsKey: 'o',
      state,
    });

    expect(payload['injectionAttempts']).toBe(2);
    expect(payload['injectionSuccesses']).toBe(1);
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

  it('creates a verification runtime descriptor with shared state and diagnostics helpers', () => {
    type TestObservation = ProductScanVerificationObservationBase<'blocked'> & {
      captchaDetected: boolean;
    };

    const runtime = createProductScanVerificationBarrierRuntime<
      { detected: boolean },
      { candidateId: string },
      {
        candidateId: string;
        iteration: number;
        loopDecision: 'blocked';
        captchaDetected: boolean;
        stableForMs: number | null;
        currentUrl?: string | null;
      },
      TestObservation
    >({
      reviewKey: 'googleVerificationReview',
      observationsKey: 'googleVerificationObservations',
      profile: {
        key: 'google_verification_review',
        subject: 'Google verification screen',
        runningMessage: 'Capturing Google verification screen for AI review.',
        historyArtifactKey: 'google-verification-review-history',
        artifactKeyPrefix: 'google-verification-review',
        evaluationProvider: 'google_lens',
        resolveEvaluationStage: () => 'google_captcha',
        buildArtifactSegments: (params) => [
          params.candidateId,
          `iter-${String(params.iteration)}`,
        ],
        buildFingerprintPartMap: (params) => ({
          candidateId: params.candidateId,
          loopDecision: params.loopDecision,
        }),
        detailDescriptors: [{ label: 'Captcha detected', value: 'captchaDetected' }],
        buildObservationExtra: (params) => ({
          captchaDetected: params.captchaDetected,
        }),
        buildLoopCaptureParams: ({ iteration, stableForMs }, baseParams) => ({
          candidateId: baseParams.candidateId,
          iteration,
          loopDecision: 'blocked',
          captchaDetected: true,
          stableForMs,
          currentUrl: null,
        }),
      },
    });

    const state = runtime.createState();
    const review: ProductScanVerificationReview = {
      status: 'capture_only',
      provider: 'google_lens',
      stage: 'google_captcha',
      currentUrl: null,
      pageTitle: null,
      pageTextSnippet: null,
      challengeType: null,
      visibleQuestion: null,
      visibleInstructions: ['Wait'],
      uiElements: ['captcha'],
      pageSummary: null,
      manualActionRequired: true,
      confidence: null,
      screenshotArtifactName: null,
      htmlArtifactName: null,
      modelId: null,
      brainApplied: { modelId: 'gemma' },
      error: null,
      evaluatedAt: null,
    };
    const observation: TestObservation = {
      ...review,
      iteration: 1,
      observedAt: '2026-04-18T00:00:00.000Z',
      loopDecision: 'blocked',
      stableForMs: null,
      fingerprint: 'candidate-1::blocked',
      captchaDetected: true,
    };

    commitProductScanVerificationObservation(state, {
      review,
      observation,
    });

    expect(runtime.profile.review.runtime.step.key).toBe('google_verification_review');
    expect(runtime.buildDiagnosticsPayload(state)).toEqual({
      googleVerificationReview: expect.objectContaining({
        stage: 'google_captcha',
      }),
      googleVerificationObservations: expect.arrayContaining([
        expect.objectContaining({
          loopDecision: 'blocked',
          captchaDetected: true,
        }),
      ]),
    });
  });

  it('captures verification state from a page-backed runtime and resolves currentUrl lazily', async () => {
    type TestObservation = ProductScanVerificationObservationBase<'blocked'> & {
      captchaDetected: boolean;
    };

    const runtime = createProductScanVerificationBarrierRuntime<
      { detected: boolean },
      { candidateId: string },
      {
        candidateId: string;
        iteration: number;
        loopDecision: 'blocked';
        captchaDetected: boolean;
        stableForMs: number | null;
        currentUrl?: string | null;
      },
      TestObservation
    >({
      reviewKey: 'googleVerificationReview',
      observationsKey: 'googleVerificationObservations',
      injectorProviderLabel: 'Google',
      profile: {
        key: 'google_verification_review',
        subject: 'Google verification screen',
        runningMessage: 'Capturing Google verification screen for AI review.',
        historyArtifactKey: 'google-verification-review-history',
        artifactKeyPrefix: 'google-verification-review',
        screenshotFailureLogKey: 'google.verification.review.screenshot_failed',
        evaluationProvider: 'google_lens',
        resolveEvaluationStage: () => 'google_captcha',
        buildArtifactSegments: (params) => [params.candidateId, `iter-${String(params.iteration)}`],
        buildFingerprintPartMap: (params) => ({
          candidateId: params.candidateId,
          loopDecision: params.loopDecision,
        }),
        detailDescriptors: [{ label: 'Captcha detected', value: 'captchaDetected' }],
        buildObservationExtra: (params) => ({
          captchaDetected: params.captchaDetected,
        }),
        buildLoopCaptureParams: ({ iteration, stableForMs }, baseParams) => ({
          candidateId: baseParams.candidateId,
          iteration,
          loopDecision: 'blocked',
          captchaDetected: true,
          stableForMs,
          currentUrl: null,
        }),
      },
    });

    const page = {
      url: vi.fn().mockReturnValue('https://www.google.com/sorry/index'),
      title: vi.fn().mockResolvedValue('Before you continue'),
      screenshot: vi.fn().mockRejectedValue(new Error('capture failed')),
      locator: vi.fn().mockImplementation(() => ({
        first: vi.fn().mockReturnThis(),
        textContent: vi.fn().mockResolvedValue('Verify you are human'),
      })),
    } as unknown as Page;
    const upsertStep = vi.fn();
    const verificationState = runtime.createState();

    const observation = await runtime.captureWithStateFromPage({
      verificationState,
      params: {
        candidateId: 'candidate-1',
        iteration: 1,
        loopDecision: 'blocked',
        captchaDetected: true,
        stableForMs: null,
      },
      resolveCurrentUrl: () => 'https://www.google.com/sorry/index',
      page,
      log: vi.fn(),
      upsertStep,
    });

    expect(observation).toEqual(
      expect.objectContaining({
        status: 'failed',
        provider: 'google_lens',
        stage: 'google_captcha',
        currentUrl: 'https://www.google.com/sorry/index',
        captchaDetected: true,
      })
    );
    expect(verificationState.review).toEqual(
      expect.objectContaining({
        currentUrl: 'https://www.google.com/sorry/index',
      })
    );
    expect(upsertStep).toHaveBeenCalledTimes(2);
  });

  it('observes a verification loop through the runtime descriptor with page-backed capture', async () => {
    type TestObservation = ProductScanVerificationObservationBase<'blocked' | 'resolved'> & {
      captchaDetected: boolean;
    };

    const runtime = createProductScanVerificationBarrierRuntime<
      { detected: boolean },
      { candidateId: string },
      {
        candidateId: string;
        iteration: number;
        loopDecision: 'blocked' | 'resolved';
        captchaDetected: boolean;
        stableForMs: number | null;
        currentUrl?: string | null;
      },
      TestObservation
    >({
      reviewKey: 'googleVerificationReview',
      observationsKey: 'googleVerificationObservations',
      injectorProviderLabel: 'Google',
      profile: {
        key: 'google_verification_review',
        subject: 'Google verification screen',
        runningMessage: 'Capturing Google verification screen for AI review.',
        historyArtifactKey: 'google-verification-review-history',
        artifactKeyPrefix: 'google-verification-review',
        screenshotFailureLogKey: 'google.verification.review.screenshot_failed',
        evaluationProvider: 'google_lens',
        resolveEvaluationStage: () => 'google_captcha',
        buildArtifactSegments: (params) => [params.candidateId, `iter-${String(params.iteration)}`],
        buildFingerprintPartMap: (params) => ({
          candidateId: params.candidateId,
          loopDecision: params.loopDecision,
        }),
        detailDescriptors: [{ label: 'Captcha detected', value: 'captchaDetected' }],
        buildObservationExtra: (params) => ({
          captchaDetected: params.captchaDetected,
        }),
        buildLoopCaptureParams: ({ iteration, decision, snapshot, stableForMs }, baseParams) => ({
          candidateId: baseParams.candidateId,
          iteration,
          loopDecision: decision === 'blocked' ? 'blocked' : 'resolved',
          captchaDetected: snapshot.blocked,
          stableForMs,
          currentUrl: null,
        }),
      },
    });

    const page = {
      url: vi.fn().mockReturnValue('https://www.google.com/sorry/index'),
      title: vi.fn().mockResolvedValue('Before you continue'),
      screenshot: vi.fn().mockRejectedValue(new Error('capture failed')),
      locator: vi.fn().mockImplementation(() => ({
        first: vi.fn().mockReturnThis(),
        textContent: vi.fn().mockResolvedValue('Verify you are human'),
      })),
    } as unknown as Page;
    const upsertStep = vi.fn();
    const verificationState = runtime.createState();

    const result = await runtime.observeLoopWithPage({
      timeoutMs: 5_000,
      stableClearWindowMs: 0,
      intervalMs: 0,
      initialSnapshot: {
        state: null,
        blocked: true,
        currentUrl: 'https://www.google.com/sorry/index',
      },
      isPageClosed: () => false,
      wait: async () => {},
      readSnapshot: async () => ({
        state: { detected: false },
        blocked: false,
        currentUrl: 'https://lens.google.com/search',
      }),
      baseParams: {
        candidateId: 'candidate-1',
      },
      verificationState,
      resolveCurrentUrl: () => 'https://www.google.com/sorry/index',
      page,
      log: vi.fn(),
      upsertStep,
    });

    expect(result).toEqual(
      expect.objectContaining({
        resolved: true,
        finalDecision: 'resolved',
      })
    );
    expect(verificationState.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ loopDecision: 'blocked' }),
        expect.objectContaining({ loopDecision: 'resolved' }),
      ])
    );
    expect(upsertStep).toHaveBeenCalledTimes(4);
  });

  it('binds base params into a page session for capture and diagnostics', async () => {
    type TestObservation = ProductScanVerificationObservationBase<'blocked'> & {
      captchaDetected: boolean;
    };

    const runtime = createProductScanVerificationBarrierRuntime<
      { detected: boolean },
      { candidateId: string },
      {
        candidateId: string;
        iteration: number;
        loopDecision: 'blocked';
        captchaDetected: boolean;
        stableForMs: number | null;
        currentUrl?: string | null;
      },
      TestObservation
    >({
      reviewKey: 'googleVerificationReview',
      observationsKey: 'googleVerificationObservations',
      injectorProviderLabel: 'Google',
      profile: {
        key: 'google_verification_review',
        subject: 'Google verification screen',
        runningMessage: 'Capturing Google verification screen for AI review.',
        historyArtifactKey: 'google-verification-review-history',
        artifactKeyPrefix: 'google-verification-review',
        screenshotFailureLogKey: 'google.verification.review.screenshot_failed',
        evaluationProvider: 'google_lens',
        resolveEvaluationStage: () => 'google_captcha',
        buildArtifactSegments: (params) => [params.candidateId, `iter-${String(params.iteration)}`],
        buildFingerprintPartMap: (params) => ({
          candidateId: params.candidateId,
          loopDecision: params.loopDecision,
        }),
        detailDescriptors: [{ label: 'Captcha detected', value: 'captchaDetected' }],
        buildObservationExtra: (params) => ({
          captchaDetected: params.captchaDetected,
        }),
        buildLoopCaptureParams: ({ iteration, stableForMs }, baseParams) => ({
          candidateId: baseParams.candidateId,
          iteration,
          loopDecision: 'blocked',
          captchaDetected: true,
          stableForMs,
          currentUrl: null,
        }),
      },
    });

    const page = {
      url: vi.fn().mockReturnValue('https://www.google.com/sorry/index'),
      title: vi.fn().mockResolvedValue('Before you continue'),
      screenshot: vi.fn().mockRejectedValue(new Error('capture failed')),
      locator: vi.fn().mockImplementation(() => ({
        first: vi.fn().mockReturnThis(),
        textContent: vi.fn().mockResolvedValue('Verify you are human'),
      })),
    } as unknown as Page;
    const upsertStep = vi.fn();
    const session = runtime.createPageSession({
      resolveCurrentUrl: () => 'https://www.google.com/sorry/index',
      page,
      log: vi.fn(),
      upsertStep,
    });
    const boundSession = session.bindBaseParams({
      candidateId: 'candidate-1',
    });

    const observation = await boundSession.capture({
      iteration: 1,
      loopDecision: 'blocked',
      captchaDetected: true,
      stableForMs: null,
    });

    expect(observation).toEqual(
      expect.objectContaining({
        status: 'failed',
        provider: 'google_lens',
        stage: 'google_captcha',
        currentUrl: 'https://www.google.com/sorry/index',
        captchaDetected: true,
      })
    );
    expect(session.buildDiagnosticsPayload()).toEqual(
      expect.objectContaining({
        googleVerificationReview: expect.objectContaining({
          currentUrl: 'https://www.google.com/sorry/index',
        }),
        googleVerificationObservations: [
          expect.objectContaining({ loopDecision: 'blocked' }),
        ],
      })
    );
    expect(upsertStep).toHaveBeenCalledTimes(2);
  });

  it('observes a verification loop through base params bound into a page session', async () => {
    type TestObservation = ProductScanVerificationObservationBase<'blocked' | 'resolved'> & {
      captchaDetected: boolean;
    };

    const runtime = createProductScanVerificationBarrierRuntime<
      { detected: boolean },
      { candidateId: string },
      {
        candidateId: string;
        iteration: number;
        loopDecision: 'blocked' | 'resolved';
        captchaDetected: boolean;
        stableForMs: number | null;
        currentUrl?: string | null;
      },
      TestObservation
    >({
      reviewKey: 'googleVerificationReview',
      observationsKey: 'googleVerificationObservations',
      injectorProviderLabel: 'Google',
      profile: {
        key: 'google_verification_review',
        subject: 'Google verification screen',
        runningMessage: 'Capturing Google verification screen for AI review.',
        historyArtifactKey: 'google-verification-review-history',
        artifactKeyPrefix: 'google-verification-review',
        screenshotFailureLogKey: 'google.verification.review.screenshot_failed',
        evaluationProvider: 'google_lens',
        resolveEvaluationStage: () => 'google_captcha',
        buildArtifactSegments: (params) => [params.candidateId, `iter-${String(params.iteration)}`],
        buildFingerprintPartMap: (params) => ({
          candidateId: params.candidateId,
          loopDecision: params.loopDecision,
        }),
        detailDescriptors: [{ label: 'Captcha detected', value: 'captchaDetected' }],
        buildObservationExtra: (params) => ({
          captchaDetected: params.captchaDetected,
        }),
        buildLoopCaptureParams: ({ iteration, decision, snapshot, stableForMs }, baseParams) => ({
          candidateId: baseParams.candidateId,
          iteration,
          loopDecision: decision === 'blocked' ? 'blocked' : 'resolved',
          captchaDetected: snapshot.blocked,
          stableForMs,
          currentUrl: null,
        }),
      },
    });

    const page = {
      url: vi.fn().mockReturnValue('https://www.google.com/sorry/index'),
      title: vi.fn().mockResolvedValue('Before you continue'),
      screenshot: vi.fn().mockRejectedValue(new Error('capture failed')),
      locator: vi.fn().mockImplementation(() => ({
        first: vi.fn().mockReturnThis(),
        textContent: vi.fn().mockResolvedValue('Verify you are human'),
      })),
    } as unknown as Page;
    const upsertStep = vi.fn();
    const session = runtime.createPageSession({
      resolveCurrentUrl: () => 'https://www.google.com/sorry/index',
      page,
      log: vi.fn(),
      upsertStep,
    });
    const boundSession = session.bindBaseParams({
      candidateId: 'candidate-1',
    });

    const result = await boundSession.observeLoop({
      timeoutMs: 5_000,
      stableClearWindowMs: 0,
      intervalMs: 0,
      initialSnapshot: {
        state: null,
        blocked: true,
        currentUrl: 'https://www.google.com/sorry/index',
      },
      isPageClosed: () => false,
      wait: async () => {},
      readSnapshot: async () => ({
        state: { detected: false },
        blocked: false,
        currentUrl: 'https://lens.google.com/search',
      }),
    });

    expect(result).toEqual(
      expect.objectContaining({
        resolved: true,
        finalDecision: 'resolved',
      })
    );
    expect(session.buildDiagnosticsPayload()).toEqual(
      expect.objectContaining({
        googleVerificationObservations: expect.arrayContaining([
          expect.objectContaining({ loopDecision: 'blocked' }),
          expect.objectContaining({ loopDecision: 'resolved' }),
        ]),
      })
    );
    expect(upsertStep).toHaveBeenCalledTimes(4);
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
        profile: createProductScanVerificationBarrierReviewLoopProfile({
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
      profile: createProductScanVerificationBarrierReviewLoopProfile({
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
      profile: createProductScanVerificationBarrierReviewLoopProfile<
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
      profile: createProductScanVerificationBarrierReviewLoopProfile<
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

  const makeCapture = (
    overrides: Partial<import('@/features/playwright/server/ai-step-service').PlaywrightCapturedPageObservation> = {}
  ) => ({
    currentUrl: 'https://google.com/sorry',
    pageTitle: 'Before you continue',
    pageTextSnippet: 'Solve this puzzle to verify you are human.',
    screenshotBase64: null,
    screenshotArtifactName: null,
    htmlArtifactName: null,
    fingerprint: 'fp::test',
    observedAt: '2026-04-18T10:00:00.000Z',
    ...overrides,
  });

  it('triggers injection when review is analyzed and manual action is required', () => {
    const config = createProductScanVerificationBarrierAutoInjectionConfig();
    expect(config.shouldInject(makeReview(), makeCapture())).toBe(true);
  });

  it('does not trigger injection when status is not analyzed', () => {
    const config = createProductScanVerificationBarrierAutoInjectionConfig();
    expect(config.shouldInject(makeReview({ status: 'capture_only' }), makeCapture())).toBe(false);
    expect(config.shouldInject(makeReview({ status: 'failed' }), makeCapture())).toBe(false);
  });

  it('does not trigger injection when manualActionRequired is false', () => {
    const config = createProductScanVerificationBarrierAutoInjectionConfig();
    expect(config.shouldInject(makeReview({ manualActionRequired: false }), makeCapture())).toBe(false);
    expect(config.shouldInject(makeReview({ manualActionRequired: null }), makeCapture())).toBe(false);
  });

  it('builds a goal string that includes provider, challenge type, visible question, and current URL', () => {
    const config = createProductScanVerificationBarrierAutoInjectionConfig({ provider: 'Google' });
    const review = makeReview();
    const capture = makeCapture({ currentUrl: 'https://google.com/sorry/index?continue=1' });
    const goal = typeof config.goal === 'function' ? config.goal(review, capture) : config.goal;
    expect(goal).toContain('Google');
    expect(goal).toContain('checkbox');
    expect(goal).toContain('Are you human?');
    expect(goal).toContain('https://google.com/sorry/index?continue=1');
  });

  it('builds evaluator context that serialises challenge details and capture context', () => {
    const config = createProductScanVerificationBarrierAutoInjectionConfig({ provider: '1688' });
    const review = makeReview({
      provider: '1688',
      stage: '1688_open',
      challengeType: 'slider',
      visibleInstructions: ['Drag slider to complete.'],
      uiElements: ['slider-track'],
    });
    const capture = makeCapture({
      currentUrl: 'https://1688.com/challenge',
      pageTextSnippet: 'Drag the slider to verify.',
    });
    const ctx =
      typeof config.buildEvaluatorContext === 'function'
        ? config.buildEvaluatorContext(review, capture)
        : '';
    expect(ctx).toContain('slider');
    expect(ctx).toContain('Drag slider to complete.');
    expect(ctx).toContain('slider-track');
    expect(ctx).toContain('https://1688.com/challenge');
    expect(ctx).toContain('Drag the slider to verify.');
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

  it('includes a per-iteration evaluateCapture function', () => {
    const config = createProductScanVerificationBarrierAutoInjectionConfig();
    expect(typeof config.evaluateCapture).toBe('function');
  });

  it('evaluateCapture reports done=true when manualActionRequired is false', async () => {
    const { runBrainChatCompletion: mockChat, isBrainModelVisionCapable: mockVision, resolveBrainExecutionConfigForCapability: mockConfig } =
      await import('@/shared/lib/ai-brain/server-runtime-client').then((m) => ({
        runBrainChatCompletion: vi.mocked(m.runBrainChatCompletion),
        isBrainModelVisionCapable: vi.mocked(m.isBrainModelVisionCapable),
        resolveBrainExecutionConfigForCapability: undefined,
      }));
    const mockResolve = vi.mocked(
      (await import('@/shared/lib/ai-brain/segments/api')).resolveBrainExecutionConfigForCapability
    );

    vi.clearAllMocks();
    mockResolve.mockResolvedValue({ modelId: 'claude-sonnet-4-6', systemPrompt: null, temperature: 0.2, brainApplied: false });
    mockVision.mockReturnValue(true);
    mockChat.mockResolvedValue({
      text: JSON.stringify({ challengeType: null, visibleQuestion: null, visibleInstructions: [], uiElements: [], pageSummary: 'Solved.', manualActionRequired: false, confidence: 0.98 }),
      modelId: 'claude-sonnet-4-6',
    });

    const config = createProductScanVerificationBarrierAutoInjectionConfig({ provider: 'Google' });
    const result = await config.evaluateCapture!({
      screenshotBase64: 'base64shot',
      dom: '<html></html>',
      url: 'https://google.com/done',
      iteration: 2,
      maxIterations: 3,
    });

    expect(result.done).toBe(true);
    expect(result.reasoning).toBe('Solved.');
  });

  it('evaluateCapture reports done=false with context when challenge still present', async () => {
    const mockChat = vi.mocked(
      (await import('@/shared/lib/ai-brain/server-runtime-client')).runBrainChatCompletion
    );
    const mockVision = vi.mocked(
      (await import('@/shared/lib/ai-brain/server-runtime-client')).isBrainModelVisionCapable
    );
    const mockResolve = vi.mocked(
      (await import('@/shared/lib/ai-brain/segments/api')).resolveBrainExecutionConfigForCapability
    );

    vi.clearAllMocks();
    mockResolve.mockResolvedValue({ modelId: 'claude-sonnet-4-6', systemPrompt: null, temperature: 0.2, brainApplied: false });
    mockVision.mockReturnValue(true);
    mockChat.mockResolvedValue({
      text: JSON.stringify({ challengeType: 'slider', visibleQuestion: 'Drag to verify', visibleInstructions: ['Drag the handle.'], uiElements: ['slider-track', 'handle'], pageSummary: null, manualActionRequired: true, confidence: 0.9 }),
      modelId: 'claude-sonnet-4-6',
    });

    const config = createProductScanVerificationBarrierAutoInjectionConfig({ provider: 'Google' });
    const result = await config.evaluateCapture!({
      screenshotBase64: 'base64shot',
      dom: null,
      url: 'https://google.com/captcha',
      iteration: 1,
      maxIterations: 3,
    });

    expect(result.done).toBe(false);
    expect(result.context).toContain('slider');
    expect(result.context).toContain('Drag to verify');
    expect(result.context).toContain('https://google.com/captcha');
  });
});

describe('createProductScanVerificationBarrierManualOnlyInjectionConfig', () => {
  const makeReview = (
    overrides: Partial<ProductScanVerificationReview> = {}
  ): ProductScanVerificationReview => ({
    status: 'analyzed',
    provider: 'google',
    stage: 'google_captcha',
    currentUrl: 'https://www.google.com/sorry/index',
    pageTitle: 'Before you continue',
    pageTextSnippet: 'Verify you are human',
    challengeType: 'captcha',
    visibleQuestion: 'Are you human?',
    visibleInstructions: ['Complete the check to continue.'],
    uiElements: ['checkbox'],
    pageSummary: 'Google verification challenge.',
    manualActionRequired: true,
    confidence: 0.9,
    screenshotArtifactName: null,
    htmlArtifactName: null,
    modelId: 'claude-sonnet-4-6',
    brainApplied: null,
    error: null,
    evaluatedAt: '2026-04-24T10:00:00.000Z',
    ...overrides,
  });

  const makeCapture = (
    overrides: Partial<import('@/features/playwright/server/ai-step-service').PlaywrightCapturedPageObservation> = {}
  ) => ({
    currentUrl: 'https://www.google.com/sorry/index',
    pageTitle: 'Before you continue',
    pageTextSnippet: 'Verify you are human.',
    screenshotBase64: null,
    screenshotArtifactName: null,
    htmlArtifactName: null,
    fingerprint: 'fp::manual-only',
    observedAt: '2026-04-24T10:00:00.000Z',
    ...overrides,
  });

  it('never triggers injection even when manual action is required', () => {
    const config = createProductScanVerificationBarrierManualOnlyInjectionConfig({
      provider: 'Google',
    });

    expect(config.shouldInject(makeReview(), makeCapture())).toBe(false);
    expect(
      config.shouldInject(
        makeReview({ manualActionRequired: false }),
        makeCapture()
      )
    ).toBe(false);
  });

  it('uses a manual-only goal and disables iterative injection behavior', () => {
    const config = createProductScanVerificationBarrierManualOnlyInjectionConfig({
      provider: 'Google',
    });
    const goal =
      typeof config.goal === 'function'
        ? config.goal(makeReview(), makeCapture())
        : config.goal;

    expect(goal).toContain('manual-only');
    expect(goal).toContain('Do not interact with the challenge UI.');
    expect(goal).toContain('Google');
    expect(config.maxIterations).toBe(0);
    expect(config.reEvaluateAfterInjection).toBe(false);
    expect(config.waitForNavigation).toBe(false);
    expect(config.useConversationHistory).toBe(false);
  });
});

describe('createProductScanVerificationBarrierRuntime — injectionConfigOverrides', () => {
  const makeMinimalProfile = () => ({
    key: 'test_review',
    subject: 'Test',
    runningMessage: 'Running.',
    historyArtifactKey: 'test-history',
    artifactKeyPrefix: 'test',
    evaluationProvider: 'test_provider',
    resolveEvaluationStage: () => 'test_stage',
    buildArtifactSegments: () => [],
    buildFingerprintPartMap: () => ({}),
    detailDescriptors: [],
    buildObservationExtra: () => ({}),
    buildLoopCaptureParams: ({ iteration, stableForMs }: { iteration: number; stableForMs: number | null }, base: { candidateId: string; candidateRank: number }) => ({
      candidateId: base.candidateId,
      candidateRank: base.candidateRank,
      iteration,
      loopDecision: 'blocked' as const,
      stableForMs,
    }),
  });

  it('applies injectionConfigOverrides on top of the auto-generated config', () => {
    type TestObservation = ProductScanVerificationObservationBase<'blocked'>;
    const customShouldInject = vi.fn().mockReturnValue(false);

    const runtime = createProductScanVerificationBarrierRuntime<
      Record<never, never>,
      { candidateId: string; candidateRank: number },
      { candidateId: string; candidateRank: number; iteration: number; loopDecision: 'blocked'; stableForMs: number | null },
      TestObservation
    >({
      reviewKey: 'r',
      observationsKey: 'o',
      injectorProviderLabel: 'Test',
      injectionConfigOverrides: {
        shouldInject: customShouldInject,
        maxIterations: 10,
        timeoutMs: 60000,
        reEvaluateAfterInjection: false,
        useConversationHistory: false,
      },
      profile: makeMinimalProfile(),
    });

    expect(runtime).toBeDefined();
    expect(runtime.createState().injectionAttempts).toEqual([]);
  });

  it('uses the auto-generated config unchanged when injectionConfigOverrides is not provided', () => {
    type TestObservation = ProductScanVerificationObservationBase<'blocked'>;

    const runtime = createProductScanVerificationBarrierRuntime<
      Record<never, never>,
      { candidateId: string; candidateRank: number },
      { candidateId: string; candidateRank: number; iteration: number; loopDecision: 'blocked'; stableForMs: number | null },
      TestObservation
    >({
      reviewKey: 'r',
      observationsKey: 'o',
      injectorProviderLabel: 'NoOverride',
      profile: makeMinimalProfile(),
    });

    expect(runtime).toBeDefined();
    expect(runtime.createState().injectionAttempts).toEqual([]);
  });
});
