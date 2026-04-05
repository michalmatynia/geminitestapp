import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BaseQuickExportFailureBanner } from './BaseQuickExportFailureBanner';

describe('BaseQuickExportFailureBanner', () => {
  it('renders provided Base quick-export failure details', () => {
    render(
      <BaseQuickExportFailureBanner status='failed' runId='run-base-failed-99' />
    );

    expect(screen.getByText('Previous Base.com export failed')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
    expect(screen.getByText('run-base-failed-99')).toBeInTheDocument();
  });

  it('renders fallback values when details are unavailable', () => {
    render(<BaseQuickExportFailureBanner status={null} runId={null} />);

    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
  });
});
