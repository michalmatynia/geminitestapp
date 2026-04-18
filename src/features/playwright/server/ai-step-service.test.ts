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
} from './ai-step-service';

const makeMockPage = (overrides: Partial<Page> = {}): Page =>
  ({
    url: vi.fn().mockReturnValue('https://example.com/challenge'),
    title: vi.fn().mockResolvedValue('Challenge page'),
    screenshot: vi.fn().mockResolvedValue(Buffer.from('mock-screenshot')),
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
