import { getDb } from '@/lib/mongodb';
import { EDITORIALS, type Editorial } from '@/data/lookbook';
import { normalizeLocale } from '@/lib/locales';

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
  const { _id, ...rest } = doc;
  void _id;
  return rest as unknown as Editorial;
}

function localizeEditorial(entry: Editorial, localeInput?: string | null): Editorial {
  if (normalizeLocale(localeInput) !== 'pl') return entry;
  return {
    ...entry,
    ...(EDITORIAL_PL[entry.id] ?? {}),
  };
}

export async function getAllLookbookEntries(locale?: string | null): Promise<Editorial[]> {
  try {
    const db = await getDb();
    const docs = await db.collection(COLLECTION).find({}).sort({ issue: 1 }).toArray();
    const entries = docs.length === 0
      ? EDITORIALS
      : docs.map((d) => docToEditorial(d as Record<string, unknown>));
    return entries.map((entry) => localizeEditorial(entry, locale));
  } catch {
    return EDITORIALS.map((entry) => localizeEditorial(entry, locale));
  }
}

export async function getLookbookEntry(id: string, locale?: string | null): Promise<Editorial | null> {
  try {
    const db = await getDb();
    const doc = await db.collection(COLLECTION).findOne({ id });
    if (!doc) {
      const fallback = EDITORIALS.find((e) => e.id === id) ?? null;
      return fallback ? localizeEditorial(fallback, locale) : null;
    }
    return localizeEditorial(docToEditorial(doc as Record<string, unknown>), locale);
  } catch {
    const fallback = EDITORIALS.find((e) => e.id === id) ?? null;
    return fallback ? localizeEditorial(fallback, locale) : null;
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
