import type { Collection } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';

type CmsPageDoc = {
  id: string;
  status?: 'draft' | 'published' | 'scheduled';
  locale?: string | null;
  translationGroupId?: string | null;
  sourceLocale?: string | null;
  translationStatus?: 'draft' | 'machine' | 'reviewed' | 'published';
};

type CmsSlugDoc = {
  id: string;
  locale?: string | null;
  translationGroupId?: string | null;
};

const APPLY = process.argv.includes('--apply');
const DEFAULT_LOCALE = DEFAULT_SITE_I18N_CONFIG.defaultLocale;

const backfillPages = async (collection: Collection<CmsPageDoc>): Promise<number> => {
  const cursor = collection.find({
    $or: [
      { locale: { $exists: false } },
      { translationGroupId: { $exists: false } },
      { locale: null },
      { translationGroupId: null },
    ],
  });

  let updates = 0;

  for await (const page of cursor) {
    updates += 1;
    if (!APPLY) {
      continue;
    }

    await collection.updateOne(
      { id: page.id },
      {
        $set: {
          locale: page.locale?.trim().toLowerCase() || DEFAULT_LOCALE,
          translationGroupId: page.translationGroupId?.trim() || page.id,
          sourceLocale: page.sourceLocale?.trim().toLowerCase() || null,
          translationStatus: page.translationStatus ?? (page.status === 'published' ? 'published' : 'draft'),
        },
      }
    );
  }

  return updates;
};

const backfillSlugs = async (collection: Collection<CmsSlugDoc>): Promise<number> => {
  const cursor = collection.find({
    $or: [
      { locale: { $exists: false } },
      { translationGroupId: { $exists: false } },
      { locale: null },
      { translationGroupId: null },
    ],
  });

  let updates = 0;

  for await (const slug of cursor) {
    updates += 1;
    if (!APPLY) {
      continue;
    }

    await collection.updateOne(
      { id: slug.id },
      {
        $set: {
          locale: slug.locale?.trim().toLowerCase() || DEFAULT_LOCALE,
          translationGroupId: slug.translationGroupId?.trim() || slug.id,
        },
      }
    );
  }

  return updates;
};

async function main(): Promise<void> {
  const db = await getMongoDb();
  const [pageUpdates, slugUpdates] = await Promise.all([
    backfillPages(db.collection<CmsPageDoc>('cms_pages')),
    backfillSlugs(db.collection<CmsSlugDoc>('cms_slugs')),
  ]);

  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      apply: APPLY,
      defaultLocale: DEFAULT_LOCALE,
      pageUpdates,
      slugUpdates,
    })}\n`
  );
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ ok: false, message })}\n`);
  process.exitCode = 1;
});
