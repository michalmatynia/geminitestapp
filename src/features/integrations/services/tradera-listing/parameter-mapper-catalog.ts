import 'server-only';

import { isTraderaBrowserIntegrationSlug } from '@/features/integrations/constants/slugs';
import { loadTraderaSystemSettings } from '@/features/integrations/services/tradera-system-settings';
import { getExternalCategoryRepository, getIntegrationRepository } from '@/features/integrations/server';
import type {
  TraderaParameterMapperCatalogEntry,
  TraderaParameterMapperCatalogFetchResponse,
} from '@/shared/contracts/integrations/tradera-parameter-mapper';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

import { normalizeTraderaListingFormUrl } from '@/features/integrations/constants/tradera';
import { runPlaywrightListingScript } from '../playwright-listing/runner';
import {
  buildTraderaParameterMapperCatalogEntryId,
  buildTraderaParameterMapperFieldKey,
  parseTraderaParameterMapperCatalogPayload,
  parseTraderaParameterMapperCatalogJson,
  replaceTraderaParameterMapperCategoryFetchForCategory,
  replaceTraderaParameterMapperCatalogEntriesForCategory,
  serializeTraderaParameterMapperCatalog,
} from './parameter-mapper';

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const IGNORED_TRADERA_PARAMETER_MAPPER_FIELD_KEYS = new Set([
  'category',
  'condition',
  'department',
  'listingformat',
  'annonsformat',
  'delivery',
  'leverans',
  'shipping',
  'frakt',
]);

const DEFAULT_TRADERA_PARAMETER_MAPPER_CATALOG_SCRIPT = String.raw`export default async function run({
  page,
  input,
  emit,
}) {
  const wait = async (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, Math.max(0, Math.trunc(ms)));
    });

  const COOKIE_ACCEPT_SELECTORS = [
    '#onetrust-accept-btn-handler',
    'button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
    'button:has-text("Accept all cookies")',
    'button:has-text("Accept all")',
    'button:has-text("Acceptera alla cookies")',
    'button:has-text("Acceptera alla kakor")',
    'button:has-text("Godkänn alla cookies")',
    'button:has-text("Tillåt alla cookies")',
  ];

  const SKIP_FIELD_LABELS = [
    'condition',
    'department',
    'category',
    'listing format',
    'annonsformat',
    'delivery',
    'leverans',
    'shipping',
    'frakt',
  ];

  const normalizeWhitespace = (value) =>
    typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

  const normalizeLookupKey = (value) =>
    normalizeWhitespace(value)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');

  const isLikelyVisible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return (
      (rect.width > 0 || rect.height > 0) &&
      style.visibility !== 'hidden' &&
      style.display !== 'none'
    );
  };

  const acceptCookiesIfPresent = async () => {
    for (const selector of COOKIE_ACCEPT_SELECTORS) {
      const locator = page.locator(selector).first();
      const visible = await locator.isVisible().catch(() => false);
      if (!visible) continue;
      await locator.click().catch(() => undefined);
      await wait(600);
      return true;
    }
    return false;
  };

  const isAuthPage = async () => {
    const currentUrl = page.url().toLowerCase();
    if (
      currentUrl.includes('/login') ||
      currentUrl.includes('/captcha') ||
      currentUrl.includes('/challenge')
    ) {
      return true;
    }

    const loginFormVisible = await page
      .locator('form[action*="login"], input[type="password"]')
      .first()
      .isVisible()
      .catch(() => false);
    return loginFormVisible;
  };

  const deriveFieldLabel = (triggerText) => {
    const normalized = normalizeWhitespace(triggerText);
    if (!normalized) return '';
    return normalized.replace(/^(select|choose|välj|velg)\s+/i, '').trim();
  };

  const collectCandidateFields = async () =>
    page
      .locator(
        'button[aria-haspopup], button[aria-haspopup="listbox"], button[aria-haspopup="true"], [role="combobox"]'
      )
      .evaluateAll((elements, { skipFieldLabels }) => {
        const normalizeWhitespaceLocal = (value) =>
          typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
        const normalizeLookupKeyLocal = (value) =>
          normalizeWhitespaceLocal(value)
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '');
        const deriveFieldLabelLocal = (triggerText) => {
          const normalized = normalizeWhitespaceLocal(triggerText);
          if (!normalized) return '';
          return normalized.replace(/^(select|choose|välj|velg)\s+/i, '').trim();
        };
        const results = [];
        const seen = new Set();

        for (const element of elements) {
          if (element.closest('[data-test-category-chooser="true"]')) continue;
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          const visible =
            (rect.width > 0 || rect.height > 0) &&
            style.visibility !== 'hidden' &&
            style.display !== 'none';
          if (!visible) continue;

          const triggerText = normalizeWhitespaceLocal(
            element.getAttribute('aria-label') ||
              element.getAttribute('title') ||
              element.textContent ||
              ''
          );
          if (!triggerText) continue;

          const fieldLabel = deriveFieldLabelLocal(triggerText);
          const normalizedFieldKey = normalizeLookupKeyLocal(fieldLabel);
          if (!normalizedFieldKey || seen.has(normalizedFieldKey)) continue;
          if (skipFieldLabels.includes(normalizedFieldKey)) continue;
          if (!/^(select|choose|välj|velg)\s/i.test(triggerText)) continue;

          seen.add(normalizedFieldKey);
          results.push({
            triggerText,
            fieldLabel,
            fieldKey: normalizedFieldKey,
          });
        }

        return results;
      }, { skipFieldLabels: skipFieldLabels.map((label) => normalizeLookupKey(label)) })
      .catch(() => []);

  const clickTriggerByText = async (triggerText) => {
    const escaped = triggerText.replace(/[.*+?^\$()|[\]{}\\]/g, '\\$&');
    const exactPattern = new RegExp('^' + escaped + '$', 'i');
    const locator = page
      .locator(
        'button[aria-haspopup], button[aria-haspopup="listbox"], button[aria-haspopup="true"], [role="combobox"]'
      )
      .filter({ hasText: exactPattern })
      .first();
    const visible = await locator.isVisible().catch(() => false);
    if (visible) {
      await locator.click().catch(() => undefined);
      return true;
    }

    return page
      .evaluate((text) => {
        const candidates = document.querySelectorAll(
          'button[aria-haspopup], [role="combobox"]'
        );
        for (const element of candidates) {
          if (element.closest('[data-test-category-chooser="true"]')) continue;
          const normalized = (element.textContent || '').replace(/\s+/g, ' ').trim();
          if (normalized === text) {
            if (element instanceof HTMLElement) {
              element.click();
              return true;
            }
          }
        }
        return false;
      }, triggerText)
      .catch(() => false);
  };

  const readVisibleOptionLabels = async () =>
    page
      .evaluate(() => {
        const normalizeWhitespaceLocal = (value) =>
          typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
        const normalizeLookupKeyLocal = (value) =>
          normalizeWhitespaceLocal(value)
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '');
        const optionSelectors = [
          '[role="option"]',
          '[role="menuitem"]',
          '[role="menuitemradio"]',
          '[role="radio"]',
          '[data-radix-popper-content-wrapper] button',
          '[data-radix-popper-content-wrapper] [role="button"]',
        ];
        const candidates = document.querySelectorAll(optionSelectors.join(','));
        const results = [];
        const seen = new Set();

        for (const element of candidates) {
          if (element.closest('[data-test-category-chooser="true"]')) continue;
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          const visible =
            (rect.width > 0 || rect.height > 0) &&
            style.visibility !== 'hidden' &&
            style.display !== 'none';
          if (!visible) continue;

          const label = normalizeWhitespaceLocal(
            element.getAttribute('aria-label') ||
              element.getAttribute('title') ||
              element.textContent ||
              ''
          );
          const normalized = normalizeLookupKeyLocal(label);
          if (!label || !normalized || seen.has(normalized)) continue;
          seen.add(normalized);
          results.push(label);
        }

        return results;
      })
      .catch(() => []);

  const startUrl =
    typeof input?.startUrl === 'string' && input.startUrl.trim() ? input.startUrl.trim() : page.url();

  if (page.url() !== startUrl) {
    await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  }
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await wait(1_500);
  await acceptCookiesIfPresent();
  await wait(1_000);

  if (await isAuthPage()) {
    throw new Error('FAIL_AUTH_REQUIRED: Tradera login is required before fetching category field options.');
  }

  const fields = await collectCandidateFields();
  const entries = [];

  for (const field of fields) {
    const opened = await clickTriggerByText(field.triggerText);
    if (!opened) continue;
    await wait(500);

    const optionLabels = await readVisibleOptionLabels();
    await page.keyboard.press('Escape').catch(() => undefined);
    await wait(250);

    entries.push({
      fieldLabel: field.fieldLabel,
      fieldKey: field.fieldKey,
      optionLabels,
    });
  }

  emit('result', {
    entries,
    currentUrl: page.url(),
  });
}`;

const toCatalogEntries = ({
  externalCategoryId,
  externalCategoryName,
  externalCategoryPath,
  rawEntries,
  fetchedAt,
  runId,
}: {
  externalCategoryId: string;
  externalCategoryName: string;
  externalCategoryPath: string | null;
  rawEntries: unknown;
  fetchedAt: string;
  runId: string | null;
}): TraderaParameterMapperCatalogEntry[] => {
  if (!Array.isArray(rawEntries)) {
    return [];
  }

  const entries: TraderaParameterMapperCatalogEntry[] = [];
  const seen = new Set<string>();

  for (const entry of rawEntries) {
    const record =
      entry && typeof entry === 'object' && !Array.isArray(entry)
        ? (entry as Record<string, unknown>)
        : null;
    if (!record) continue;

    const fieldLabel = toTrimmedString(record['fieldLabel']);
    const fieldKey =
      buildTraderaParameterMapperFieldKey(toTrimmedString(record['fieldKey']) || fieldLabel) || '';
    if (
      !fieldLabel ||
      !fieldKey ||
      seen.has(fieldKey) ||
      IGNORED_TRADERA_PARAMETER_MAPPER_FIELD_KEYS.has(fieldKey)
    ) {
      continue;
    }

    const optionLabels = Array.isArray(record['optionLabels'])
      ? Array.from(
          new Set(
            record['optionLabels']
              .map((value) => toTrimmedString(value))
              .filter((value) => value.length > 0)
          )
        )
      : [];

    seen.add(fieldKey);
    entries.push({
      id: buildTraderaParameterMapperCatalogEntryId({
        externalCategoryId,
        fieldKey,
      }),
      externalCategoryId,
      externalCategoryName,
      externalCategoryPath,
      fieldLabel,
      fieldKey,
      optionLabels,
      source: 'playwright',
      fetchedAt,
      runId,
    });
  }

  return entries;
};

export const fetchAndStoreTraderaParameterMapperCatalog = async ({
  connectionId,
  externalCategoryId,
}: {
  connectionId: string;
  externalCategoryId: string;
}): Promise<TraderaParameterMapperCatalogFetchResponse> => {
  const integrationRepository = await getIntegrationRepository();
  const connection = await integrationRepository.getConnectionById(connectionId);
  if (!connection) {
    throw notFoundError('Tradera connection not found.', { connectionId });
  }

  const integration = await integrationRepository.getIntegrationById(connection.integrationId);
  if (!integration || !isTraderaBrowserIntegrationSlug(integration.slug)) {
    throw badRequestError(
      'Tradera parameter mapper is only available for browser Tradera connections.',
      {
        connectionId,
        integrationId: connection.integrationId,
        integrationSlug: integration?.slug ?? null,
      }
    );
  }

  const externalCategoryRepository = getExternalCategoryRepository();
  const category = await externalCategoryRepository.getByExternalId(connectionId, externalCategoryId);
  if (!category) {
    throw notFoundError('Tradera category not found for this connection.', {
      connectionId,
      externalCategoryId,
    });
  }

  const systemSettings = await loadTraderaSystemSettings();
  const categoryUrl = new URL(normalizeTraderaListingFormUrl(systemSettings.listingFormUrl));
  categoryUrl.searchParams.set('categoryId', externalCategoryId);

  const fetchedAt = new Date().toISOString();
  const runResult = await runPlaywrightListingScript({
    script: DEFAULT_TRADERA_PARAMETER_MAPPER_CATALOG_SCRIPT,
    input: {
      startUrl: categoryUrl.toString(),
      externalCategoryId,
    },
    connection,
    timeoutMs: 90_000,
    disableStartUrlBootstrap: false,
  });

  const nextEntries = toCatalogEntries({
    externalCategoryId,
    externalCategoryName: category.name,
    externalCategoryPath: category.path ?? null,
    rawEntries: runResult.rawResult['entries'],
    fetchedAt,
    runId: runResult.runId,
  });

  const existingCatalogPayload = parseTraderaParameterMapperCatalogPayload(
    connection.traderaParameterMapperCatalogJson
  );
  const existingEntries = parseTraderaParameterMapperCatalogJson(
    connection.traderaParameterMapperCatalogJson
  );
  const updatedEntries = replaceTraderaParameterMapperCatalogEntriesForCategory({
    existingEntries,
    externalCategoryId,
    nextEntries,
  });
  const updatedCategoryFetches = replaceTraderaParameterMapperCategoryFetchForCategory({
    existingCategoryFetches: existingCatalogPayload.categoryFetches,
    nextCategoryFetch: {
      externalCategoryId,
      externalCategoryName: category.name,
      externalCategoryPath: category.path ?? null,
      fetchedAt,
      fieldCount: nextEntries.length,
      runId: runResult.runId,
    },
  });

  await integrationRepository.updateConnection(connectionId, {
    traderaParameterMapperCatalogJson: serializeTraderaParameterMapperCatalog(
      updatedEntries,
      updatedCategoryFetches
    ),
  });

  const categoryLabel = toTrimmedString(category.path) || category.name;
  return {
    connectionId,
    externalCategoryId,
    entries: nextEntries,
    message:
      nextEntries.length > 0
        ? `Fetched ${nextEntries.length} additional Tradera field${nextEntries.length === 1 ? '' : 's'} for ${categoryLabel}.`
        : `No additional Tradera dropdown fields were detected for ${categoryLabel}.`,
  };
};
