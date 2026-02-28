import 'server-only';

import type { ProductDbProvider } from '@/features/products/services/product-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

type LanguageLookupRow = {
  id?: string | null;
  code?: string | null;
};

const buildLookupMap = (rows: LanguageLookupRow[]): Map<string, string> => {
  const map = new Map<string, string>();
  for (const row of rows) {
    const id = String(row.id ?? '').trim();
    const code = String(row.code ?? '').trim();
    if (id) {
      map.set(id, id);
      map.set(id.toLowerCase(), id);
    }
    if (code && id) {
      map.set(code, id);
      map.set(code.toLowerCase(), id);
    }
  }
  return map;
};

const readLanguageRows = async (provider: ProductDbProvider): Promise<LanguageLookupRow[]> => {
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    return mongo
      .collection<LanguageLookupRow>('languages')
      .find({}, { projection: { id: 1, code: 1 } })
      .toArray();
  }

  const rows = await prisma.language.findMany({
    select: { id: true, code: true },
  });
  return rows;
};

export const normalizeCatalogLanguageSelection = async (params: {
  provider: ProductDbProvider;
  languageIds: string[];
  defaultLanguageId?: string | null;
}): Promise<{ languageIds: string[]; defaultLanguageId: string | null }> => {
  const { provider, languageIds, defaultLanguageId } = params;
  const rows = await readLanguageRows(provider);
  const lookup = buildLookupMap(rows);

  const normalizedLanguageIds: string[] = [];
  const seen = new Set<string>();
  for (const rawId of languageIds) {
    const trimmed = String(rawId ?? '').trim();
    if (!trimmed) continue;
    const canonical = lookup.get(trimmed) ?? lookup.get(trimmed.toLowerCase()) ?? trimmed;
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    normalizedLanguageIds.push(canonical);
  }

  const trimmedDefault = String(defaultLanguageId ?? '').trim();
  const normalizedDefaultLanguageId = trimmedDefault
    ? (lookup.get(trimmedDefault) ?? lookup.get(trimmedDefault.toLowerCase()) ?? trimmedDefault)
    : null;

  return {
    languageIds: normalizedLanguageIds,
    defaultLanguageId: normalizedDefaultLanguageId,
  };
};
