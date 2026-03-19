import 'dotenv/config';

import type { Collection } from 'mongodb';

import type { KangurAiTutorNativeGuideStore } from '@/shared/contracts/kangur-ai-tutor-native-guide';
import {
  DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
  parseKangurAiTutorNativeGuideStore,
} from '@/shared/contracts/kangur-ai-tutor-native-guide';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import {
  buildKangurAiTutorNativeGuideLocaleScaffold,
  getKangurAiTutorNativeGuideLocaleOverlay,
} from '@/features/kangur/server/ai-tutor-native-guide-locale-scaffold';

const COLLECTION_NAME = 'kangur_ai_tutor_native_guides';

type KangurAiTutorNativeGuideDoc = {
  locale: string;
  store: KangurAiTutorNativeGuideStore;
  createdAt: Date;
  updatedAt: Date;
};

type CliOptions = {
  apply: boolean;
  locales: string[];
  sourceLocale: string;
};

const parseArgs = (argv: string[]): CliOptions => {
  const localesArg = argv.find((entry) => entry.startsWith('--locales='));
  const sourceLocaleArg = argv.find((entry) => entry.startsWith('--source-locale='));

  return {
    apply: argv.includes('--apply'),
    locales: (localesArg?.split('=')[1] ?? 'en,de')
      .split(',')
      .map((entry) => normalizeSiteLocale(entry))
      .filter(Boolean),
    sourceLocale: normalizeSiteLocale(sourceLocaleArg?.split('=')[1] ?? 'pl'),
  };
};

const serialize = (value: unknown): string => JSON.stringify(value);

const readSourceStore = async (
  collection: Collection<KangurAiTutorNativeGuideDoc>,
  sourceLocale: string
): Promise<KangurAiTutorNativeGuideStore> => {
  const existing = await collection.findOne({ locale: sourceLocale });
  if (!existing?.store) {
    return parseKangurAiTutorNativeGuideStore({
      ...DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
      locale: sourceLocale,
    });
  }

  return parseKangurAiTutorNativeGuideStore(existing.store);
};

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required to backfill Kangur AI Tutor native guide locales.');
  }

  const options = parseArgs(process.argv.slice(2));
  const mongoClient = await getMongoClient();

  try {
    const db = await getMongoDb();
    const collection = db.collection<KangurAiTutorNativeGuideDoc>(COLLECTION_NAME);
    const sourceStore = await readSourceStore(collection, options.sourceLocale);
    const results: Array<{
      locale: string;
      action: 'created' | 'updated' | 'unchanged';
      wrote: boolean;
      localizedEntryCount: number;
      sourceLocale: string;
    }> = [];

    for (const locale of options.locales) {
      if (locale === options.sourceLocale) {
        continue;
      }

      const existing = await collection.findOne({ locale });
      const scaffold = buildKangurAiTutorNativeGuideLocaleScaffold({
        locale,
        sourceStore,
        existingStore: existing?.store ?? null,
      });
      const changed = serialize(existing?.store ?? null) !== serialize(scaffold);
      const localizedEntryCount = Object.keys(
        getKangurAiTutorNativeGuideLocaleOverlay(locale).entries
      ).length;
      const now = new Date();

      if (options.apply && changed) {
        await collection.updateOne(
          { locale },
          {
            $set: {
              store: scaffold,
              updatedAt: now,
            },
            $setOnInsert: {
              locale,
              createdAt: now,
            },
          },
          { upsert: true }
        );
      }

      results.push({
        locale,
        action: !existing ? 'created' : changed ? 'updated' : 'unchanged',
        wrote: options.apply && changed,
        localizedEntryCount,
        sourceLocale: options.sourceLocale,
      });
    }

    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        collection: COLLECTION_NAME,
        apply: options.apply,
        sourceLocale: options.sourceLocale,
        locales: options.locales,
        results,
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
