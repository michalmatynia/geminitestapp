import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ImageStudioAnalysisSummaryChip } from '@/features/ai/image-studio/components/ImageStudioAnalysisSummaryChip';

describe('ImageStudioAnalysisSummaryChip', () => {
  it('renders core analysis summary fields', () => {
    render(
      <ImageStudioAnalysisSummaryChip
        label='Analysis Summary'
        data={{
          detectionUsed: 'alpha_bbox',
          confidence: 0.8123,
          fallbackApplied: false,
          policyReason: 'alpha_confident',
          policyVersion: 'policy_v2',
        }}
      />
    );

    expect(screen.getByText('Analysis Summary')).toBeInTheDocument();
    expect(screen.getByText('alpha_bbox')).toBeInTheDocument();
    expect(screen.getByText('Confidence 81.2%')).toBeInTheDocument();
    expect(screen.getByText('Fallback no')).toBeInTheDocument();
    expect(screen.getByText('policy_v2')).toBeInTheDocument();
    expect(screen.getByText('alpha_confident')).toBeInTheDocument();
  });

  it('shows stale state marker text', () => {
    render(
      <ImageStudioAnalysisSummaryChip
        stale
        data={{
          detectionUsed: 'white_bg_first_colored_pixel',
          confidence: 0.2,
          fallbackApplied: true,
          policyReason: 'white_fallback',
          policyVersion: 'policy_v2',
        }}
      />
    );

    expect(screen.getByText('Stale: white_fallback')).toBeInTheDocument();
  });
});
