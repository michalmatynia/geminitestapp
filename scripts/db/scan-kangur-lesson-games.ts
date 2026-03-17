import 'dotenv/config';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  resolveKangurLessonDocumentPages,
  normalizeKangurLessonDocument,
} from '@/features/kangur/lesson-documents';
import { KANGUR_LESSON_ACTIVITY_DEFINITIONS } from '@/features/kangur/lesson-activities';
import { KANGUR_LESSON_ACTIVITY_IDS } from '@/features/kangur/shared/contracts/kangur';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

const COLLECTION = 'kangur_lesson_documents';

type LessonActivityHit = {
  activityId: string;
  type: string | null;
  label: string | null;
  pageId: string;
  blockId: string;
};

type LessonActivitySummary = {
  lessonId: string;
  activityCount: number;
  activities: LessonActivityHit[];
};

type ActivityCatalogEntry = {
  activityId: string;
  type: string;
  label: string;
  description: string;
};

type ScanReport = {
  scannedAt: string;
  totalDocuments: number;
  lessonsWithActivities: number;
  activityCatalog: ActivityCatalogEntry[];
  activityCounts: Record<string, number>;
  activityTypeCounts: Record<string, number>;
  activityIdsInLessons: string[];
  unusedActivityIds: string[];
  unknownActivityIds: string[];
  lessons: LessonActivitySummary[];
};

const OUTPUT_PATH = path.join(process.cwd(), 'tmp', 'kangur-lesson-game-scan.json');

const bump = (map: Map<string, number>, key: string): void => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

const toSortedRecord = (map: Map<string, number>): Record<string, number> =>
  Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required to scan Kangur lesson documents.');
  }

  const db = await getMongoDb();
  const docs = await db.collection<{ lessonId?: string; document?: unknown }>(COLLECTION).find({}).toArray();
  const store = Object.fromEntries(
    docs
      .filter((doc) => typeof doc.lessonId === 'string' && doc.lessonId.trim().length > 0)
      .map((doc) => [doc.lessonId!, normalizeKangurLessonDocument(doc.document ?? {})])
  );
  const activityCounts = new Map<string, number>();
  const activityTypeCounts = new Map<string, number>();
  const unknownActivityIds = new Set<string>();
  const lessons: LessonActivitySummary[] = [];
  const activityCatalog: ActivityCatalogEntry[] = Object.values(
    KANGUR_LESSON_ACTIVITY_DEFINITIONS
  )
    .map((definition) => ({
      activityId: definition.id,
      type: definition.type,
      label: definition.label,
      description: definition.description,
    }))
    .sort((a, b) => a.activityId.localeCompare(b.activityId));

  for (const [lessonId, document] of Object.entries(store)) {
    const pages = resolveKangurLessonDocumentPages(document);
    const hits: LessonActivityHit[] = [];

    for (const page of pages) {
      for (const block of page.blocks) {
        if (block.type !== 'activity') continue;
        const definition = KANGUR_LESSON_ACTIVITY_DEFINITIONS[block.activityId];
        const type = definition?.type ?? null;
        if (!definition) {
          unknownActivityIds.add(block.activityId);
        }
        bump(activityCounts, block.activityId);
        if (type) {
          bump(activityTypeCounts, type);
        }
        hits.push({
          activityId: block.activityId,
          type,
          label: definition?.label ?? null,
          pageId: page.id,
          blockId: block.id,
        });
      }
    }

    if (hits.length > 0) {
      lessons.push({ lessonId, activityCount: hits.length, activities: hits });
    }
  }

  const activityIdsInLessons = [...activityCounts.keys()].sort();
  const unusedActivityIds = KANGUR_LESSON_ACTIVITY_IDS.filter(
    (activityId) => !activityCounts.has(activityId)
  );

  const report: ScanReport = {
    scannedAt: new Date().toISOString(),
    totalDocuments: Object.keys(store).length,
    lessonsWithActivities: lessons.length,
    activityCatalog,
    activityCounts: toSortedRecord(activityCounts),
    activityTypeCounts: toSortedRecord(activityTypeCounts),
    activityIdsInLessons,
    unusedActivityIds,
    unknownActivityIds: [...unknownActivityIds].sort(),
    lessons,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('Kangur lesson activity scan complete.');
  console.log(`- Documents scanned: ${report.totalDocuments}`);
  console.log(`- Lessons with activities: ${report.lessonsWithActivities}`);
  console.log(`- Activity IDs found: ${report.activityIdsInLessons.length}`);
  console.log(`- Unknown activity IDs: ${report.unknownActivityIds.length}`);
  console.log(`- Output: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error('Failed to scan Kangur lesson activities.');
  console.error(error);
  process.exit(1);
});
