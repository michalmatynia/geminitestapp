import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  ensureInternationalizationDefaults,
  fallbackLanguages,
  defaultLanguages,
  countryMappings,
} from '@/shared/lib/internationalization/server';
import { getInternationalizationProvider } from '@/shared/lib/internationalization/services/internationalization-provider';
import { parseJsonBody } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { conflictError, internalError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import type { Prisma } from '@prisma/client';

const languageCreateSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  nativeName: z.string().trim().min(1).optional(),
  countryIds: z.array(z.string().trim().min(1)).optional(),
});

type LanguageCountryDoc = {
  countryId: string;
  country: {
    id: string;
    code: string;
    name: string;
  };
};

type CountryDoc = {
  id: string;
  code: string;
  name: string;
};

type LanguageDoc = {
  id: string;
  code: string;
  name: string;
  nativeName?: string | null;
  countries: LanguageCountryDoc[];
  createdAt: Date;
  updatedAt: Date;
};

const LANGUAGES_COLLECTION = 'languages';

const seedMongoLanguages = async (db: Awaited<ReturnType<typeof getMongoDb>>) => {
  const now = new Date();
  const countriesCollection = db.collection('countries');

  for (const language of defaultLanguages) {
    const matchingMappings = countryMappings.filter((mapping: (typeof countryMappings)[number]) =>
      mapping.languageCodes.includes(language.code)
    );

    const countries: LanguageCountryDoc[] = [];
    for (const mapping of matchingMappings) {
      const country = (await countriesCollection.findOne({
        code: mapping.countryCode,
      })) as { id: string; code: string; name: string } | null;
      if (country) {
        countries.push({
          countryId: country.id || mapping.countryCode,
          country: {
            id: country.id || mapping.countryCode,
            code: country.code || mapping.countryCode,
            name: country.name || mapping.countryCode,
          },
        });
      }
    }

    await db.collection<LanguageDoc>(LANGUAGES_COLLECTION).updateOne(
      { code: language.code },
      {
        $setOnInsert: {
          id: language.code,
          code: language.code,
          name: language.name,
          nativeName: language.nativeName,
          countries,
          createdAt: now,
        },
        $set: { updatedAt: now },
      },
      { upsert: true }
    );
  }
};

/**
 * GET /api/languages
 * Fetches available languages (seeds defaults if empty).
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const provider = await getInternationalizationProvider();
  if (provider === 'mongodb') {
    if (!process.env['MONGODB_URI']) {
      throw internalError('MongoDB is not configured.');
    }
    const mongo = await getMongoDb();
    await seedMongoLanguages(mongo);
    const languages = await mongo
      .collection<LanguageDoc>(LANGUAGES_COLLECTION)
      .find({})
      .sort({ code: 1 })
      .toArray();
    const formattedLanguages = languages.map((lang) => ({
      ...lang,
      createdAt: lang.createdAt.toISOString(),
      updatedAt: lang.updatedAt.toISOString(),
    }));
    return NextResponse.json(formattedLanguages);
  }

  if (!process.env['DATABASE_URL']) {
    return NextResponse.json(fallbackLanguages);
  }
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await ensureInternationalizationDefaults(tx);
  });
  const languages = await prisma.language.findMany({
    orderBy: { code: 'asc' },
    include: {
      countries: {
        include: {
          country: true,
        },
      },
    },
  });
  const formattedLanguages = languages.map((lang) => ({
    ...lang,
    createdAt: lang.createdAt.toISOString(),
    updatedAt: lang.updatedAt.toISOString(),
    countries: lang.countries.map((lc) => ({
      ...lc,
      assignedAt: lc.assignedAt.toISOString(),
      country: {
        ...lc.country,
        createdAt: lc.country.createdAt.toISOString(),
        updatedAt: lc.country.updatedAt.toISOString(),
      },
    })),
  }));
  return NextResponse.json(formattedLanguages);
}

/**
 * POST /api/languages
 * Creates a language with optional country assignments.
 */
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, languageCreateSchema, {
    logPrefix: 'languages.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const code = data.code.toUpperCase();

  const provider = await getInternationalizationProvider();
  if (provider === 'mongodb') {
    if (!process.env['MONGODB_URI']) {
      throw internalError('MongoDB is not configured.');
    }
    const mongo = await getMongoDb();
    const existing = await mongo.collection<LanguageDoc>(LANGUAGES_COLLECTION).findOne({ code });
    if (existing) {
      throw conflictError('Language code already exists.', { code });
    }

    const countryIds = data.countryIds ?? [];
    const uniqueIds = Array.from(new Set(countryIds));
    const countries: LanguageCountryDoc[] = [];

    if (uniqueIds.length > 0) {
      const countriesCollection = mongo.collection('countries');
      for (const countryId of uniqueIds) {
        const country = (await countriesCollection.findOne({
          id: countryId,
        })) as unknown as CountryDoc | null;
        if (country) {
          countries.push({
            countryId: country.id,
            country: {
              id: country.id,
              code: country.code,
              name: country.name,
            },
          });
        }
      }
    }

    const now = new Date();
    const doc: LanguageDoc = {
      id: code,
      code,
      name: data.name,
      nativeName: data.nativeName ?? null,
      countries,
      createdAt: now,
      updatedAt: now,
    };
    await mongo.collection<LanguageDoc>(LANGUAGES_COLLECTION).insertOne(doc);
    return NextResponse.json(doc);
  }

  const countryIds = data.countryIds ?? [];
  const uniqueIds = Array.from(new Set(countryIds));
  const existingLanguage = await prisma.language.findUnique({
    where: { code },
    select: { id: true },
  });
  if (existingLanguage) {
    throw conflictError('Language code already exists.', { code });
  }
  const existing = await prisma.country.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((entry: { id: string }) => entry.id));
  const validIds = uniqueIds.filter((countryId: string) => existingIds.has(countryId));

  const language = await prisma.language.create({
    data: {
      code,
      name: data.name,
      ...(data.nativeName !== undefined && { nativeName: data.nativeName }),
      ...(validIds.length
        ? {
          countries: {
            createMany: {
              data: validIds.map((countryId: string) => ({ countryId })),
            },
          },
        }
        : {}),
    },
    include: {
      countries: {
        include: {
          country: true,
        },
      },
    },
  });
  return NextResponse.json(language);
}
