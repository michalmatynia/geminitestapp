import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/ai-brain/segments/api', () => ({
  resolveBrainExecutionConfigForCapability: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  isBrainModelVisionCapable: vi.fn(),
  runBrainChatCompletion: vi.fn(),
}));

import type { Page } from 'playwright';

import {
  captureAndEvaluatePlaywrightObservation,
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
});
