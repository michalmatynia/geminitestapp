import { createHash } from 'node:crypto';

import { config as loadDotenv } from 'dotenv';
import type { Collection, Document, WithId } from 'mongodb';

import {
  filemakerJobBoardScrapeRequestSchema,
  type FilemakerJobBoardScrapeExtractionPath,
  type FilemakerJobBoardScrapeProvider,
} from '@/features/filemaker/filemaker-job-board-scrape-contracts';
import {
  createFilemakerJobListing,
  createFilemakerOrganization,
  normalizeFilemakerDatabase,
  toPersistedFilemakerDatabase,
} from '@/features/filemaker/settings';
import { FILEMAKER_DATABASE_KEY } from '@/features/filemaker/settings-constants';
import { probeJobBoardOffer } from '@/features/job-board/server/job-scans-service';
import {
  isSuspiciousJobBoardCompanyName,
  offerFromEvaluation,
} from '@/features/filemaker/server/job-board-scrape/offer-from-evaluation';
import {
  buildCandidate,
  findBestMatch,
  normalizeNameForMatch,
  type OrganizationCandidate,
} from '@/features/filemaker/server/job-board-scrape/match-organizations';
import type {
  FilemakerDatabase,
  FilemakerJobListing,
  FilemakerOrganization,
} from '@/features/filemaker/types';
import type { MongoSource } from '@/shared/contracts/database';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  getJobBoardSourceSite,
  resolveJobBoardProvider,
} from '@/shared/lib/job-board/job-board-providers';
import { decodeSettingValue, encodeSettingValue } from '@/shared/lib/settings/settings-compression';

loadDotenv({ path: '.env', quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });

const SETTINGS_COLLECTION = 'settings';
const ORGANIZATIONS_COLLECTION = 'filemaker_organizations';
const DEFAULT_ORGANIZATION_NAME = 'Ch';
const DEFAULT_MINIMUM_MATCH_CONFIDENCE = 85;
const DEFAULT_TIMEOUT_MS = 180_000;

type MongoStringSettingRecord = Document & {
  key?: string;
  value?: string;
};

type CliOptions = {
  dryRun: boolean;
  extractionPath: FilemakerJobBoardScrapeExtractionPath;
  headless: boolean | null;
  limit: number | null;
  minimumMatchConfidence: number;
  organizationIds: string[];
  organizationName: string;
  includeSuspiciousJobBoardNames: boolean;
  pruneEmptySuspectOrganizations: boolean;
  provider: FilemakerJobBoardScrapeProvider;
  source: MongoSource | undefined;
  timeoutMs: number;
};

type PruneCandidate = {
  id: string;
  name: string;
  status: 'would_prune' | 'pruned' | 'retained';
  reason: string;
};

type RepairResult = {
  companyName: string | null;
  error: string | null;
  fromOrganizationId: string;
  listingId: string;
  sourceUrl: string;
  status: 'would_move' | 'moved' | 'skipped' | 'failed';
  title: string;
  toOrganizationId: string | null;
  toOrganizationName: string | null;
};

const printUsage = (): void => {
  console.log(
    [
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/repair-filemaker-job-board-ch-organization-imports.ts --source=local --dry-run',
      '',
      'Repairs job-board listings that were incorrectly attached to a suspect organisation.',
      'By default this includes the short "Ch" organisation and Pracuj employer-directory metadata organisations.',
      'The script re-scrapes each affected listing URL to recover the employer name, then creates/reuses the correct organisation and moves the listing.',
      '',
      'Options:',
      '  --write                         Persist repaired FileMaker settings and Mongo organisation upserts.',
      '  --dry-run                       Report planned repairs without writing. Default.',
      '  --source=local|cloud            Override active Mongo source.',
      '  --organization-name=Ch          Suspect organisation name. Default: Ch.',
      '  --organization-id=<id>          Suspect organisation id. Can be passed multiple times.',
      '  --no-suspicious-job-board-names Do not auto-include suspicious job-board directory organisation names.',
      '  --prune-empty-suspect-organizations',
      '                                  Delete suspect organisations after repair if no listings or relation records reference them.',
      '  --limit=<n>                     Process at most n affected listings.',
      '  --provider=auto|pracuj_pl|justjoin_it|nofluffjobs',
      '  --extraction-path=playwright_ai|deterministic|deterministic_then_playwright',
      '  --headed                        Run browser extraction headed.',
      '  --headless                      Run browser extraction headless.',
      '  --timeout-ms=<n>                Offer scrape timeout. Default: 180000.',
    ].join('\n')
  );
};

const parsePositiveInteger = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseNullablePositiveInteger = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    extractionPath: 'playwright_ai',
    headless: null,
    limit: null,
    minimumMatchConfidence: DEFAULT_MINIMUM_MATCH_CONFIDENCE,
    organizationIds: [],
    organizationName: DEFAULT_ORGANIZATION_NAME,
    includeSuspiciousJobBoardNames: true,
    pruneEmptySuspectOrganizations: false,
    provider: 'auto',
    source: undefined,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  argv.forEach((arg: string): void => {
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    if (arg === '--write') {
      options.dryRun = false;
      return;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      return;
    }
    if (arg === '--headed') {
      options.headless = false;
      return;
    }
    if (arg === '--headless') {
      options.headless = true;
      return;
    }
    if (arg === '--no-suspicious-job-board-names') {
      options.includeSuspiciousJobBoardNames = false;
      return;
    }
    if (arg === '--prune-empty-suspect-organizations') {
      options.pruneEmptySuspectOrganizations = true;
      return;
    }
    if (arg.startsWith('--source=')) {
      const source = arg.slice('--source='.length).trim();
      if (source === 'local' || source === 'cloud') options.source = source;
      return;
    }
    if (arg.startsWith('--organization-name=')) {
      options.organizationName = arg.slice('--organization-name='.length).trim();
      return;
    }
    if (arg.startsWith('--organization-id=')) {
      const organizationId = arg.slice('--organization-id='.length).trim();
      if (organizationId.length > 0) options.organizationIds.push(organizationId);
      return;
    }
    if (arg.startsWith('--limit=')) {
      options.limit = parseNullablePositiveInteger(arg.slice('--limit='.length));
      return;
    }
    if (arg.startsWith('--minimum-match-confidence=')) {
      options.minimumMatchConfidence = parsePositiveInteger(
        arg.slice('--minimum-match-confidence='.length),
        DEFAULT_MINIMUM_MATCH_CONFIDENCE
      );
      return;
    }
    if (arg.startsWith('--provider=')) {
      const provider = arg.slice('--provider='.length).trim();
      if (
        provider === 'auto' ||
        provider === 'pracuj_pl' ||
        provider === 'justjoin_it' ||
        provider === 'nofluffjobs'
      ) {
        options.provider = provider;
      }
      return;
    }
    if (arg.startsWith('--extraction-path=')) {
      const extractionPath = arg.slice('--extraction-path='.length).trim();
      if (
        extractionPath === 'playwright_ai' ||
        extractionPath === 'deterministic' ||
        extractionPath === 'deterministic_then_playwright'
      ) {
        options.extractionPath = extractionPath;
      }
      return;
    }
    if (arg.startsWith('--timeout-ms=')) {
      options.timeoutMs = parsePositiveInteger(
        arg.slice('--timeout-ms='.length),
        DEFAULT_TIMEOUT_MS
      );
    }
  });

  return options;
};

const loadDatabase = async (
  source: MongoSource | undefined
): Promise<{ database: FilemakerDatabase; setting: WithId<MongoStringSettingRecord> | null }> => {
  const mongo = await getMongoDb(source);
  const setting = await mongo
    .collection<MongoStringSettingRecord>(SETTINGS_COLLECTION)
    .findOne({ $or: [{ _id: FILEMAKER_DATABASE_KEY }, { key: FILEMAKER_DATABASE_KEY }] });
  if (typeof setting?.value !== 'string' || setting.value.trim().length === 0) {
    return { database: normalizeFilemakerDatabase(null), setting };
  }
  const decoded = decodeSettingValue(FILEMAKER_DATABASE_KEY, setting.value);
  return {
    database: normalizeFilemakerDatabase(JSON.parse(decoded) as unknown),
    setting,
  };
};

const persistDatabase = async (
  source: MongoSource | undefined,
  setting: WithId<MongoStringSettingRecord> | null,
  database: FilemakerDatabase
): Promise<void> => {
  const mongo = await getMongoDb(source);
  const now = new Date();
  const value = encodeSettingValue(
    FILEMAKER_DATABASE_KEY,
    JSON.stringify(toPersistedFilemakerDatabase(normalizeFilemakerDatabase(database)))
  );
  const filter = setting?._id
    ? { _id: setting._id }
    : { key: FILEMAKER_DATABASE_KEY };
  await mongo.collection<MongoStringSettingRecord>(SETTINGS_COLLECTION).updateOne(
    filter,
    {
      $set: {
        key: FILEMAKER_DATABASE_KEY,
        updatedAt: now,
        value,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );
};

const buildOrganizationId = (companyName: string): string => {
  const digest = createHash('sha256')
    .update(`filemaker.job-board.organization:${normalizeNameForMatch(companyName)}`)
    .digest('hex')
    .slice(0, 24);
  return `filemaker-job-board-organization-${digest}`;
};

const isSuspectOrganization = (
  organization: FilemakerOrganization,
  options: CliOptions
): boolean => {
  if (options.organizationIds.includes(organization.id)) return true;
  if (
    options.includeSuspiciousJobBoardNames &&
    organization.name.trim().length > 0 &&
    isSuspiciousJobBoardCompanyName(organization.name)
  ) {
    return true;
  }
  const suspectName = normalizeNameForMatch(options.organizationName);
  return suspectName.length > 0 && normalizeNameForMatch(organization.name) === suspectName;
};

const createOrganizationFromOffer = (
  database: FilemakerDatabase,
  companyName: string,
  companyProfile: string,
  companyProfileUrl: string | null,
  persistToDatabase: boolean
): FilemakerOrganization => {
  const now = new Date().toISOString();
  const baseId = buildOrganizationId(companyName);
  let id = baseId;
  let suffix = 1;
  while (
    database.organizations.some(
      (organization: FilemakerOrganization): boolean => organization.id === id
    )
  ) {
    suffix += 1;
    id = `${baseId}-${suffix}`;
  }
  const organization = createFilemakerOrganization({
    id,
    name: companyName,
    jobBoardCompanyProfile: companyProfile,
    jobBoardCompanyProfileUrl: companyProfileUrl ?? undefined,
    jobBoardCompanyProfileScrapedAt:
      companyProfile.trim().length > 0 ? now : undefined,
    updatedBy: 'filemaker:job-board-repair',
    createdAt: now,
    updatedAt: now,
  });
  if (persistToDatabase) {
    database.organizations.push(organization);
  }
  return organization;
};

const upsertMongoOrganization = async (
  source: MongoSource | undefined,
  organization: FilemakerOrganization
): Promise<void> => {
  const mongo = await getMongoDb(source);
  const now = new Date();
  const collection: Collection<Document> = mongo.collection(ORGANIZATIONS_COLLECTION);
  await collection.updateOne(
    { id: organization.id },
    {
      $set: {
        addressId: organization.addressId,
        city: organization.city,
        country: organization.country,
        countryId: organization.countryId,
        displayAddressId: organization.displayAddressId ?? organization.addressId,
        id: organization.id,
        jobBoardCompanyProfile: organization.jobBoardCompanyProfile,
        jobBoardCompanyProfileScrapedAt: organization.jobBoardCompanyProfileScrapedAt,
        jobBoardCompanyProfileUrl: organization.jobBoardCompanyProfileUrl,
        name: organization.name,
        postalCode: organization.postalCode,
        street: organization.street,
        streetNumber: organization.streetNumber,
        tradingName: organization.tradingName,
        updatedAt: organization.updatedAt,
        updatedBy: 'filemaker:job-board-repair',
      },
      $setOnInsert: {
        _id: organization.id,
        createdAt: organization.createdAt,
        importSourceKind: 'filemaker.job-board-repair',
        importedAt: now,
        mongoCreatedAt: now,
        schemaVersion: 1,
      },
    },
    { upsert: true }
  );
};

const buildCandidates = (
  database: FilemakerDatabase,
  suspectOrganizationIds: Set<string>
): OrganizationCandidate[] =>
  database.organizations
    .filter(
      (organization: FilemakerOrganization): boolean =>
        !suspectOrganizationIds.has(organization.id)
    )
    .map(buildCandidate);

const collectionReferencesOrganization = (
  value: unknown,
  organizationId: string
): boolean => {
  if (!Array.isArray(value)) return false;
  return value.some((entry: unknown): boolean => {
    try {
      return JSON.stringify(entry).includes(`"${organizationId}"`);
    } catch {
      return false;
    }
  });
};

const organizationHasRemainingReferences = (
  database: FilemakerDatabase,
  organizationId: string
): boolean => {
  if (
    database.jobListings.some(
      (listing: FilemakerJobListing): boolean => listing.organizationId === organizationId
    )
  ) {
    return true;
  }
  return Object.entries(database).some(([key, value]): boolean => {
    if (key === 'organizations' || key === 'jobListings') return false;
    return collectionReferencesOrganization(value, organizationId);
  });
};

const pruneEmptySuspectOrganizations = (
  database: FilemakerDatabase,
  suspectOrganizationIds: Set<string>,
  dryRun: boolean
): PruneCandidate[] => {
  const candidates = database.organizations
    .filter((organization: FilemakerOrganization): boolean =>
      suspectOrganizationIds.has(organization.id)
    )
    .map((organization: FilemakerOrganization): PruneCandidate => {
      if (organizationHasRemainingReferences(database, organization.id)) {
        return {
          id: organization.id,
          name: organization.name,
          reason: 'Organisation still has listing or relation references.',
          status: 'retained',
        };
      }
      return {
        id: organization.id,
        name: organization.name,
        reason: dryRun
          ? 'No remaining references; would prune in write mode with pruning enabled.'
          : 'No remaining references; pruned.',
        status: dryRun ? 'would_prune' : 'pruned',
      };
    });
  if (!dryRun) {
    const prunedIds = new Set(
      candidates
        .filter((candidate: PruneCandidate): boolean => candidate.status === 'pruned')
        .map((candidate: PruneCandidate): string => candidate.id)
    );
    if (prunedIds.size > 0) {
      database.organizations = database.organizations.filter(
        (organization: FilemakerOrganization): boolean => !prunedIds.has(organization.id)
      );
    }
  }
  return candidates;
};

const resolveTargetOrganization = (input: {
  candidates: OrganizationCandidate[];
  companyName: string;
  companyProfile: string;
  companyProfileUrl: string | null;
  database: FilemakerDatabase;
  minimumMatchConfidence: number;
  persistCreatedOrganization: boolean;
}): FilemakerOrganization => {
  const offerLike = {
    companyName: input.companyName,
    companyProfile: input.companyProfile,
    companyProfileUrl: input.companyProfileUrl,
    description: '',
    expiresAt: null,
    location: '',
    postedAt: null,
    salaryCurrency: null,
    salaryMax: null,
    salaryMin: null,
    salaryPeriod: 'monthly' as const,
    salaryText: '',
    sourceExternalId: null,
    sourceSite: '',
    sourceUrl: 'https://pracuj.pl',
    pills: [],
    title: 'repair',
  };
  const match = findBestMatch(
    offerLike,
    input.candidates,
    input.minimumMatchConfidence
  );
  const matchedOrganization =
    match !== null
      ? input.database.organizations.find(
          (organization: FilemakerOrganization): boolean =>
            organization.id === match.organizationId
        )
      : undefined;
  if (matchedOrganization !== undefined) return matchedOrganization;
  const organization = createOrganizationFromOffer(
    input.database,
    input.companyName,
    input.companyProfile,
    input.companyProfileUrl,
    input.persistCreatedOrganization
  );
  if (input.persistCreatedOrganization) {
    input.candidates.push(buildCandidate(organization));
  }
  return organization;
};

const scrapeListingEmployer = async (
  listing: FilemakerJobListing,
  options: CliOptions
) => {
  const sourceUrl = listing.sourceUrl?.trim() ?? '';
  const provider = resolveJobBoardProvider(sourceUrl, options.provider);
  if (provider === null) {
    throw new Error(`Unsupported job-board provider for ${sourceUrl}.`);
  }
  const scrapeOptions = filemakerJobBoardScrapeRequestSchema.parse({
    duplicateStrategy: 'skip',
    extractionPath: options.extractionPath,
    headless: options.headless,
    maxOffers: 1,
    mode: 'preview',
    provider: options.provider,
    sourceUrl,
    timeoutMs: options.timeoutMs,
  });
  const probe = await probeJobBoardOffer({
    extractionPath: options.extractionPath,
    forcePlaywright: options.extractionPath !== 'deterministic',
    headless: options.headless,
    humanizeMouse: true,
    provider,
    sourceUrl,
    timeoutMs: options.timeoutMs,
  });
  const offer = offerFromEvaluation({
    evaluation: probe.evaluation,
    finalUrl: probe.finalUrl,
    options: scrapeOptions,
    provider: probe.provider,
    snapshot: probe.snapshot,
    sourceSite: probe.sourceSite || getJobBoardSourceSite(provider),
  });
  if (offer === null) {
    throw new Error(probe.error ?? `Could not extract employer from ${sourceUrl}.`);
  }
  if (isSuspiciousJobBoardCompanyName(offer.companyName)) {
    throw new Error(
      `Extracted employer still looks like job-board directory metadata: ${offer.companyName}`
    );
  }
  return offer;
};

const repairListing = async (input: {
  candidates: OrganizationCandidate[];
  database: FilemakerDatabase;
  listing: FilemakerJobListing;
  options: CliOptions;
  source: MongoSource | undefined;
}): Promise<RepairResult> => {
  const sourceUrl = input.listing.sourceUrl?.trim() ?? '';
  if (sourceUrl.length === 0) {
    return {
      companyName: null,
      error: 'Listing has no source URL.',
      fromOrganizationId: input.listing.organizationId,
      listingId: input.listing.id,
      sourceUrl,
      status: 'skipped',
      title: input.listing.title,
      toOrganizationId: null,
      toOrganizationName: null,
    };
  }
  try {
    const offer = await scrapeListingEmployer(input.listing, input.options);
    const organization = resolveTargetOrganization({
      candidates: input.candidates,
      companyName: offer.companyName,
      companyProfile: offer.companyProfile,
      companyProfileUrl: offer.companyProfileUrl,
      database: input.database,
      minimumMatchConfidence: input.options.minimumMatchConfidence,
      persistCreatedOrganization: !input.options.dryRun,
    });
    const status = input.options.dryRun ? 'would_move' : 'moved';
    if (!input.options.dryRun) {
      const index = input.database.jobListings.findIndex(
        (listing: FilemakerJobListing): boolean => listing.id === input.listing.id
      );
      if (index >= 0) {
        input.database.jobListings.splice(
          index,
          1,
          createFilemakerJobListing({
            ...input.listing,
            organizationId: organization.id,
            title: offer.title || input.listing.title,
            description: offer.description || input.listing.description,
            location: offer.location || input.listing.location,
            salaryCurrency: offer.salaryCurrency ?? input.listing.salaryCurrency,
            salaryMax: offer.salaryMax,
            salaryMin: offer.salaryMin,
            salaryText: offer.salaryText || input.listing.salaryText,
            salaryPeriod: offer.salaryPeriod,
            sourceExternalId: offer.sourceExternalId ?? input.listing.sourceExternalId,
            sourceSite: offer.sourceSite || input.listing.sourceSite,
            sourceUrl: offer.sourceUrl || input.listing.sourceUrl,
            postedAt: offer.postedAt ?? input.listing.postedAt,
            expiresAt: offer.expiresAt ?? input.listing.expiresAt,
            scrapedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        );
      }
      await upsertMongoOrganization(input.source, organization);
    }
    return {
      companyName: offer.companyName,
      error: null,
      fromOrganizationId: input.listing.organizationId,
      listingId: input.listing.id,
      sourceUrl,
      status,
      title: input.listing.title,
      toOrganizationId: organization.id,
      toOrganizationName: organization.name,
    };
  } catch (error) {
    return {
      companyName: null,
      error: error instanceof Error ? error.message : String(error),
      fromOrganizationId: input.listing.organizationId,
      listingId: input.listing.id,
      sourceUrl,
      status: 'failed',
      title: input.listing.title,
      toOrganizationId: null,
      toOrganizationName: null,
    };
  }
};

const main = async (): Promise<void> => {
  const options = parseOptions(process.argv.slice(2));
  const { database, setting } = await loadDatabase(options.source);
  const suspectOrganizationIds = new Set(
    database.organizations
      .filter((organization: FilemakerOrganization): boolean =>
        isSuspectOrganization(organization, options)
      )
      .map((organization: FilemakerOrganization): string => organization.id)
  );
  const affectedListings = database.jobListings
    .filter((listing: FilemakerJobListing): boolean =>
      suspectOrganizationIds.has(listing.organizationId)
    )
    .slice(0, options.limit ?? undefined);
  const candidates = buildCandidates(database, suspectOrganizationIds);
  const results: RepairResult[] = [];

  for (const listing of affectedListings) {
    // eslint-disable-next-line no-await-in-loop
    const result = await repairListing({
      candidates,
      database,
      listing,
      options,
      source: options.source,
    });
    results.push(result);
  }

  const pruneCandidates = options.pruneEmptySuspectOrganizations
    ? pruneEmptySuspectOrganizations(database, suspectOrganizationIds, options.dryRun)
    : [];
  const changed =
    results.some((result: RepairResult): boolean => result.status === 'moved') ||
    pruneCandidates.some(
      (candidate: PruneCandidate): boolean => candidate.status === 'pruned'
    );
  if (changed && !options.dryRun) {
    await persistDatabase(options.source, setting, database);
  }

  console.log(
    JSON.stringify(
      {
        dryRun: options.dryRun,
        suspectOrganizationIds: Array.from(suspectOrganizationIds),
        affectedListings: affectedListings.length,
        moved: results.filter((result) => result.status === 'moved').length,
        wouldMove: results.filter((result) => result.status === 'would_move').length,
        skipped: results.filter((result) => result.status === 'skipped').length,
        failed: results.filter((result) => result.status === 'failed').length,
        pruneEnabled: options.pruneEmptySuspectOrganizations,
        prunedOrganizations: pruneCandidates.filter(
          (candidate) => candidate.status === 'pruned'
        ).length,
        wouldPruneOrganizations: pruneCandidates.filter(
          (candidate) => candidate.status === 'would_prune'
        ).length,
        retainedSuspectOrganizations: pruneCandidates.filter(
          (candidate) => candidate.status === 'retained'
        ).length,
        pruneCandidates,
        results,
      },
      null,
      2
    )
  );
};

void main().catch((error: unknown): void => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
