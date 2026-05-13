import { describe, expect, it } from 'vitest';

import { buildCarrierTrackingUrl } from './carrier-tracking';

describe('buildCarrierTrackingUrl', () => {
  it('builds DPD tracking links from a tracking number', () => {
    expect(buildCarrierTrackingUrl('dpd', ' 0000 1111 2222 3A ')).toBe(
      'https://tracktrace.dpd.com.pl/parcelDetails?p1=0000111122223A&typ=1',
    );
  });

  it('builds Poczta Polska eMonitoring links from a tracking number', () => {
    expect(buildCarrierTrackingUrl('poczta_polska', ' RR123456789PL ')).toBe(
      'https://emonitoring.poczta-polska.pl/?numer=RR123456789PL',
    );
  });

  it('does not infer links for unsupported carriers or empty numbers', () => {
    expect(buildCarrierTrackingUrl('manual', 'TRACK123')).toBeUndefined();
    expect(buildCarrierTrackingUrl('dpd', '   ')).toBeUndefined();
  });
});
