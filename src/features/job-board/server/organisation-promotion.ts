import 'server-only';

import { randomUUID } from 'crypto';

import {
  FILEMAKER_EMAIL_LINKS_COLLECTION,
  FILEMAKER_EMAILS_COLLECTION,
  type MongoFilemakerEmailDocument,
  type MongoFilemakerEmailLinkDocument,
} from '@/features/filemaker/server/filemaker-email-repository';
import {
  getFilemakerOrganizationsCollection,
  toFilemakerOrganization,
} from '@/features/filemaker/server/filemaker-organizations-mongo';
import { getMongoFilemakerOrganizationById } from '@/features/filemaker/server/filemaker-organizations-repository';
import type { CompanyEmail } from '@/shared/contracts/job-board';
import type { FilemakerOrganization } from '@/shared/contracts/filemaker';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { getCompanyById, upsertCompany } from './companies-repository';
import { listJobScans, updateJobScan } from './job-scans-repository';

const AUTO_PROMOTE_UPDATED_BY = 'job-board:auto';

const recordManualPromotionStep = async (input: {
  companyId: string;
  organizationName: string;
  promotedCount: number;
  skippedCount: number;
  startedAt: string;
  completedAt: string;
}): Promise<void> => {
  try {
    const scans = await listJobScans({ companyId: input.companyId, limit: 1 });
    const scan = scans[0];
    if (!scan) return;
    const message =
      input.promotedCount > 0
        ? `Manually promoted to "${input.organizationName}"; ${input.promotedCount} link(s) written, ${input.skippedCount} skipped.`
        : `Manual promotion to "${input.organizationName}" wrote no links (${input.skippedCount} skipped).`;
    const newStep = {
      key: 'manual_promote',
      label: 'Promote to Organiser (manual)',
      status: input.promotedCount > 0 ? ('completed' as const) : ('skipped' as const),
      message,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      durationMs: Date.parse(input.completedAt) - Date.parse(input.startedAt),
    };
    // Append the new step; cap the array length so we don't blow the schema's max(50).
    const nextSteps = [...scan.steps, newStep].slice(-50);
    await updateJobScan(scan.id, { steps: nextSteps });
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'job-scans.organisation-promotion',
      action: 'recordManualPromotionStep',
      companyId: input.companyId,
    });
  }
};

export type EmailPromotionItem = {
  address: string;
  emailId: string;
  linkId: string;
  status: 'created' | 'linked' | 'already-linked';
};

export type PromoteCompanyToOrganisationResult = {
  companyId: string;
  organizationId: string;
  organizationName: string;
  promoted: EmailPromotionItem[];
  skipped: Array<{ address: string; reason: string }>;
};

const normaliseAddress = (address: string): string => address.trim().toLowerCase();

const filterAddresses = (
  emails: CompanyEmail[],
  addressFilter: string[] | null
): CompanyEmail[] => {
  if (!addressFilter || addressFilter.length === 0) return emails;
  const allowed = new Set(addressFilter.map(normaliseAddress));
  return emails.filter((email) => allowed.has(normaliseAddress(email.address)));
};

/**
 * Writes scraped Company emails into the user's Filemaker CRM as
 * `filemaker_emails` rows + `filemaker_email_links` rows pointing at the chosen
 * organisation. Each email is upserted by its lowercased address (the existing
 * unique index on the emails collection), and each link is upserted by the
 * `(emailId, partyKind, partyId)` compound unique index.
 *
 * Source provenance is tagged with `importSourceKind: 'job-board-scrape'` and
 * an `importBatchId` derived from the source company id so the rows can be
 * audited or rolled back from a future cleanup script.
 */
export const promoteCompanyToOrganisation = async (input: {
  companyId: string;
  organizationId: string;
  addresses?: string[] | null;
  updatedBy?: string | null;
}): Promise<PromoteCompanyToOrganisationResult> => {
  if (!process.env['MONGODB_URI']) {
    throw new Error(
      'Promotion to Filemaker organisation requires a MongoDB connection (MONGODB_URI is unset).'
    );
  }

  const company = await getCompanyById(input.companyId);
  if (!company) {
    throw new Error(`Company ${input.companyId} not found.`);
  }

  const organization = await getMongoFilemakerOrganizationById(input.organizationId);
  if (!organization) {
    throw new Error(`Filemaker organisation ${input.organizationId} not found.`);
  }

  const candidates = filterAddresses(company.emails, input.addresses ?? null);
  if (candidates.length === 0) {
    return {
      companyId: company.id,
      organizationId: organization.id,
      organizationName: organization.name,
      promoted: [],
      skipped: [{ address: '*', reason: 'No scraped emails to promote.' }],
    };
  }

  const db = await getMongoDb();
  const emails = db.collection<MongoFilemakerEmailDocument>(FILEMAKER_EMAILS_COLLECTION);
  const links = db.collection<MongoFilemakerEmailLinkDocument>(FILEMAKER_EMAIL_LINKS_COLLECTION);

  const importBatchId = `job-board:${company.id}`;
  const nowIso = new Date().toISOString();
  const startedAtIso = nowIso;
  const now = new Date();

  const promoted: EmailPromotionItem[] = [];
  const skipped: PromoteCompanyToOrganisationResult['skipped'] = [];

  for (const email of candidates) {
    const address = normaliseAddress(email.address);
    if (!address.includes('@')) {
      skipped.push({ address: email.address, reason: 'Invalid address.' });
      continue;
    }

    try {
      const existingEmail = await emails.findOne({ email: address });
      let emailId: string;
      let emailWasCreated = false;
      if (existingEmail) {
        emailId = existingEmail.id;
      } else {
        emailId = randomUUID();
        const emailDoc: MongoFilemakerEmailDocument = {
          _id: emailId,
          email: address,
          id: emailId,
          legacyUuids: [],
          schemaVersion: 1,
          status: 'unverified',
          createdAt: nowIso,
          updatedAt: nowIso,
          importBatchId,
          importedAt: now,
          ...(input.updatedBy ? { updatedBy: input.updatedBy } : {}),
        };
        try {
          await emails.insertOne(emailDoc);
          emailWasCreated = true;
        } catch (error) {
          // Lost the race to create — re-fetch.
          const racedEmail = await emails.findOne({ email: address });
          if (!racedEmail) throw error;
          emailId = racedEmail.id;
        }
      }

      const existingLink = await links.findOne({
        emailId,
        partyKind: 'organization',
        partyId: organization.id,
      });

      if (existingLink) {
        promoted.push({
          address,
          emailId,
          linkId: existingLink.id,
          status: 'already-linked',
        });
        continue;
      }

      const linkId = randomUUID();
      const linkDoc: MongoFilemakerEmailLinkDocument = {
        _id: linkId,
        id: linkId,
        emailId,
        organizationId: organization.id,
        partyId: organization.id,
        partyKind: 'organization',
        legacyEmailAddress: address,
        ...(organization.legacyUuid
          ? { legacyOrganizationUuid: organization.legacyUuid }
          : {}),
        legacyOrganizationName: organization.name,
        schemaVersion: 1,
        importBatchId,
        importedAt: now,
        createdAt: nowIso,
        updatedAt: nowIso,
        ...(input.updatedBy ? { updatedBy: input.updatedBy } : {}),
      };
      await links.insertOne(linkDoc);

      promoted.push({
        address,
        emailId,
        linkId,
        status: emailWasCreated ? 'created' : 'linked',
      });
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'job-scans.organisation-promotion',
        action: 'promoteEmail',
        companyId: company.id,
        organizationId: organization.id,
        address,
      });
      skipped.push({
        address,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Mark the company so the UI can reflect the promotion without a manual refresh.
  if (promoted.length > 0) {
    await upsertCompany({
      ...company,
      // No dedicated promotion field on Company; touching updatedAt is enough.
    });
  }

  // Record a `manual_promote` step on the company's most recent scan so the admin
  // Promotions log surfaces UI-driven promotions alongside automatic ones. The auto
  // pipeline writes its own `auto_promote` step inline, so suppress the duplicate
  // when called from there (signaled by the well-known `updatedBy` tag).
  if (input.updatedBy !== AUTO_PROMOTE_UPDATED_BY) {
    await recordManualPromotionStep({
      companyId: company.id,
      organizationName: organization.name,
      promotedCount: promoted.length,
      skippedCount: skipped.length,
      startedAt: startedAtIso,
      completedAt: new Date().toISOString(),
    });
  }

  return {
    companyId: company.id,
    organizationId: organization.id,
    organizationName: organization.name,
    promoted,
    skipped,
  };
};

export type FilemakerOrganisationSearchHit = Pick<
  FilemakerOrganization,
  'id' | 'name' | 'taxId' | 'krs' | 'city' | 'tradingName' | 'cooperationStatus'
>;

const normaliseNip = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const digits = value.replace(/\D+/g, '');
  return digits.length === 10 ? digits : null;
};

const normaliseName = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,]/g, '')
    .replace(/\b(sp\.?|sp\.\s?z\s?o\.?\s?o\.?|s\.?a\.?|sa|sp\.?z\.?o\.?o\.?)\b/g, '')
    .trim();

export type FilemakerOrganisationMatch = {
  organization: FilemakerOrganization;
  confidence: 'nip' | 'name';
};

/**
 * Find the single Filemaker organisation that matches a scraped Company.
 * Strict ordering: NIP digit-match first (returns only when exactly one row
 * carries that taxId), then exact normalised name (returns only when one row
 * matches). Returns null when ambiguous or absent so the caller can fall
 * back to manual selection rather than corrupting CRM data.
 */
export const findFilemakerOrganisationMatch = async (input: {
  nip?: string | null;
  name?: string | null;
}): Promise<FilemakerOrganisationMatch | null> => {
  if (!process.env['MONGODB_URI']) return null;

  const collection = await getFilemakerOrganizationsCollection();
  const nip = normaliseNip(input.nip);

  if (nip) {
    const candidates = await collection
      .find({ taxId: nip })
      .limit(2)
      .toArray();
    if (candidates.length === 1) {
      const document = candidates[0];
      if (document) {
        return { organization: toFilemakerOrganization(document), confidence: 'nip' };
      }
    }
    if (candidates.length > 1) {
      // Ambiguous — abort auto-match. User must pick manually.
      return null;
    }
  }

  const name = input.name ? normaliseName(input.name) : null;
  if (name && name.length >= 3) {
    // Mongo can't do normalised-name comparison server-side cheaply (no precomputed
    // field), but the unique-name lookup is rare enough to scan within a tight cap.
    const candidates = await collection.find({}).limit(1000).toArray();
    const matches = candidates.filter((doc) => normaliseName(doc.name ?? '') === name);
    if (matches.length === 1) {
      const document = matches[0];
      if (document) {
        return { organization: toFilemakerOrganization(document), confidence: 'name' };
      }
    }
  }

  return null;
};
