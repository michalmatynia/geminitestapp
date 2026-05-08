import { cache } from 'react';
import { getDb } from '@/lib/mongodb';
import { EDITORIALS, type Editorial } from '@/data/lookbook';
import { DEFAULT_LOCALE, normalizeLocale } from '@/lib/locales';

const COLLECTION = 'ecom_lookbook';

const EDITORIAL_PL: Record<string, Partial<Editorial>> = {
  'spring-26-earth': {
    title: 'Ziemia i ręka',
    subtitle: 'Ceramika wybrzeża Bretanii - studium cierpliwości i gliny',
    season: 'Wiosna 2026',
  },
  'spring-26-linen': {
    title: 'Ciężar światła',
    subtitle: 'Belgijski len, prany i noszony aż do miękkiej elegancji',
    season: 'Wiosna 2026',
  },
  'spring-26-cognac': {
    title: 'Garbarnie Millau',
    subtitle: 'Portret francuskiej dynastii skórzanej w piątym pokoleniu',
    season: 'Wiosna 2026',
  },
  'aw-25-obsidian': {
    title: 'Ciemne studium',
    subtitle: 'Obsydianowa paleta na długie miesiące światła wewnątrz',
    season: 'Jesień / Zima 2025',
  },
  'aw-25-marble': {
    title: 'Biel i żyła',
    subtitle: 'Marmur Carrara jako fundament rytuału stołu',
    season: 'Jesień / Zima 2025',
  },
  'aw-25-wool': {
    title: 'Hebrydy Zewnętrzne',
    subtitle: 'Podróż na wyspy, z których pochodzi wełna naszych szalików',
    season: 'Jesień / Zima 2025',
  },
  'ss-25-clay': {
    title: 'Przy świetle świec',
    subtitle: 'Ręcznie robione gliniane zawieszki do pomieszczeń, które lubią cień',
    season: 'Wiosna / Lato 2025',
  },
  'ss-25-walnut': {
    title: 'Poranny rytuał',
    subtitle: 'Taca jako rama dnia, wykonana z amerykańskiego czarnego orzecha',
    season: 'Wiosna / Lato 2025',
  },
};

function docToEditorial(doc: Record<string, unknown>): Editorial {
  const { _id, locale, createdAt, updatedAt, ...rest } = doc;
  void _id;
  void locale;
  void createdAt;
  void updatedAt;
  return rest as unknown as Editorial;
}

function localizeEditorial(entry: Editorial, localeInput?: string | null): Editorial {
  if (normalizeLocale(localeInput) !== 'pl') return entry;
  return {
    ...entry,
    ...(EDITORIAL_PL[entry.id] ?? {}),
  };
}

export const getAllLookbookEntries = cache(async function getAllLookbookEntries(locale?: string | null): Promise<Editorial[]> {
  const requestedLocale = normalizeLocale(locale);
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTION);
    const defaultDocs = await collection.find({ locale: DEFAULT_LOCALE }).sort({ issue: 1 }).toArray();
    const legacyDocs = defaultDocs.length === 0
      ? await collection.find({ locale: { $exists: false } }).sort({ issue: 1 }).toArray()
      : [];
    const baseEntries = (defaultDocs.length > 0 ? defaultDocs : legacyDocs)
      .map((d) => docToEditorial(d as Record<string, unknown>));
    const fallbackEntries = baseEntries.length > 0 ? baseEntries : EDITORIALS;

    if (requestedLocale === DEFAULT_LOCALE) return fallbackEntries;

    const localizedDocs = await collection.find({ locale: requestedLocale }).sort({ issue: 1 }).toArray();
    const localizedEntries = localizedDocs.map((d) => docToEditorial(d as Record<string, unknown>));
    const localizedById = new Map(localizedEntries.map((entry) => [entry.id, entry]));
    const fallbackIds = new Set(fallbackEntries.map((entry) => entry.id));
    const localizedOnly = localizedEntries.filter((entry) => !fallbackIds.has(entry.id));

    return [
      ...localizedOnly,
      ...fallbackEntries.map((entry) => localizedById.get(entry.id) ?? localizeEditorial(entry, requestedLocale)),
    ];
  } catch {
    return EDITORIALS.map((entry) => localizeEditorial(entry, requestedLocale));
  }
});

export const getLookbookEntry = cache(async function getLookbookEntry(id: string, locale?: string | null): Promise<Editorial | null> {
  const requestedLocale = normalizeLocale(locale);
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTION);
    const localizedDoc = await collection.findOne({ id, locale: requestedLocale });
    if (localizedDoc) {
      return docToEditorial(localizedDoc as Record<string, unknown>);
    }

    const defaultDoc = await collection.findOne({ id, locale: DEFAULT_LOCALE });
    const legacyDoc = defaultDoc ? null : await collection.findOne({ id, locale: { $exists: false } });
    const fallback = defaultDoc ?? legacyDoc;
    const fallbackEntry = fallback
      ? docToEditorial(fallback as Record<string, unknown>)
      : EDITORIALS.find((e) => e.id === id) ?? null;

    return fallbackEntry ? localizeEditorial(fallbackEntry, requestedLocale) : null;
  } catch {
    const fallback = EDITORIALS.find((e) => e.id === id) ?? null;
    return fallback ? localizeEditorial(fallback, requestedLocale) : null;
  }
});

export async function saveLookbookEntry(entry: Editorial, locale?: string | null): Promise<void> {
  const targetLocale = normalizeLocale(locale);
  const db = await getDb();
  await db.collection(COLLECTION).updateOne(
    { id: entry.id, locale: targetLocale },
    { $set: { ...entry, locale: targetLocale, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
}

export async function deleteLookbookEntry(id: string, locale?: string | null): Promise<void> {
  const targetLocale = normalizeLocale(locale);
  const db = await getDb();
  if (targetLocale === DEFAULT_LOCALE) {
    await db.collection(COLLECTION).deleteMany({
      id,
      $or: [{ locale: DEFAULT_LOCALE }, { locale: { $exists: false } }],
    });
    return;
  }

  await db.collection(COLLECTION).deleteOne({ id, locale: targetLocale });
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
