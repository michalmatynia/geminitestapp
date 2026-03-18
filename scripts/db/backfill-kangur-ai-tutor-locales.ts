import 'dotenv/config';

import type { Collection } from 'mongodb';

import type { KangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';
import {
  DEFAULT_KANGUR_AI_TUTOR_CONTENT,
  parseKangurAiTutorContent,
} from '@/shared/contracts/kangur-ai-tutor-content';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import { buildKangurAiTutorContentLocaleScaffold } from '@/features/kangur/server/ai-tutor-content-locale-scaffold';

const COLLECTION_NAME = 'kangur_ai_tutor_content';

type KangurAiTutorContentDoc = {
  locale: string;
  content: KangurAiTutorContent;
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

const readSourceContent = async (
  collection: Collection<KangurAiTutorContentDoc>,
  sourceLocale: string
): Promise<KangurAiTutorContent> => {
  const existing = await collection.findOne({ locale: sourceLocale });
  if (!existing?.content) {
    return parseKangurAiTutorContent({
      ...DEFAULT_KANGUR_AI_TUTOR_CONTENT,
      locale: sourceLocale,
    });
  }

  return parseKangurAiTutorContent(existing.content);
};

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required to backfill Kangur AI Tutor locales.');
  }

  const options = parseArgs(process.argv.slice(2));
  const mongoClient = await getMongoClient();

  try {
    const db = await getMongoDb();
    const collection = db.collection<KangurAiTutorContentDoc>(COLLECTION_NAME);
    const sourceContent = await readSourceContent(collection, options.sourceLocale);
    const results: Array<{
      locale: string;
      action: 'created' | 'updated' | 'unchanged';
      wrote: boolean;
      authCopyLocalized: boolean;
      sourceLocale: string;
    }> = [];

    for (const locale of options.locales) {
      if (locale === options.sourceLocale) {
        continue;
      }

      const existing = await collection.findOne({ locale });
      const scaffold = buildKangurAiTutorContentLocaleScaffold({
        locale,
        sourceContent,
        existingContent: existing?.content ?? null,
      });
      const nextSerialized = serialize(scaffold);
      const previousSerialized = serialize(existing?.content ?? null);
      const changed = previousSerialized !== nextSerialized;
      const now = new Date();

      if (options.apply && changed) {
        await collection.updateOne(
          { locale },
          {
            $set: {
              content: scaffold,
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
        authCopyLocalized: true,
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
