import { isProductScanActiveStatus } from '@/shared/contracts/product-scans';

import {
  AMAZON_IMAGE_SEARCH_PAGE_OPTIONS,
  CUSTOM_AMAZON_IMAGE_SEARCH_PAGE_VALUE,
} from './ProductScanModal.constants';
import type { ScanModalRow } from './ProductScanModal.types';

export const resolveAmazonImageSearchPageSelectValue = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return '';
  return AMAZON_IMAGE_SEARCH_PAGE_OPTIONS.some((option) => option.value === trimmed)
    ? trimmed
    : CUSTOM_AMAZON_IMAGE_SEARCH_PAGE_VALUE;
};

export const formatTimestamp = (value: string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return 'Unknown time';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) === true) return value;
  return parsed.toLocaleString();
};

export const formatPlaywrightBrowserLabel = (
  value: 'auto' | 'brave' | 'chrome' | 'chromium' | null | undefined
): string => {
  if (value === 'brave') return 'Brave';
  if (value === 'chrome') return 'Chrome';
  if (value === 'chromium') return 'Chromium';
  return 'Auto';
};

export const formatPlaywrightIdentityProfileLabel = (
  value: 'default' | 'search' | 'marketplace' | null | undefined
): string => {
  if (value === 'search') return 'Search';
  if (value === 'marketplace') return 'Marketplace';
  return 'Default';
};

type PlaywrightPostureConnection = {
  playwrightBrowser?: 'auto' | 'brave' | 'chrome' | 'chromium' | null;
  playwrightIdentityProfile?: 'default' | 'search' | 'marketplace' | null;
  playwrightPersonaId?: string | null;
  playwrightHumanizeMouse?: boolean;
};

const resolvePersonaWarning = (connection: PlaywrightPostureConnection): string | null => {
  const personaId = connection.playwrightPersonaId;
  const personaIdValue =
    typeof personaId === 'string' && personaId.trim() !== '' ? personaId.trim() : null;
  if (personaIdValue !== null) return null;
  return 'No Playwright persona is configured for this 1688 profile.';
};

const resolveIdentityProfileWarning = (
  connection: PlaywrightPostureConnection
): string | null => {
  const identityProfile = connection.playwrightIdentityProfile ?? 'default';
  if (identityProfile === 'marketplace') return null;
  return `Identity profile is ${formatPlaywrightIdentityProfileLabel(
    identityProfile
  )}. 1688 is more reliable with Marketplace posture.`;
};

const resolveBrowserWarning = (connection: PlaywrightPostureConnection): string | null => {
  const browser = connection.playwrightBrowser ?? 'auto';
  if (browser !== 'auto') return null;
  return 'Browser is set to Auto. Runtime browser choice can vary between runs.';
};

const resolveHumanizedInputWarning = (
  connection: PlaywrightPostureConnection
): string | null => {
  if (connection.playwrightHumanizeMouse !== false) return null;
  return 'Humanized input is disabled for this 1688 profile.';
};

export const resolve1688PostureWarnings = (
  connection: PlaywrightPostureConnection | null
): string[] => {
  if (connection === null) return [];
  return [
    resolvePersonaWarning(connection),
    resolveIdentityProfileWarning(connection),
    resolveBrowserWarning(connection),
    resolveHumanizedInputWarning(connection),
  ].filter((warning): warning is string => typeof warning === 'string');
};

export const isDiscoveredScanCurrentForRow = (
  row: ScanModalRow,
  discoveredScan: ScanModalRow['scan']
): discoveredScan is NonNullable<ScanModalRow['scan']> => {
  if (discoveredScan === null) return false;
  if (isProductScanActiveStatus(discoveredScan.status)) return true;

  const requestedAtTs = Date.parse(row.requestedAt);
  const discoveredCreatedAt = discoveredScan.createdAt;
  const createdAtTs = typeof discoveredCreatedAt === 'string' ? Date.parse(discoveredCreatedAt) : NaN;
  if (Number.isFinite(requestedAtTs) === false || Number.isFinite(createdAtTs) === false) {
    return false;
  }
  return createdAtTs >= requestedAtTs - 1_000;
};
