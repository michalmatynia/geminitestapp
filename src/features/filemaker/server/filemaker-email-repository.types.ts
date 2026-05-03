import type { Collection, Document } from 'mongodb';

import type {
  FilemakerEmailStatus,
  FilemakerPartyKind,
} from '../types';
import type { MxLookupOutcome } from './filemaker-email-mx-verifier';

export const FILEMAKER_EMAILS_COLLECTION = 'filemaker_emails';
export const FILEMAKER_EMAIL_LINKS_COLLECTION = 'filemaker_email_links';

export type MongoFilemakerEmailDocument = Document & {
  _id: string;
  createdAt?: string;
  domainCountry?: string;
  email: string;
  id: string;
  importBatchId?: string;
  importSourceKind?: string;
  importedAt?: Date;
  domainHasMx?: boolean;
  domainMxCheckedAt?: Date;
  domainMxLookupOutcome?: MxLookupOutcome;
  isRoleAccount?: boolean;
  legacyStatusRaw?: string;
  legacyStatusUuid?: string;
  legacyUuid?: string;
  legacyUuids: string[];
  schemaVersion: 1;
  status: FilemakerEmailStatus;
  updatedAt?: string;
  updatedBy?: string;
};

export type MongoFilemakerEmailLinkDocument = Document & {
  _id: string;
  createdAt?: string;
  emailId: string;
  id: string;
  importBatchId?: string;
  importSourceKind?: string;
  importedAt?: Date;
  legacyEmailAddress?: string;
  legacyEmailUuid?: string;
  legacyJoinUuid?: string;
  legacyJoinUuids?: string[];
  legacyOrganizationName?: string;
  legacyOrganizationUuid?: string;
  legacyPersonUuid?: string;
  legacyStatusUuid?: string;
  legacyStatusUuids?: string[];
  organizationId?: string;
  partyId?: string;
  partyKind: FilemakerPartyKind;
  schemaVersion: 1;
  updatedAt?: string;
};

export type MongoFilemakerEmailCollections = {
  emails: Collection<MongoFilemakerEmailDocument>;
  links: Collection<MongoFilemakerEmailLinkDocument>;
};
