import './load-app-env';

import { filemakerMailAccountSchema } from '@/shared/contracts/filemaker-mail';
import { getMongoDb, invalidateMongoClientCache } from '@/shared/lib/db/mongo-client';

import type { FilemakerMailAccount } from '@/shared/contracts/filemaker-mail';
import type { MongoSource } from '@/shared/contracts/database';

const SOURCE_COLLECTION = 'filemaker_mail_accounts';
const TARGET_COLLECTION = 'filemaker_mail_account_settings';

type AccountDocument = FilemakerMailAccount & { _id?: unknown };

type MigrationCandidate = {
  account: FilemakerMailAccount;
  action: 'insert' | 'update';
};

const args = new Set(process.argv.slice(2));
const shouldApply = args.has('--apply');
const shouldDropSource = args.has('--drop-legacy');
const shouldForceDropSource = args.has('--force-drop-legacy');
const sourceArg = process.argv
  .slice(2)
  .find((arg) => arg.startsWith('--source='))
  ?.slice('--source='.length);
const preferredSource: MongoSource | undefined =
  sourceArg === 'local' || sourceArg === 'cloud' ? sourceArg : undefined;

if (sourceArg !== undefined && preferredSource === undefined) {
  throw new Error('Invalid --source value. Expected "local" or "cloud".');
}

const toTime = (value: string | null | undefined): number => {
  if (typeof value !== 'string' || value.trim() === '') return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isSourceNewer = (
  sourceAccount: FilemakerMailAccount,
  targetAccount: FilemakerMailAccount
): boolean => toTime(sourceAccount.updatedAt) > toTime(targetAccount.updatedAt);

const parseAccountDocument = (document: unknown): FilemakerMailAccount | null => {
  const parsed = filemakerMailAccountSchema.safeParse(document);
  return parsed.success ? parsed.data : null;
};

const selectLatestById = (accounts: FilemakerMailAccount[]): FilemakerMailAccount[] => {
  const accountsById = new Map<string, FilemakerMailAccount>();
  accounts.forEach((account) => {
    const current = accountsById.get(account.id);
    if (current === undefined || isSourceNewer(account, current)) {
      accountsById.set(account.id, account);
    }
  });
  return Array.from(accountsById.values());
};

const collectionExists = async (name: string): Promise<boolean> => {
  const mongo = await getMongoDb(preferredSource);
  const matches = await mongo.listCollections({ name }, { nameOnly: true }).toArray();
  return matches.length > 0;
};

const buildMigrationCandidates = (
  sourceAccounts: FilemakerMailAccount[],
  targetAccounts: FilemakerMailAccount[]
): MigrationCandidate[] => {
  const targetAccountsById = new Map(targetAccounts.map((account) => [account.id, account]));

  return sourceAccounts.reduce<MigrationCandidate[]>((candidates, sourceAccount) => {
    const targetAccount = targetAccountsById.get(sourceAccount.id);
    if (targetAccount === undefined) {
      candidates.push({ account: sourceAccount, action: 'insert' });
      return candidates;
    }
    if (isSourceNewer(sourceAccount, targetAccount)) {
      candidates.push({ account: sourceAccount, action: 'update' });
    }
    return candidates;
  }, []);
};

const upsertAccount = async (account: FilemakerMailAccount): Promise<void> => {
  const mongo = await getMongoDb(preferredSource);
  await mongo.collection<AccountDocument>(TARGET_COLLECTION).updateOne(
    { id: account.id },
    {
      $set: account,
      $setOnInsert: { _id: account.id },
    },
    { upsert: true }
  );
};

const run = async (): Promise<void> => {
  const mongo = await getMongoDb(preferredSource);
  const sourceExists = await collectionExists(SOURCE_COLLECTION);
  const sourceDocuments = sourceExists
    ? await mongo.collection<AccountDocument>(SOURCE_COLLECTION).find().toArray()
    : [];
  const targetDocuments = await mongo.collection<AccountDocument>(TARGET_COLLECTION).find().toArray();
  const parsedSourceAccounts = sourceDocuments
    .map(parseAccountDocument)
    .filter((account): account is FilemakerMailAccount => account !== null);
  const parsedTargetAccounts = targetDocuments
    .map(parseAccountDocument)
    .filter((account): account is FilemakerMailAccount => account !== null);
  const sourceAccounts = selectLatestById(parsedSourceAccounts);
  const targetAccounts = selectLatestById(parsedTargetAccounts);
  const invalidSourceDocuments = sourceDocuments.length - parsedSourceAccounts.length;
  const candidates = buildMigrationCandidates(sourceAccounts, targetAccounts);

  if (shouldApply) {
    await Promise.all(candidates.map((candidate) => upsertAccount(candidate.account)));
    await mongo.collection<AccountDocument>(TARGET_COLLECTION).createIndex(
      { id: 1 },
      { unique: true }
    );
    await mongo.collection<AccountDocument>(TARGET_COLLECTION).createIndex({ emailAddress: 1 });
  }

  let droppedSourceCollection = false;
  const canDropSource =
    shouldApply &&
    shouldDropSource &&
    sourceExists &&
    (invalidSourceDocuments === 0 || shouldForceDropSource);
  if (canDropSource) {
    await mongo.collection(SOURCE_COLLECTION).drop();
    droppedSourceCollection = true;
  }

  const targetAfterCount = await mongo
    .collection<AccountDocument>(TARGET_COLLECTION)
    .countDocuments();
  const summary = {
    mode: shouldApply ? 'apply' : 'dry-run',
    source: preferredSource ?? 'active-default',
    sourceCollection: SOURCE_COLLECTION,
    targetCollection: TARGET_COLLECTION,
    sourceExists,
    sourceDocuments: sourceDocuments.length,
    validSourceAccounts: sourceAccounts.length,
    invalidSourceDocuments,
    targetDocumentsBefore: targetDocuments.length,
    targetDocumentsAfter: targetAfterCount,
    inserts: candidates.filter((candidate) => candidate.action === 'insert').length,
    updates: candidates.filter((candidate) => candidate.action === 'update').length,
    droppedSourceCollection,
    dropSkippedBecauseInvalidSourceDocuments:
      shouldApply && shouldDropSource && sourceExists && invalidSourceDocuments > 0 && !shouldForceDropSource,
  };

  console.log(JSON.stringify(summary, null, 2));
};

try {
  await run();
} finally {
  await invalidateMongoClientCache();
}
