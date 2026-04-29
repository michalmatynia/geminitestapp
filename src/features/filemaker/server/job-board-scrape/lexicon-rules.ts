import type { JobBoardProvider } from '@/shared/lib/job-board/job-board-providers';

export const normalizeLexiconLabel = (value: string): string =>
  value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

export const normalizeLexiconKey = (value: string): string =>
  normalizeLexiconLabel(value)
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const looksLikeAddressPill = (value: string): boolean =>
  /\d/.test(value) && value.includes(',') && normalizeLexiconKey(value).split(' ').length >= 3;

const PRACUJ_NOISE_PILL_KEYS = new Set<string>([
  'aplikuj',
  'aplikuj szybko',
  'aplikuj teraz',
  'asystent pracuj pl',
  'pracuj pl',
  'pracuj pl sp z o o',
]);

export const isProviderNoisePill = (label: string, provider: JobBoardProvider): boolean => {
  const normalized = normalizeLexiconKey(label);
  if (provider !== 'pracuj_pl') return false;
  if (PRACUJ_NOISE_PILL_KEYS.has(normalized)) return true;
  return normalized.includes('pracuj pl') && /asystent|konto|profil|rekruter/u.test(normalized);
};
