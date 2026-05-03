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
import {
  createMxVerifier,
  type MxLookupResult,
  type MxVerifier,
} from './filemaker-email-mx-verifier';
import {
  EXTRACTOR_BODY,
  classifyEmail,
  isPlausibleEmail,
} from './filemaker-organization-email-scrape-extractor';
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

export type FilemakerOrganizationEmailScrapeMetrics = {
  totalEmailsFound: number;
  disposableSkipped: number;
  rolePromoted: number;
  retries: number;
  domainsWithoutMx: number;
  domainsWithNullMx: number;
  mxLookupTimeouts: number;
  mxLookupErrors: number;
  sourceBreakdown: {
    regex: number;
    mailto: number;
    jsonLd: number;
    dataCfemail: number;
    microdata: number;
  };
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
  metrics: FilemakerOrganizationEmailScrapeMetrics;
  warnings: string[];
  websiteDiscovery: Pick<
    FilemakerOrganizationPresenceScrapeResult,
    'persisted' | 'runId' | 'socialProfiles' | 'visitedUrls' | 'warnings' | 'websites'
  > | null;
};

type ScrapedEmail = {
  address: string;
  sourceUrls: string[];
  kinds: string[];
};

type EngineScrapeResult = {
  emails: ScrapedEmail[];
  visitedUrls: string[];
  warnings: string[];
  metrics: FilemakerOrganizationEmailScrapeMetrics;
};

const emptyMetrics = (): FilemakerOrganizationEmailScrapeMetrics => ({
  totalEmailsFound: 0,
  disposableSkipped: 0,
  rolePromoted: 0,
  retries: 0,
  domainsWithoutMx: 0,
  domainsWithNullMx: 0,
  mxLookupTimeouts: 0,
  mxLookupErrors: 0,
  sourceBreakdown: { regex: 0, mailto: 0, jsonLd: 0, dataCfemail: 0, microdata: 0 },
});

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
  const kindsByAddress = new Map<string, string[]>();

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
    const kinds = Array.isArray(record['kinds'])
      ? record['kinds'].filter((k): k is string => typeof k === 'string')
      : [];
    kindsByAddress.set(address, kinds);
  });

  return Array.from(byAddress.entries()).map(([address, sourceUrls]) => ({
    address,
    sourceUrls: Array.from(sourceUrls),
    kinds: kindsByAddress.get(address) ?? [],
  }));
};

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? uniqueStrings(value.filter((item): item is string => typeof item === 'string'))
    : [];

const parseMetrics = (value: unknown): FilemakerOrganizationEmailScrapeMetrics => {
  const base = emptyMetrics();
  if (value === null || typeof value !== 'object') return base;
  const record = value as Record<string, unknown>;
  const numberOr = (key: string, fallback: number): number => {
    const raw = record[key];
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
  };
  const breakdownRaw =
    record['sourceBreakdown'] !== null && typeof record['sourceBreakdown'] === 'object'
      ? (record['sourceBreakdown'] as Record<string, unknown>)
      : {};
  const breakdownNumber = (key: string): number => {
    const raw = breakdownRaw[key];
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
  };
  return {
    totalEmailsFound: numberOr('totalEmailsFound', base.totalEmailsFound),
    disposableSkipped: numberOr('disposableSkipped', base.disposableSkipped),
    rolePromoted: numberOr('rolePromoted', base.rolePromoted),
    retries: numberOr('retries', base.retries),
    domainsWithoutMx: numberOr('domainsWithoutMx', base.domainsWithoutMx),
    domainsWithNullMx: numberOr('domainsWithNullMx', base.domainsWithNullMx),
    mxLookupTimeouts: numberOr('mxLookupTimeouts', base.mxLookupTimeouts),
    mxLookupErrors: numberOr('mxLookupErrors', base.mxLookupErrors),
    sourceBreakdown: {
      regex: breakdownNumber('regex'),
      mailto: breakdownNumber('mailto'),
      jsonLd: breakdownNumber('jsonLd'),
      dataCfemail: breakdownNumber('dataCfemail'),
      microdata: breakdownNumber('microdata'),
    },
  };
};

const parseEngineScrapeResult = (value: unknown): EngineScrapeResult => {
  const record =
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    emails: normalizeScrapedEmails(record['emails']),
    visitedUrls: normalizeStringArray(record['visitedUrls']),
    warnings: normalizeStringArray(record['warnings']),
    metrics: parseMetrics(record['metrics']),
  };
};

export const buildFilemakerOrganizationEmailScrapeScript = (): string => `
  export default async ({ page, input, log }) => {
    const api = {};
    ${EXTRACTOR_BODY}

    const toUrl = (value) => {
      try {
        const url = new URL(String(value || ''));
        return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
      } catch (e) {
        return null;
      }
    };
    const sameHost = (left, right) =>
      left.hostname.replace(/^www\\./, '') === right.hostname.replace(/^www\\./, '');

    const maxPages = Math.max(1, Math.min(Number(input.maxPages || 8), 12));
    const startUrls = Array.isArray(input.websites) ? input.websites.map(toUrl).filter(Boolean) : [];
    const queue = startUrls.slice();
    const seen = new Set();
    const visitedUrls = [];
    const warnings = [];
    const aggregate = new Map();
    const totalBreakdown = { regex: 0, mailto: 0, jsonLd: 0, dataCfemail: 0, microdata: 0 };
    let disposableSkipped = 0;
    let rolePromoted = 0;
    let retries = 0;

    const gotoWithRetry = async (href) => {
      let lastError = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 30000 });
          try { await page.waitForLoadState('networkidle', { timeout: 5000 }); } catch (e) {}
          return true;
        } catch (error) {
          lastError = error;
          const message = error instanceof Error ? error.message : String(error);
          const transient = /Timeout|net::ERR_|ECONN|ETIMEDOUT|socket hang up/i.test(message);
          if (!transient || attempt === 2) break;
          retries += 1;
          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        }
      }
      throw lastError || new Error('navigation failed');
    };

    while (queue.length > 0 && visitedUrls.length < maxPages) {
      const nextUrl = queue.shift();
      if (!nextUrl) continue;
      const href = nextUrl.toString();
      if (seen.has(href)) continue;
      seen.add(href);
      try {
        await gotoWithRetry(href);
        const currentUrl = page.url();
        visitedUrls.push(currentUrl);
        const extracted = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll('a'));
          const microdataNodes = Array.from(
            document.querySelectorAll('[itemprop="email"], [itemprop="contactEmail"]')
          );
          const ogEmail = document.querySelector('meta[property="og:email"]');
          return {
            text: document.body ? document.body.innerText || '' : '',
            html: document.documentElement ? document.documentElement.innerHTML || '' : '',
            mailtos: anchors
              .map((anchor) => anchor.getAttribute('href') || '')
              .filter((href) => href.toLowerCase().startsWith('mailto:')),
            links: anchors.map((anchor) => ({
              href: anchor.href || '',
              text: anchor.textContent || '',
              ariaLabel: anchor.getAttribute('aria-label') || '',
              title: anchor.getAttribute('title') || '',
            })),
            jsonLd: Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
              .map((script) => script.textContent || ''),
            microdataEmails: microdataNodes
              .map((node) => node.getAttribute('content') || node.textContent || '')
              .filter((value) => value && value.length > 0)
              .concat(ogEmail ? [ogEmail.getAttribute('content') || ''] : []),
          };
        });

        const pageResult = api.extractEmailsFromPage({
          text: extracted.text,
          html: extracted.html,
          mailtos: extracted.mailtos,
          jsonLd: extracted.jsonLd,
          microdataEmails: extracted.microdataEmails,
        });
        totalBreakdown.regex += pageResult.breakdown.regex;
        totalBreakdown.mailto += pageResult.breakdown.mailto;
        totalBreakdown.jsonLd += pageResult.breakdown.jsonLd;
        totalBreakdown.dataCfemail += pageResult.breakdown.dataCfemail;
        totalBreakdown.microdata += pageResult.breakdown.microdata;
        disposableSkipped += pageResult.disposableSkipped || 0;

        pageResult.emails.forEach((entry) => {
          const existing = aggregate.get(entry.address) || { sourceUrls: new Set(), kinds: new Set() };
          existing.sourceUrls.add(currentUrl);
          (entry.kinds || []).forEach((k) => existing.kinds.add(k));
          aggregate.set(entry.address, existing);
          if (entry.kinds && entry.kinds.indexOf('role') !== -1) rolePromoted += 1;
        });

        const baseUrl = toUrl(currentUrl);
        if (baseUrl) {
          extracted.links.forEach((link) => {
            const haystack = (link.href || '') + ' ' + (link.text || '') + ' ' + (link.ariaLabel || '') + ' ' + (link.title || '');
            if (!api.matchesContactKeyword(haystack)) return;
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

    const emailsOut = [];
    aggregate.forEach((entry, address) => {
      emailsOut.push({
        address: address,
        sourceUrls: Array.from(entry.sourceUrls),
        kinds: Array.from(entry.kinds),
      });
    });

    return {
      emails: emailsOut,
      visitedUrls: visitedUrls,
      warnings: warnings,
      metrics: {
        totalEmailsFound: emailsOut.length,
        disposableSkipped: disposableSkipped,
        rolePromoted: rolePromoted,
        retries: retries,
        sourceBreakdown: totalBreakdown,
      },
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

const getEmailDomain = (address: string): string => address.slice(address.indexOf('@') + 1);

type OrganizationEmailUpsertCandidate = {
  address: string;
  classification: ReturnType<typeof classifyEmail>;
  existingEmail: MongoFilemakerEmailDocument | null;
  scrapedEmail: ScrapedEmail;
};

const buildPrefetchedMxLookupMap = async (input: {
  domains: string[];
  mxVerifier: MxVerifier;
}): Promise<Map<string, MxLookupResult>> => {
  if (input.mxVerifier.lookupMany === undefined) return new Map();
  const domains = uniqueStrings(input.domains);
  if (domains.length === 0) return new Map();
  const results = await input.mxVerifier.lookupMany(domains);
  return new Map(domains.map((domain, index) => [
    domain,
    results[index] ?? { outcome: 'error', hasMail: false },
  ]));
};

const lookupDomainMx = async (input: {
  domain: string;
  mxVerifier: MxVerifier;
  prefetchedMxLookups: Map<string, MxLookupResult>;
}): Promise<MxLookupResult> =>
  input.prefetchedMxLookups.get(input.domain) ?? input.mxVerifier.lookup(input.domain);

const upsertOrganizationEmails = async (input: {
  organization: FilemakerOrganization;
  runId: string;
  scrapedEmails: ScrapedEmail[];
  mxVerifier: MxVerifier;
}): Promise<
  Pick<FilemakerOrganizationEmailScrapeResult, 'promoted' | 'skipped'> & {
    domainsWithoutMx: number;
    domainsWithNullMx: number;
    mxLookupTimeouts: number;
    mxLookupErrors: number;
  }
> => {
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
  const domainsWithoutMx = new Set<string>();
  const domainsWithNullMx = new Set<string>();
  const domainsWithMxLookupTimeout = new Set<string>();
  const domainsWithMxLookupError = new Set<string>();
  const candidates: OrganizationEmailUpsertCandidate[] = [];
  for (const scrapedEmail of input.scrapedEmails) {
    const address = normalizeEmailAddress(scrapedEmail.address);
    if (!EMAIL_RE.test(address) || !isPlausibleEmail(address)) {
      skipped.push({ address: scrapedEmail.address, reason: 'Invalid address.' });
      continue;
    }
    const classification = classifyEmail(address);
    if (classification.kind === 'disposable') {
      skipped.push({ address: scrapedEmail.address, reason: 'Disposable domain.' });
      continue;
    }
    try {
      candidates.push({
        address,
        classification,
        existingEmail: await emails.findOne({ email: address }),
        scrapedEmail,
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
  const prefetchedMxLookups = await buildPrefetchedMxLookupMap({
    domains: candidates
      .filter((candidate) => candidate.existingEmail === null)
      .map((candidate) => getEmailDomain(candidate.address)),
    mxVerifier: input.mxVerifier,
  });

  for (const candidate of candidates) {
    const { address, classification, existingEmail, scrapedEmail } = candidate;
    try {
      let emailId = existingEmail?.id ?? randomUUID();
      let emailWasCreated = false;
      if (!existingEmail) {
        const domain = getEmailDomain(address);
        const mxLookup = await lookupDomainMx({
          domain,
          mxVerifier: input.mxVerifier,
          prefetchedMxLookups,
        });
        if (mxLookup.outcome === 'none') domainsWithoutMx.add(domain);
        if (mxLookup.outcome === 'null-mx') domainsWithNullMx.add(domain);
        if (mxLookup.outcome === 'timeout') domainsWithMxLookupTimeout.add(domain);
        if (mxLookup.outcome === 'error') domainsWithMxLookupError.add(domain);
        try {
          await emails.insertOne({
            _id: emailId,
            domainHasMx: mxLookup.hasMail,
            domainMxCheckedAt: now,
            domainMxLookupOutcome: mxLookup.outcome,
            email: address,
            id: emailId,
            importBatchId,
            importedAt: now,
            importSourceKind: EMAIL_SCRAPE_IMPORT_SOURCE_KIND,
            ...(classification.kind === 'role' ? { isRoleAccount: true } : {}),
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

  return {
    promoted,
    skipped,
    domainsWithoutMx: domainsWithoutMx.size,
    domainsWithNullMx: domainsWithNullMx.size,
    mxLookupErrors: domainsWithMxLookupError.size,
    mxLookupTimeouts: domainsWithMxLookupTimeout.size,
  };
};

export const runFilemakerOrganizationEmailScrape = async (input: {
  organizationId: string;
  maxPages?: number;
  mxVerifier?: MxVerifier;
}): Promise<FilemakerOrganizationEmailScrapeResult> => {
  const mxVerifier = input.mxVerifier ?? createMxVerifier();
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
      metrics: emptyMetrics(),
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
      metrics: emptyMetrics(),
      warnings: [...discoveryWarnings, ...normalizeStringArray(run.logs)],
      websiteDiscovery,
    };
  }

  const parsed = parseEngineScrapeResult(readRunReturnValue(run.result));
  const upsert = await upsertOrganizationEmails({
    organization,
    runId: run.runId,
    scrapedEmails: parsed.emails,
    mxVerifier,
  });

  const disposableSkipped = upsert.skipped.filter((s) => s.reason === 'Disposable domain.').length;
  const metrics: FilemakerOrganizationEmailScrapeMetrics = {
    ...parsed.metrics,
    disposableSkipped: parsed.metrics.disposableSkipped + disposableSkipped,
    domainsWithoutMx: upsert.domainsWithoutMx,
    domainsWithNullMx: upsert.domainsWithNullMx,
    mxLookupErrors: upsert.mxLookupErrors,
    mxLookupTimeouts: upsert.mxLookupTimeouts,
  };

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    runId: run.runId,
    runtimeKey: EMAIL_SCRAPE_RUNTIME_KEY,
    websites,
    visitedUrls: parsed.visitedUrls,
    promoted: upsert.promoted,
    skipped: upsert.skipped,
    metrics,
    warnings: [...discoveryWarnings, ...parsed.warnings],
    websiteDiscovery,
  };
};
