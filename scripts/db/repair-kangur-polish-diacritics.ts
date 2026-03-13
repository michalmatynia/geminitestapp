import 'dotenv/config';
import type { Document, Filter } from 'mongodb';

import { getKangurPageContentStore } from '@/features/kangur/server/page-content-repository';
import { getKangurAiTutorContent } from '@/features/kangur/server/ai-tutor-content-repository';
import { getKangurAiTutorNativeGuideStore } from '@/features/kangur/server/ai-tutor-native-guide-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { KangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';
import type { KangurAiTutorNativeGuideStore } from '@/shared/contracts/kangur-ai-tutor-native-guide';
import type { KangurPageContentStore } from '@/shared/contracts/kangur-page-content';
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';

type KangurAiTutorContentDoc = {
  locale: string;
  content: unknown;
};

type KangurAiTutorNativeGuideDoc = {
  locale: string;
  store: unknown;
};

type PolishAuditEntry = {
  name: string;
  changed: number;
  scanned: number;
  sampleIds: string[];
};

type PolishRepairEntry = PolishAuditEntry & {
  updated: number;
};

const CONTENT_COLLECTION = 'kangur_ai_tutor_content';
const GUIDE_COLLECTION = 'kangur_ai_tutor_native_guides';
const PAGE_CONTENT_COLLECTION = 'kangur_page_content';

const serialize = (value: unknown): string => JSON.stringify(value);

const POLISH_LOCALES = ['pl', 'pl-PL', 'pl_PL', 'pl-pl', 'pl_pl'] as const;

const buildPolishLocaleFilter = () => ({
  $or: [
    { locale: { $in: POLISH_LOCALES } },
    { language: { $in: POLISH_LOCALES } },
    { lang: { $in: POLISH_LOCALES } },
    { locale: /^pl([-_].*)?$/i },
    { language: /^pl([-_].*)?$/i },
    { lang: /^pl([-_].*)?$/i },
  ],
});

type CliOptions = {
  dryRun: boolean;
};

const parseArgs = (argv: string[]): CliOptions => ({
  dryRun:
    argv.includes('--dry-run') ||
    argv.includes('--dryrun') ||
    process.env['KANGUR_REPAIR_DRY_RUN'] === 'true',
});

const shouldSkipCollection = (name: string) => name.startsWith('system.');

const collectPendingPolishRepairAudit = async (db: Awaited<ReturnType<typeof getMongoDb>>) => {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const audit: PolishAuditEntry[] = [];

  for (const { name } of collections) {
    if (shouldSkipCollection(name)) {
      continue;
    }

    const docs = await db
      .collection(name)
      .find({
        ...buildPolishLocaleFilter(),
      })
      .limit(500)
      .toArray();

    if (docs.length === 0) {
      continue;
    }

    let changed = 0;
    const sampleIds: string[] = [];

    for (const doc of docs) {
      if (serialize(doc) === serialize(repairKangurPolishCopy(doc))) {
        continue;
      }

      changed += 1;
      if (sampleIds.length < 5) {
        sampleIds.push(String(doc._id));
      }
    }

    if (changed > 0) {
      audit.push({
        name,
        changed,
        scanned: docs.length,
        sampleIds,
      });
    }
  }

  return audit;
};

const repairAllPolishCollections = async (
  db: Awaited<ReturnType<typeof getMongoDb>>,
  options: CliOptions
) => {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const repairs: PolishRepairEntry[] = [];
  let totalScanned = 0;
  let totalUpdated = 0;

  for (const { name } of collections) {
    if (shouldSkipCollection(name)) {
      continue;
    }

    const collection = db.collection(name);
    const cursor = collection.find(buildPolishLocaleFilter());
    let scanned = 0;
    let changed = 0;
    let updated = 0;
    const sampleIds: string[] = [];

    for await (const doc of cursor) {
      scanned += 1;
      totalScanned += 1;

      const repaired = repairKangurPolishCopy(doc);
      if (serialize(doc) === serialize(repaired)) {
        continue;
      }

      changed += 1;
      if (sampleIds.length < 5) {
        sampleIds.push(String((doc as { _id?: unknown })._id));
      }

      const id = (doc as { _id?: unknown | null })._id;
      if (id === null || typeof id === 'undefined') {
        continue;
      }

      if (!options.dryRun) {
        await collection.replaceOne({ _id: id } as Filter<Document>, repaired as Document);
        updated += 1;
        totalUpdated += 1;
      }
    }

    if (changed > 0) {
      repairs.push({
        name,
        changed,
        scanned,
        updated,
        sampleIds,
      });
    }
  }

  return {
    dryRun: options.dryRun,
    totalScanned,
    totalUpdated,
    collectionsWithChanges: repairs.length,
    repairs,
  };
};

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is not set.');
  }

  const options = parseArgs(process.argv.slice(2));
  const locale = 'pl';
  const db = await getMongoDb();
  const contentCollection = db.collection<KangurAiTutorContentDoc>(CONTENT_COLLECTION);
  const guideCollection = db.collection<KangurAiTutorNativeGuideDoc>(GUIDE_COLLECTION);
  const pageContentCollection = db.collection(PAGE_CONTENT_COLLECTION);

  const [contentBefore, guidesBefore, pageContentBefore] = await Promise.all([
    contentCollection.findOne({ locale }),
    guideCollection.findOne({ locale }),
    pageContentCollection.countDocuments({ locale }),
  ]);

  const contentRepairNeeded = contentBefore
    ? serialize(contentBefore.content) !== serialize(repairKangurPolishCopy(contentBefore.content))
    : true;
  const guideRepairNeeded = guidesBefore
    ? serialize(guidesBefore.store) !== serialize(repairKangurPolishCopy(guidesBefore.store))
    : true;

  let content: KangurAiTutorContent | null = null;
  let guideStore: KangurAiTutorNativeGuideStore | null = null;
  let pageContentStore: KangurPageContentStore | null = null;

  if (!options.dryRun) {
    [content, guideStore, pageContentStore] = await Promise.all([
      getKangurAiTutorContent(locale),
      getKangurAiTutorNativeGuideStore(locale),
      getKangurPageContentStore(locale),
    ]);
  }

  const repairAll = await repairAllPolishCollections(db, options);

  const [contentAfter, guidesAfter, pageContentAfter] = await Promise.all([
    contentCollection.findOne({ locale }),
    guideCollection.findOne({ locale }),
    pageContentCollection.countDocuments({ locale }),
  ]);
  const audit = await collectPendingPolishRepairAudit(db);

  const contentVersion =
    content?.version ??
    (contentBefore?.content as Partial<KangurAiTutorContent> | undefined)?.version ??
    null;
  const guideEntryCount =
    guideStore?.entries?.length ??
    (guidesBefore?.store as Partial<KangurAiTutorNativeGuideStore> | undefined)?.entries?.length ??
    null;
  const pageContentEntryCount = pageContentStore?.entries?.length ?? pageContentBefore;

  console.log(
    JSON.stringify(
      {
        mode: options.dryRun ? 'dry-run' : 'apply',
        locale,
        content: {
          existedBefore: Boolean(contentBefore),
          repaired: contentRepairNeeded,
          existsAfter: Boolean(contentAfter),
          version: contentVersion,
        },
        nativeGuides: {
          existedBefore: Boolean(guidesBefore),
          repaired: guideRepairNeeded,
          existsAfter: Boolean(guidesAfter),
          entryCount: guideEntryCount,
        },
        pageContent: {
          docsBefore: pageContentBefore,
          docsAfter: pageContentAfter,
          seeded: pageContentBefore === 0 && pageContentAfter > 0,
          entryCount: pageContentEntryCount,
        },
        repairAll,
        audit: {
          collectionsWithPendingDiffs: audit.length,
          pendingDiffs: audit,
        },
      },
      null,
      2
    )
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
