/**
 * CMS Domain Repository
 * 
 * Provides database persistence and management for CMS domains and their 
 * associated slug links in MongoDB.
 */

import { getMongoDb } from '@/shared/lib/db/cms-builder-mongo-client';

export const DOMAIN_COLLECTION = 'cms_domains';
export const DOMAIN_SLUGS_COLLECTION = 'cms_domain_slugs';

export type CmsDomainRecord = {
  id: string;
  name?: string;
  domain: string;
  aliasOf?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CmsDomainSlugLink = {
  domainId: string;
  slugId: string;
  isDefault?: boolean;
  assignedAt: Date;
  updatedAt?: Date;
};

/**
 * Retrieves a domain record by its unique identifier.
 */
export const getDomainRecordById = async (domainId: string): Promise<CmsDomainRecord | null> => {
  const db = await getMongoDb();
  return db.collection<CmsDomainRecord>(DOMAIN_COLLECTION).findOne({ id: domainId });
};

/**
 * Fetches all domain records from the collection.
 */
export const fetchAllDomainRecords = async (): Promise<CmsDomainRecord[]> => {
  const db = await getMongoDb();
  return db.collection<CmsDomainRecord>(DOMAIN_COLLECTION).find().sort({ domain: 1 }).toArray();
};

/**
 * Inserts a new domain record.
 */
export const insertDomainRecord = async (doc: CmsDomainRecord): Promise<void> => {
  const db = await getMongoDb();
  await db.collection<CmsDomainRecord>(DOMAIN_COLLECTION).insertOne(doc);
};

/**
 * Deletes a domain record by its unique identifier.
 */
export const deleteDomainRecord = async (domainId: string): Promise<void> => {
  const db = await getMongoDb();
  await db.collection<CmsDomainRecord>(DOMAIN_COLLECTION).deleteOne({ id: domainId });
};

/**
 * Removes every slug link for a domain.
 */
export const deleteDomainSlugLinks = async (domainId: string): Promise<void> => {
  const db = await getMongoDb();
  await db.collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION).deleteMany({ domainId });
};

/**
 * Updates or inserts a slug link for a domain.
 */
export const upsertDomainSlugLink = async (domainId: string, slugId: string): Promise<void> => {
  const db = await getMongoDb();
  await db.collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION).updateOne(
    { domainId, slugId },
    {
      $setOnInsert: {
        domainId,
        slugId,
        isDefault: false,
        assignedAt: new Date(),
      },
      $set: { updatedAt: new Date() },
    },
    { upsert: true }
  );
};

/**
 * Removes a slug link for a domain.
 */
export const deleteDomainSlugLink = async (domainId: string, slugId: string): Promise<void> => {
  const db = await getMongoDb();
  await db.collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION).deleteOne({ domainId, slugId });
};

/**
 * Resets the default flag for all slugs in a domain.
 */
export const resetDomainDefaultSlug = async (domainId: string): Promise<void> => {
  const db = await getMongoDb();
  await db
    .collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION)
    .updateMany({ domainId }, { $set: { isDefault: false, updatedAt: new Date() } });
};

/**
 * Sets a specific slug as the default for a domain.
 */
export const setDomainDefaultSlugLink = async (domainId: string, slugId: string): Promise<void> => {
  const db = await getMongoDb();
  await db.collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION).updateOne(
    { domainId, slugId },
    {
      $set: { isDefault: true, updatedAt: new Date() },
      $setOnInsert: { domainId, slugId, assignedAt: new Date() },
    },
    { upsert: true }
  );
};

/**
 * Checks if a slug is linked to a domain.
 */
export const isSlugLinkedToDomain = async (domainId: string, slugId: string): Promise<boolean> => {
  const db = await getMongoDb();
  const doc = await db.collection<CmsDomainSlugLink>(DOMAIN_SLUGS_COLLECTION).findOne({ domainId, slugId });
  return Boolean(doc);
};
