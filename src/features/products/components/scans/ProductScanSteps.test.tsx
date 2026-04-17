import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  ProductScanSteps,
  resolveProductScanActiveStepSummary,
  resolveProductScanContinuationSummary,
  resolveProductScanEvaluationPolicySummary,
  resolveProductScanLatestOutcomeSummary,
  resolveProductScanRejectedCandidateSummary,
} from './ProductScanSteps';

describe('ProductScanSteps', () => {
  it('renders grouped timeline sections with attempt and detail metadata', () => {
    render(
      <ProductScanSteps
        steps={[
          {
            key: 'prepare_scan',
            label: 'Prepare Amazon scan',
            group: 'input',
            attempt: 1,
            candidateId: null,
            candidateRank: null,
            inputSource: null,
            retryOf: null,
            resultCode: 'prepared',
            status: 'completed',
            message: 'Prepared 3 image candidates for Amazon candidate search.',
            warning: null,
            details: [{ label: 'Image candidates', value: '3' }],
            url: null,
            startedAt: '2026-04-11T10:00:00.000Z',
            completedAt: '2026-04-11T10:00:01.000Z',
            durationMs: 1000,
          },
          {
            key: 'google_upload',
            label: 'Upload image to Google Lens',
            group: 'google_lens',
            attempt: 2,
            candidateId: 'image-2',
            candidateRank: null,
            inputSource: 'url',
            retryOf: 'Local file upload',
            resultCode: 'url_submitted',
            status: 'completed',
            message: 'Submitted image URL for image-2.',
            warning: 'URL upload succeeded after a file fallback was skipped.',
            details: [{ label: 'Source', value: 'Image URL' }],
            url: 'https://lens.google.com/uploadbyurl?url=https://cdn.example.com/image-2.jpg',
            startedAt: '2026-04-11T10:00:05.000Z',
            completedAt: '2026-04-11T10:00:07.000Z',
            durationMs: 2000,
          },
          {
            key: 'amazon_extract',
            label: 'Extract Amazon details',
            group: 'amazon',
            attempt: 1,
            candidateId: 'image-2',
            candidateRank: 1,
            inputSource: null,
            retryOf: null,
            resultCode: 'match_found',
            status: 'completed',
            message: 'Extracted Amazon ASIN B00TEST123.',
            warning: null,
            details: [
              { label: 'ASIN', value: 'B00TEST123' },
              { label: 'Title', value: 'Amazon product title' },
            ],
            url: 'https://www.amazon.com/dp/B00TEST123',
            startedAt: '2026-04-11T10:00:08.000Z',
            completedAt: '2026-04-11T10:00:11.000Z',
            durationMs: 3000,
          },
        ]}
      />
    );

    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('Google Lens')).toBeInTheDocument();
    expect(screen.getByText('Amazon')).toBeInTheDocument();
    expect(screen.getByText('3 steps')).toBeInTheDocument();
    expect(screen.getByText('1 warning')).toBeInTheDocument();
    expect(screen.getByText('1 retry')).toBeInTheDocument();
    expect(screen.getByText('1 Amazon candidate')).toBeInTheDocument();
    expect(screen.getByText('Attempt 2')).toBeInTheDocument();
    expect(screen.getByText('URL input')).toBeInTheDocument();
    expect(screen.getByText('Prepared')).toBeInTheDocument();
    expect(screen.getByText('Url Submitted')).toBeInTheDocument();
    expect(screen.getByText('Match Found')).toBeInTheDocument();
    expect(screen.getByText('Candidate #1')).toBeInTheDocument();
    expect(screen.getByText('Retry of: Local file upload')).toBeInTheDocument();
    expect(screen.getAllByText('Candidate: image-2')).toHaveLength(2);
    expect(screen.getByText('Image candidates')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('URL upload succeeded after a file fallback was skipped.')).toBeInTheDocument();
    expect(screen.getAllByText('Open Step URL')).toHaveLength(2);
  });

  it('resolves the active step summary from running steps', () => {
    const summary = resolveProductScanActiveStepSummary([
      {
        key: 'prepare_scan',
        label: 'Prepare Amazon scan',
        group: 'input',
        attempt: 1,
        candidateId: null,
        candidateRank: null,
        inputSource: null,
        retryOf: null,
        resultCode: 'prepared',
        status: 'completed',
        message: 'Prepared image candidates.',
        warning: null,
        details: [],
        url: null,
        startedAt: '2026-04-11T10:00:00.000Z',
        completedAt: '2026-04-11T10:00:01.000Z',
        durationMs: 1000,
      },
      {
        key: 'google_candidates',
        label: 'Collect Amazon candidates from Google results',
        group: 'google_lens',
        attempt: 2,
        candidateId: 'image-2',
        candidateRank: null,
        inputSource: 'url',
        retryOf: null,
        resultCode: 'collecting',
        status: 'running',
        message: 'Waiting for reverse image results.',
        warning: null,
        details: [],
        url: 'https://www.google.com/searchbyimage?image_url=https://cdn.example.com/image-2.jpg',
        startedAt: '2026-04-11T10:00:05.000Z',
        completedAt: null,
        durationMs: null,
      },
    ]);

    expect(summary).toEqual({
      phaseLabel: 'Google Lens',
      stepLabel: 'Collect Amazon candidates from Google results',
      message: 'Waiting for reverse image results.',
      attempt: 2,
      inputSource: 'url',
    });
  });

  it('resolves the latest failed step summary with formatted result code', () => {
    const summary = resolveProductScanLatestOutcomeSummary([
      {
        key: 'google_candidates',
        label: 'Collect Amazon candidates from Google results',
        group: 'google_lens',
        attempt: 2,
        candidateId: 'image-2',
        candidateRank: null,
        inputSource: 'url',
        retryOf: null,
        resultCode: 'candidate_collect_timeout',
        status: 'failed',
        message: 'Timed out while waiting for reverse image results.',
        warning: null,
        details: [],
        url: 'https://www.google.com/searchbyimage?image_url=https://cdn.example.com/image-2.jpg',
        startedAt: '2026-04-11T10:00:05.000Z',
        completedAt: '2026-04-11T10:00:13.000Z',
        durationMs: 8000,
      },
    ]);

    expect(summary).toMatchObject({
      kind: 'failed',
      phaseLabel: 'Google Lens',
      sourceLabel: 'Candidate collection',
      stepLabel: 'Collect Amazon candidates from Google results',
      message: 'Timed out while waiting for reverse image results.',
      resultCodeLabel: 'Candidate Collect Timeout',
      attempt: 2,
      inputSource: 'url',
      url: 'https://www.google.com/searchbyimage?image_url=https://cdn.example.com/image-2.jpg',
    });
    expect(summary?.timingLabel).toContain('Duration 8.0 s');
  });

  it('resolves the latest failed supplier evaluator step summary', () => {
    const summary = resolveProductScanLatestOutcomeSummary([
      {
        key: 'supplier_ai_evaluate',
        label: 'Evaluate supplier candidate match',
        group: 'supplier',
        attempt: 1,
        candidateId: 'image-1',
        candidateRank: 1,
        inputSource: null,
        retryOf: null,
        resultCode: 'evaluation_failed',
        status: 'failed',
        message: '1688 supplier AI evaluation failed.',
        warning: null,
        details: [{ label: 'Error', value: 'Timed out while evaluating supplier candidate.' }],
        url: 'https://detail.1688.com/offer/123456789.html',
        startedAt: '2026-04-11T10:00:05.000Z',
        completedAt: '2026-04-11T10:00:08.000Z',
        durationMs: 3000,
      },
    ]);

    expect(summary).toMatchObject({
      kind: 'failed',
      phaseLabel: 'Supplier',
      sourceLabel: 'Supplier evaluator',
      stepLabel: 'Evaluate supplier candidate match',
      message: '1688 supplier AI evaluation failed.',
      resultCodeLabel: 'Evaluation Failed',
      attempt: 1,
      url: 'https://detail.1688.com/offer/123456789.html',
    });
  });

  it('resolves candidate continuation summaries after AI rejection', () => {
    const summary = resolveProductScanContinuationSummary([
      {
        key: 'amazon_ai_evaluate',
        label: 'Evaluate Amazon candidate match',
        group: 'amazon',
        attempt: 1,
        candidateId: 'image-2',
        candidateRank: 1,
        inputSource: null,
        retryOf: null,
        resultCode: 'candidate_rejected',
        status: 'failed',
        message: 'AI evaluator rejected the Amazon candidate.',
        warning: null,
        details: [],
        url: 'https://www.amazon.com/dp/B00TEST123',
        startedAt: '2026-04-11T10:00:05.000Z',
        completedAt: '2026-04-11T10:00:08.000Z',
        durationMs: 3000,
      },
      {
        key: 'queue_scan',
        label: 'Continue with next Amazon candidate',
        group: 'input',
        attempt: 2,
        candidateId: null,
        candidateRank: null,
        inputSource: null,
        retryOf: null,
        resultCode: 'run_queued',
        status: 'completed',
        message: 'Queued the next Amazon candidate after AI rejection.',
        warning: null,
        details: [
          { label: 'Rejected candidate URL', value: 'https://www.amazon.com/dp/B00TEST123' },
          { label: 'Next candidate URL', value: 'https://www.amazon.com/dp/B00TEST456' },
        ],
        url: 'https://www.amazon.com/dp/B00TEST456',
        startedAt: '2026-04-11T10:00:08.000Z',
        completedAt: '2026-04-11T10:00:09.000Z',
        durationMs: 1000,
      },
    ]);

    expect(summary).toEqual({
      phaseLabel: 'Input',
      stepLabel: 'Continue with next Amazon candidate',
      message: 'Queued the next Amazon candidate after AI rejection.',
      resultCodeLabel: 'Run Queued',
      attempt: 2,
      rejectedUrl: 'https://www.amazon.com/dp/B00TEST123',
      nextUrl: 'https://www.amazon.com/dp/B00TEST456',
      rejectionKind: 'product',
    });
  });

  it('resolves rejected candidate summaries from AI evaluation steps', () => {
    const summary = resolveProductScanRejectedCandidateSummary([
      {
        key: 'amazon_ai_evaluate',
        label: 'Evaluate Amazon candidate match',
        group: 'amazon',
        attempt: 1,
        candidateId: 'image-2',
        candidateRank: 1,
        inputSource: null,
        retryOf: null,
        resultCode: 'candidate_rejected',
        status: 'failed',
        message: 'AI evaluator rejected the Amazon candidate (21%).',
        warning: null,
        details: [
          { label: 'Confidence', value: '21%' },
          { label: 'Candidate URL', value: 'https://www.amazon.com/dp/B00TEST123' },
          { label: 'Reason', value: 'The Amazon page shows a different product.' },
        ],
        url: 'https://www.amazon.com/dp/B00TEST123',
        startedAt: '2026-04-11T10:00:05.000Z',
        completedAt: '2026-04-11T10:00:08.000Z',
        durationMs: 3000,
      },
      {
        key: 'amazon_ai_evaluate',
        label: 'Evaluate Amazon candidate match',
        group: 'amazon',
        attempt: 2,
        candidateId: 'image-2',
        candidateRank: 2,
        inputSource: null,
        retryOf: null,
        resultCode: 'candidate_rejected',
        status: 'failed',
        message: 'AI evaluator rejected the Amazon candidate (17%).',
        warning: null,
        details: [
          { label: 'Confidence', value: '17%' },
          { label: 'Candidate URL', value: 'https://www.amazon.com/dp/B00TEST456' },
          { label: 'Reason', value: 'The second Amazon page is still a different product.' },
        ],
        url: 'https://www.amazon.com/dp/B00TEST456',
        startedAt: '2026-04-11T10:00:09.000Z',
        completedAt: '2026-04-11T10:00:12.000Z',
        durationMs: 3000,
      },
    ]);

    expect(summary).toEqual({
      rejectedCount: 2,
      languageRejectedCount: 0,
      latestRejectedUrl: 'https://www.amazon.com/dp/B00TEST456',
      latestReason: 'The second Amazon page is still a different product.',
      latestRejectionKind: 'product',
    });
  });

  it('resolves rejected supplier candidate summaries from 1688 AI evaluation steps', () => {
    const summary = resolveProductScanRejectedCandidateSummary([
      {
        key: 'supplier_ai_evaluate',
        label: 'Evaluate supplier candidate match',
        group: 'supplier',
        attempt: 1,
        candidateId: 'image-1',
        candidateRank: 1,
        inputSource: null,
        retryOf: null,
        resultCode: 'candidate_rejected',
        status: 'failed',
        message: 'AI evaluator rejected the 1688 supplier candidate (34%).',
        warning: null,
        details: [
          { label: 'Confidence', value: '34%' },
          { label: 'Candidate URL', value: 'https://detail.1688.com/offer/123456789.html' },
          { label: 'Mismatch', value: 'Supplier gallery differs from the source product.' },
        ],
        url: 'https://detail.1688.com/offer/123456789.html',
        startedAt: '2026-04-11T10:00:05.000Z',
        completedAt: '2026-04-11T10:00:08.000Z',
        durationMs: 3000,
      },
    ]);

    expect(summary).toEqual({
      rejectedCount: 1,
      languageRejectedCount: 0,
      latestRejectedUrl: 'https://detail.1688.com/offer/123456789.html',
      latestReason: 'Supplier gallery differs from the source product.',
      latestRejectionKind: 'product',
    });
  });

  it('resolves language-rejection continuation and rejected summaries', () => {
    const continuationSummary = resolveProductScanContinuationSummary([
      {
        key: 'amazon_ai_evaluate',
        label: 'Evaluate Amazon candidate match',
        group: 'amazon',
        attempt: 1,
        candidateId: 'image-2',
        candidateRank: 1,
        inputSource: null,
        retryOf: null,
        resultCode: 'candidate_language_rejected',
        status: 'failed',
        message: 'AI evaluator rejected the Amazon candidate because page content is not English.',
        warning: null,
        details: [{ label: 'Rejection kind', value: 'Language gate' }],
        url: 'https://www.amazon.de/dp/B00TEST123',
        startedAt: '2026-04-11T10:00:05.000Z',
        completedAt: '2026-04-11T10:00:08.000Z',
        durationMs: 3000,
      },
      {
        key: 'queue_scan',
        label: 'Continue with next Amazon candidate',
        group: 'input',
        attempt: 2,
        candidateId: null,
        candidateRank: null,
        inputSource: null,
        retryOf: null,
        resultCode: 'run_started',
        status: 'completed',
        message: 'Started the next Amazon candidate after language rejection.',
        warning: null,
        details: [
          { label: 'Rejection kind', value: 'Language gate' },
          { label: 'Rejected candidate URL', value: 'https://www.amazon.de/dp/B00TEST123' },
          { label: 'Next candidate URL', value: 'https://www.amazon.com/dp/B00TEST456' },
        ],
        url: 'https://www.amazon.com/dp/B00TEST456',
        startedAt: '2026-04-11T10:00:08.000Z',
        completedAt: '2026-04-11T10:00:09.000Z',
        durationMs: 1000,
      },
    ]);

    expect(continuationSummary?.rejectionKind).toBe('language');

    const rejectedSummary = resolveProductScanRejectedCandidateSummary([
      {
        key: 'amazon_ai_evaluate',
        label: 'Evaluate Amazon candidate match',
        group: 'amazon',
        attempt: 1,
        candidateId: 'image-2',
        candidateRank: 1,
        inputSource: null,
        retryOf: null,
        resultCode: 'candidate_language_rejected',
        status: 'failed',
        message: 'AI evaluator rejected the Amazon candidate because page content is not English.',
        warning: null,
        details: [
          { label: 'Candidate URL', value: 'https://www.amazon.de/dp/B00TEST123' },
          { label: 'Language reason', value: 'Detected German product content.' },
          { label: 'Rejection kind', value: 'Language gate' },
        ],
        url: 'https://www.amazon.de/dp/B00TEST123',
        startedAt: '2026-04-11T10:00:05.000Z',
        completedAt: '2026-04-11T10:00:08.000Z',
        durationMs: 3000,
      },
    ]);

    expect(rejectedSummary).toEqual({
      rejectedCount: 1,
      languageRejectedCount: 1,
      latestRejectedUrl: 'https://www.amazon.de/dp/B00TEST123',
      latestReason: 'Detected German product content.',
      latestRejectionKind: 'language',
    });
  });

  it('resolves the persisted AI evaluator policy summary from the latest evaluation step', () => {
    const summary = resolveProductScanEvaluationPolicySummary([
      {
        key: 'amazon_ai_evaluate',
        label: 'Evaluate Amazon candidate match',
        group: 'amazon',
        attempt: 1,
        candidateId: 'image-2',
        candidateRank: 1,
        inputSource: null,
        retryOf: null,
        resultCode: 'candidate_rejected',
        status: 'failed',
        message: 'AI evaluator rejected the Amazon candidate.',
        warning: null,
        details: [
          { label: 'Model source', value: 'Scanner override' },
          { label: 'Model', value: 'gpt-4o-mini' },
          { label: 'Threshold', value: '82%' },
          { label: 'Evaluation scope', value: 'Ambiguous Amazon candidates only' },
          { label: 'Similarity decision', value: 'AI only' },
          { label: 'Allowed content language', value: 'English' },
          { label: 'Language policy', value: 'Reject non-English content' },
          { label: 'Language detection', value: 'Deterministic first, then AI' },
        ],
        url: 'https://www.amazon.com/dp/B00TEST123',
        startedAt: '2026-04-11T10:00:05.000Z',
        completedAt: '2026-04-11T10:00:08.000Z',
        durationMs: 3000,
      },
    ]);

    expect(summary).toEqual({
      executionLabel: 'Reviewed by AI',
      modelSource: 'Scanner override',
      modelLabel: 'gpt-4o-mini',
      thresholdLabel: '82%',
      scopeLabel: 'Ambiguous Amazon candidates only',
      similarityDecisionLabel: 'AI only',
      languageGateLabel: 'English only',
      languageDetectionLabel: 'Deterministic first, then AI',
    });
  });

  it('resolves the persisted AI evaluator policy summary from the latest Amazon triage step', () => {
    const summary = resolveProductScanEvaluationPolicySummary([
      {
        key: 'amazon_ai_triage',
        label: 'Triage Amazon candidates',
        group: 'amazon',
        attempt: 1,
        candidateId: 'image-2',
        candidateRank: 2,
        inputSource: null,
        retryOf: null,
        resultCode: 'candidates_triaged',
        status: 'completed',
        message: 'Amazon candidate triage selected the best candidate.',
        warning: null,
        details: [
          { label: 'Model source', value: 'AI Brain default' },
          { label: 'Model', value: 'gpt-4.1-mini' },
          { label: 'Threshold', value: '70%' },
          { label: 'Evaluation scope', value: 'Every Amazon candidate' },
          { label: 'Similarity decision', value: 'AI only' },
          { label: 'Allowed content language', value: 'English' },
          { label: 'Language policy', value: 'Reject non-English content' },
          { label: 'Language detection', value: 'AI only' },
        ],
        url: 'https://www.amazon.de/dp/B00TEST123',
        startedAt: '2026-04-11T10:00:05.000Z',
        completedAt: '2026-04-11T10:00:08.000Z',
        durationMs: 3000,
      },
    ]);

    expect(summary).toEqual({
      executionLabel: 'Reviewed by AI',
      modelSource: 'AI Brain default',
      modelLabel: 'gpt-4.1-mini',
      thresholdLabel: '70%',
      scopeLabel: 'Every Amazon candidate',
      similarityDecisionLabel: 'AI only',
      languageGateLabel: 'English only',
      languageDetectionLabel: 'AI only',
    });
  });

  it('resolves the persisted AI evaluator policy summary for 1688 supplier scans', () => {
    const summary = resolveProductScanEvaluationPolicySummary([
      {
        key: 'supplier_ai_evaluate',
        label: 'Evaluate supplier candidate match',
        group: 'supplier',
        attempt: 1,
        candidateId: 'image-1',
        candidateRank: 1,
        inputSource: null,
        retryOf: null,
        resultCode: 'candidate_approved',
        status: 'completed',
        message: 'AI evaluator approved the 1688 supplier candidate.',
        warning: null,
        details: [
          { label: 'Model source', value: 'AI Brain default' },
          { label: 'Model', value: 'gpt-4.1-mini' },
          { label: 'Threshold', value: '80%' },
          { label: 'Evaluation scope', value: 'Ambiguous 1688 candidates only' },
        ],
        url: 'https://detail.1688.com/offer/123456789.html',
        startedAt: '2026-04-11T10:00:05.000Z',
        completedAt: '2026-04-11T10:00:08.000Z',
        durationMs: 3000,
      },
    ]);

    expect(summary).toEqual({
      executionLabel: 'Reviewed by AI',
      modelSource: 'AI Brain default',
      modelLabel: 'gpt-4.1-mini',
      thresholdLabel: '80%',
      scopeLabel: 'Ambiguous 1688 candidates only',
      similarityDecisionLabel: null,
      languageGateLabel: null,
      languageDetectionLabel: null,
    });
  });

  it('resolves deterministic bypass in the persisted evaluator policy summary', () => {
    const summary = resolveProductScanEvaluationPolicySummary([
      {
        key: 'amazon_ai_evaluate',
        label: 'Evaluate Amazon candidate match',
        group: 'amazon',
        attempt: 1,
        candidateId: 'image-2',
        candidateRank: 1,
        inputSource: null,
        retryOf: null,
        resultCode: 'evaluation_skipped',
        status: 'skipped',
        message:
          'Skipped Amazon candidate AI evaluation because deterministic identifiers already matched.',
        warning: null,
        details: [
          { label: 'Model source', value: 'AI Brain default' },
          { label: 'Model', value: 'gpt-4o' },
          { label: 'Threshold', value: '85%' },
          { label: 'Evaluation scope', value: 'Ambiguous Amazon candidates only' },
          { label: 'Similarity decision', value: 'Deterministic hints, then AI' },
          { label: 'Allowed content language', value: 'English' },
          { label: 'Language policy', value: 'Reject non-English content' },
          { label: 'Language detection', value: 'Deterministic first, then AI' },
        ],
        url: 'https://www.amazon.com/dp/B00TEST123',
        startedAt: '2026-04-11T10:00:05.000Z',
        completedAt: '2026-04-11T10:00:08.000Z',
        durationMs: 3000,
      },
    ]);

    expect(summary).toEqual({
      executionLabel: 'Deterministic bypass',
      modelSource: 'AI Brain default',
      modelLabel: 'gpt-4o',
      thresholdLabel: '85%',
      scopeLabel: 'Ambiguous Amazon candidates only',
      similarityDecisionLabel: 'Deterministic hints, then AI',
      languageGateLabel: 'English only',
      languageDetectionLabel: 'Deterministic first, then AI',
    });
  });

  it('renders recovery badges and context for continuation attempts in the timeline', () => {
    render(
      <ProductScanSteps
        steps={[
          {
            key: 'amazon_ai_evaluate',
            label: 'Evaluate Amazon candidate match',
            group: 'amazon',
            attempt: 1,
            candidateId: 'image-2',
            candidateRank: 1,
            inputSource: null,
            retryOf: null,
            resultCode: 'candidate_rejected',
            status: 'failed',
            message: 'AI evaluator rejected the Amazon candidate.',
            warning: null,
            details: [],
            url: 'https://www.amazon.com/dp/B00TEST123',
            startedAt: '2026-04-11T10:00:05.000Z',
            completedAt: '2026-04-11T10:00:08.000Z',
            durationMs: 3000,
          },
          {
            key: 'queue_scan',
            label: 'Continue with next Amazon candidate',
            group: 'input',
            attempt: 2,
            candidateId: null,
            candidateRank: null,
            inputSource: null,
            retryOf: null,
            resultCode: 'run_queued',
            status: 'completed',
            message: 'Queued the next Amazon candidate after AI rejection.',
            warning: null,
            details: [
              { label: 'Rejected candidate URL', value: 'https://www.amazon.com/dp/B00TEST123' },
              { label: 'Next candidate URL', value: 'https://www.amazon.com/dp/B00TEST456' },
            ],
            url: 'https://www.amazon.com/dp/B00TEST456',
            startedAt: '2026-04-11T10:00:08.000Z',
            completedAt: '2026-04-11T10:00:09.000Z',
            durationMs: 1000,
          },
          {
            key: 'amazon_open',
            label: 'Open Amazon candidate',
            group: 'amazon',
            attempt: 2,
            candidateId: 'image-2',
            candidateRank: 2,
            inputSource: null,
            retryOf: null,
            resultCode: 'candidate_open_start',
            status: 'running',
            message: 'Opening Amazon candidate page.',
            warning: null,
            details: [],
            url: 'https://www.amazon.com/dp/B00TEST456',
            startedAt: '2026-04-11T10:00:10.000Z',
            completedAt: null,
            durationMs: null,
          },
        ]}
      />
    );

    expect(screen.getByText('AI rejection recovery')).toBeInTheDocument();
    expect(screen.getByText('Recovery attempt')).toBeInTheDocument();
    expect(
      screen.getByText('Continues after AI rejection of https://www.amazon.com/dp/B00TEST123.')
    ).toBeInTheDocument();
  });

  it('renders the persisted evaluator policy inline on amazon evaluation steps', () => {
    render(
      <ProductScanSteps
        steps={[
          {
            key: 'amazon_ai_evaluate',
            label: 'Evaluate Amazon candidate match',
            group: 'amazon',
            attempt: 1,
            candidateId: 'image-2',
            candidateRank: 1,
            inputSource: null,
            retryOf: null,
            resultCode: 'candidate_rejected',
            status: 'failed',
            message: 'AI evaluator rejected the Amazon candidate.',
            warning: null,
            details: [
              { label: 'Model source', value: 'Scanner override' },
              { label: 'Model', value: 'gpt-4o-mini' },
              { label: 'Threshold', value: '82%' },
              { label: 'Evaluation scope', value: 'Ambiguous Amazon candidates only' },
              { label: 'Similarity decision', value: 'AI only' },
              { label: 'Allowed content language', value: 'English' },
              { label: 'Language policy', value: 'Reject non-English content' },
              { label: 'Language detection', value: 'Deterministic first, then AI' },
            ],
            url: 'https://www.amazon.com/dp/B00TEST123',
            startedAt: '2026-04-11T10:00:05.000Z',
            completedAt: '2026-04-11T10:00:08.000Z',
            durationMs: 3000,
          },
        ]}
      />
    );

    expect(screen.getByText('AI evaluator policy')).toBeInTheDocument();
    expect(screen.getByText('Model gpt-4o-mini')).toBeInTheDocument();
    expect(screen.getAllByText('Scanner override').length).toBeGreaterThan(0);
    expect(screen.getAllByText('82%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ambiguous Amazon candidates only').length).toBeGreaterThan(0);
    expect(screen.getAllByText('AI only').length).toBeGreaterThan(0);
    expect(screen.getAllByText('English only').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Deterministic first, then AI').length).toBeGreaterThan(0);
  });

  it('shows whether amazon evaluation steps were reviewed by AI or bypassed deterministically', () => {
    render(
      <ProductScanSteps
        steps={[
          {
            key: 'amazon_ai_evaluate',
            label: 'Evaluate Amazon candidate match',
            group: 'amazon',
            attempt: 1,
            candidateId: 'image-2',
            candidateRank: 1,
            inputSource: null,
            retryOf: null,
            resultCode: 'candidate_approved',
            status: 'completed',
            message: 'AI evaluator approved the Amazon candidate (93%).',
            warning: null,
            details: [{ label: 'Model', value: 'gpt-4o' }],
            url: 'https://www.amazon.com/dp/B00TEST123',
            startedAt: '2026-04-11T10:00:05.000Z',
            completedAt: '2026-04-11T10:00:08.000Z',
            durationMs: 3000,
          },
          {
            key: 'amazon_ai_evaluate',
            label: 'Evaluate Amazon candidate match',
            group: 'amazon',
            attempt: 2,
            candidateId: 'image-2',
            candidateRank: 2,
            inputSource: null,
            retryOf: null,
            resultCode: 'evaluation_skipped',
            status: 'skipped',
            message:
              'Skipped Amazon candidate AI evaluation because deterministic identifiers already matched.',
            warning: null,
            details: [{ label: 'Model', value: 'gpt-4o' }],
            url: 'https://www.amazon.com/dp/B00TEST456',
            startedAt: '2026-04-11T10:00:09.000Z',
            completedAt: '2026-04-11T10:00:10.000Z',
            durationMs: 1000,
          },
        ]}
      />
    );

    expect(screen.getByText('Reviewed by AI')).toBeInTheDocument();
    expect(screen.getByText('Deterministic bypass')).toBeInTheDocument();
    expect(screen.getByText('Bypassed on deterministic match')).toBeInTheDocument();
  });

  it('renders language gate context for continuation attempts in the timeline', () => {
    render(
      <ProductScanSteps
        steps={[
          {
            key: 'amazon_ai_evaluate',
            label: 'Evaluate Amazon candidate match',
            group: 'amazon',
            attempt: 1,
            candidateId: 'image-2',
            candidateRank: 1,
            inputSource: null,
            retryOf: null,
            resultCode: 'candidate_language_rejected',
            status: 'failed',
            message: 'AI evaluator rejected the Amazon candidate because page content is not English.',
            warning: null,
            details: [{ label: 'Rejection kind', value: 'Language gate' }],
            url: 'https://www.amazon.de/dp/B00TEST123',
            startedAt: '2026-04-11T10:00:05.000Z',
            completedAt: '2026-04-11T10:00:08.000Z',
            durationMs: 3000,
          },
          {
            key: 'queue_scan',
            label: 'Continue with next Amazon candidate',
            group: 'input',
            attempt: 2,
            candidateId: null,
            candidateRank: null,
            inputSource: null,
            retryOf: null,
            resultCode: 'run_queued',
            status: 'completed',
            message: 'Queued the next Amazon candidate after language rejection.',
            warning: null,
            details: [
              { label: 'Rejection kind', value: 'Language gate' },
              { label: 'Rejected candidate URL', value: 'https://www.amazon.de/dp/B00TEST123' },
              { label: 'Next candidate URL', value: 'https://www.amazon.com/dp/B00TEST456' },
            ],
            url: 'https://www.amazon.com/dp/B00TEST456',
            startedAt: '2026-04-11T10:00:08.000Z',
            completedAt: '2026-04-11T10:00:09.000Z',
            durationMs: 1000,
          },
          {
            key: 'amazon_open',
            label: 'Open Amazon candidate',
            group: 'amazon',
            attempt: 2,
            candidateId: 'image-2',
            candidateRank: 2,
            inputSource: null,
            retryOf: null,
            resultCode: 'candidate_open_start',
            status: 'running',
            message: 'Opening Amazon candidate page.',
            warning: null,
            details: [],
            url: 'https://www.amazon.com/dp/B00TEST456',
            startedAt: '2026-04-11T10:00:10.000Z',
            completedAt: null,
            durationMs: null,
          },
        ]}
      />
    );

    expect(screen.getAllByText('Language gate').length).toBeGreaterThan(0);
    expect(screen.getByText('Language rejection recovery')).toBeInTheDocument();
    expect(screen.getByText('Language recovery attempt')).toBeInTheDocument();
    expect(
      screen.getByText('Continues after language rejection of https://www.amazon.de/dp/B00TEST123.')
    ).toBeInTheDocument();
  });
});
