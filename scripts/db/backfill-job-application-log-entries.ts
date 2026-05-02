/**
 * Backfill applicationLog entries for existing applied FilemakerJobApplication documents
 * that were created before the log feature was introduced.
 *
 * For each applied document with no applicationLog:
 *   - Source is 'filemaker-manual-applied'  → method: 'manual'
 *   - Source is anything else (AI path, apply script)  → method: 'apply_script'
 *
 * Usage:
 *   npx tsx scripts/db/backfill-job-application-log-entries.ts           (dry run)
 *   npx tsx scripts/db/backfill-job-application-log-entries.ts --write   (commit changes)
 *   npx tsx scripts/db/backfill-job-application-log-entries.ts --write --limit=500
 */

import 'dotenv/config';

import { randomUUID } from 'crypto';

import { getFilemakerJobApplicationsCollection } from '@/features/filemaker/server/filemaker-job-application-collection';

type CliOptions = {
  dryRun: boolean;
  limit: number;
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = { dryRun: true, limit: 1_000 };
  for (const arg of argv) {
    if (arg === '--write') { options.dryRun = false; continue; }
    if (arg.startsWith('--limit=')) {
      const parsed = Number.parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0) options.limit = parsed;
    }
  }
  return options;
};

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const run = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  console.log(`Mode: ${options.dryRun ? 'DRY RUN (pass --write to apply)' : 'WRITE'}`);
  console.log(`Limit: ${options.limit}`);

  const collection = await getFilemakerJobApplicationsCollection();

  // Find applied documents that have no applicationLog or an empty one
  const candidates = await collection
    .find({
      status: 'applied',
      $or: [
        { applicationLog: { $exists: false } },
        { applicationLog: null },
        { applicationLog: { $size: 0 } },
      ],
    })
    .limit(options.limit)
    .toArray();

  console.log(`\nFound ${candidates.length} applied documents with no log entries.`);
  if (candidates.length === 0) {
    console.log('Nothing to backfill.');
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const doc of candidates) {
    const source = normalizeString(doc['source']);
    const method = source === 'filemaker-manual-applied' ? 'manual' : 'apply_script';
    const personId = normalizeString(doc['personId']);
    const personName = normalizeString(doc['personName']);

    // Use updatedAt as the best approximation of when it was applied
    const appliedAt =
      normalizeString(doc['updatedAt']) ??
      normalizeString(doc['createdAt']) ??
      new Date().toISOString();

    const logEntry = {
      id: randomUUID(),
      appliedAt,
      method,
      personId,
      personName,
      toStatus: 'applied',
    };

    const docId = doc['_id'] as string;

    if (options.dryRun) {
      console.log(`  [DRY RUN] Would add ${method} log entry to ${docId} (appliedAt: ${appliedAt}, person: ${personName ?? personId ?? 'unknown'})`);
      updated++;
      continue;
    }

    try {
      const result = await collection.updateOne(
        { _id: docId },
        { $set: { applicationLog: [logEntry] } }
      );
      if (result.modifiedCount > 0) {
        updated++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`  ERROR updating ${docId}:`, err);
      skipped++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
  if (options.dryRun && updated > 0) {
    console.log('\nRe-run with --write to apply changes.');
  }
};

run().catch((err: unknown) => {
  console.error('Script failed:', err);
  process.exit(1);
});
