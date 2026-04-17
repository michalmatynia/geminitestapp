import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProductScanAmazonCandidateSelectionPanel } from './ProductScanAmazonCandidateSelectionPanel';

describe('ProductScanAmazonCandidateSelectionPanel', () => {
  it('renders candidate previews and triggers extraction', async () => {
    const onExtractCandidate = vi.fn().mockResolvedValue(undefined);

    render(
      <ProductScanAmazonCandidateSelectionPanel
        scan={
          {
            id: 'scan-1',
            provider: 'amazon',
            amazonDetails: null,
            asin: null,
            rawResult: {
              candidatePreviews: [
                {
                  id: 'candidate-1',
                  matchedImageId: 'image-1',
                  url: 'https://www.amazon.com/dp/B0001',
                  title: 'Amazon candidate title',
                  asin: 'B0001',
                  marketplaceDomain: 'www.amazon.com',
                  rank: 1,
                },
              ],
            },
          } as never
        }
        onExtractCandidate={onExtractCandidate}
      />
    );

    expect(screen.getByText('Candidates for extraction')).toBeInTheDocument();
    expect(screen.getByText('Amazon candidate title')).toBeInTheDocument();
    expect(screen.getByText('ASIN B0001')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Extract this candidate' }));

    expect(onExtractCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'candidate-1',
        matchedImageId: 'image-1',
        url: 'https://www.amazon.com/dp/B0001',
      })
    );
  });
});
