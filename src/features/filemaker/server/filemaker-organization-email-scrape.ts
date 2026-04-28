import 'server-only';
/* eslint-disable max-lines, max-lines-per-function, complexity, max-depth, no-await-in-loop */

import { randomUUID } from 'crypto';

import { createCustomPlaywrightInstance } from '@/features/playwright/server/instances';
import { runPlaywrightEngineTask } from '@/features/playwright/server/runtime';
import { notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { MongoFilemakerWebsite } from '../filemaker-websites.types';
import type { FilemakerOrganization } from '../types';
import {
  FILEMAKER_EMAIL_LINKS_COLLECTION,
  FILEMAKER_EMAILS_COLLECTION,
  ensureMongoFilemakerEmailIndexes,
  getMongoFilemakerEmailCollections,
  type MongoFilemakerEmailDocument,
  type MongoFilemakerEmailLinkDocument,
} from './filemaker-email-repository';
import { getMongoFilemakerOrganizationById } from './filemaker-organizations-repository';
import {
  runFilemakerOrganizationPresenceScrapeForOrganization,
  type FilemakerOrganizationPresenceScrapeResult,
} from './filemaker-organization-presence-scrape';
import { listMongoFilemakerWebsitesForOrganization } from './filemaker-website-repository';

const EMAIL_SCRAPE_IMPORT_SOURCE_KIND = 'organization-email-scrape';
const EMAIL_SCRAPE_UPDATED_BY = 'filemaker:organization-email-scrape';
const EMAIL_SCRAPE_RUNTIME_KEY = 'filemaker_organization_email_scrape';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FilemakerOrganizationEmailScrapePromotedItem = {
  address: string;
  emailId: string;
  linkId: string;
  sourceUrls: string[];
  status: 'created' | 'linked' | 'already-linked';
};

export type FilemakerOrganizationEmailScrapeSkippedItem = {
  address: string;
  reason: string;
};

export type FilemakerOrganizationEmailScrapeResult = {
  organizationId: string;
  organizationName: string;
  runId: string | null;
  runtimeKey: typeof EMAIL_SCRAPE_RUNTIME_KEY;
  websites: string[];
  visitedUrls: string[];
  promoted: FilemakerOrganizationEmailScrapePromotedItem[];
  skipped: FilemakerOrganizationEmailScrapeSkippedItem[];
  warnings: string[];
  websiteDiscovery: Pick<
    FilemakerOrganizationPresenceScrapeResult,
    'persisted' | 'runId' | 'socialProfiles' | 'visitedUrls' | 'warnings' | 'websites'
  > | null;
};

type ScrapedEmail = {
  address: string;
  sourceUrls: string[];
};

type EngineScrapeResult = {
  emails: ScrapedEmail[];
  visitedUrls: string[];
  warnings: string[];
};

const normalizeEmailAddress = (value: string): string => value.trim().toLowerCase();

const normalizeWebsiteUrl = (website: MongoFilemakerWebsite): string | null => {
  const normalized = website.normalizedUrl?.trim() ?? '';
  const raw = normalized.length > 0 ? normalized : website.url;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

const uniqueStrings = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));

const normalizeScrapedEmails = (value: unknown): ScrapedEmail[] => {
  if (!Array.isArray(value)) return [];
  const byAddress = new Map<string, Set<string>>();

  value.forEach((entry: unknown): void => {
    const record =
      entry !== null && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
    let rawAddress = '';
    if (typeof record['address'] === 'string') {
      rawAddress = record['address'];
    } else if (typeof entry === 'string') {
      rawAddress = entry;
    }
    const address = normalizeEmailAddress(rawAddress);
    if (!EMAIL_RE.test(address)) return;
    let sourceUrls: string[] = [];
    if (Array.isArray(record['sourceUrls'])) {
      sourceUrls = record['sourceUrls'].filter(
        (item): item is string => typeof item === 'string'
      );
    } else if (typeof record['sourceUrl'] === 'string') {
      sourceUrls = [record['sourceUrl']];
    }
    const existing = byAddress.get(address) ?? new Set<string>();
    sourceUrls.forEach((sourceUrl) => {
      const normalizedSourceUrl = sourceUrl.trim();
      if (normalizedSourceUrl.length > 0) existing.add(normalizedSourceUrl);
    });
    byAddress.set(address, existing);
  });

  return Array.from(byAddress.entries()).map(([address, sourceUrls]) => ({
    address,
    sourceUrls: Array.from(sourceUrls),
  }));
};

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? uniqueStrings(value.filter((item): item is string => typeof item === 'string'))
    : [];

const parseEngineScrapeResult = (value: unknown): EngineScrapeResult => {
  const record =
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    emails: normalizeScrapedEmails(record['emails']),
    visitedUrls: normalizeStringArray(record['visitedUrls']),
    warnings: normalizeStringArray(record['warnings']),
  };
};

export const buildFilemakerOrganizationEmailScrapeScript = (): string => `
  export default async ({ page, input, log }) => {
    const emailPattern = /[A-Z0-9._%+-]+\\s*(?:@|\\s*\\[at\\]\\s*|\\s*\\(at\\)\\s*|\\s+at\\s+)\\s*[A-Z0-9.-]+\\s*(?:\\.|\\s*\\[dot\\]\\s*|\\s*\\(dot\\)\\s*|\\s+dot\\s+)\\s*[A-Z]{2,}/gi;
    const normalizeEmail = (value) => String(value || '')
      .replace(/\\s*\\[at\\]\\s*|\\s*\\(at\\)\\s*|\\s+at\\s+/gi, '@')
      .replace(/\\s*\\[dot\\]\\s*|\\s*\\(dot\\)\\s*|\\s+dot\\s+/gi, '.')
      .replace(/\\s+/g, '')
      .toLowerCase()
      .trim();
    const isEmail = (value) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value);
    const toUrl = (value) => {
      try {
        const url = new URL(String(value || ''));
        return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
      } catch {
        return null;
      }
    };
    const sameHost = (left, right) => left.hostname.replace(/^www\\./, '') === right.hostname.replace(/^www\\./, '');
    const contactWords = /(contact|kontakt|o-nas|onas|about|team|zespol|zarzad|biuro|office|firma)/i;
    const maxPages = Math.max(1, Math.min(Number(input.maxPages || 8), 12));
    const startUrls = Array.isArray(input.websites) ? input.websites.map(toUrl).filter(Boolean) : [];
    const queue = [...startUrls];
    const seen = new Set();
    const visitedUrls = [];
    const warnings = [];
    const emails = new Map();

    const addEmail = (address, sourceUrl) => {
      const normalized = normalizeEmail(address);
      if (!isEmail(normalized)) return;
      const current = emails.get(normalized) || new Set();
      if (sourceUrl) current.add(sourceUrl);
      emails.set(normalized, current);
    };

    while (queue.length > 0 && visitedUrls.length < maxPages) {
      const nextUrl = queue.shift();
      if (!nextUrl) continue;
      const href = nextUrl.toString();
      if (seen.has(href)) continue;
      seen.add(href);
      try {
        await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 30000 });
        try { await page.waitForLoadState('networkidle', { timeout: 5000 }); } catch {}
        const currentUrl = page.url();
        visitedUrls.push(currentUrl);
        const extracted = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll('a'));
          return {
            text: document.body ? document.body.innerText || '' : '',
            html: document.documentElement ? document.documentElement.innerHTML || '' : '',
            mailtos: anchors
              .map((anchor) => anchor.getAttribute('href') || '')
              .filter((href) => href.toLowerCase().startsWith('mailto:')),
            links: anchors.map((anchor) => ({
              href: anchor.href || '',
              text: anchor.textContent || '',
            })),
            jsonLd: Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
              .map((script) => script.textContent || ''),
          };
        });

        extracted.mailtos.forEach((mailto) => {
          const address = mailto.replace(/^mailto:/i, '').split('?')[0];
          addEmail(address, currentUrl);
        });
        const scanText = [extracted.text, extracted.html, ...extracted.jsonLd].join('\\n');
        for (const match of scanText.matchAll(emailPattern)) {
          addEmail(match[0], currentUrl);
        }

        const baseUrl = toUrl(currentUrl);
        if (baseUrl) {
          extracted.links.forEach((link) => {
            if (!contactWords.test(link.href) && !contactWords.test(link.text)) return;
            const candidate = toUrl(link.href);
            if (!candidate || !sameHost(baseUrl, candidate)) return;
            if (!seen.has(candidate.toString()) && queue.length < maxPages * 2) {
              queue.push(candidate);
            }
          });
        }
      } catch (error) {
        warnings.push('Failed to scan ' + href + ': ' + (error instanceof Error ? error.message : String(error)));
        log('organization email scrape page failed', href, error instanceof Error ? error.message : String(error));
      }
    }

    return {
      emails: Array.from(emails.entries()).map(([address, sourceUrls]) => ({
        address,
        sourceUrls: Array.from(sourceUrls),
      })),
      visitedUrls,
      warnings,
    };
  };
`;

const readRunReturnValue = (result: unknown): unknown =>
  result !== null && typeof result === 'object'
    ? (result as Record<string, unknown>)['returnValue']
    : null;

const buildOrganizationEmailLinkFilter = (input: {
  emailId: string;
  organizationId: string;
}): Pick<MongoFilemakerEmailLinkDocument, 'emailId' | 'partyId' | 'partyKind'> => ({
  emailId: input.emailId,
  partyKind: 'organization',
  partyId: input.organizationId,
});

const upsertOrganizationEmails = async (input: {
  organization: FilemakerOrganization;
  runId: string;
  scrapedEmails: ScrapedEmail[];
}): Promise<Pick<FilemakerOrganizationEmailScrapeResult, 'promoted' | 'skipped'>> => {
  const collections = await getMongoFilemakerEmailCollections();
  await ensureMongoFilemakerEmailIndexes(collections);
  const db = await getMongoDb();
  const emails = db.collection<MongoFilemakerEmailDocument>(FILEMAKER_EMAILS_COLLECTION);
  const links = db.collection<MongoFilemakerEmailLinkDocument>(FILEMAKER_EMAIL_LINKS_COLLECTION);
  const importBatchId = `${EMAIL_SCRAPE_IMPORT_SOURCE_KIND}:${input.organization.id}:${input.runId}`;
  const nowIso = new Date().toISOString();
  const now = new Date();
  const promoted: FilemakerOrganizationEmailScrapePromotedItem[] = [];
  const skipped: FilemakerOrganizationEmailScrapeSkippedItem[] = [];

  for (const scrapedEmail of input.scrapedEmails) {
    const address = normalizeEmailAddress(scrapedEmail.address);
    if (!EMAIL_RE.test(address)) {
      skipped.push({ address: scrapedEmail.address, reason: 'Invalid address.' });
      continue;
    }

    try {
      const existingEmail = await emails.findOne({ email: address });
      let emailId = existingEmail?.id ?? randomUUID();
      let emailWasCreated = false;
      if (!existingEmail) {
        try {
          await emails.insertOne({
            _id: emailId,
            email: address,
            id: emailId,
            importBatchId,
            importedAt: now,
            importSourceKind: EMAIL_SCRAPE_IMPORT_SOURCE_KIND,
            legacyUuids: [],
            schemaVersion: 1,
            status: 'unverified',
            createdAt: nowIso,
            updatedAt: nowIso,
            updatedBy: EMAIL_SCRAPE_UPDATED_BY,
          });
          emailWasCreated = true;
        } catch (error) {
          const racedEmail = await emails.findOne({ email: address });
          if (!racedEmail) throw error;
          emailId = racedEmail.id;
        }
      }

      const linkFilter = buildOrganizationEmailLinkFilter({
        emailId,
        organizationId: input.organization.id,
      });
      const existingLink = await links.findOne(linkFilter);
      if (existingLink) {
        promoted.push({
          address,
          emailId,
          linkId: existingLink.id,
          sourceUrls: scrapedEmail.sourceUrls,
          status: 'already-linked',
        });
        continue;
      }

      const linkId = randomUUID();
      const legacyOrganizationUuid = input.organization.legacyUuid?.trim() ?? '';
      try {
        await links.insertOne({
          _id: linkId,
          id: linkId,
          emailId,
          organizationId: input.organization.id,
          partyId: input.organization.id,
          partyKind: 'organization',
          legacyEmailAddress: address,
          ...(legacyOrganizationUuid.length > 0 ? { legacyOrganizationUuid } : {}),
          legacyOrganizationName: input.organization.name,
          importBatchId,
          importedAt: now,
          importSourceKind: EMAIL_SCRAPE_IMPORT_SOURCE_KIND,
          schemaVersion: 1,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      } catch (error) {
        const racedLink = await links.findOne(linkFilter);
        if (!racedLink) throw error;
        promoted.push({
          address,
          emailId,
          linkId: racedLink.id,
          sourceUrls: scrapedEmail.sourceUrls,
          status: 'already-linked',
        });
        continue;
      }
      promoted.push({
        address,
        emailId,
        linkId,
        sourceUrls: scrapedEmail.sourceUrls,
        status: emailWasCreated ? 'created' : 'linked',
      });
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'filemaker.organization-email-scrape',
        action: 'upsert-email',
        organizationId: input.organization.id,
        address,
      });
      skipped.push({
        address,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { promoted, skipped };
};

export const runFilemakerOrganizationEmailScrape = async (input: {
  organizationId: string;
  maxPages?: number;
}): Promise<FilemakerOrganizationEmailScrapeResult> => {
  const organization = await getMongoFilemakerOrganizationById(input.organizationId);
  if (!organization) {
    throw notFoundError(`Filemaker organisation ${input.organizationId} not found.`, {
      organizationId: input.organizationId,
    });
  }

  const initialLinkedWebsites = await listMongoFilemakerWebsitesForOrganization(organization);
  let websiteDiscovery: FilemakerOrganizationEmailScrapeResult['websiteDiscovery'] = null;
  let discoveryWarnings: string[] = [];
  try {
    const discovery = await runFilemakerOrganizationPresenceScrapeForOrganization({
      existingWebsites: initialLinkedWebsites,
      maxPages: 6,
      maxSearchResults: 8,
      organization,
    });
    websiteDiscovery = {
      persisted: discovery.persisted,
      runId: discovery.runId,
      socialProfiles: discovery.socialProfiles,
      visitedUrls: discovery.visitedUrls,
      warnings: discovery.warnings,
      websites: discovery.websites,
    };
    discoveryWarnings = discovery.warnings.map((warning) => `Website discovery: ${warning}`);
  } catch (error) {
    discoveryWarnings = [
      `Website discovery failed: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }

  const linkedWebsites = await listMongoFilemakerWebsitesForOrganization(organization);
  const websites = uniqueStrings(
    linkedWebsites
      .map(normalizeWebsiteUrl)
      .filter((url): url is string => url !== null)
  );

  if (websites.length === 0) {
    return {
      organizationId: organization.id,
      organizationName: organization.name,
      runId: null,
      runtimeKey: EMAIL_SCRAPE_RUNTIME_KEY,
      websites: [],
      visitedUrls: [],
      promoted: [],
      skipped: [{ address: '*', reason: 'No linked organisation websites to scrape.' }],
      warnings: discoveryWarnings,
      websiteDiscovery,
    };
  }

  const run = await runPlaywrightEngineTask({
    request: {
      script: buildFilemakerOrganizationEmailScrapeScript(),
      startUrl: websites[0],
      input: {
        organization: {
          id: organization.id,
          name: organization.name,
          tradingName: organization.tradingName ?? null,
          taxId: organization.taxId ?? null,
          krs: organization.krs ?? null,
          city: organization.city,
          postalCode: organization.postalCode,
          street: organization.street,
          streetNumber: organization.streetNumber,
        },
        websites,
        maxPages: input.maxPages ?? 8,
        runtimeKey: EMAIL_SCRAPE_RUNTIME_KEY,
      },
      actionId: EMAIL_SCRAPE_RUNTIME_KEY,
      actionName: 'Filemaker organisation email scrape',
      runtimeKey: EMAIL_SCRAPE_RUNTIME_KEY,
      browserEngine: 'chromium',
      timeoutMs: 120_000,
      preventNewPages: true,
    },
    instance: createCustomPlaywrightInstance({
      family: 'scrape',
      label: `Filemaker organisation email scrape: ${organization.name}`,
      tags: ['filemaker', 'organization', 'email-scrape', 'playwright'],
    }),
  });

  if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'canceled') {
    return {
      organizationId: organization.id,
      organizationName: organization.name,
      runId: run.runId,
      runtimeKey: EMAIL_SCRAPE_RUNTIME_KEY,
      websites,
      visitedUrls: [],
      promoted: [],
      skipped: [{ address: '*', reason: run.error ?? `Scrape run status=${run.status}` }],
      warnings: [...discoveryWarnings, ...normalizeStringArray(run.logs)],
      websiteDiscovery,
    };
  }

  const parsed = parseEngineScrapeResult(readRunReturnValue(run.result));
  const upsert = await upsertOrganizationEmails({
    organization,
    runId: run.runId,
    scrapedEmails: parsed.emails,
  });

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    runId: run.runId,
    runtimeKey: EMAIL_SCRAPE_RUNTIME_KEY,
    websites,
    visitedUrls: parsed.visitedUrls,
    promoted: upsert.promoted,
    skipped: upsert.skipped,
    warnings: [...discoveryWarnings, ...parsed.warnings],
    websiteDiscovery,
  };
};
