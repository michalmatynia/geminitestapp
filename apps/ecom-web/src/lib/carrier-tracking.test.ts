import { beforeEach, describe, expect, it, vi } from 'vitest';

const providerMocks = vi.hoisted(() => ({
  readDpdProviderSettings: vi.fn(),
  readPocztaPolskaProviderSettings: vi.fn(),
}));

vi.mock('@/lib/providerSettings', () => ({
  readDpdProviderSettings: providerMocks.readDpdProviderSettings,
  readPocztaPolskaProviderSettings: providerMocks.readPocztaPolskaProviderSettings,
}));

import { buildCarrierTrackingUrl } from './carrier-tracking';

describe('buildCarrierTrackingUrl', () => {
  beforeEach(() => {
    providerMocks.readDpdProviderSettings.mockReset();
    providerMocks.readPocztaPolskaProviderSettings.mockReset();
    providerMocks.readDpdProviderSettings.mockResolvedValue(null);
    providerMocks.readPocztaPolskaProviderSettings.mockResolvedValue(null);
  });

  it('builds DPD tracking links from a tracking number', async () => {
    await expect(buildCarrierTrackingUrl('dpd', ' 0000 1111 2222 3A ')).resolves.toBe(
      'https://tracktrace.dpd.com.pl/parcelDetails?p1=0000111122223A&typ=1',
    );
  });

  it('builds Poczta Polska eMonitoring links from a tracking number', async () => {
    await expect(buildCarrierTrackingUrl('poczta_polska', ' RR123456789PL ')).resolves.toBe(
      'https://emonitoring.poczta-polska.pl/?numer=RR123456789PL',
    );
  });

  it('uses pushed DPD tracking templates before built-in defaults', async () => {
    providerMocks.readDpdProviderSettings.mockResolvedValue({
      accountNumber: '',
      apiUrl: '',
      enabled: true,
      password: '',
      trackingUrlTemplate: 'https://dpd.example.test/track/{trackingNumber}',
      username: '',
    });

    await expect(buildCarrierTrackingUrl('dpd', 'DPD 123')).resolves.toBe(
      'https://dpd.example.test/track/DPD123',
    );
  });

  it('does not infer DPD links when pushed provider settings disable DPD', async () => {
    providerMocks.readDpdProviderSettings.mockResolvedValue({
      accountNumber: '',
      apiUrl: '',
      enabled: false,
      password: '',
      trackingUrlTemplate: 'https://dpd.example.test/track/{trackingNumber}',
      username: '',
    });

    await expect(buildCarrierTrackingUrl('dpd', 'DPD123')).resolves.toBeUndefined();
  });

  it('uses pushed Poczta Polska tracking templates before built-in defaults', async () => {
    providerMocks.readPocztaPolskaProviderSettings.mockResolvedValue({
      apiUrl: '',
      cardNumber: '',
      enabled: true,
      password: '',
      trackingUrlTemplate: 'https://poczta.example.test/find?number={tracking_number}',
      username: '',
    });

    await expect(buildCarrierTrackingUrl('poczta_polska', ' RR123456789PL ')).resolves.toBe(
      'https://poczta.example.test/find?number=RR123456789PL',
    );
  });

  it('does not infer Poczta Polska links when pushed provider settings disable Poczta Polska', async () => {
    providerMocks.readPocztaPolskaProviderSettings.mockResolvedValue({
      apiUrl: '',
      cardNumber: '',
      enabled: false,
      password: '',
      trackingUrlTemplate: 'https://poczta.example.test/find?number={tracking_number}',
      username: '',
    });

    await expect(buildCarrierTrackingUrl('poczta_polska', 'RR123456789PL')).resolves.toBeUndefined();
  });

  it('does not infer links for unsupported carriers or empty numbers', async () => {
    await expect(buildCarrierTrackingUrl('manual', 'TRACK123')).resolves.toBeUndefined();
    await expect(buildCarrierTrackingUrl('dpd', '   ')).resolves.toBeUndefined();
  });
});
