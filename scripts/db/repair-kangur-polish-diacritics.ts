import { getKangurPageContentStore } from '@/features/kangur/server/page-content-repository';
import { getKangurAiTutorContent } from '@/features/kangur/server/ai-tutor-content-repository';
import { getKangurAiTutorNativeGuideStore } from '@/features/kangur/server/ai-tutor-native-guide-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
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

const CONTENT_COLLECTION = 'kangur_ai_tutor_content';
const GUIDE_COLLECTION = 'kangur_ai_tutor_native_guides';
const PAGE_CONTENT_COLLECTION = 'kangur_page_content';

const serialize = (value: unknown): string => JSON.stringify(value);

const collectPendingPolishRepairAudit = async (db: Awaited<ReturnType<typeof getMongoDb>>) => {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const audit: PolishAuditEntry[] = [];

  for (const { name } of collections) {
    const docs = await db
      .collection(name)
      .find({
        $or: [{ locale: 'pl' }, { language: 'pl' }, { lang: 'pl' }],
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

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is not set.');
  }

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

  const [content, guideStore, pageContentStore] = await Promise.all([
    getKangurAiTutorContent(locale),
    getKangurAiTutorNativeGuideStore(locale),
    getKangurPageContentStore(locale),
  ]);

  const [contentAfter, guidesAfter, pageContentAfter] = await Promise.all([
    contentCollection.findOne({ locale }),
    guideCollection.findOne({ locale }),
    pageContentCollection.countDocuments({ locale }),
  ]);
  const audit = await collectPendingPolishRepairAudit(db);

  console.log(
    JSON.stringify(
      {
        locale,
        content: {
          existedBefore: Boolean(contentBefore),
          repaired: contentRepairNeeded,
          existsAfter: Boolean(contentAfter),
          version: content.version,
        },
        nativeGuides: {
          existedBefore: Boolean(guidesBefore),
          repaired: guideRepairNeeded,
          existsAfter: Boolean(guidesAfter),
          entryCount: guideStore.entries.length,
        },
        pageContent: {
          docsBefore: pageContentBefore,
          docsAfter: pageContentAfter,
          seeded: pageContentBefore === 0 && pageContentAfter > 0,
          entryCount: pageContentStore.entries.length,
        },
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
