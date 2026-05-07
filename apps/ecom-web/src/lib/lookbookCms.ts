import { getDb } from '@/lib/mongodb';
import { EDITORIALS, type Editorial } from '@/data/lookbook';

const COLLECTION = 'ecom_lookbook';

function docToEditorial(doc: Record<string, unknown>): Editorial {
  const { _id, ...rest } = doc;
  void _id;
  return rest as unknown as Editorial;
}

export async function getAllLookbookEntries(): Promise<Editorial[]> {
  try {
    const db = await getDb();
    const docs = await db.collection(COLLECTION).find({}).sort({ issue: 1 }).toArray();
    if (docs.length === 0) return EDITORIALS;
    return docs.map((d) => docToEditorial(d as Record<string, unknown>));
  } catch {
    return EDITORIALS;
  }
}

export async function getLookbookEntry(id: string): Promise<Editorial | null> {
  try {
    const db = await getDb();
    const doc = await db.collection(COLLECTION).findOne({ id });
    if (!doc) return EDITORIALS.find((e) => e.id === id) ?? null;
    return docToEditorial(doc as Record<string, unknown>);
  } catch {
    return EDITORIALS.find((e) => e.id === id) ?? null;
  }
}

export async function saveLookbookEntry(entry: Editorial): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).updateOne(
    { id: entry.id },
    { $set: { ...entry, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
}

export async function deleteLookbookEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).deleteOne({ id });
}

export function validateEditorial(input: unknown): { editorial: Editorial | null; errors: string[] } {
  const errors: string[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { editorial: null, errors: ['Entry must be an object.'] };
  }
  const src = input as Record<string, unknown>;

  const required = ['id', 'issue', 'title', 'subtitle', 'season', 'gradient', 'textColor', 'productSlug'];
  for (const key of required) {
    if (typeof src[key] !== 'string' || !(src[key] as string).trim()) {
      errors.push(`${key} is required.`);
    }
  }
  if (errors.length > 0) return { editorial: null, errors };

  return {
    editorial: {
      id: (src['id'] as string).trim(),
      issue: (src['issue'] as string).trim(),
      title: (src['title'] as string).trim(),
      subtitle: (src['subtitle'] as string).trim(),
      season: (src['season'] as string).trim(),
      gradient: (src['gradient'] as string).trim(),
      textColor: (src['textColor'] as string).trim(),
      productSlug: (src['productSlug'] as string).trim(),
    },
    errors: [],
  };
}
