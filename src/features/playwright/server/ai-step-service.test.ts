import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('@/shared/lib/ai-brain/segments/api', () => ({
  resolveBrainExecutionConfigForCapability: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  isBrainModelVisionCapable: vi.fn(),
  runBrainChatCompletion: vi.fn(),
}));

import type { Page } from 'playwright';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/segments/api';
import {
  isBrainModelVisionCapable,
  runBrainChatCompletion,
} from '@/shared/lib/ai-brain/server-runtime-client';

import {
  buildPlaywrightVerificationReviewDetailsFromProfile,
  buildPlaywrightVerificationReviewDetailsWithDescriptors,
  buildPlaywrightVerificationReviewExtraDetailsFromDescriptors,
  buildPlaywrightVerificationReviewFingerprintParts,
  captureAndEvaluatePlaywrightObservation,
  buildPlaywrightVerificationReviewArtifactKey,
  createPlaywrightVerificationObservationLoopAdapter,
  createPlaywrightVerificationObservationFromProfile,
  createPlaywrightVerificationReviewLoopProfile,
  createPlaywrightVerificationReviewProfile,
  createPlaywrightVerificationObservation,
  finalizePlaywrightVerificationReview,
  resolvePlaywrightVerificationReviewCaptureContext,
  runPlaywrightVerificationReviewCapture,
  runPlaywrightVerificationObservationLoop,
  runPlaywrightVerificationObservationLoopWithAdapter,
  runPlaywrightVerificationObservationLoopWithProfile,
  createPlaywrightVerificationReviewArtifactConfig,
  buildPlaywrightVerificationReviewDetailsWithAdapter,
  createPlaywrightVerificationReviewStepMessages,
  createPlaywrightVerificationReviewRuntimeConfig,
  createPlaywrightVerificationReviewStepConfig,
  evaluateStructuredPlaywrightScreenshotWithAI,
  resolvePlaywrightVerificationReviewArtifactKeys,
  resolvePlaywrightVerificationReviewStepOutcome,
  slugifyPlaywrightVerificationReviewSegment,
  runPlaywrightObservationLoop,
  runPlaywrightVisionGuidedAutomation,
  createPlaywrightVisionGuidedEvaluator,
  injectCodeWithAI,
} from './ai-step-service';

const makeMockPage = (overrides: Partial<Page> = {}): Page =>
  ({
    url: vi.fn().mockReturnValue('https://example.com/challenge'),
    title: vi.fn().mockResolvedValue('Challenge page'),
    screenshot: vi.fn().mockResolvedValue(Buffer.from('mock-screenshot')),
    click: vi.fn().mockResolvedValue(undefined),
    locator: vi.fn().mockImplementation(() => ({
      first: vi.fn().mockReturnThis(),
      textContent: vi.fn().mockResolvedValue('Verify you are human before continuing.'),
    })),
    ...overrides,
  }) as unknown as Page;

const mockedResolveBrainExecutionConfigForCapability = vi.mocked(
  resolveBrainExecutionConfigForCapability
);
const mockedIsBrainModelVisionCapable = vi.mocked(isBrainModelVisionCapable);
const mockedRunBrainChatCompletion = vi.mocked(runBrainChatCompletion);

describe('runPlaywrightObservationLoop', () => {
  it('resolves after the page stays clear for the stable window', async () => {
    const dateSpy = vi.spyOn(Date, 'now');
    let now = 1_000;
    dateSpy.mockImplementation(() => now);
    const decisions: string[] = [];
    const readSnapshot = vi
      .fn()
      .mockResolvedValueOnce({
        state: { currentUrl: 'https://www.google.com/sorry/index' },
        blocked: true,
        currentUrl: 'https://www.google.com/sorry/index',
      })
      .mockResolvedValueOnce({
        state: { currentUrl: 'https://lens.google.com/search?p=1' },
        blocked: false,
        currentUrl: 'https://lens.google.com/search?p=1',
      })
      .mockResolvedValue({
        state: { currentUrl: 'https://lens.google.com/search?p=1' },
        blocked: false,
        currentUrl: 'https://lens.google.com/search?p=1',
      });

    try {
      const result = await runPlaywrightObservationLoop({
        timeoutMs: 10_000,
        intervalMs: 2_000,
        stableClearWindowMs: 2_000,
        initialSnapshot: {
          state: null,
          blocked: true,
          currentUrl: 'https://www.google.com/sorry/index',
        },
        isPageClosed: () => false,
        wait: async (ms) => {
          now += ms;
        },
        readSnapshot,
        observe: async ({ decision }) => {
          decisions.push(decision);
          return { decision };
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          resolved: true,
          finalDecision: 'resolved',
          iterations: 4,
        })
      );
      expect(decisions).toEqual([
        'blocked',
        'blocked',
        'awaiting_stable_clear',
        'resolved',
      ]);
    } finally {
      dateSpy.mockRestore();
    }
  });

  it('records a timeout observation when the barrier never clears', async () => {
    const dateSpy = vi.spyOn(Date, 'now');
    let now = 10_000;
    dateSpy.mockImplementation(() => now);
    const decisions: string[] = [];

    try {
      const result = await runPlaywrightObservationLoop({
        timeoutMs: 500,
        intervalMs: 1_000,
        stableClearWindowMs: 2_000,
        initialSnapshot: {
          state: null,
          blocked: true,
          currentUrl: 'https://www.google.com/sorry/index',
        },
        isPageClosed: () => false,
        wait: async (ms) => {
          now += ms;
        },
        readSnapshot: async () => ({
          state: { currentUrl: 'https://www.google.com/sorry/index' },
          blocked: true,
          currentUrl: 'https://www.google.com/sorry/index',
        }),
        observe: async ({ decision }) => {
          decisions.push(decision);
          return { decision };
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          resolved: false,
          finalDecision: 'timeout',
          iterations: 3,
        })
      );
      expect(decisions).toEqual(['blocked', 'blocked', 'timeout']);
    } finally {
      dateSpy.mockRestore();
    }
  });

  it('records page closure as a terminal loop decision', async () => {
    const decisions: string[] = [];
    let closed = false;

    const result = await runPlaywrightObservationLoop({
      timeoutMs: 10_000,
      intervalMs: 1_000,
      stableClearWindowMs: 2_000,
      initialSnapshot: {
        state: null,
        blocked: true,
        currentUrl: 'https://www.google.com/sorry/index',
      },
      isPageClosed: () => closed,
      wait: async () => {
        closed = true;
      },
      readSnapshot: async () => ({
        state: { currentUrl: null },
        blocked: true,
        currentUrl: null,
      }),
      observe: async ({ decision }) => {
        decisions.push(decision);
        return { decision };
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        resolved: false,
        finalDecision: 'page_closed',
        iterations: 2,
      })
    );
    expect(decisions).toEqual(['blocked', 'page_closed']);
  });
});

describe('runPlaywrightVerificationObservationLoop', () => {
  it('bridges loop snapshots into provider capture params through the shared helper', async () => {
    const dateSpy = vi.spyOn(Date, 'now');
    let now = 10_000;
    dateSpy.mockImplementation(() => now);
    const capturedParams: Array<Record<string, unknown>> = [];

    try {
      const result = await runPlaywrightVerificationObservationLoop<
        { currentUrl: string },
        { iteration: number; decision: string },
        {
          candidateId: string;
          candidateRank: number;
          iteration: number;
          loopDecision: string;
          stableForMs: number | null;
          currentUrl: string;
        }
      >({
        timeoutMs: 500,
        intervalMs: 1_000,
        stableClearWindowMs: 2_000,
        initialSnapshot: {
          state: { currentUrl: 'https://example.com/challenge' },
          blocked: true,
          currentUrl: 'https://example.com/challenge',
        },
        isPageClosed: () => false,
        wait: async (ms) => {
          now += ms;
        },
        readSnapshot: async () => ({
          state: { currentUrl: 'https://example.com/challenge' },
          blocked: true,
          currentUrl: 'https://example.com/challenge',
        }),
        buildCaptureParams: ({ iteration, decision, snapshot, stableForMs }) => ({
          candidateId: 'pin-badge',
          candidateRank: 2,
          iteration,
          loopDecision: decision,
          stableForMs,
          currentUrl: snapshot.currentUrl ?? 'unknown',
        }),
        captureObservation: async (params) => {
          capturedParams.push(params);
          return { iteration: params.iteration, decision: params.loopDecision };
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          resolved: false,
          finalDecision: 'timeout',
          iterations: 3,
        })
      );
      expect(capturedParams).toEqual([
        {
          candidateId: 'pin-badge',
          candidateRank: 2,
          iteration: 1,
          loopDecision: 'blocked',
          stableForMs: null,
          currentUrl: 'https://example.com/challenge',
        },
        {
          candidateId: 'pin-badge',
          candidateRank: 2,
          iteration: 2,
          loopDecision: 'blocked',
          stableForMs: null,
          currentUrl: 'https://example.com/challenge',
        },
        {
          candidateId: 'pin-badge',
          candidateRank: 2,
          iteration: 3,
          loopDecision: 'timeout',
          stableForMs: null,
          currentUrl: 'https://example.com/challenge',
        },
      ]);
    } finally {
      dateSpy.mockRestore();
    }
  });
});

describe('runPlaywrightVerificationObservationLoopWithAdapter', () => {
  it('bridges loop snapshots into provider capture params through a reusable adapter', async () => {
    const dateSpy = vi.spyOn(Date, 'now');
    let now = 10_000;
    dateSpy.mockImplementation(() => now);
    const capturedParams: Array<Record<string, unknown>> = [];

    try {
      const result = await runPlaywrightVerificationObservationLoopWithAdapter<
        { currentUrl: string },
        { iteration: number; decision: string },
        { candidateId: string; candidateRank: number },
        {
          candidateId: string;
          candidateRank: number;
          iteration: number;
          loopDecision: string;
          stableForMs: number | null;
          currentUrl: string;
        }
      >({
        timeoutMs: 500,
        intervalMs: 1_000,
        stableClearWindowMs: 2_000,
        initialSnapshot: {
          state: { currentUrl: 'https://example.com/challenge' },
          blocked: true,
          currentUrl: 'https://example.com/challenge',
        },
        isPageClosed: () => false,
        wait: async (ms) => {
          now += ms;
        },
        readSnapshot: async () => ({
          state: { currentUrl: 'https://example.com/challenge' },
          blocked: true,
          currentUrl: 'https://example.com/challenge',
        }),
        adapter: createPlaywrightVerificationObservationLoopAdapter({
          buildCaptureParams: ({ iteration, decision, snapshot, stableForMs }, baseParams) => ({
            candidateId: baseParams.candidateId,
            candidateRank: baseParams.candidateRank,
            iteration,
            loopDecision: decision,
            stableForMs,
            currentUrl: snapshot.currentUrl ?? 'unknown',
          }),
        }),
        baseParams: {
          candidateId: 'pin-badge',
          candidateRank: 2,
        },
        captureObservation: async (params) => {
          capturedParams.push(params);
          return { iteration: params.iteration, decision: params.loopDecision };
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          resolved: false,
          finalDecision: 'timeout',
          iterations: 3,
        })
      );
      expect(capturedParams).toEqual([
        {
          candidateId: 'pin-badge',
          candidateRank: 2,
          iteration: 1,
          loopDecision: 'blocked',
          stableForMs: null,
          currentUrl: 'https://example.com/challenge',
        },
        {
          candidateId: 'pin-badge',
          candidateRank: 2,
          iteration: 2,
          loopDecision: 'blocked',
          stableForMs: null,
          currentUrl: 'https://example.com/challenge',
        },
        {
          candidateId: 'pin-badge',
          candidateRank: 2,
          iteration: 3,
          loopDecision: 'timeout',
          stableForMs: null,
          currentUrl: 'https://example.com/challenge',
        },
      ]);
    } finally {
      dateSpy.mockRestore();
    }
  });
});

describe('runPlaywrightVerificationObservationLoopWithProfile', () => {
  it('bridges loop snapshots through a reusable verification loop profile', async () => {
    const dateSpy = vi.spyOn(Date, 'now');
    let now = 10_000;
    dateSpy.mockImplementation(() => now);
    const capturedParams: Array<Record<string, unknown>> = [];

    try {
      const result = await runPlaywrightVerificationObservationLoopWithProfile<
        { currentUrl: string },
        { iteration: number; decision: string },
        { candidateId: string; candidateRank: number },
        {
          candidateId: string;
          candidateRank: number;
          iteration: number;
          loopDecision: string;
          stableForMs: number | null;
          currentUrl: string;
        },
        {
          status: string;
          iteration: number;
          loopDecision: string;
        }
      >({
        timeoutMs: 500,
        intervalMs: 1_000,
        stableClearWindowMs: 2_000,
        initialSnapshot: {
          state: { currentUrl: 'https://example.com/challenge' },
          blocked: true,
          currentUrl: 'https://example.com/challenge',
        },
        isPageClosed: () => false,
        wait: async (ms) => {
          now += ms;
        },
        readSnapshot: async () => ({
          state: { currentUrl: 'https://example.com/challenge' },
          blocked: true,
          currentUrl: 'https://example.com/challenge',
        }),
        profile: createPlaywrightVerificationReviewLoopProfile({
          key: 'google_verification_review',
          subject: 'Google verification screen',
          runningMessage: 'Capturing Google verification screen for AI review.',
          historyArtifactKey: 'google-verification-review-history',
          artifactKeyPrefix: 'google-verification-review',
          evaluationProvider: 'google_lens',
          resolveEvaluationStage: () => 'google_captcha',
          buildArtifactSegments: () => [],
          buildFingerprintPartMap: () => ({}),
          detailDescriptors: [],
          buildLoopCaptureParams: (
            { iteration, decision, snapshot, stableForMs },
            baseParams: { candidateId: string; candidateRank: number }
          ) => ({
            candidateId: baseParams.candidateId,
            candidateRank: baseParams.candidateRank,
            iteration,
            loopDecision: decision,
            stableForMs,
            currentUrl: snapshot.currentUrl ?? 'unknown',
          }),
        }),
        baseParams: {
          candidateId: 'pin-badge',
          candidateRank: 2,
        },
        captureObservation: async (params) => {
          capturedParams.push(params);
          return { iteration: params.iteration, decision: params.loopDecision };
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          resolved: false,
          finalDecision: 'timeout',
          iterations: 3,
        })
      );
      expect(capturedParams).toEqual([
        {
          candidateId: 'pin-badge',
          candidateRank: 2,
          iteration: 1,
          loopDecision: 'blocked',
          stableForMs: null,
          currentUrl: 'https://example.com/challenge',
        },
        {
          candidateId: 'pin-badge',
          candidateRank: 2,
          iteration: 2,
          loopDecision: 'blocked',
          stableForMs: null,
          currentUrl: 'https://example.com/challenge',
        },
        {
          candidateId: 'pin-badge',
          candidateRank: 2,
          iteration: 3,
          loopDecision: 'timeout',
          stableForMs: null,
          currentUrl: 'https://example.com/challenge',
        },
      ]);
    } finally {
      dateSpy.mockRestore();
    }
  });
});

describe('evaluateStructuredPlaywrightScreenshotWithAI', () => {
  it('runs screenshot evaluation and parses structured JSON through the shared helper', async () => {
    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'gemma',
      systemPrompt: null,
      temperature: 0,
    } as never);
    mockedIsBrainModelVisionCapable.mockReturnValue(true);
    mockedRunBrainChatCompletion.mockResolvedValue({
      text: JSON.stringify({ challengeType: 'captcha', manualActionRequired: true }),
      modelId: 'gemma',
    } as never);

    const result = await evaluateStructuredPlaywrightScreenshotWithAI({
      screenshotBase64: Buffer.from('shot').toString('base64'),
      systemPrompt: 'Describe the screenshot.',
      promptPayload: { stage: 'captcha' },
      responseSchema: z.object({
        challengeType: z.string(),
        manualActionRequired: z.boolean(),
      }),
    });

    expect(result).toEqual({
      parsed: { challengeType: 'captcha', manualActionRequired: true },
      rawOutput: JSON.stringify({ challengeType: 'captcha', manualActionRequired: true }),
      modelId: 'gemma',
      error: null,
    });
    expect(mockedRunBrainChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'gemma',
      })
    );
  });

  it('returns a structured error when the screenshot input is missing', async () => {
    const result = await evaluateStructuredPlaywrightScreenshotWithAI({
      screenshotBase64: null,
      systemPrompt: 'Describe the screenshot.',
      responseSchema: z.object({ challengeType: z.string() }),
    });

    expect(result).toEqual({
      parsed: null,
      rawOutput: null,
      modelId: null,
      error: 'Screenshot input is required.',
    });
  });
});

describe('captureAndEvaluatePlaywrightObservation', () => {
  it('captures page state, persists artifacts, and builds an observation through the shared helper', async () => {
    const page = makeMockPage();
    const artifacts = {
      file: vi.fn().mockResolvedValue('/tmp/verification-shot.png'),
      html: vi.fn().mockResolvedValue('/tmp/verification-shot.html'),
    };
    const evaluate = vi.fn().mockResolvedValue({
      status: 'analyzed',
      summary: 'Barrier detected.',
    });

    const result = await captureAndEvaluatePlaywrightObservation({
      page,
      artifacts,
      artifactKey: 'verification-shot',
      extraFingerprintParts: ['provider:generic', 'blocked:true'],
      evaluate,
      buildObservation: ({ capture, review }) => ({
        ...review,
        fingerprint: capture.fingerprint,
        currentUrl: capture.currentUrl,
        screenshotArtifactName: capture.screenshotArtifactName,
        htmlArtifactName: capture.htmlArtifactName,
      }),
    });

    expect(result.deduped).toBe(false);
    expect(result.capture).toEqual(
      expect.objectContaining({
        currentUrl: 'https://example.com/challenge',
        pageTitle: 'Challenge page',
        pageTextSnippet: 'Verify you are human before continuing.',
        screenshotBase64: Buffer.from('mock-screenshot').toString('base64'),
        screenshotArtifactName: 'verification-shot.png',
        htmlArtifactName: 'verification-shot.html',
      })
    );
    expect(artifacts.file).toHaveBeenCalledWith(
      'verification-shot',
      expect.any(Buffer),
      expect.objectContaining({ kind: 'screenshot' })
    );
    expect(artifacts.html).toHaveBeenCalledWith('verification-shot');
    expect(evaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        currentUrl: 'https://example.com/challenge',
        screenshotArtifactName: 'verification-shot.png',
      })
    );
    expect(result.observation).toEqual(
      expect.objectContaining({
        status: 'analyzed',
        fingerprint: expect.any(String),
        currentUrl: 'https://example.com/challenge',
      })
    );
  });

  it('reuses the previous observation when the computed fingerprint is unchanged', async () => {
    const page = makeMockPage();
    const previousObservation = {
      status: 'analyzed',
      fingerprint: 'https://example.com/challenge::Challenge page::Verify you are human before continuing.::provider:generic',
    };
    const evaluate = vi.fn();

    const result = await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'verification-shot',
      previousObservation,
      previousFingerprint: previousObservation.fingerprint,
      extraFingerprintParts: ['provider:generic'],
      evaluate,
      buildObservation: ({ review }) => review,
    });

    expect(result.deduped).toBe(true);
    expect(result.observation).toBe(previousObservation);
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('runs the code injector after evaluation when shouldInject returns true', async () => {
    vi.clearAllMocks();
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html><body>Challenge</body></html>'),
      url: vi.fn().mockReturnValue('https://example.com/challenge'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });
    const evaluate = vi.fn().mockResolvedValue({ status: 'blocked', challengeType: 'captcha' });

    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedRunBrainChatCompletion.mockResolvedValue({
      text: JSON.stringify({ code: '// no-op', done: true, reasoning: 'Clicked solve button.' }),
      modelId: 'claude-sonnet-4-6',
    });

    const result = await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'verification-shot',
      evaluate,
      buildObservation: ({ review }) => review,
      injectOnEvaluation: {
        shouldInject: (review) => review.status === 'blocked',
        goal: 'Resolve the captcha challenge on the page.',
        maxIterations: 1,
        buildEvaluatorContext: (review) =>
          `Status: ${review.status}. Challenge: ${(review as { challengeType?: string }).challengeType ?? 'unknown'}.`,
      },
    });

    expect(result.deduped).toBe(false);
    expect(result.injectionReEvaluated).toBe(false);
    expect(result.injection).toEqual(
      expect.objectContaining({
        attempted: true,
        iterationsRun: 1,
        done: true,
        lastReasoning: 'Clicked solve button.',
        modelId: 'claude-sonnet-4-6',
        finalUrl: 'https://example.com/challenge',
        iterations: expect.arrayContaining([
          expect.objectContaining({
            iteration: 1,
            done: true,
            reasoning: 'Clicked solve button.',
            executionError: null,
          }),
        ]),
      })
    );
    expect(mockedRunBrainChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'text',
                text: expect.stringContaining('Status: blocked. Challenge: captcha.'),
              }),
            ]),
          }),
        ]),
      })
    );
  });

  it('skips injection when shouldInject returns false', async () => {
    vi.clearAllMocks();
    const page = makeMockPage();
    const evaluate = vi.fn().mockResolvedValue({ status: 'clear' });

    const result = await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'verification-shot',
      evaluate,
      buildObservation: ({ review }) => review,
      injectOnEvaluation: {
        shouldInject: (review) => review.status === 'blocked',
        goal: 'Resolve the captcha.',
      },
    });

    expect(result.injection).toBeNull();
    expect(result.injectionReEvaluated).toBe(false);
    expect(mockedRunBrainChatCompletion).not.toHaveBeenCalled();
  });

  it('sends a multimodal message when the model is vision-capable', async () => {
    vi.clearAllMocks();
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html><body>Challenge</body></html>'),
      url: vi.fn().mockReturnValue('https://example.com/challenge'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });
    const evaluate = vi.fn().mockResolvedValue({ status: 'blocked' });

    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedIsBrainModelVisionCapable.mockReturnValue(true);
    mockedRunBrainChatCompletion.mockResolvedValue({
      text: JSON.stringify({ code: '', done: true, reasoning: 'Done.' }),
      modelId: 'claude-sonnet-4-6',
    });

    await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'verification-shot',
      evaluate,
      buildObservation: ({ review }) => review,
      injectOnEvaluation: {
        shouldInject: () => true,
        goal: 'Solve it.',
        maxIterations: 1,
      },
    });

    expect(mockedRunBrainChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({ type: 'image_url' }),
              expect.objectContaining({ type: 'text' }),
            ]),
          }),
        ]),
      })
    );
  });

  it('re-captures and re-evaluates after injection when reEvaluateAfterInjection is true', async () => {
    vi.clearAllMocks();
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html><body>Challenge</body></html>'),
      url: vi.fn()
        .mockReturnValueOnce('https://example.com/challenge')
        .mockReturnValue('https://example.com/resolved'),
      title: vi.fn()
        .mockResolvedValueOnce('Challenge page')
        .mockResolvedValue('Resolved page'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });
    const evaluate = vi
      .fn()
      .mockResolvedValueOnce({ status: 'blocked' })
      .mockResolvedValueOnce({ status: 'clear' });

    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedRunBrainChatCompletion.mockResolvedValue({
      text: JSON.stringify({ code: '', done: true, reasoning: 'Challenge resolved.' }),
      modelId: 'claude-sonnet-4-6',
    });

    const result = await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'verification-shot',
      evaluate,
      buildObservation: ({ review }) => review,
      injectOnEvaluation: {
        shouldInject: (review) => review.status === 'blocked',
        goal: 'Resolve the challenge.',
        maxIterations: 1,
        reEvaluateAfterInjection: true,
      },
    });

    expect(result.injection).not.toBeNull();
    expect(result.injectionReEvaluated).toBe(true);
    expect(result.review).toEqual(expect.objectContaining({ status: 'clear' }));
    expect(result.capture.currentUrl).toBe('https://example.com/resolved');
    expect(evaluate).toHaveBeenCalledTimes(2);
  });

  it('recovers from code execution error and passes the error to the next iteration', async () => {
    vi.clearAllMocks();
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html><body>Challenge</body></html>'),
      url: vi.fn().mockReturnValue('https://example.com/challenge'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });
    const evaluate = vi.fn().mockResolvedValue({ status: 'blocked' });

    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedRunBrainChatCompletion
      .mockResolvedValueOnce({
        text: JSON.stringify({ code: 'throw new Error("bad selector")', done: false, reasoning: 'First attempt.' }),
        modelId: 'claude-sonnet-4-6',
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({ code: '', done: true, reasoning: 'Fixed approach.' }),
        modelId: 'claude-sonnet-4-6',
      });

    const result = await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'verification-shot',
      evaluate,
      buildObservation: ({ review }) => review,
      injectOnEvaluation: {
        shouldInject: () => true,
        goal: 'Solve the challenge.',
        maxIterations: 2,
      },
    });

    expect(result.injection).toEqual(
      expect.objectContaining({ iterationsRun: 2, done: true })
    );
    expect(result.injection?.iterations[0]).toEqual(
      expect.objectContaining({ iteration: 1, executionError: expect.stringContaining('bad selector'), done: false })
    );
    expect(result.injection?.iterations[1]).toEqual(
      expect.objectContaining({ iteration: 2, executionError: null, done: true })
    );
    const secondCallArgs = mockedRunBrainChatCompletion.mock.calls[1]?.[0] as {
      messages: Array<{ role: string; content: string | Array<{ text?: string }> }>;
    };
    const userMessages = secondCallArgs?.messages?.filter((m) => m.role === 'user') ?? [];
    // With conversation history enabled the last user entry is the current iteration's message
    const lastUserContent = userMessages[userMessages.length - 1]?.content;
    const textPayload =
      typeof lastUserContent === 'string'
        ? lastUserContent
        : (lastUserContent as Array<{ text?: string }>)?.find((p) => p.text)?.text ?? '';
    expect(textPayload).toContain('Prior execution error');
    expect(textPayload).toContain('bad selector');
  });

  it('calls the log callback on each injection iteration', async () => {
    vi.clearAllMocks();
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html><body>Challenge</body></html>'),
      url: vi.fn().mockReturnValue('https://example.com/challenge'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });
    const evaluate = vi.fn().mockResolvedValue({ status: 'blocked' });
    const logMessages: string[] = [];

    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedRunBrainChatCompletion
      .mockResolvedValueOnce({
        text: JSON.stringify({ code: '', done: false, reasoning: 'Step 1.' }),
        modelId: 'claude-sonnet-4-6',
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({ code: '', done: true, reasoning: 'Step 2 done.' }),
        modelId: 'claude-sonnet-4-6',
      });

    await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'verification-shot',
      evaluate,
      buildObservation: ({ review }) => review,
      injectOnEvaluation: {
        shouldInject: () => true,
        goal: 'Solve it.',
        maxIterations: 2,
        log: (msg) => logMessages.push(msg),
      },
    });

    expect(logMessages).toHaveLength(2);
    expect(logMessages[0]).toContain('1/2');
    expect(logMessages[1]).toContain('2/2');
  });

  it('waits for domcontentloaded when the URL changes after code execution', async () => {
    vi.clearAllMocks();
    let urlCallCount = 0;
    const waitForLoadStateMock = vi.fn().mockResolvedValue(undefined);
    const waitForTimeoutMock = vi.fn().mockResolvedValue(undefined);
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html><body>Challenge</body></html>'),
      // First call (captureAndEvaluatePlaywrightObservation initial safePageUrl) returns 'before';
      // all subsequent calls (post-execution inside the loop) return 'after'.
      url: vi.fn().mockImplementation(() => {
        urlCallCount++;
        return urlCallCount <= 1 ? 'https://example.com/before' : 'https://example.com/after';
      }),
      waitForTimeout: waitForTimeoutMock,
      waitForLoadState: waitForLoadStateMock,
    });
    const evaluate = vi.fn().mockResolvedValue({ status: 'blocked' });

    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedRunBrainChatCompletion
      .mockResolvedValueOnce({
        text: JSON.stringify({ code: '// navigate', done: false, reasoning: 'Navigating.' }),
        modelId: 'claude-sonnet-4-6',
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({ code: '', done: true, reasoning: 'Done.' }),
        modelId: 'claude-sonnet-4-6',
      });

    await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'verification-shot',
      evaluate,
      buildObservation: ({ review }) => review,
      injectOnEvaluation: {
        shouldInject: () => true,
        goal: 'Navigate and solve.',
        maxIterations: 2,
      },
    });

    expect(waitForLoadStateMock).toHaveBeenCalledWith('domcontentloaded', expect.objectContaining({ timeout: 5000 }));
    expect(waitForTimeoutMock).not.toHaveBeenCalled();
  });

  it('aborts when the AI generates the same code twice (duplicate detection)', async () => {
    vi.clearAllMocks();
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html><body>Challenge</body></html>'),
      url: vi.fn().mockReturnValue('https://example.com/challenge'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });
    const evaluate = vi.fn().mockResolvedValue({ status: 'blocked' });
    const duplicateCode = 'await page.click("#submit");';

    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedRunBrainChatCompletion
      .mockResolvedValueOnce({
        text: JSON.stringify({ code: duplicateCode, done: false, reasoning: 'Clicking submit.' }),
        modelId: 'claude-sonnet-4-6',
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({ code: duplicateCode, done: false, reasoning: 'Clicking submit again.' }),
        modelId: 'claude-sonnet-4-6',
      });

    const result = await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'verification-shot',
      evaluate,
      buildObservation: ({ review }) => review,
      injectOnEvaluation: {
        shouldInject: () => true,
        goal: 'Solve the captcha.',
        maxIterations: 3,
      },
    });

    expect(result.injection?.iterationsRun).toBe(2);
    expect(result.injection?.done).toBe(false);
    expect(result.injection?.lastReasoning).toContain('Duplicate code');
    expect(mockedRunBrainChatCompletion).toHaveBeenCalledTimes(2);
  });

  it('calls onIterationResult with a typed record for each injection iteration', async () => {
    vi.clearAllMocks();
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html><body>Challenge</body></html>'),
      url: vi.fn().mockReturnValue('https://example.com/challenge'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });
    const evaluate = vi.fn().mockResolvedValue({ status: 'blocked' });
    const records: unknown[] = [];

    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedRunBrainChatCompletion
      .mockResolvedValueOnce({
        text: JSON.stringify({ code: '// step A', done: false, reasoning: 'Step A.' }),
        modelId: 'claude-sonnet-4-6',
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({ code: '', done: true, reasoning: 'Step B done.' }),
        modelId: 'claude-sonnet-4-6',
      });

    await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'verification-shot',
      evaluate,
      buildObservation: ({ review }) => review,
      injectOnEvaluation: {
        shouldInject: () => true,
        goal: 'Solve it.',
        maxIterations: 2,
        onIterationResult: (rec) => records.push(rec),
      },
    });

    expect(records).toHaveLength(2);
    expect(records[0]).toEqual(
      expect.objectContaining({ iteration: 1, reasoning: 'Step A.', executionError: null })
    );
    expect(records[1]).toEqual(
      expect.objectContaining({ iteration: 2, reasoning: 'Step B done.', done: true })
    );
  });

  it('includes all iteration records in the injection result', async () => {
    vi.clearAllMocks();
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html><body>Challenge</body></html>'),
      url: vi.fn().mockReturnValue('https://example.com/challenge'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });
    const evaluate = vi.fn().mockResolvedValue({ status: 'blocked' });

    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedRunBrainChatCompletion
      .mockResolvedValueOnce({
        text: JSON.stringify({ code: '// step 1', done: false, reasoning: 'Step 1.' }),
        modelId: 'claude-sonnet-4-6',
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({ code: '// step 2', done: true, reasoning: 'Step 2.' }),
        modelId: 'claude-sonnet-4-6',
      });

    const result = await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'verification-shot',
      evaluate,
      buildObservation: ({ review }) => review,
      injectOnEvaluation: {
        shouldInject: () => true,
        goal: 'Solve it.',
        maxIterations: 2,
      },
    });

    expect(result.injection?.iterations).toHaveLength(2);
    expect(result.injection?.iterations[0]).toEqual(
      expect.objectContaining({ iteration: 1, code: '// step 1', done: false, executionError: null })
    );
    expect(result.injection?.iterations[1]).toEqual(
      expect.objectContaining({ iteration: 2, code: '// step 2', done: true, executionError: null })
    );
  });

  it('builds a multi-turn conversation across iterations by default', async () => {
    vi.clearAllMocks();
    mockedIsBrainModelVisionCapable.mockReturnValue(false);
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html><body>Challenge</body></html>'),
      url: vi.fn().mockReturnValue('https://example.com/challenge'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });
    const evaluate = vi.fn().mockResolvedValue({ status: 'blocked' });

    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedRunBrainChatCompletion
      .mockResolvedValueOnce({
        text: JSON.stringify({ code: '// step 1', done: false, reasoning: 'Step 1.' }),
        modelId: 'claude-sonnet-4-6',
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({ code: '', done: true, reasoning: 'Done.' }),
        modelId: 'claude-sonnet-4-6',
      });

    const result = await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'verification-shot',
      evaluate,
      buildObservation: ({ review }) => review,
      injectOnEvaluation: {
        shouldInject: () => true,
        goal: 'Solve it.',
        maxIterations: 2,
      },
    });

    // Second call should include the first user message and assistant response as history
    const secondCallArgs = mockedRunBrainChatCompletion.mock.calls[1]?.[0] as {
      messages: Array<{ role: string; content: string }>;
    };
    const userMessages = secondCallArgs?.messages?.filter((m) => m.role === 'user') ?? [];
    const assistantMessages = secondCallArgs?.messages?.filter((m) => m.role === 'assistant') ?? [];
    expect(userMessages.length).toBe(2);
    expect(assistantMessages.length).toBe(1);
    // History user message (iter 1) should contain 'Goal:'
    expect(userMessages[0]?.content).toContain('Goal:');
    // Current user message (iter 2) should be a continuation
    expect(userMessages[1]?.content).toContain('Continuation');
    expect(userMessages[1]?.content).not.toContain('Prior AI Evaluator output');
    // History assistant entry should be the raw JSON from iter 1
    expect(assistantMessages[0]?.content).toContain('step 1');
    // Result should expose the full conversation history
    expect(result.injection?.conversationHistory).toHaveLength(4); // 2 user + 2 assistant
  });

  it('omits conversation history when useConversationHistory is false', async () => {
    vi.clearAllMocks();
    mockedIsBrainModelVisionCapable.mockReturnValue(false);
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html><body>Challenge</body></html>'),
      url: vi.fn().mockReturnValue('https://example.com/challenge'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });
    const evaluate = vi.fn().mockResolvedValue({ status: 'blocked' });

    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedRunBrainChatCompletion
      .mockResolvedValueOnce({
        text: JSON.stringify({ code: '// step 1', done: false, reasoning: 'Step 1.' }),
        modelId: 'claude-sonnet-4-6',
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({ code: '', done: true, reasoning: 'Done.' }),
        modelId: 'claude-sonnet-4-6',
      });

    const result = await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'verification-shot',
      evaluate,
      buildObservation: ({ review }) => review,
      injectOnEvaluation: {
        shouldInject: () => true,
        goal: 'Solve it.',
        maxIterations: 2,
        useConversationHistory: false,
      },
    });

    const secondCallArgs = mockedRunBrainChatCompletion.mock.calls[1]?.[0] as {
      messages: Array<{ role: string; content: string }>;
    };
    const userMessages = secondCallArgs?.messages?.filter((m) => m.role === 'user') ?? [];
    const assistantMessages = secondCallArgs?.messages?.filter((m) => m.role === 'assistant') ?? [];
    // Single-turn: only the current user message, no history
    expect(userMessages.length).toBe(1);
    expect(assistantMessages.length).toBe(0);
    // Falls back to priorInjectorReasoning in the message
    expect(userMessages[0]?.content).toContain('Prior injector reasoning');
    expect(result.injection?.conversationHistory).toHaveLength(0);
  });

  it('aborts the injection loop when timeoutMs is exceeded', async () => {
    vi.clearAllMocks();
    const dateSpy = vi.spyOn(Date, 'now');
    let now = 1_000;
    dateSpy.mockImplementation(() => now);

    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html/>'),
      url: vi.fn().mockReturnValue('https://example.com/challenge'),
      waitForTimeout: vi.fn().mockImplementation(async (ms: number) => { now += ms; }),
    });
    const evaluate = vi.fn().mockResolvedValue({ status: 'blocked' });

    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedRunBrainChatCompletion.mockImplementation(async () => {
      now += 600;
      return { text: JSON.stringify({ code: '', done: false, reasoning: 'Trying.' }), modelId: 'claude-sonnet-4-6' };
    });

    try {
      const result = await captureAndEvaluatePlaywrightObservation({
        page,
        artifactKey: 'shot',
        evaluate,
        buildObservation: ({ review }) => review,
        injectOnEvaluation: {
          shouldInject: () => true,
          goal: 'Solve it.',
          maxIterations: 5,
          timeoutMs: 1_000,
        },
      });

      expect(result.injection?.done).toBe(false);
      expect(result.injection?.lastReasoning).toContain('timed out');
      expect(result.injection?.iterationsRun).toBeLessThan(5);
    } finally {
      dateSpy.mockRestore();
    }
  });

  it('saves a JSON artifact with injection history after the loop', async () => {
    vi.clearAllMocks();
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html/>'),
      url: vi.fn().mockReturnValue('https://example.com/challenge'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });
    const evaluate = vi.fn().mockResolvedValue({ status: 'blocked' });
    const jsonArtifacts: Record<string, unknown> = {};

    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedRunBrainChatCompletion.mockResolvedValue({
      text: JSON.stringify({ code: '', done: true, reasoning: 'Done.' }),
      modelId: 'claude-sonnet-4-6',
    });

    await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'verification-shot',
      evaluate,
      buildObservation: ({ review }) => review,
      artifacts: {
        json: async (key, data) => { jsonArtifacts[key] = data; },
      },
      injectOnEvaluation: {
        shouldInject: () => true,
        goal: 'Solve it.',
        maxIterations: 1,
      },
    });

    expect(jsonArtifacts).toHaveProperty('verification-shot-inject-history');
    expect(jsonArtifacts['verification-shot-inject-history']).toEqual(
      expect.arrayContaining([expect.objectContaining({ iteration: 1 })])
    );
  });

  it('forwards parent artifactKey and artifacts to the injection loop for per-iteration screenshots', async () => {
    vi.clearAllMocks();
    mockedIsBrainModelVisionCapable.mockReturnValue(false);
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html></html>'),
      url: vi.fn().mockReturnValue('https://example.com'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });
    const evaluate = vi.fn().mockResolvedValue({ status: 'blocked' });

    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedRunBrainChatCompletion.mockResolvedValue({
      text: JSON.stringify({ code: '// act', done: true, reasoning: 'Injected.' }),
      modelId: 'claude-sonnet-4-6',
    });

    const savedFiles: string[] = [];
    const savedHtml: string[] = [];

    const result = await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'obs-key',
      evaluate,
      buildObservation: ({ review }) => review,
      artifacts: {
        file: async (key) => {
          savedFiles.push(key);
          return `${key}.png`;
        },
        html: async (key) => { savedHtml.push(key); return `${key}.html`; },
      },
      injectOnEvaluation: {
        shouldInject: () => true,
        goal: 'Solve it.',
        maxIterations: 1,
        // No artifactKey/artifacts set on inject config — should be forwarded from parent
      },
    });

    // The injection loop should have saved screenshot and HTML with the forwarded artifactKey
    expect(savedFiles.some((k) => k.startsWith('obs-key-inject-iter-'))).toBe(true);
    expect(savedHtml.some((k) => k.startsWith('obs-key-inject-iter-'))).toBe(true);
    // Iteration record should have both artifact names populated
    expect(result.injection?.iterations[0]!.screenshotArtifactName).toMatch(/obs-key-inject-iter-1\.png/);
    expect(result.injection?.iterations[0]!.htmlArtifactName).toMatch(/obs-key-inject-iter-1\.html/);
  });

  it('saves a post-inject HTML artifact when reEvaluateAfterInjection is true', async () => {
    vi.clearAllMocks();
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html/>'),
      url: vi.fn().mockReturnValue('https://example.com/after'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });
    const evaluate = vi.fn()
      .mockResolvedValueOnce({ status: 'blocked' })
      .mockResolvedValueOnce({ status: 'clear' });
    const htmlArtifacts: string[] = [];

    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedRunBrainChatCompletion.mockResolvedValue({
      text: JSON.stringify({ code: '', done: true, reasoning: 'Done.' }),
      modelId: 'claude-sonnet-4-6',
    });

    await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'verification-shot',
      evaluate,
      buildObservation: ({ review }) => review,
      artifacts: {
        html: async (key) => { htmlArtifacts.push(key); return `${key}.html`; },
      },
      injectOnEvaluation: {
        shouldInject: (r) => r.status === 'blocked',
        goal: 'Solve it.',
        maxIterations: 1,
        reEvaluateAfterInjection: true,
      },
    });

    expect(htmlArtifacts).toContain('verification-shot');
    expect(htmlArtifacts).toContain('verification-shot-post-inject');
  });

  it('exits injection loop without code generation when evaluateCapture reports done', async () => {
    vi.clearAllMocks();
    mockedIsBrainModelVisionCapable.mockReturnValue(false);
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html><body>Solved</body></html>'),
      url: vi.fn().mockReturnValue('https://example.com/solved'),
    });
    const evaluate = vi.fn().mockResolvedValue({ status: 'blocked' });

    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });

    const result = await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'v-shot',
      evaluate,
      buildObservation: ({ review }) => review,
      injectOnEvaluation: {
        shouldInject: () => true,
        goal: 'Solve challenge.',
        maxIterations: 5,
        evaluateCapture: async () => ({
          context: 'Challenge already gone.',
          done: true,
          reasoning: 'Captcha solved between iterations.',
        }),
      },
    });

    expect(result.injection?.done).toBe(true);
    expect(result.injection?.iterationsRun).toBe(1);
    expect(result.injection?.iterations[0]).toMatchObject({
      iteration: 1,
      code: '',
      done: true,
      reasoning: 'Captcha solved between iterations.',
      executionError: null,
    });
    expect(mockedRunBrainChatCompletion).not.toHaveBeenCalled();
  });

  it('populates evaluation field in iteration records when evaluateCapture is provided', async () => {
    vi.clearAllMocks();
    mockedIsBrainModelVisionCapable.mockReturnValue(false);
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html></html>'),
      url: vi.fn().mockReturnValue('https://example.com'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });
    const evaluate = vi.fn().mockResolvedValue({ status: 'blocked' });

    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedRunBrainChatCompletion.mockResolvedValue({
      text: JSON.stringify({ code: '// act', done: true, reasoning: 'Injected.' }),
      modelId: 'claude-sonnet-4-6',
    });

    let captureCallCount = 0;
    const result = await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'v-shot',
      evaluate,
      buildObservation: ({ review }) => review,
      injectOnEvaluation: {
        shouldInject: () => true,
        goal: 'Solve challenge.',
        maxIterations: 1,
        evaluateCapture: async () => {
          captureCallCount++;
          return { context: `Eval context #${captureCallCount}.`, done: false };
        },
      },
    });

    expect(result.injection?.iterations[0]!.evaluation).toMatchObject({
      done: false,
      context: 'Eval context #1.',
    });
  });

  it('passes fresh evaluateCapture context into the code-generator user message', async () => {
    vi.clearAllMocks();
    mockedIsBrainModelVisionCapable.mockReturnValue(false);
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html></html>'),
      url: vi.fn().mockReturnValue('https://example.com'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });
    const evaluate = vi.fn().mockResolvedValue({ status: 'blocked' });

    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedRunBrainChatCompletion.mockResolvedValue({
      text: JSON.stringify({ code: '', done: true, reasoning: 'Done.' }),
      modelId: 'claude-sonnet-4-6',
    });

    let evalCallCount = 0;
    await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'v-shot',
      evaluate,
      buildObservation: ({ review }) => review,
      injectOnEvaluation: {
        shouldInject: () => true,
        goal: 'Solve it.',
        maxIterations: 1,
        evaluateCapture: async () => {
          evalCallCount++;
          return { context: `Per-iteration context #${evalCallCount}.`, done: false };
        },
      },
    });

    const userMsg = (mockedRunBrainChatCompletion.mock.calls[0]![0] as {
      messages: Array<{ role: string; content: string }>;
    }).messages.find((m) => m.role === 'user')!.content;

    expect(userMsg).toContain('Per-iteration context #1.');
  });

  it('evaluateCapture is called on continuation turns and fresh context appears in every message', async () => {
    vi.clearAllMocks();
    mockedIsBrainModelVisionCapable.mockReturnValue(false);
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html></html>'),
      url: vi.fn().mockReturnValue('https://example.com'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });
    const evaluate = vi.fn().mockResolvedValue({ status: 'blocked' });

    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedRunBrainChatCompletion
      .mockResolvedValueOnce({
        text: JSON.stringify({ code: '// step', done: false, reasoning: 'Step 1.' }),
        modelId: 'claude-sonnet-4-6',
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({ code: '// final', done: true, reasoning: 'Done.' }),
        modelId: 'claude-sonnet-4-6',
      });

    let iterCount = 0;
    await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'v-shot',
      evaluate,
      buildObservation: ({ review }) => review,
      injectOnEvaluation: {
        shouldInject: () => true,
        goal: 'Do it.',
        maxIterations: 2,
        useConversationHistory: true,
        evaluateCapture: async () => {
          iterCount++;
          return { context: `Fresh context iter ${iterCount}.`, done: false };
        },
      },
    });

    const firstUser = (mockedRunBrainChatCompletion.mock.calls[0]![0] as {
      messages: Array<{ role: string; content: string }>;
    }).messages.find((m) => m.role === 'user')!.content;

    // second call is continuation — fresh context must still be present
    const secondUser = (mockedRunBrainChatCompletion.mock.calls[1]![0] as {
      messages: Array<{ role: string; content: string }>;
    }).messages.filter((m) => m.role === 'user').at(-1)!.content;

    expect(firstUser).toContain('Fresh context iter 1.');
    expect(secondUser).toContain('Fresh context iter 2.');
    expect(secondUser).toContain('Continuation');
  });
});

describe('buildPlaywrightVerificationReviewDetailsWithAdapter', () => {
  it('merges common review details with adapter-provided provider details', () => {
    const details = buildPlaywrightVerificationReviewDetailsWithAdapter(
      {
        iteration: 2,
        observedAt: '2026-04-18T19:00:00.000Z',
        loopDecision: 'blocked',
        stableForMs: null,
        status: 'analyzed',
        challengeType: 'captcha',
        visibleQuestion: 'Verify you are human',
        manualActionRequired: true,
        modelId: 'gemma',
        screenshotArtifactName: 'shot.png',
        htmlArtifactName: 'page.html',
        error: null,
      },
      (review) => [
        { label: 'Blocked', value: review.loopDecision === 'blocked' ? 'true' : 'false' },
      ]
    );

    expect(details).toEqual(
      expect.arrayContaining([
        { label: 'Observation iteration', value: '2' },
        { label: 'Loop decision', value: 'blocked' },
        { label: 'Blocked', value: 'true' },
        { label: 'Review status', value: 'analyzed' },
        { label: 'Challenge type', value: 'captcha' },
      ])
    );
  });
});

describe('buildPlaywrightVerificationReviewExtraDetailsFromDescriptors', () => {
  it('builds provider extra details from declarative descriptors', () => {
    expect(
      buildPlaywrightVerificationReviewExtraDetailsFromDescriptors(
        {
          iteration: 2,
          observedAt: '2026-04-18T19:00:00.000Z',
          loopDecision: 'blocked',
          stableForMs: null,
          status: 'analyzed',
          challengeType: 'captcha',
          visibleQuestion: 'Verify you are human',
          manualActionRequired: true,
          modelId: 'gemma',
          screenshotArtifactName: 'shot.png',
          htmlArtifactName: 'page.html',
          error: null,
          blocked: true,
          barrierKind: 'captcha',
        },
        [
          { label: 'Blocked', value: 'blocked' },
          { label: 'Barrier kind', value: 'barrierKind' },
        ]
      )
    ).toEqual([
      { label: 'Blocked', value: 'true' },
      { label: 'Barrier kind', value: 'captcha' },
    ]);
  });
});

describe('buildPlaywrightVerificationReviewDetailsWithDescriptors', () => {
  it('merges common review details with declarative provider descriptors', () => {
    const details = buildPlaywrightVerificationReviewDetailsWithDescriptors(
      {
        iteration: 2,
        observedAt: '2026-04-18T19:00:00.000Z',
        loopDecision: 'blocked',
        stableForMs: null,
        status: 'analyzed',
        challengeType: 'captcha',
        visibleQuestion: 'Verify you are human',
        manualActionRequired: true,
        modelId: 'gemma',
        screenshotArtifactName: 'shot.png',
        htmlArtifactName: 'page.html',
        error: null,
        blocked: true,
      },
      [{ label: 'Blocked', value: 'blocked' }]
    );

    expect(details).toEqual(
      expect.arrayContaining([
        { label: 'Observation iteration', value: '2' },
        { label: 'Blocked', value: 'true' },
        { label: 'Review status', value: 'analyzed' },
      ])
    );
  });
});

describe('createPlaywrightVerificationReviewProfile', () => {
  it('builds a combined review profile with runtime, capture config, details, and log key', () => {
    const profile = createPlaywrightVerificationReviewProfile({
      key: 'google_verification_review',
      subject: 'Google verification screen',
      runningMessage: 'Capturing Google verification screen for AI review.',
      historyArtifactKey: 'google-verification-review-history',
      artifactKeyPrefix: 'google-verification-review',
      analysisFailureLogKey: 'google.verification.review.analysis_failed',
      screenshotFailureLogKey: 'google.verification.review.screenshot_failed',
      evaluationProvider: 'google_lens',
      resolveEvaluationStage: () => 'google_captcha',
      evaluationObjective: 'Describe the visible Google verification barrier.',
      buildArtifactSegments: (params: { candidateId: string }) => [params.candidateId],
      buildFingerprintPartMap: (params: { candidateId: string }) => ({
        candidateId: params.candidateId,
      }),
      detailDescriptors: [{ label: 'Captcha detected', value: 'challengeType' }],
    });

    expect(profile).toEqual({
      runtime: {
        step: {
          key: 'google_verification_review',
          runningMessage: 'Capturing Google verification screen for AI review.',
          messages: {
            analyzed:
              'Captured and classified the Google verification screen for manual review.',
            captureOnly:
              'Captured the Google verification screen, but AI review was unavailable.',
            failed: 'Could not capture the Google verification screen for AI review.',
          },
        },
        artifacts: {
          historyArtifactKey: 'google-verification-review-history',
          artifactKeyPrefix: 'google-verification-review',
          analysisArtifactSuffix: '-analysis',
        },
      },
      capture: {
        runtime: {
          step: {
            key: 'google_verification_review',
            runningMessage: 'Capturing Google verification screen for AI review.',
            messages: {
              analyzed:
                'Captured and classified the Google verification screen for manual review.',
              captureOnly:
                'Captured the Google verification screen, but AI review was unavailable.',
              failed: 'Could not capture the Google verification screen for AI review.',
            },
          },
          artifacts: {
            historyArtifactKey: 'google-verification-review-history',
            artifactKeyPrefix: 'google-verification-review',
            analysisArtifactSuffix: '-analysis',
          },
        },
        buildArtifactSegments: expect.any(Function),
        buildFingerprintPartMap: expect.any(Function),
      },
      evaluation: {
        provider: 'google_lens',
        resolveStage: expect.any(Function),
        objective: 'Describe the visible Google verification barrier.',
      },
      observation: {
        buildExtra: expect.any(Function),
      },
      detailDescriptors: [{ label: 'Captcha detected', value: 'challengeType' }],
      analysisFailureLogKey: 'google.verification.review.analysis_failed',
      screenshotFailureLogKey: 'google.verification.review.screenshot_failed',
    });
  });
});

describe('createPlaywrightVerificationReviewLoopProfile', () => {
  it('combines the review profile and loop adapter into one reusable config', () => {
    const loopProfile = createPlaywrightVerificationReviewLoopProfile<
      { currentUrl: string },
      { candidateId: string; candidateRank: number },
      {
        candidateId: string;
        candidateRank: number;
        iteration: number;
        loopDecision: string;
        stableForMs: number | null;
        currentUrl: string;
      },
      {
        status: string;
        iteration: number;
        loopDecision: string;
      }
    >({
      key: 'google_verification_review',
      subject: 'Google verification screen',
      runningMessage: 'Capturing Google verification screen for AI review.',
      historyArtifactKey: 'google-verification-review-history',
      artifactKeyPrefix: 'google-verification-review',
      screenshotFailureLogKey: 'google.verification.review.screenshot_failed',
      evaluationProvider: 'google_lens',
      resolveEvaluationStage: () => 'google_captcha',
      buildArtifactSegments: (params) => [params.candidateId],
      buildFingerprintPartMap: (params) => ({
        candidateId: params.candidateId,
      }),
      detailDescriptors: [],
      buildLoopCaptureParams: (
        { iteration, decision, snapshot, stableForMs },
        baseParams
      ) => ({
        candidateId: baseParams.candidateId,
        candidateRank: baseParams.candidateRank,
        iteration,
        loopDecision: decision,
        stableForMs,
        currentUrl: snapshot.currentUrl ?? 'unknown',
      }),
    });

    expect(loopProfile.review.screenshotFailureLogKey).toBe(
      'google.verification.review.screenshot_failed'
    );
    expect(
      loopProfile.adapter.buildCaptureParams(
        {
          iteration: 2,
          decision: 'blocked',
          snapshot: {
            state: { currentUrl: 'https://example.com/challenge' },
            blocked: true,
            currentUrl: 'https://example.com/challenge',
          },
          stableForMs: null,
        },
        {
          candidateId: 'pin-badge',
          candidateRank: 2,
        }
      )
    ).toEqual({
      candidateId: 'pin-badge',
      candidateRank: 2,
      iteration: 2,
      loopDecision: 'blocked',
      stableForMs: null,
      currentUrl: 'https://example.com/challenge',
    });
  });
});

describe('buildPlaywrightVerificationReviewDetailsFromProfile', () => {
  it('builds common and provider details from a shared review profile', () => {
    const details = buildPlaywrightVerificationReviewDetailsFromProfile(
      {
        iteration: 2,
        observedAt: '2026-04-18T19:00:00.000Z',
        loopDecision: 'blocked',
        stableForMs: null,
        status: 'analyzed',
        challengeType: 'captcha',
        visibleQuestion: 'Verify you are human',
        manualActionRequired: true,
        modelId: 'gemma',
        screenshotArtifactName: 'shot.png',
        htmlArtifactName: 'page.html',
        error: null,
        blocked: true,
      },
      createPlaywrightVerificationReviewProfile({
        key: 'supplier_verification_review',
        subject: 'supplier verification barrier',
        runningMessage: 'Capturing supplier verification barrier for AI review.',
        historyArtifactKey: '1688-verification-review-history',
        artifactKeyPrefix: '1688-verification-review',
        evaluationProvider: '1688',
        resolveEvaluationStage: () => '1688_barrier',
        buildObservationExtra: () => ({ blocked: true }),
        buildArtifactSegments: () => [],
        buildFingerprintPartMap: () => ({}),
        detailDescriptors: [{ label: 'Blocked', value: 'blocked' }],
      })
    );

    expect(details).toEqual(
      expect.arrayContaining([
        { label: 'Observation iteration', value: '2' },
        { label: 'Blocked', value: 'true' },
        { label: 'Review status', value: 'analyzed' },
      ])
    );
  });
});

describe('createPlaywrightVerificationReviewStepMessages', () => {
  it('builds the standard analyzed/capture-only/failed message set for a subject', () => {
    expect(createPlaywrightVerificationReviewStepMessages('Google verification screen')).toEqual({
      analyzed: 'Captured and classified the Google verification screen for manual review.',
      captureOnly:
        'Captured the Google verification screen, but AI review was unavailable.',
      failed: 'Could not capture the Google verification screen for AI review.',
    });
  });
});

describe('createPlaywrightVerificationReviewArtifactConfig', () => {
  it('builds the standard artifact config and resolves concrete keys', () => {
    const config = createPlaywrightVerificationReviewArtifactConfig({
      historyArtifactKey: 'google-verification-review-history',
      artifactKeyPrefix: 'google-verification-review',
    });

    expect(config).toEqual({
      historyArtifactKey: 'google-verification-review-history',
      artifactKeyPrefix: 'google-verification-review',
      analysisArtifactSuffix: '-analysis',
    });
    expect(
      resolvePlaywrightVerificationReviewArtifactKeys(
        'google-verification-review-rank-1',
        config
      )
    ).toEqual({
      analysisArtifactKey: 'google-verification-review-rank-1-analysis',
      historyArtifactKey: 'google-verification-review-history',
    });
  });
});

describe('buildPlaywrightVerificationReviewArtifactKey', () => {
  it('builds the prefixed artifact key from normalized segments', () => {
    expect(
      buildPlaywrightVerificationReviewArtifactKey(
        { artifactKeyPrefix: '1688-verification-review' },
        ['supplier-open', 'pin-badge', 'rank-1', 'iter-2']
      )
    ).toBe('1688-verification-review-supplier-open-pin-badge-rank-1-iter-2');
  });
});

describe('resolvePlaywrightVerificationReviewCaptureContext', () => {
  it('builds the shared artifact key and fingerprint parts from declarative capture config', () => {
    expect(
      resolvePlaywrightVerificationReviewCaptureContext(
        {
          runtime: createPlaywrightVerificationReviewRuntimeConfig({
            key: 'google_verification_review',
            subject: 'Google verification screen',
            runningMessage: 'Capturing Google verification screen for AI review.',
            historyArtifactKey: 'google-verification-review-history',
            artifactKeyPrefix: 'google-verification-review',
          }),
          buildArtifactSegments: (params: {
            candidateId: string;
            candidateRank: number;
            iteration: number;
          }) => [params.candidateId, `rank-${params.candidateRank}`, `iter-${params.iteration}`],
          buildFingerprintPartMap: (params: {
            candidateId: string;
            candidateRank: number;
            captchaDetected: boolean;
          }) => ({
            candidateId: params.candidateId,
            candidateRank: params.candidateRank,
            captchaDetected: params.captchaDetected,
          }),
        },
        {
          candidateId: 'pin-badge',
          candidateRank: 2,
          iteration: 4,
          captchaDetected: true,
        }
      )
    ).toEqual({
      artifactKey: 'google-verification-review-pin-badge-rank-2-iter-4',
      extraFingerprintParts: [
        'candidateId=pin-badge',
        'candidateRank=2',
        'captchaDetected=true',
      ],
    });
  });
});

describe('createPlaywrightVerificationObservation', () => {
  it('builds the shared observation shape from review, capture, and provider extras', () => {
    expect(
      createPlaywrightVerificationObservation({
        review: {
          status: 'analyzed',
          challengeType: 'captcha',
          manualActionRequired: true,
        },
        capture: {
          observedAt: '2026-04-18T19:00:00.000Z',
          fingerprint: 'fingerprint-1',
        },
        iteration: 3,
        loopDecision: 'blocked',
        stableForMs: null,
        extra: {
          blocked: true,
          barrierKind: 'captcha',
        },
      })
    ).toEqual({
      status: 'analyzed',
      challengeType: 'captcha',
      manualActionRequired: true,
      iteration: 3,
      observedAt: '2026-04-18T19:00:00.000Z',
      loopDecision: 'blocked',
      stableForMs: null,
      fingerprint: 'fingerprint-1',
      blocked: true,
      barrierKind: 'captcha',
    });
  });
});

describe('createPlaywrightVerificationObservationFromProfile', () => {
  it('builds the shared observation shape from a review profile', () => {
    expect(
      createPlaywrightVerificationObservationFromProfile({
        profile: createPlaywrightVerificationReviewProfile({
          key: 'supplier_verification_review',
          subject: 'supplier verification barrier',
          runningMessage: 'Capturing supplier verification barrier for AI review.',
          historyArtifactKey: '1688-verification-review-history',
          artifactKeyPrefix: '1688-verification-review',
          evaluationProvider: '1688',
          resolveEvaluationStage: () => 'supplier_open',
          buildObservationExtra: () => ({
            blocked: true,
            barrierKind: 'captcha',
          }),
          buildArtifactSegments: () => [],
          buildFingerprintPartMap: () => ({}),
          detailDescriptors: [{ label: 'Blocked', value: 'blocked' }],
        }),
        params: {},
        review: {
          status: 'analyzed',
          challengeType: 'captcha',
          manualActionRequired: true,
        },
        capture: {
          observedAt: '2026-04-18T19:00:00.000Z',
          fingerprint: 'fingerprint-2',
        },
        iteration: 4,
        loopDecision: 'blocked',
        stableForMs: null,
      })
    ).toEqual({
      status: 'analyzed',
      challengeType: 'captcha',
      manualActionRequired: true,
      iteration: 4,
      observedAt: '2026-04-18T19:00:00.000Z',
      loopDecision: 'blocked',
      stableForMs: null,
      fingerprint: 'fingerprint-2',
      blocked: true,
      barrierKind: 'captcha',
    });
  });
});

describe('runPlaywrightVerificationReviewCapture', () => {
  it('runs the shared capture, observation commit, and finalization flow from one helper', async () => {
    const page = makeMockPage();
    const json = vi.fn().mockResolvedValue(undefined);
    const file = vi.fn().mockResolvedValue('/tmp/google-shot.png');
    const html = vi.fn().mockResolvedValue('/tmp/google-shot.html');
    const upsertStep = vi.fn();
    const profile = createPlaywrightVerificationReviewProfile({
      key: 'google_verification_review',
      subject: 'Google verification screen',
      runningMessage: 'Capturing Google verification screen for AI review.',
      historyArtifactKey: 'google-verification-review-history',
      artifactKeyPrefix: 'google-verification-review',
      analysisFailureLogKey: 'google.verification.review.analysis_failed',
      evaluationProvider: 'google_lens',
      resolveEvaluationStage: () => 'google_captcha',
      buildObservationExtra: (params: { captchaDetected: boolean }) => ({
        captchaDetected: params.captchaDetected,
      }),
      buildArtifactSegments: (params: {
        candidateId: string;
        candidateRank: number;
        iteration: number;
      }) => [params.candidateId, `rank-${params.candidateRank}`, `iter-${params.iteration}`],
      buildFingerprintPartMap: (params: {
        candidateId: string;
        candidateRank: number;
        captchaDetected: boolean;
      }) => ({
        candidateId: params.candidateId,
        candidateRank: params.candidateRank,
        captchaDetected: params.captchaDetected,
      }),
      detailDescriptors: [{ label: 'Captcha detected', value: 'captchaDetected' }],
    });
    const observations: Array<Record<string, unknown>> = [];

    const observation = await runPlaywrightVerificationReviewCapture({
      profile,
      params: {
        candidateId: 'pin-badge',
        candidateRank: 2,
        iteration: 1,
        loopDecision: 'captcha_present',
        stableForMs: null,
        captchaDetected: true,
      },
      currentUrl: 'https://lens.google.com',
      previousObservation: null,
      page,
      artifacts: { file, html, json },
      evaluate: async () => ({
        status: 'analyzed',
        challengeType: 'captcha',
        manualActionRequired: true,
      }),
      commitObservation: ({ observation: nextObservation }) => {
        observations.push(nextObservation as Record<string, unknown>);
        return observations;
      },
      upsertStep,
    });

    expect(observation).toMatchObject({
      status: 'analyzed',
      challengeType: 'captcha',
      captchaDetected: true,
      iteration: 1,
      loopDecision: 'captcha_present',
    });
    expect(upsertStep).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        key: 'google_verification_review',
        status: 'running',
        candidateId: 'pin-badge',
        candidateRank: 2,
      })
    );
    expect(upsertStep).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        key: 'google_verification_review',
        status: 'completed',
        candidateId: 'pin-badge',
        candidateRank: 2,
        resultCode: 'manual_review_ready',
      })
    );
    expect(json).toHaveBeenNthCalledWith(
      1,
      'google-verification-review-pin-badge-rank-2-iter-1-analysis',
      expect.objectContaining({
        status: 'analyzed',
      })
    );
    expect(json).toHaveBeenNthCalledWith(
      2,
      'google-verification-review-history',
      expect.arrayContaining([
        expect.objectContaining({
          captchaDetected: true,
        }),
      ])
    );
  });

  it('uses the review profile screenshot failure log key when capture logging is not passed inline', async () => {
    const log = vi.fn();
    const upsertStep = vi.fn();
    const page = makeMockPage({
      screenshot: vi.fn().mockRejectedValue(new Error('capture failed')),
    });
    const profile = createPlaywrightVerificationReviewProfile({
      key: 'google_verification_review',
      subject: 'Google verification screen',
      runningMessage: 'Capturing Google verification screen for AI review.',
      historyArtifactKey: 'google-verification-review-history',
      artifactKeyPrefix: 'google-verification-review',
      screenshotFailureLogKey: 'google.verification.review.screenshot_failed',
      evaluationProvider: 'google_lens',
      resolveEvaluationStage: () => 'google_captcha',
      buildObservationExtra: (params: { captchaDetected: boolean }) => ({
        captchaDetected: params.captchaDetected,
      }),
      buildArtifactSegments: (params: {
        candidateId: string;
        candidateRank: number;
        iteration: number;
      }) => [params.candidateId, `rank-${params.candidateRank}`, `iter-${params.iteration}`],
      buildFingerprintPartMap: (params: {
        candidateId: string;
        candidateRank: number;
        captchaDetected: boolean;
      }) => ({
        candidateId: params.candidateId,
        candidateRank: params.candidateRank,
        captchaDetected: params.captchaDetected,
      }),
      detailDescriptors: [{ label: 'Captcha detected', value: 'captchaDetected' }],
    });

    await runPlaywrightVerificationReviewCapture({
      profile,
      params: {
        candidateId: 'pin-badge',
        candidateRank: 2,
        iteration: 1,
        loopDecision: 'captcha_present',
        stableForMs: null,
        captchaDetected: true,
      },
      currentUrl: 'https://lens.google.com',
      previousObservation: null,
      page,
      log,
      evaluate: async () => ({
        status: 'capture_only',
        challengeType: 'captcha',
        manualActionRequired: true,
        error: 'Screenshot input is required.',
      }),
      commitObservation: ({ observation: nextObservation }) => [nextObservation],
      upsertStep,
    });

    expect(log).toHaveBeenCalledWith(
      'google.verification.review.screenshot_failed',
      expect.objectContaining({
        error: 'capture failed',
      })
    );
  });
});

describe('finalizePlaywrightVerificationReview', () => {
  it('resolves the step outcome, logs capture-only failures, and persists artifacts', async () => {
    const upsertStep = vi.fn();
    const json = vi.fn().mockResolvedValue(undefined);
    const log = vi.fn();

    const outcome = await finalizePlaywrightVerificationReview({
      runtime: createPlaywrightVerificationReviewRuntimeConfig({
        key: 'supplier_verification_review',
        subject: 'supplier verification barrier',
        runningMessage: 'Capturing supplier verification barrier for AI review.',
        historyArtifactKey: '1688-verification-review-history',
        artifactKeyPrefix: '1688-verification-review',
        group: 'supplier',
        label: 'Inspect supplier verification barrier',
      }),
      artifactKey: '1688-verification-review-supplier-open-pin-badge-rank-1-iter-2',
      artifacts: { json },
      review: {
        status: 'capture_only',
        error: 'Vision runtime unavailable',
      },
      observations: [{ iteration: 1 }],
      currentUrl: 'https://s.1688.com/youyuan/index.htm',
      details: [{ label: 'Blocked', value: 'true' }],
      log,
      analysisFailureLogKey: '1688.verification.review.analysis_failed',
      upsertStep,
    });

    expect(outcome).toEqual({
      status: 'completed',
      resultCode: 'capture_only',
      message: 'Captured the supplier verification barrier, but AI review was unavailable.',
      warning: 'Vision runtime unavailable',
    });
    expect(log).toHaveBeenCalledWith('1688.verification.review.analysis_failed', {
      error: 'Vision runtime unavailable',
    });
    expect(upsertStep).toHaveBeenCalledWith({
      key: 'supplier_verification_review',
      status: 'completed',
      resultCode: 'capture_only',
      message: 'Captured the supplier verification barrier, but AI review was unavailable.',
      warning: 'Vision runtime unavailable',
      url: 'https://s.1688.com/youyuan/index.htm',
      details: [{ label: 'Blocked', value: 'true' }],
      group: 'supplier',
      label: 'Inspect supplier verification barrier',
    });
    expect(json).toHaveBeenNthCalledWith(
      1,
      '1688-verification-review-supplier-open-pin-badge-rank-1-iter-2-analysis',
      { status: 'capture_only', error: 'Vision runtime unavailable' }
    );
    expect(json).toHaveBeenNthCalledWith(2, '1688-verification-review-history', [
      { iteration: 1 },
    ]);
  });
});

describe('buildPlaywrightVerificationReviewFingerprintParts', () => {
  it('builds labeled fingerprint parts with stable serialization', () => {
    expect(
      buildPlaywrightVerificationReviewFingerprintParts({
        candidateId: 'img-1',
        candidateRank: 2,
        captchaDetected: true,
      })
    ).toEqual([
      'candidateId=img-1',
      'candidateRank=2',
      'captchaDetected=true',
    ]);
  });
});

describe('slugifyPlaywrightVerificationReviewSegment', () => {
  it('slugifies dynamic review segments and falls back when empty', () => {
    expect(slugifyPlaywrightVerificationReviewSegment(' Pin Badge / Blue ')).toBe(
      'pin-badge-blue'
    );
    expect(slugifyPlaywrightVerificationReviewSegment('', 'unknown-segment')).toBe(
      'unknown-segment'
    );
  });
});

describe('createPlaywrightVerificationReviewStepConfig', () => {
  it('builds the shared step config for a verification review step', () => {
    expect(
      createPlaywrightVerificationReviewStepConfig({
        key: 'supplier_verification_review',
        subject: 'supplier verification barrier',
        runningMessage: 'Capturing supplier verification barrier for AI review.',
        group: 'supplier',
        label: 'Inspect supplier verification barrier',
      })
    ).toEqual({
      key: 'supplier_verification_review',
      runningMessage: 'Capturing supplier verification barrier for AI review.',
      messages: {
        analyzed:
          'Captured and classified the supplier verification barrier for manual review.',
        captureOnly:
          'Captured the supplier verification barrier, but AI review was unavailable.',
        failed: 'Could not capture the supplier verification barrier for AI review.',
      },
      group: 'supplier',
      label: 'Inspect supplier verification barrier',
    });
  });
});

describe('createPlaywrightVerificationReviewRuntimeConfig', () => {
  it('builds the combined verification review runtime config', () => {
    expect(
      createPlaywrightVerificationReviewRuntimeConfig({
        key: 'google_verification_review',
        subject: 'Google verification screen',
        runningMessage: 'Capturing Google verification screen for AI review.',
        historyArtifactKey: 'google-verification-review-history',
        artifactKeyPrefix: 'google-verification-review',
      })
    ).toEqual({
      step: {
        key: 'google_verification_review',
        runningMessage: 'Capturing Google verification screen for AI review.',
        messages: {
          analyzed:
            'Captured and classified the Google verification screen for manual review.',
          captureOnly:
            'Captured the Google verification screen, but AI review was unavailable.',
          failed: 'Could not capture the Google verification screen for AI review.',
        },
      },
      artifacts: {
        historyArtifactKey: 'google-verification-review-history',
        artifactKeyPrefix: 'google-verification-review',
        analysisArtifactSuffix: '-analysis',
      },
    });
  });
});

describe('resolvePlaywrightVerificationReviewStepOutcome', () => {
  it('maps analyzed reviews to the shared manual-review-ready outcome', () => {
    const outcome = resolvePlaywrightVerificationReviewStepOutcome(
      {
        status: 'analyzed',
        error: null,
      },
      createPlaywrightVerificationReviewStepMessages('supplier verification barrier')
    );

    expect(outcome).toEqual({
      status: 'completed',
      resultCode: 'manual_review_ready',
      message:
        'Captured and classified the supplier verification barrier for manual review.',
      warning: null,
    });
  });
});

describe('captureAndEvaluatePlaywrightObservation — maxConsecutiveErrors', () => {
  const mockBrain = () => {
    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedIsBrainModelVisionCapable.mockReturnValue(false);
  };

  it('aborts the injection loop after maxConsecutiveErrors consecutive failures', async () => {
    vi.clearAllMocks();
    mockBrain();
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html></html>'),
      url: vi.fn().mockReturnValue('https://example.com'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      // every evaluate() call throws to simulate execution errors
      evaluate: vi.fn().mockRejectedValue(new Error('element not interactable')),
    });
    const outerEvaluate = vi.fn().mockResolvedValue({ status: 'blocked' });

    let callCount = 0;
    mockedRunBrainChatCompletion.mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        text: JSON.stringify({ code: `throw new Error("element not interactable ${callCount}")`, done: false, reasoning: 'Clicking.' }),
        modelId: 'claude-sonnet-4-6',
      });
    });

    const result = await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'test',
      evaluate: outerEvaluate,
      buildObservation: ({ review }) => review,
      injectOnEvaluation: {
        shouldInject: () => true,
        goal: 'Solve it.',
        maxIterations: 10,
        maxConsecutiveErrors: 2,
      },
    });

    // Loop aborted after 2 consecutive errors, not after 10 iterations
    expect(result.injection?.iterationsRun).toBe(2);
    expect(result.injection?.done).toBe(false);
    expect(result.injection?.lastReasoning).toContain('2 consecutive execution error');
  });

  it('resets consecutive error counter after a successful execution', async () => {
    vi.clearAllMocks();
    mockBrain();
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html></html>'),
      url: vi.fn().mockReturnValue('https://example.com'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });
    const outerEvaluate = vi.fn().mockResolvedValue({ status: 'blocked' });

    let callCount = 0;
    mockedRunBrainChatCompletion.mockImplementation(() => {
      callCount++;
      if (callCount === 2) {
        // Second call generates valid code (no execution error)
        return Promise.resolve({
          text: JSON.stringify({ code: '// valid', done: false, reasoning: 'Retrying.' }),
          modelId: 'claude-sonnet-4-6',
        });
      }
      return Promise.resolve({
        text: JSON.stringify({ code: 'throw new Error("bad")', done: false, reasoning: 'Trying.' }),
        modelId: 'claude-sonnet-4-6',
      });
    });

    const result = await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'test',
      evaluate: outerEvaluate,
      buildObservation: ({ review }) => review,
      injectOnEvaluation: {
        shouldInject: () => true,
        goal: 'Solve it.',
        maxIterations: 4,
        maxConsecutiveErrors: 2,
      },
    });

    // After iter 2 succeeds, consecutive errors reset to 0.
    // Iters 3 and 4 can then each error again without triggering the 2-consecutive limit
    // from where they left off.
    expect(result.injection?.iterationsRun).toBeGreaterThanOrEqual(3);
  });

  it('does not abort when maxConsecutiveErrors is not set', async () => {
    vi.clearAllMocks();
    mockBrain();
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html></html>'),
      url: vi.fn().mockReturnValue('https://example.com'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockRejectedValue(new Error('always fails')),
    });
    const outerEvaluate = vi.fn().mockResolvedValue({ status: 'blocked' });

    let noLimitCallCount = 0;
    mockedRunBrainChatCompletion.mockImplementation(() => {
      noLimitCallCount++;
      return Promise.resolve({
        text: JSON.stringify({ code: `throw new Error("always fails ${noLimitCallCount}")`, done: false, reasoning: 'Trying.' }),
        modelId: 'claude-sonnet-4-6',
      });
    });

    const result = await captureAndEvaluatePlaywrightObservation({
      page,
      artifactKey: 'test',
      evaluate: outerEvaluate,
      buildObservation: ({ review }) => review,
      injectOnEvaluation: {
        shouldInject: () => true,
        goal: 'Solve it.',
        maxIterations: 3,
        // maxConsecutiveErrors not set — loop runs to maxIterations
      },
    });

    expect(result.injection?.iterationsRun).toBe(3);
  });
});

describe('runPlaywrightVisionGuidedAutomation', () => {
  const mockBrain = () => {
    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedIsBrainModelVisionCapable.mockReturnValue(false);
  };

  it('exits immediately when evaluator reports done on the first iteration', async () => {
    vi.clearAllMocks();
    mockBrain();
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html><body>Solved</body></html>'),
      url: vi.fn().mockReturnValue('https://example.com/done'),
    });

    const evaluate = vi.fn().mockResolvedValue({ context: 'Goal already met.', done: true, reasoning: 'Page is solved.' });

    const result = await runPlaywrightVisionGuidedAutomation({
      page,
      goal: 'Solve the challenge.',
      evaluate,
      maxIterations: 3,
    });

    expect(result.attempted).toBe(true);
    expect(result.done).toBe(true);
    expect(result.iterationsRun).toBe(1);
    expect(result.lastReasoning).toBe('Page is solved.');
    expect(result.iterations).toHaveLength(1);
    expect(result.iterations[0]).toMatchObject({ iteration: 1, code: '', done: true });
    expect(mockedRunBrainChatCompletion).not.toHaveBeenCalled();
  });

  it('generates and executes code when evaluator says not done', async () => {
    vi.clearAllMocks();
    mockBrain();
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html><body>Challenge</body></html>'),
      url: vi.fn().mockReturnValue('https://example.com/challenge'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });

    const evaluate = vi
      .fn()
      .mockResolvedValueOnce({ context: 'Checkbox is visible. Not yet checked.', done: false })
      .mockResolvedValueOnce({ context: 'Checkbox checked. Goal met.', done: true, reasoning: 'Solved.' });

    mockedRunBrainChatCompletion.mockResolvedValue({
      text: JSON.stringify({ code: '// click checkbox', done: false, reasoning: 'Clicking.' }),
      modelId: 'claude-sonnet-4-6',
    });

    const result = await runPlaywrightVisionGuidedAutomation({
      page,
      goal: 'Check the checkbox.',
      evaluate,
      maxIterations: 3,
    });

    expect(result.done).toBe(true);
    expect(result.iterationsRun).toBe(2);
    expect(result.iterations[0]).toMatchObject({ code: '// click checkbox', executionError: null });
    expect(result.iterations[1]).toMatchObject({ code: '', done: true, reasoning: 'Solved.' });
    expect(mockedRunBrainChatCompletion).toHaveBeenCalledTimes(1);
  });

  it('includes fresh evaluation context in every code-generator user message', async () => {
    vi.clearAllMocks();
    mockBrain();
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html></html>'),
      url: vi.fn().mockReturnValue('https://example.com'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });

    const evaluate = vi
      .fn()
      .mockResolvedValueOnce({ context: 'Step 1 context.', done: false })
      .mockResolvedValueOnce({ context: 'Step 2 context.', done: false })
      .mockResolvedValue({ context: 'Done context.', done: true, reasoning: 'Done.' });

    mockedRunBrainChatCompletion.mockResolvedValue({
      text: JSON.stringify({ code: '// act', done: false, reasoning: 'Acting.' }),
      modelId: 'claude-sonnet-4-6',
    });

    await runPlaywrightVisionGuidedAutomation({
      page,
      goal: 'Complete the flow.',
      evaluate,
      maxIterations: 5,
      useConversationHistory: false,
    });

    const calls = mockedRunBrainChatCompletion.mock.calls;
    const firstUserMsg = (calls[0]![0] as { messages: Array<{ role: string; content: string }> })
      .messages.find((m) => m.role === 'user')!.content;
    const secondUserMsg = (calls[1]![0] as { messages: Array<{ role: string; content: string }> })
      .messages.find((m) => m.role === 'user')!.content;

    expect(firstUserMsg).toContain('Step 1 context.');
    expect(secondUserMsg).toContain('Step 2 context.');
  });

  it('includes fresh evaluation in continuation turns when useConversationHistory is true', async () => {
    vi.clearAllMocks();
    mockBrain();
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html></html>'),
      url: vi.fn().mockReturnValue('https://example.com'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });

    const evaluate = vi
      .fn()
      .mockResolvedValueOnce({ context: 'Iter 1 fresh context.', done: false })
      .mockResolvedValueOnce({ context: 'Iter 2 fresh context.', done: false })
      .mockResolvedValue({ context: 'Done.', done: true, reasoning: 'Done.' });

    mockedRunBrainChatCompletion.mockResolvedValue({
      text: JSON.stringify({ code: '// step', done: false, reasoning: 'Stepping.' }),
      modelId: 'claude-sonnet-4-6',
    });

    await runPlaywrightVisionGuidedAutomation({
      page,
      goal: 'Multi-step flow.',
      evaluate,
      maxIterations: 5,
      useConversationHistory: true,
    });

    // The second call is a continuation turn — fresh evaluation must still appear
    const secondCallMessages = (mockedRunBrainChatCompletion.mock.calls[1]![0] as {
      messages: Array<{ role: string; content: string }>;
    }).messages;
    const secondUserMsg = secondCallMessages.filter((m) => m.role === 'user').at(-1)!.content;
    expect(secondUserMsg).toContain('Iter 2 fresh context.');
  });

  it('recovers from execution error and passes the error into the next iteration context', async () => {
    vi.clearAllMocks();
    mockBrain();
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html></html>'),
      url: vi.fn().mockReturnValue('https://example.com'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockRejectedValueOnce(new Error('selector not found')),
    });

    const evaluate = vi
      .fn()
      .mockResolvedValueOnce({ context: 'Context A.', done: false })
      .mockResolvedValueOnce({ context: 'Context B.', done: false })
      .mockResolvedValue({ context: 'Done.', done: true, reasoning: 'Recovered.' });

    let callCount = 0;
    mockedRunBrainChatCompletion.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // return code that throws during execution
        return Promise.resolve({
          text: JSON.stringify({ code: 'throw new Error("selector not found")', done: false, reasoning: 'Try selector.' }),
          modelId: 'claude-sonnet-4-6',
        });
      }
      return Promise.resolve({
        text: JSON.stringify({ code: '// fixed', done: false, reasoning: 'Fixed.' }),
        modelId: 'claude-sonnet-4-6',
      });
    });

    const result = await runPlaywrightVisionGuidedAutomation({
      page,
      goal: 'Complete action.',
      evaluate,
      maxIterations: 5,
      useConversationHistory: false,
    });

    const errorRecord = result.iterations.find((r) => r.executionError !== null);
    expect(errorRecord).toBeDefined();
    expect(errorRecord!.executionError).toContain('selector not found');

    // second AI call should include the prior execution error
    const secondCallUserMsg = (mockedRunBrainChatCompletion.mock.calls[1]![0] as {
      messages: Array<{ role: string; content: string }>;
    }).messages.find((m) => m.role === 'user')!.content;
    expect(secondCallUserMsg).toContain('selector not found');
  });

  it('aborts before maxIterations when timeoutMs elapses', async () => {
    vi.clearAllMocks();
    mockBrain();
    const dateSpy = vi.spyOn(Date, 'now');
    let now = 1000;
    dateSpy.mockImplementation(() => now);

    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html></html>'),
      url: vi.fn().mockReturnValue('https://example.com'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });

    const evaluate = vi.fn().mockImplementation(() => {
      now += 200; // advance past 100ms timeout on second call
      return Promise.resolve({ context: 'Not done.', done: false });
    });

    mockedRunBrainChatCompletion.mockResolvedValue({
      text: JSON.stringify({ code: '// act', done: false, reasoning: 'Acting.' }),
      modelId: 'claude-sonnet-4-6',
    });

    const result = await runPlaywrightVisionGuidedAutomation({
      page,
      goal: 'Do something.',
      evaluate,
      maxIterations: 10,
      timeoutMs: 100,
    });

    expect(result.done).toBe(false);
    expect(result.iterationsRun).toBeLessThan(10);
    expect(result.lastReasoning).toContain('timed out');
    dateSpy.mockRestore();
  });

  it('populates evaluation field in every iteration record', async () => {
    vi.clearAllMocks();
    mockBrain();
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html></html>'),
      url: vi.fn().mockReturnValue('https://example.com'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });

    const evaluate = vi
      .fn()
      .mockResolvedValueOnce({ context: 'Step 1 context.', done: false, reasoning: null })
      .mockResolvedValue({ context: 'Goal achieved.', done: true, reasoning: 'Done now.' });

    mockedRunBrainChatCompletion.mockResolvedValue({
      text: JSON.stringify({ code: '// act', done: false, reasoning: 'Acting.' }),
      modelId: 'claude-sonnet-4-6',
    });

    const result = await runPlaywrightVisionGuidedAutomation({
      page,
      goal: 'Complete.',
      evaluate,
      maxIterations: 5,
    });

    expect(result.iterations).toHaveLength(2);
    // First iteration — evaluator said not done, code was generated
    expect(result.iterations[0]!.evaluation).toMatchObject({
      done: false,
      context: 'Step 1 context.',
    });
    // Second iteration — evaluator said done, early exit without code
    expect(result.iterations[1]!.evaluation).toMatchObject({
      done: true,
      context: 'Goal achieved.',
      reasoning: 'Done now.',
    });
  });

  it('fires onIterationResult for every iteration including evaluator-done records', async () => {
    vi.clearAllMocks();
    mockBrain();
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html></html>'),
      url: vi.fn().mockReturnValue('https://example.com'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });

    const evaluate = vi
      .fn()
      .mockResolvedValueOnce({ context: 'Not done.', done: false })
      .mockResolvedValue({ context: 'Done.', done: true, reasoning: 'Solved.' });

    mockedRunBrainChatCompletion.mockResolvedValue({
      text: JSON.stringify({ code: '// act', done: false, reasoning: 'Acting.' }),
      modelId: 'claude-sonnet-4-6',
    });

    const records: unknown[] = [];
    await runPlaywrightVisionGuidedAutomation({
      page,
      goal: 'Complete.',
      evaluate,
      maxIterations: 5,
      onIterationResult: (record) => { records.push(record); },
    });

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({ iteration: 1, code: '// act' });
    expect(records[1]).toMatchObject({ iteration: 2, code: '', done: true });
  });
});

describe('injectCodeWithAI — freshEvaluation context', () => {
  it('includes freshEvaluation in the user message on both first and continuation turns', async () => {
    vi.clearAllMocks();
    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedIsBrainModelVisionCapable.mockReturnValue(false);
    mockedRunBrainChatCompletion.mockResolvedValue({
      text: JSON.stringify({ code: '', done: true, reasoning: 'Done.' }),
      modelId: 'claude-sonnet-4-6',
    });

    await injectCodeWithAI({
      goal: 'Solve it.',
      context: {
        iteration: 2,
        maxIterations: 5,
        url: 'https://example.com',
        freshEvaluation: 'Slider is visible at x=120.',
        isContinuation: true,
      },
    });

    const userMsg = (mockedRunBrainChatCompletion.mock.calls[0]![0] as {
      messages: Array<{ role: string; content: string }>;
    }).messages.find((m) => m.role === 'user')!.content;

    expect(userMsg).toContain('Slider is visible at x=120.');
    // Continuation format — goal line not present in header
    expect(userMsg).toContain('Continuation');
  });
});

describe('runPlaywrightVisionGuidedAutomation — artifact saving', () => {
  it('saves per-iteration screenshots when artifactKey and artifacts.file are provided', async () => {
    vi.clearAllMocks();
    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedIsBrainModelVisionCapable.mockReturnValue(false);
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html></html>'),
      url: vi.fn().mockReturnValue('https://example.com'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });

    const evaluate = vi
      .fn()
      .mockResolvedValueOnce({ context: 'Not done.', done: false })
      .mockResolvedValue({ context: 'Done.', done: true, reasoning: 'Solved.' });

    mockedRunBrainChatCompletion.mockResolvedValue({
      text: JSON.stringify({ code: '// act', done: false, reasoning: 'Acting.' }),
      modelId: 'claude-sonnet-4-6',
    });

    const savedFiles: Array<{ key: string; size: number }> = [];
    const savedHtml: string[] = [];

    const result = await runPlaywrightVisionGuidedAutomation({
      page,
      goal: 'Complete.',
      evaluate,
      maxIterations: 5,
      artifactKey: 'my-run',
      artifacts: {
        file: async (key, data) => {
          savedFiles.push({ key, size: data.length });
          return `${key}.png`;
        },
        html: async (key) => { savedHtml.push(key); return `${key}.html`; },
        json: async () => undefined,
      },
    });

    // Iteration 1 screenshot saved before code generation, iteration 2 screenshot saved before evaluator reports done
    expect(savedFiles.some((f) => f.key === 'my-run-iter-1')).toBe(true);
    expect(savedFiles.some((f) => f.key === 'my-run-iter-2')).toBe(true);
    // HTML artifacts also saved per iteration
    expect(savedHtml).toContain('my-run-iter-1');
    expect(savedHtml).toContain('my-run-iter-2');
    // screenshotArtifactName and htmlArtifactName populated in records
    expect(result.iterations[0]!.screenshotArtifactName).toBe('my-run-iter-1.png');
    expect(result.iterations[0]!.htmlArtifactName).toBe('my-run-iter-1.html');
    expect(result.iterations[1]!.screenshotArtifactName).toBe('my-run-iter-2.png');
    expect(result.iterations[1]!.htmlArtifactName).toBe('my-run-iter-2.html');
  });

  it('saves iteration history JSON after the loop when artifactKey and artifacts are provided', async () => {
    vi.clearAllMocks();
    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedIsBrainModelVisionCapable.mockReturnValue(false);
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html></html>'),
      url: vi.fn().mockReturnValue('https://example.com'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });

    const evaluate = vi.fn()
      .mockResolvedValueOnce({ context: 'Not done.', done: false })
      .mockResolvedValue({ context: 'Done.', done: true, reasoning: 'Solved.' });

    mockedRunBrainChatCompletion.mockResolvedValue({
      text: JSON.stringify({ code: '// act', done: false, reasoning: 'Acting.' }),
      modelId: 'claude-sonnet-4-6',
    });

    const jsonArtifacts: Array<{ key: string; data: unknown }> = [];

    await runPlaywrightVisionGuidedAutomation({
      page,
      goal: 'Complete.',
      evaluate,
      maxIterations: 5,
      artifactKey: 'my-automation',
      artifacts: {
        json: async (key, data) => { jsonArtifacts.push({ key, data }); },
      },
    });

    expect(jsonArtifacts).toHaveLength(1);
    expect(jsonArtifacts[0]!.key).toBe('my-automation-vision-history');
    expect(jsonArtifacts[0]!.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ iteration: 1, code: '// act' })])
    );
  });

  it('does not save artifacts when artifactKey is not provided', async () => {
    vi.clearAllMocks();
    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedIsBrainModelVisionCapable.mockReturnValue(false);
    const page = makeMockPage({
      content: vi.fn().mockResolvedValue('<html></html>'),
      url: vi.fn().mockReturnValue('https://example.com'),
    });

    const evaluate = vi.fn().mockResolvedValue({ context: 'Done.', done: true, reasoning: 'Done.' });
    const jsonArtifact = vi.fn();

    await runPlaywrightVisionGuidedAutomation({
      page,
      goal: 'Do it.',
      evaluate,
      artifacts: { json: jsonArtifact },
    });

    expect(jsonArtifact).not.toHaveBeenCalled();
  });
});

describe('runPlaywrightVisionGuidedAutomation — maxConsecutiveErrors', () => {
  function makeBaseSetup() {
    vi.clearAllMocks();
    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedIsBrainModelVisionCapable.mockReturnValue(false);
    return makeMockPage({
      content: vi.fn().mockResolvedValue('<html></html>'),
      url: vi.fn().mockReturnValue('https://example.com'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    });
  }

  it('aborts after maxConsecutiveErrors consecutive execution errors', async () => {
    const page = makeBaseSetup();
    let callCount = 0;
    mockedRunBrainChatCompletion.mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        text: JSON.stringify({
          code: `throw new Error("execution error ${callCount}")`,
          done: false,
          reasoning: 'Trying.',
        }),
        modelId: 'claude-sonnet-4-6',
      });
    });
    const evaluate = vi.fn().mockResolvedValue({ context: 'Not done.', done: false, reasoning: null });

    const result = await runPlaywrightVisionGuidedAutomation({
      page,
      goal: 'Complete.',
      evaluate,
      maxIterations: 10,
      maxConsecutiveErrors: 2,
    });

    expect(result.iterationsRun).toBe(2);
    expect(result.done).toBe(false);
    expect(result.lastReasoning).toMatch(/aborted after 2 consecutive execution errors/);
  });

  it('resets consecutiveErrors counter after a successful execution', async () => {
    const page = makeBaseSetup();
    let callCount = 0;
    mockedRunBrainChatCompletion.mockImplementation(() => {
      callCount++;
      const code =
        callCount === 1 ? `throw new Error("fail once ${callCount}")` : `// success ${callCount}`;
      return Promise.resolve({
        text: JSON.stringify({ code, done: callCount >= 4, reasoning: 'Trying.' }),
        modelId: 'claude-sonnet-4-6',
      });
    });
    const evaluate = vi.fn().mockResolvedValue({ context: 'Not done.', done: false, reasoning: null });

    const result = await runPlaywrightVisionGuidedAutomation({
      page,
      goal: 'Complete.',
      evaluate,
      maxIterations: 10,
      maxConsecutiveErrors: 2,
    });

    // Iteration 1 fails, iteration 2 succeeds (resets counter), 3 succeeds, 4 done — no abort
    expect(result.iterationsRun).toBe(4);
    expect(result.done).toBe(true);
  });

  it('does not abort when maxConsecutiveErrors is not set', async () => {
    const page = makeBaseSetup();
    let callCount = 0;
    mockedRunBrainChatCompletion.mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        text: JSON.stringify({
          code: `throw new Error("always fail ${callCount}")`,
          done: false,
          reasoning: 'Trying.',
        }),
        modelId: 'claude-sonnet-4-6',
      });
    });
    const evaluate = vi.fn().mockResolvedValue({ context: 'Not done.', done: false, reasoning: null });

    const result = await runPlaywrightVisionGuidedAutomation({
      page,
      goal: 'Complete.',
      evaluate,
      maxIterations: 3,
    });

    // Runs all 3 iterations — no consecutive-error abort
    expect(result.iterationsRun).toBe(3);
    expect(result.lastReasoning).not.toMatch(/aborted after/);
  });
});

describe('createPlaywrightVisionGuidedEvaluator', () => {
  it('returns done=true with reasoning when isDone returns true', async () => {
    vi.clearAllMocks();
    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedIsBrainModelVisionCapable.mockReturnValue(true);
    mockedRunBrainChatCompletion.mockResolvedValue({
      text: JSON.stringify({ status: 'solved', confidence: 0.95 }),
      modelId: 'claude-sonnet-4-6',
    });

    const evaluator = createPlaywrightVisionGuidedEvaluator({
      schema: z.object({ status: z.string(), confidence: z.number() }),
      systemPrompt: 'Evaluate the page.',
      isDone: (parsed) => parsed?.status === 'solved',
      buildContext: (parsed) => `Status: ${parsed?.status ?? 'unknown'}`,
      getReasoning: (parsed) => `Confidence: ${String(parsed?.confidence ?? 0)}`,
    });

    const result = await evaluator({
      screenshotBase64: 'base64data',
      dom: '<html></html>',
      url: 'https://example.com',
      iteration: 1,
      maxIterations: 3,
    });

    expect(result.done).toBe(true);
    expect(result.reasoning).toBe('Confidence: 0.95');
  });

  it('returns done=false with buildContext output when isDone returns false', async () => {
    vi.clearAllMocks();
    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedIsBrainModelVisionCapable.mockReturnValue(true);
    mockedRunBrainChatCompletion.mockResolvedValue({
      text: JSON.stringify({ status: 'pending', challengeType: 'slider' }),
      modelId: 'claude-sonnet-4-6',
    });

    const evaluator = createPlaywrightVisionGuidedEvaluator({
      schema: z.object({ status: z.string(), challengeType: z.string() }),
      systemPrompt: 'Evaluate the page.',
      isDone: (parsed) => parsed?.status === 'solved',
      buildContext: (parsed, capture) =>
        `Challenge: ${parsed?.challengeType ?? 'unknown'}, URL: ${capture.url ?? ''}`,
    });

    const result = await evaluator({
      screenshotBase64: 'base64data',
      dom: null,
      url: 'https://example.com/challenge',
      iteration: 2,
      maxIterations: 3,
    });

    expect(result.done).toBe(false);
    expect(result.context).toContain('slider');
    expect(result.context).toContain('https://example.com/challenge');
  });

  it('delegates parsed=null to isDone and buildContext when AI response is unparseable', async () => {
    vi.clearAllMocks();
    mockedResolveBrainExecutionConfigForCapability.mockResolvedValue({
      modelId: 'claude-sonnet-4-6',
      systemPrompt: null,
      temperature: 0.2,
      brainApplied: false,
    });
    mockedIsBrainModelVisionCapable.mockReturnValue(true);
    mockedRunBrainChatCompletion.mockResolvedValue({
      text: 'not valid json {{',
      modelId: 'claude-sonnet-4-6',
    });

    const isDone = vi.fn().mockReturnValue(false);
    const buildContext = vi.fn().mockReturnValue('Fallback context.');

    const evaluator = createPlaywrightVisionGuidedEvaluator({
      schema: z.object({ status: z.string() }),
      systemPrompt: 'Evaluate the page.',
      isDone,
      buildContext,
    });

    const result = await evaluator({
      screenshotBase64: 'base64data',
      dom: null,
      url: 'https://example.com',
      iteration: 1,
      maxIterations: 3,
    });

    expect(result.done).toBe(false);
    expect(result.context).toBe('Fallback context.');
    expect(isDone).toHaveBeenCalledWith(null, expect.objectContaining({ iteration: 1 }));
    expect(buildContext).toHaveBeenCalledWith(null, expect.objectContaining({ iteration: 1 }));
  });
});
