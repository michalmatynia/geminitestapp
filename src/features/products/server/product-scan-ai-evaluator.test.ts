import { describe, expect, it, vi } from 'vitest';

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
  buildProductScanVerificationDiagnosticsPayload,
  cloneProductScanVerificationObservations,
  cloneProductScanVerificationReview,
  createProductScanVerificationBarrierEvaluationInput,
  createProductScanVerificationBarrierEvaluationInputFromProfile,
} from './product-scan-ai-evaluator';
import { createPlaywrightVerificationReviewProfile } from '@/features/playwright/server/ai-step-service';

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
});
