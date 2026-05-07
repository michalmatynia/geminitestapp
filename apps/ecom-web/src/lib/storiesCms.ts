import { getDb } from '@/lib/mongodb';
import { STORIES, type Story } from '@/data/stories';

const COLLECTION = 'ecom_stories';

function docToStory(doc: Record<string, unknown>): Story {
  const { _id, ...rest } = doc;
  void _id;
  return rest as Story;
}

export async function getAllStories(): Promise<Story[]> {
  try {
    const db = await getDb();
    const docs = await db.collection(COLLECTION).find({}).sort({ date: -1 }).toArray();
    if (docs.length === 0) return STORIES;
    return docs.map((d) => docToStory(d as Record<string, unknown>));
  } catch {
    return STORIES;
  }
}

export async function getStoryBySlug(slug: string): Promise<Story | null> {
  try {
    const db = await getDb();
    const doc = await db.collection(COLLECTION).findOne({ slug });
    if (!doc) {
      return STORIES.find((s) => s.slug === slug) ?? null;
    }
    return docToStory(doc as Record<string, unknown>);
  } catch {
    return STORIES.find((s) => s.slug === slug) ?? null;
  }
}

export async function saveStory(story: Story): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).updateOne(
    { slug: story.slug },
    { $set: { ...story, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
}

export async function deleteStory(slug: string): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).deleteOne({ slug });
}

export function validateStory(input: unknown): { story: Story | null; errors: string[] } {
  const errors: string[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { story: null, errors: ['Story must be an object.'] };
  }
  const src = input as Record<string, unknown>;

  const required = ['id', 'slug', 'category', 'title', 'subtitle', 'excerpt', 'readTime', 'date', 'gradient', 'accentColor', 'textColor'];
  for (const key of required) {
    if (typeof src[key] !== 'string' || !(src[key] as string).trim()) {
      errors.push(`${key} is required.`);
    }
  }

  if (!Array.isArray(src['tags'])) errors.push('tags must be an array.');
  if (!Array.isArray(src['body'])) errors.push('body must be an array.');
  if (!Array.isArray(src['relatedSlugs'])) errors.push('relatedSlugs must be an array.');

  if (errors.length > 0) return { story: null, errors };

  return {
    story: {
      id: (src['id'] as string).trim(),
      slug: (src['slug'] as string).trim(),
      category: (src['category'] as string).trim(),
      title: (src['title'] as string).trim(),
      subtitle: (src['subtitle'] as string).trim(),
      excerpt: (src['excerpt'] as string).trim(),
      readTime: (src['readTime'] as string).trim(),
      date: (src['date'] as string).trim(),
      gradient: (src['gradient'] as string).trim(),
      accentColor: (src['accentColor'] as string).trim(),
      textColor: (src['textColor'] as string).trim(),
      tags: (src['tags'] as unknown[]).filter((t): t is string => typeof t === 'string'),
      body: src['body'] as Story['body'],
      relatedSlugs: (src['relatedSlugs'] as unknown[]).filter((s): s is string => typeof s === 'string'),
    },
    errors: [],
  };
}
