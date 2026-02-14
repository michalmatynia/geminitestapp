import 'server-only';

import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import {
  chromium,
  devices,
  type BrowserContextOptions,
  type Page,
} from 'playwright';

import {
  DEFAULT_TRADERA_SYSTEM_SETTINGS,
  resolveTraderaSystemSettings,
  TRADERA_SETTINGS_KEYS,
  type TraderaSystemSettings,
} from '@/features/integrations/constants/tradera';
import { decryptSecret } from '@/features/integrations/server';
import {
  findProductListingByIdAcrossProviders,
  getIntegrationRepository,
} from '@/features/integrations/server';
import type { IntegrationConnectionRecord } from '@/features/integrations/types/integrations';
import type { ProductListingRecord } from '@/features/integrations/types/listings';
import { ErrorSystem } from '@/features/observability/server';
import {
  defaultPlaywrightSettings,
  PLAYWRIGHT_PERSONA_SETTINGS_KEY,
} from '@/features/playwright/constants/playwright';
import { getProductRepository, getSettingValue } from '@/features/products/server';
import { internalError, notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { parseJsonSetting } from '@/shared/utils/settings-json';

type PersistedStorageState = NonNullable<
  Exclude<BrowserContextOptions['storageState'], string>
>;

export type TraderaListingJobInput = {
  listingId: string;
  action: 'list' | 'relist';
  source?: 'manual' | 'scheduler' | 'api';
  jobId?: string;
};

type TraderaListingResult = {
  externalListingId: string;
  listingUrl?: string;
  simulated?: boolean;
};

export type TraderaCategoryRecord = {
  id: string;
  name: string;
  parentId: string;
};

const LOGIN_SUCCESS_SELECTOR = [
  'a[href*="logout"]',
  'a:has-text("Logga ut")',
  'a:has-text("Logout")',
  'a:has-text("Mina sidor")',
  'a:has-text("My pages")',
  'a[href*="/profile"]',
].join(', ');

const LOGIN_FORM_SELECTOR = [
  '#sign-in-form',
  'form[data-sign-in-form="true"]',
  'form[action*="login"]',
].join(', ');

const USERNAME_SELECTORS = ['#email', 'input[name="email"]', 'input[type="email"]'];
const PASSWORD_SELECTORS = ['#password', 'input[name="password"]', 'input[type="password"]'];
const LOGIN_BUTTON_SELECTORS = [
  'button[data-login-submit="true"]',
  '#sign-in-form button[type="submit"]',
  'button:has-text("Sign in")',
  'button:has-text("Logga in")',
];

const TITLE_SELECTORS = ['input[name="title"]', '#title', '[data-testid*="title"] input'];
const DESCRIPTION_SELECTORS = ['textarea[name="description"]', '#description', '[data-testid*="description"] textarea'];
const PRICE_SELECTORS = ['input[name="price"]', '#price', 'input[data-testid*="price"]'];
const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'button:has-text("Publicera")',
  'button:has-text("Publish")',
  'button:has-text("Lägg upp")',
];

type TraderaFailureCategory =
  | 'AUTH'
  | 'FORM'
  | 'SELECTOR'
  | 'NAVIGATION'
  | 'UNKNOWN';

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const classifyTraderaFailure = (message: string): TraderaFailureCategory => {
  const normalized = message.trim().toLowerCase();
  if (
    normalized.includes('auth_required') ||
    normalized.includes('login failed') ||
    normalized.includes('manual verification') ||
    normalized.includes('captcha') ||
    normalized.includes('two-factor') ||
    normalized.includes('2fa')
  ) {
    return 'AUTH';
  }
  if (normalized.includes('navigation') || normalized.includes('timeout')) {
    return 'NAVIGATION';
  }
  if (normalized.includes('selector') || normalized.includes('not found')) {
    return 'SELECTOR';
  }
  if (normalized.includes('form')) {
    return 'FORM';
  }
  return 'UNKNOWN';
};

const toUserFacingTraderaFailure = (
  category: TraderaFailureCategory,
  message: string
): string => {
  if (category === 'AUTH') {
    return 'Tradera login requires manual verification. Open login window and retry.';
  }
  return message;
};

const toTruthyBoolean = (value: string | null | undefined, fallback: boolean): boolean => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const parseSettingsFromMap = (map: Map<string, string>): TraderaSystemSettings =>
  resolveTraderaSystemSettings({
    get: (key: string): string | null => map.get(key) ?? null,
  });

const loadTraderaSystemSettings = async (): Promise<TraderaSystemSettings> => {
  const keys = Object.values(TRADERA_SETTINGS_KEYS);
  const values = await Promise.all(
    keys.map(async (key: string) => [key, await getSettingValue(key)] as const)
  );
  const map = new Map<string, string>();
  for (const [key, value] of values) {
    if (typeof value === 'string') {
      map.set(key, value);
    }
  }
  return parseSettingsFromMap(map);
};

type TraderaPlaywrightRuntimeSettings = {
  headless: boolean;
  slowMo: number;
  timeout: number;
  navigationTimeout: number;
  proxyEnabled: boolean;
  proxyServer: string;
  proxyUsername: string;
  proxyPassword: string;
  emulateDevice: boolean;
  deviceName: string;
};

const parsePersistedStorageState = (
  encryptedValue: string | null | undefined
): PersistedStorageState | null => {
  if (!encryptedValue) return null;
  try {
    const raw = decryptSecret(encryptedValue);
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as { cookies?: unknown[] }).cookies) &&
      Array.isArray((parsed as { origins?: unknown[] }).origins)
    ) {
      return {
        cookies: (parsed as PersistedStorageState).cookies,
        origins: (parsed as PersistedStorageState).origins,
      };
    }
  } catch {
    return null;
  }
  return null;
};

const toBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const toFiniteNumber = (
  value: unknown,
  fallback: number,
  min = 0
): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(min, Math.floor(value));
  }
  return fallback;
};

const toTrimmedString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.trim() : fallback;

const findPersonaSettings = (
  raw: unknown,
  personaId: string
): Record<string, unknown> | null => {
  if (!Array.isArray(raw)) return null;
  for (const persona of raw) {
    if (!persona || typeof persona !== 'object') continue;
    const id = (persona as { id?: unknown }).id;
    if (typeof id !== 'string' || id !== personaId) continue;
    const settings = (persona as { settings?: unknown }).settings;
    if (!settings || typeof settings !== 'object') return null;
    return settings as Record<string, unknown>;
  }
  return null;
};

const resolveConnectionPlaywrightSettings = async (
  connection: IntegrationConnectionRecord
): Promise<TraderaPlaywrightRuntimeSettings> => {
  const base: TraderaPlaywrightRuntimeSettings = {
    headless: connection.playwrightHeadless ?? defaultPlaywrightSettings.headless,
    slowMo: connection.playwrightSlowMo ?? defaultPlaywrightSettings.slowMo,
    timeout: connection.playwrightTimeout ?? defaultPlaywrightSettings.timeout,
    navigationTimeout:
      connection.playwrightNavigationTimeout ??
      defaultPlaywrightSettings.navigationTimeout,
    proxyEnabled:
      connection.playwrightProxyEnabled ?? defaultPlaywrightSettings.proxyEnabled,
    proxyServer: connection.playwrightProxyServer?.trim() ?? '',
    proxyUsername: connection.playwrightProxyUsername?.trim() ?? '',
    proxyPassword: connection.playwrightProxyPassword
      ? decryptSecret(connection.playwrightProxyPassword)
      : '',
    emulateDevice:
      connection.playwrightEmulateDevice ??
      defaultPlaywrightSettings.emulateDevice,
    deviceName:
      connection.playwrightDeviceName ?? defaultPlaywrightSettings.deviceName,
  };

  const personaId = connection.playwrightPersonaId?.trim();
  if (!personaId) return base;

  const raw = await getSettingValue(PLAYWRIGHT_PERSONA_SETTINGS_KEY);
  const parsed = parseJsonSetting<unknown>(raw, null);
  const personaSettings = findPersonaSettings(parsed, personaId);
  if (!personaSettings) return base;

  const personaProxyPassword = toTrimmedString(
    personaSettings['proxyPassword'],
    ''
  );

  return {
    headless: toBoolean(personaSettings['headless'], base.headless),
    slowMo: toFiniteNumber(personaSettings['slowMo'], base.slowMo, 0),
    timeout: toFiniteNumber(personaSettings['timeout'], base.timeout, 1000),
    navigationTimeout: toFiniteNumber(
      personaSettings['navigationTimeout'],
      base.navigationTimeout,
      1000
    ),
    proxyEnabled: toBoolean(personaSettings['proxyEnabled'], base.proxyEnabled),
    proxyServer: toTrimmedString(personaSettings['proxyServer'], base.proxyServer),
    proxyUsername: toTrimmedString(
      personaSettings['proxyUsername'],
      base.proxyUsername
    ),
    proxyPassword: personaProxyPassword || base.proxyPassword,
    emulateDevice: toBoolean(personaSettings['emulateDevice'], base.emulateDevice),
    deviceName: toTrimmedString(personaSettings['deviceName'], base.deviceName),
  };
};

const resolveConnectionListingSettings = (
  connection: IntegrationConnectionRecord,
  systemSettings: TraderaSystemSettings
): {
  durationHours: number;
  autoRelistEnabled: boolean;
  autoRelistLeadMinutes: number;
  templateId: string | null;
} => ({
  durationHours:
    connection.traderaDefaultDurationHours ??
    systemSettings.defaultDurationHours,
  autoRelistEnabled:
    connection.traderaAutoRelistEnabled ?? systemSettings.autoRelistEnabled,
  autoRelistLeadMinutes:
    connection.traderaAutoRelistLeadMinutes ??
    systemSettings.autoRelistLeadMinutes,
  templateId: connection.traderaDefaultTemplateId ?? null,
});

const buildRelistPolicy = (settings: {
  durationHours: number;
  autoRelistEnabled: boolean;
  autoRelistLeadMinutes: number;
  templateId: string | null;
}): Record<string, unknown> => ({
  enabled: settings.autoRelistEnabled,
  durationHours: settings.durationHours,
  leadMinutes: settings.autoRelistLeadMinutes,
  templateId: settings.templateId,
});

const toPolicyRecord = (
  value: ProductListingRecord['relistPolicy']
): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
};

const parsePolicyBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const parsePolicyInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.floor(parsed);
  }
  return null;
};

const parsePolicyTemplateId = (
  value: unknown
): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.toLowerCase() === 'none') return null;
  return normalized;
};

const resolveEffectiveListingSettings = (
  listing: ProductListingRecord,
  connection: IntegrationConnectionRecord,
  systemSettings: TraderaSystemSettings
): {
  durationHours: number;
  autoRelistEnabled: boolean;
  autoRelistLeadMinutes: number;
  templateId: string | null;
} => {
  const fallback = resolveConnectionListingSettings(connection, systemSettings);
  const policy = toPolicyRecord(listing.relistPolicy);
  if (!policy) return fallback;

  const durationCandidate = parsePolicyInteger(policy['durationHours']);
  const leadMinutesCandidate = parsePolicyInteger(policy['leadMinutes']);
  const enabledCandidate = parsePolicyBoolean(policy['enabled']);
  const templateCandidate = parsePolicyTemplateId(policy['templateId']);

  return {
    durationHours:
      durationCandidate !== null && durationCandidate > 0
        ? durationCandidate
        : fallback.durationHours,
    autoRelistEnabled: enabledCandidate ?? fallback.autoRelistEnabled,
    autoRelistLeadMinutes:
      leadMinutesCandidate !== null && leadMinutesCandidate >= 0
        ? leadMinutesCandidate
        : fallback.autoRelistLeadMinutes,
    templateId:
      templateCandidate !== undefined ? templateCandidate : fallback.templateId,
  };
};

const resolveExpiry = (durationHours: number): Date => {
  const now = Date.now();
  return new Date(now + durationHours * 60 * 60 * 1000);
};

const resolveNextRelistAt = (
  expiresAt: Date,
  autoRelistEnabled: boolean,
  leadMinutes: number
): Date | null => {
  if (!autoRelistEnabled) return null;
  return new Date(expiresAt.getTime() - leadMinutes * 60 * 1000);
};

const captureTraderaListingDebugArtifacts = async (
  page: Page,
  listingId: string,
  action: 'list' | 'relist'
): Promise<string | null> => {
  try {
    const now = new Date().toISOString().replace(/[:.]/g, '-');
    const baseDir = path.join(process.cwd(), 'playwright-debug', 'tradera');
    await mkdir(baseDir, { recursive: true });
    const prefix = `${listingId}-${action}-${now}`;
    const screenshotPath = path.join(baseDir, `${prefix}.png`);
    const htmlPath = path.join(baseDir, `${prefix}.html`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    const html = await page.content();
    await writeFile(htmlPath, html, 'utf8');
    return `Screenshot: ${screenshotPath}\nHTML: ${htmlPath}`;
  } catch {
    return null;
  }
};

const findVisibleLocator = async (page: Page, selectors: string[]) => {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) === 0) continue;
    if (await locator.isVisible().catch(() => false)) return locator;
  }
  return null;
};

const ensureLoggedIn = async (
  page: Page,
  connection: IntegrationConnectionRecord,
  listingFormUrl: string
): Promise<void> => {
  const isLoggedIn = async (): Promise<boolean> =>
    page.locator(LOGIN_SUCCESS_SELECTOR).first().isVisible().catch(() => false);

  await page.goto('https://www.tradera.com/en', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  if (await isLoggedIn()) return;

  await page.goto('https://www.tradera.com/login', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await page.waitForSelector(LOGIN_FORM_SELECTOR, {
    state: 'attached',
    timeout: 20_000,
  });

  const usernameInput = await findVisibleLocator(page, USERNAME_SELECTORS);
  const passwordInput = await findVisibleLocator(page, PASSWORD_SELECTORS);
  if (!usernameInput || !passwordInput) {
    throw internalError('Unable to locate Tradera login inputs.');
  }

  const decryptedPassword = decryptSecret(connection.password);
  await usernameInput.fill(connection.username);
  await passwordInput.fill(decryptedPassword);

  const submitButton = await findVisibleLocator(page, LOGIN_BUTTON_SELECTORS);
  if (!submitButton) {
    throw internalError('Unable to locate Tradera login submit button.');
  }

  await Promise.allSettled([
    page.waitForNavigation({
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    }),
    submitButton.click(),
  ]);

  if (!(await isLoggedIn())) {
    throw internalError(
      'AUTH_REQUIRED: Tradera login failed or requires manual verification.'
    );
  }

  await page.goto(listingFormUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
};

const extractExternalListingId = (url: string): string | null => {
  const match = url.match(/(\d{6,})/);
  if (!match?.[1]) return null;
  return match[1];
};

const runTraderaBrowserListing = async ({
  listing,
  connection,
  systemSettings,
  source,
  action,
}: {
  listing: ProductListingRecord;
  connection: IntegrationConnectionRecord;
  systemSettings: TraderaSystemSettings;
  source: 'manual' | 'scheduler' | 'api';
  action: 'list' | 'relist';
}): Promise<TraderaListingResult> => {
  const listingFormUrl = systemSettings.listingFormUrl;
  const storageState = parsePersistedStorageState(
    connection.playwrightStorageState
  );
  const playwrightSettings =
    await resolveConnectionPlaywrightSettings(connection);
  const emulateDevice = playwrightSettings.emulateDevice;
  const deviceName = playwrightSettings.deviceName;
  const deviceProfile =
    emulateDevice && deviceName && devices[deviceName]
      ? devices[deviceName]
      : null;

  const browser = await chromium.launch({
    headless: playwrightSettings.headless,
    slowMo: playwrightSettings.slowMo,
    ...(playwrightSettings.proxyEnabled && playwrightSettings.proxyServer
      ? {
        proxy: {
          server: playwrightSettings.proxyServer,
          ...(playwrightSettings.proxyUsername
            ? { username: playwrightSettings.proxyUsername }
            : {}),
          ...(playwrightSettings.proxyPassword
            ? { password: playwrightSettings.proxyPassword }
            : {}),
        },
      }
      : {}),
  });

  const deviceContextOptions: BrowserContextOptions = deviceProfile
    ? (({ defaultBrowserType: _ignore, ...rest }) => rest)(deviceProfile)
    : {};

  const context = await browser.newContext({
    ...deviceContextOptions,
    ...(storageState ? { storageState } : {}),
  });
  context.setDefaultTimeout(playwrightSettings.timeout);
  context.setDefaultNavigationTimeout(playwrightSettings.navigationTimeout);

  const page = await context.newPage();
  try {
    await ensureLoggedIn(page, connection, listingFormUrl);

    const productRepository = await getProductRepository();
    const product = await productRepository.getProductById(listing.productId);
    if (!product) {
      throw notFoundError('Product not found', { productId: listing.productId });
    }

    const title =
      product.name_en ||
      product.name_pl ||
      product.name_de ||
      product.sku ||
      `Listing ${listing.productId}`;
    const description =
      product.description_en ||
      product.description_pl ||
      product.description_de ||
      title;
    const priceValue =
      typeof product.price === 'number' && Number.isFinite(product.price)
        ? String(product.price)
        : '1';

    const titleInput = await findVisibleLocator(page, TITLE_SELECTORS);
    const descriptionInput = await findVisibleLocator(page, DESCRIPTION_SELECTORS);
    const priceInput = await findVisibleLocator(page, PRICE_SELECTORS);
    const submitButton = await findVisibleLocator(page, SUBMIT_SELECTORS);

    if (!titleInput || !descriptionInput || !priceInput || !submitButton) {
      throw internalError(
        'Tradera listing form selectors were not found. Update Tradera selector settings.'
      );
    }

    await titleInput.fill(title);
    await descriptionInput.fill(description);
    await priceInput.fill(priceValue);

    const previousUrl = page.url();
    await Promise.allSettled([
      page.waitForNavigation({
        waitUntil: 'domcontentloaded',
        timeout: 25_000,
      }),
      submitButton.click(),
    ]);

    const finalUrl = page.url();
    const externalListingId = extractExternalListingId(finalUrl);
    if (externalListingId) {
      return { externalListingId, listingUrl: finalUrl };
    }

    if (systemSettings.allowSimulatedSuccess) {
      const maybeListingUrl = finalUrl !== previousUrl ? finalUrl : null;
      return {
        externalListingId: `sim-${Date.now()}`,
        simulated: true,
        ...(maybeListingUrl ? { listingUrl: maybeListingUrl } : {}),
      };
    }

    throw internalError(
      `Failed to resolve Tradera listing id after ${action} (source: ${source}).`
    );
  } catch (error) {
    const debugArtifacts = await captureTraderaListingDebugArtifacts(
      page,
      listing.id,
      action
    );
    if (debugArtifacts) {
      const message = error instanceof Error ? error.message : String(error);
      throw internalError(`${message}\n\nDebug:\n${debugArtifacts}`);
    }
    throw error;
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
};

export const fetchTraderaCategoriesForConnection = async (
  connection: IntegrationConnectionRecord
): Promise<TraderaCategoryRecord[]> => {
  const systemSettings = await loadTraderaSystemSettings();
  const listingFormUrl = systemSettings.listingFormUrl;

  const storageState = parsePersistedStorageState(
    connection.playwrightStorageState
  );
  const playwrightSettings =
    await resolveConnectionPlaywrightSettings(connection);
  const emulateDevice = playwrightSettings.emulateDevice;
  const deviceName = playwrightSettings.deviceName;
  const deviceProfile =
    emulateDevice && deviceName && devices[deviceName]
      ? devices[deviceName]
      : null;

  const browser = await chromium.launch({
    headless: playwrightSettings.headless,
    slowMo: playwrightSettings.slowMo,
    ...(playwrightSettings.proxyEnabled && playwrightSettings.proxyServer
      ? {
        proxy: {
          server: playwrightSettings.proxyServer,
          ...(playwrightSettings.proxyUsername
            ? { username: playwrightSettings.proxyUsername }
            : {}),
          ...(playwrightSettings.proxyPassword
            ? { password: playwrightSettings.proxyPassword }
            : {}),
        },
      }
      : {}),
  });
  const deviceContextOptions: BrowserContextOptions = deviceProfile
    ? (({ defaultBrowserType: _ignore, ...rest }) => rest)(deviceProfile)
    : {};
  const context = await browser.newContext({
    ...deviceContextOptions,
    ...(storageState ? { storageState } : {}),
  });
  context.setDefaultTimeout(playwrightSettings.timeout);
  context.setDefaultNavigationTimeout(playwrightSettings.navigationTimeout);
  const page = await context.newPage();

  try {
    await ensureLoggedIn(page, connection, listingFormUrl);

    const categorySelect = await findVisibleLocator(page, [
      'select[name*="category"]',
      '#category',
      '[data-testid*="category"] select',
    ]);
    if (!categorySelect) {
      throw internalError('Could not locate category selector on Tradera listing form.');
    }

    const options = await categorySelect
      .locator('option')
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          id: (node as HTMLOptionElement).value ?? '',
          name: node.textContent?.trim() ?? '',
        }))
      );

    return options
      .filter((option) => option.id && option.name)
      .map((option) => ({
        id: option.id,
        name: option.name,
        parentId: '0',
      }));
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
};

const findDueRelistsInMongo = async (limit: number): Promise<string[]> => {
  if (!process.env['MONGODB_URI']) return [];
  const db = await getMongoDb();
  const traderaIntegrations = await db
    .collection<{ _id: string; slug: string }>('integrations')
    .find({ slug: { $regex: /^tradera$/i } }, { projection: { _id: 1 } })
    .toArray();
  if (traderaIntegrations.length === 0) return [];

  const now = new Date();
  const listings = await db
    .collection<{
      _id: string;
      integrationId: string;
      status: string;
      nextRelistAt?: Date | null;
    }>('product_listings')
    .find({
      integrationId: { $in: traderaIntegrations.map((i) => i._id) },
      status: { $in: ['active', 'queued_relist'] },
      nextRelistAt: { $ne: null, $lte: now },
    })
    .sort({ nextRelistAt: 1, updatedAt: 1 })
    .limit(limit)
    .toArray();

  return listings.map((listing) => listing._id);
};

const findDueRelistsInPrisma = async (limit: number): Promise<string[]> => {
  if (!process.env['DATABASE_URL']) return [];
  try {
    const rows = await prisma.$queryRawUnsafe(
      `
      SELECT pl.id
      FROM "ProductListing" pl
      INNER JOIN "Integration" i ON i.id = pl."integrationId"
      WHERE LOWER(i.slug) = 'tradera'
        AND pl.status IN ('active', 'queued_relist')
        AND pl."nextRelistAt" IS NOT NULL
        AND pl."nextRelistAt" <= NOW()
      ORDER BY pl."nextRelistAt" ASC, pl."updatedAt" ASC
      LIMIT $1
      `,
      limit
    );
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row: unknown) => {
        if (!row || typeof row !== 'object') return null;
        const id = (row as { id?: unknown }).id;
        return typeof id === 'string' ? id : null;
      })
      .filter((id): id is string => Boolean(id));
  } catch {
    return [];
  }
};

export const findDueTraderaRelistListingIds = async (
  limit = 20
): Promise<string[]> => {
  const [mongoIds, prismaIds] = await Promise.all([
    findDueRelistsInMongo(limit),
    findDueRelistsInPrisma(limit),
  ]);
  return Array.from(new Set([...mongoIds, ...prismaIds])).slice(0, limit);
};

export const processTraderaListingJob = async (
  input: TraderaListingJobInput
): Promise<void> => {
  const resolved = await findProductListingByIdAcrossProviders(input.listingId);
  if (!resolved) {
    throw notFoundError('Listing not found', { listingId: input.listingId });
  }
  const listing = resolved.listing;
  const listingRepository = resolved.repository;

  const integrationRepository = await getIntegrationRepository();
  const integration = await integrationRepository.getIntegrationById(
    listing.integrationId
  );
  if (integration?.slug.toLowerCase() !== 'tradera') {
    throw internalError('Listing is not connected to Tradera.');
  }

  const connection = await integrationRepository.getConnectionById(
    listing.connectionId
  );
  if (!connection) {
    throw notFoundError('Connection not found', {
      connectionId: listing.connectionId,
    });
  }

  const systemSettings = await loadTraderaSystemSettings();
  const listingSettings = resolveEffectiveListingSettings(
    listing,
    connection,
    systemSettings
  );
  const nextRelistAttempts =
    (listing.relistAttempts ?? 0) + (input.action === 'relist' ? 1 : 0);
  const source = input.source ?? 'api';
  const correlationId = `${input.action}:${listing.id}:${Date.now()}`;
  const existingMarketplaceData = toRecord(listing.marketplaceData);
  const existingTraderaData = toRecord(existingMarketplaceData['tradera']);

  await ErrorSystem.logInfo('Tradera listing job started', {
    service: 'tradera-listing-service',
    listingId: listing.id,
    productId: listing.productId,
    action: input.action,
    source,
    jobId: input.jobId ?? null,
    correlationId,
  });

  await listingRepository.updateListingStatus(listing.id, 'running');
  await listingRepository.updateListing(listing.id, {
    lastStatusCheckAt: new Date(),
    failureReason: null,
    marketplaceData: {
      ...existingMarketplaceData,
      tradera: {
        ...existingTraderaData,
        lastAction: input.action,
        source,
        status: 'running',
        jobId: input.jobId ?? null,
        correlationId,
        lastErrorCategory: null,
      },
    },
  });
  await listingRepository.appendExportHistory(listing.id, {
    exportedAt: new Date(),
    status: 'running',
    relist: input.action === 'relist',
  });

  try {
    const result = await runTraderaBrowserListing({
      listing,
      connection,
      systemSettings,
      source,
      action: input.action,
    });

    const expiresAt = resolveExpiry(listingSettings.durationHours);
    const nextRelistAt = resolveNextRelistAt(
      expiresAt,
      listingSettings.autoRelistEnabled,
      listingSettings.autoRelistLeadMinutes
    );
    await listingRepository.updateListingStatus(listing.id, 'active');
    await listingRepository.updateListing(listing.id, {
      externalListingId: result.externalListingId,
      expiresAt,
      nextRelistAt,
      relistPolicy: buildRelistPolicy(listingSettings),
      relistAttempts: nextRelistAttempts,
      lastRelistedAt: input.action === 'relist' ? new Date() : listing.lastRelistedAt ?? null,
      lastStatusCheckAt: new Date(),
      failureReason: null,
      marketplaceData: {
        ...existingMarketplaceData,
        tradera: {
          ...existingTraderaData,
          lastAction: input.action,
          source,
          status: 'active',
          simulated: Boolean(result.simulated),
          listingUrl: result.listingUrl ?? null,
          templateId: listingSettings.templateId,
          jobId: input.jobId ?? null,
          correlationId,
          lastErrorCategory: null,
        },
      },
    });
    await listingRepository.appendExportHistory(listing.id, {
      exportedAt: new Date(),
      status: 'active',
      externalListingId: result.externalListingId,
      templateId: listingSettings.templateId,
      expiresAt,
      relist: input.action === 'relist',
    });
    await ErrorSystem.logInfo('Tradera listing job completed', {
      service: 'tradera-listing-service',
      listingId: listing.id,
      productId: listing.productId,
      action: input.action,
      source,
      jobId: input.jobId ?? null,
      correlationId,
      externalListingId: result.externalListingId,
      simulated: Boolean(result.simulated),
    });
  } catch (error) {
    const rawMessage =
      error instanceof Error ? error.message : 'Unknown Tradera error';
    const failureCategory = classifyTraderaFailure(rawMessage);
    const message = toUserFacingTraderaFailure(failureCategory, rawMessage);
    const failureStatus = failureCategory === 'AUTH' ? 'needs_login' : 'failed';
    await listingRepository.updateListingStatus(listing.id, failureStatus);
    await listingRepository.updateListing(listing.id, {
      failureReason: message,
      lastStatusCheckAt: new Date(),
      relistAttempts: nextRelistAttempts,
      marketplaceData: {
        ...existingMarketplaceData,
        tradera: {
          ...existingTraderaData,
          lastAction: input.action,
          source,
          status: 'failed',
          jobId: input.jobId ?? null,
          correlationId,
          lastErrorCategory: failureCategory,
          lastErrorMessage: message,
        },
      },
    });
    await listingRepository.appendExportHistory(listing.id, {
      exportedAt: new Date(),
      status: failureStatus,
      failureReason: message,
      relist: input.action === 'relist',
    });
    await ErrorSystem.captureException(error, {
      service: 'tradera-listing-service',
      listingId: listing.id,
      action: input.action,
      source,
      productId: listing.productId,
      jobId: input.jobId ?? null,
      correlationId,
      failureCategory,
      category: failureCategory === 'AUTH' ? 'USER' : 'EXTERNAL',
    });
    throw internalError(message);
  }
};

export const shouldRunTraderaRelistScheduler = async (): Promise<boolean> => {
  const enabledSetting = await getSettingValue(
    TRADERA_SETTINGS_KEYS.schedulerEnabled
  );
  return toTruthyBoolean(
    enabledSetting,
    DEFAULT_TRADERA_SYSTEM_SETTINGS.schedulerEnabled
  );
};
