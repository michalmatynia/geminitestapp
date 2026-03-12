import 'dotenv/config';

import { REQUIRED_KANGUR_AI_TUTOR_NATIVE_GUIDE_COVERAGE } from '@/features/kangur/ai-tutor-native-guide-coverage';
import { getKangurPageContentStore } from '@/features/kangur/server/page-content-repository';
import {
  DEFAULT_KANGUR_AI_TUTOR_CONTENT,
  parseKangurAiTutorContent,
  type KangurAiTutorContent,
} from '@/shared/contracts/kangur-ai-tutor-content';
import {
  DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
  mergeKangurAiTutorNativeGuideStore,
  parseKangurAiTutorNativeGuideStore,
  type KangurAiTutorNativeGuideStore,
} from '@/shared/contracts/kangur-ai-tutor-native-guide';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';

const CONTENT_COLLECTION_NAME = 'kangur_ai_tutor_content';
const GUIDE_COLLECTION_NAME = 'kangur_ai_tutor_native_guides';

type ContentDoc = {
  locale: string;
  content: KangurAiTutorContent;
  createdAt: Date;
  updatedAt: Date;
};

type NativeGuideDoc = {
  locale: string;
  store: KangurAiTutorNativeGuideStore;
  createdAt: Date;
  updatedAt: Date;
};

const resolveMergedContent = (
  existingContent: KangurAiTutorContent | null | undefined,
  defaultContent: KangurAiTutorContent
): KangurAiTutorContent => {
  try {
    return parseKangurAiTutorContent(existingContent ?? defaultContent);
  } catch {
    return defaultContent;
  }
};

const resolveMergedGuides = (
  existingGuides: KangurAiTutorNativeGuideStore | null | undefined,
  defaultGuides: KangurAiTutorNativeGuideStore
): KangurAiTutorNativeGuideStore => {
  try {
    return existingGuides
      ? mergeKangurAiTutorNativeGuideStore(defaultGuides, existingGuides)
      : defaultGuides;
  } catch {
    return defaultGuides;
  }
};

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required to seed the Kangur Tutor-AI knowledge base.');
  }

  const mongoClient = await getMongoClient();

  try {
    const db = await getMongoDb();
    const contentCollection = db.collection<ContentDoc>(CONTENT_COLLECTION_NAME);
    const guideCollection = db.collection<NativeGuideDoc>(GUIDE_COLLECTION_NAME);
    const defaultContent = parseKangurAiTutorContent(DEFAULT_KANGUR_AI_TUTOR_CONTENT);
    const defaultGuides = parseKangurAiTutorNativeGuideStore(
      DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE
    );
    const existingContent = await contentCollection.findOne({ locale: defaultContent.locale });
    const existingGuides = await guideCollection.findOne({ locale: defaultGuides.locale });
    const mergedContent = resolveMergedContent(existingContent?.content, defaultContent);
    const mergedGuides = resolveMergedGuides(existingGuides?.store, defaultGuides);
    const pageContentStore = await getKangurPageContentStore(defaultGuides.locale);
    const now = new Date();

    await contentCollection.updateOne(
      { locale: mergedContent.locale },
      {
        $set: {
          content: mergedContent,
          updatedAt: now,
        },
        $setOnInsert: {
          locale: mergedContent.locale,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    await guideCollection.updateOne(
      { locale: mergedGuides.locale },
      {
        $set: {
          store: mergedGuides,
          updatedAt: now,
        },
        $setOnInsert: {
          locale: mergedGuides.locale,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        locale: mergedGuides.locale,
        contentVersion: mergedContent.version,
        nativeGuideVersion: mergedGuides.version,
        nativeGuideEntryCount: mergedGuides.entries.length,
        pageContentVersion: pageContentStore.version,
        pageContentEntryCount: pageContentStore.entries.length,
        requiredGuideCoverageCount: REQUIRED_KANGUR_AI_TUTOR_NATIVE_GUIDE_COVERAGE.length,
      })}\n`
    );
  } finally {
    await mongoClient.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
