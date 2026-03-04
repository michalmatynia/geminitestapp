import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest';

vi.unmock('@/shared/lib/db/prisma');

import { DELETE, PUT } from '@/app/api/v2/metadata/[type]/[id]/route';
import { GET, POST } from '@/app/api/v2/metadata/[type]/route';
import prisma from '@/shared/lib/db/prisma';

type LanguageResponse = {
  id: string;
  code: string;
  name: string;
  nativeName?: string | null;
  countries?: Array<{ countryId: string }>;
};

let canMutateLanguagesApiTables = true;

describe('Languages API', () => {
  const languagesRouteContext = { params: Promise.resolve({ type: 'languages' }) };
  const languagesIdRouteContext = (id: string) =>
    ({ params: Promise.resolve({ type: 'languages', id }) }) as const;
  const shouldSkipLanguagesApiTests = (): boolean =>
    !process.env['DATABASE_URL'] || !canMutateLanguagesApiTables;

  beforeEach(async () => {
    if (shouldSkipLanguagesApiTests()) return;

    try {
      await prisma.languageCountry.deleteMany({});
      await prisma.language.deleteMany({});
      await prisma.country.deleteMany({});
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'EPERM') {
        canMutateLanguagesApiTables = false;
        return;
      }
      throw error;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/v2/metadata/languages', () => {
    it('should seed default languages on first call', async () => {
      if (shouldSkipLanguagesApiTests()) return;
      const res = await GET(
        new NextRequest('http://localhost/api/v2/metadata/languages'),
        languagesRouteContext
      );
      const languages = (await res.json()) as LanguageResponse[];

      expect(res.status).toEqual(200);
      expect(languages.length).toBeGreaterThan(0);

      const dbLanguages = await prisma.language.findMany();
      expect(dbLanguages.length).toBeGreaterThan(0);

      const en = languages.find((l: LanguageResponse) => l.code === 'EN');
      if (!en) {
        throw new Error('Expected seeded language EN.');
      }
      expect(en.name).toBe('English');
      expect(en.nativeName).toBe('English');
    });
  });

  describe('POST /api/v2/metadata/languages', () => {
    it('should create a new language', async () => {
      if (shouldSkipLanguagesApiTests()) return;
      const newLanguage = {
        code: 'fr', // Will be uppercased
        name: 'French',
        nativeName: 'Français',
      };

      const req = new NextRequest('http://localhost/api/v2/metadata/languages', {
        method: 'POST',
        body: JSON.stringify(newLanguage),
      });

      const res = await POST(req, languagesRouteContext);
      const language = (await res.json()) as LanguageResponse;

      expect(res.status).toEqual(200);
      expect(language.code).toBe('FR');
      expect(language.name).toBe('French');
    });

    it('should create a language with country assignments', async () => {
      if (shouldSkipLanguagesApiTests()) return;
      // Need a country first
      const country = await prisma.country.create({
        data: { code: 'PL', name: 'Poland' },
      });

      const newLanguage = {
        code: 'pl',
        name: 'Polish',
        countryIds: [country.id],
      };

      const req = new NextRequest('http://localhost/api/v2/metadata/languages', {
        method: 'POST',
        body: JSON.stringify(newLanguage),
      });

      const res = await POST(req, languagesRouteContext);
      const language = (await res.json()) as LanguageResponse;

      expect(res.status).toEqual(200);
      expect(language.countries).toHaveLength(1);
      expect(language.countries![0]!.countryId).toBe(country.id);
    });

    it('should reject invalid payload', async () => {
      if (shouldSkipLanguagesApiTests()) return;
      const invalidLanguage = {
        name: 'Missing Code',
      };

      const req = new NextRequest('http://localhost/api/v2/metadata/languages', {
        method: 'POST',
        body: JSON.stringify(invalidLanguage),
      });

      const res = await POST(req, languagesRouteContext);
      expect(res.status).toEqual(400);
    });
  });

  describe('PUT /api/v2/metadata/languages/[id]', () => {
    it('should update language fields and countries', async () => {
      if (shouldSkipLanguagesApiTests()) return;
      const language = await prisma.language.create({
        data: { code: 'PL', name: 'Polish', nativeName: 'Polski' },
      });
      const country = await prisma.country.create({
        data: { code: 'PL', name: 'Poland' },
      });

      const req = new NextRequest(`http://localhost/api/v2/metadata/languages/${language.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          code: 'PL',
          name: 'Polish Updated',
          nativeName: 'Polski',
          countryIds: [country.id],
        }),
      });

      const res = await PUT(req, languagesIdRouteContext(language.id));
      const updated = (await res.json()) as LanguageResponse;

      expect(res.status).toEqual(200);
      expect(updated.name).toBe('Polish Updated');
      expect(updated.countries).toHaveLength(1);
      expect(updated.countries![0]!.countryId).toBe(country.id);
    });
  });

  describe('DELETE /api/v2/metadata/languages/[id]', () => {
    it('should delete language and remove assignments', async () => {
      if (shouldSkipLanguagesApiTests()) return;
      const language = await prisma.language.create({
        data: { code: 'SV', name: 'Swedish', nativeName: 'Svenska' },
      });
      const country = await prisma.country.create({
        data: { code: 'SE', name: 'Sweden' },
      });
      const catalog = await prisma.catalog.create({
        data: { name: 'Nordic', description: 'Nordic catalog' },
      });

      await prisma.languageCountry.create({
        data: { languageId: language.id, countryId: country.id },
      });
      await prisma.catalogLanguage.create({
        data: { catalogId: catalog.id, languageId: language.id },
      });

      const res = await DELETE(
        new NextRequest('http://localhost/api/v2/metadata/languages/' + language.id),
        languagesIdRouteContext(language.id)
      );

      expect(res.status).toEqual(204);
      const remainingLanguage = await prisma.language.findUnique({
        where: { id: language.id },
      });
      const remainingCountryLinks = await prisma.languageCountry.findMany({
        where: { languageId: language.id },
      });
      const remainingCatalogLinks = await prisma.catalogLanguage.findMany({
        where: { languageId: language.id },
      });

      expect(remainingLanguage).toBeNull();
      expect(remainingCountryLinks).toHaveLength(0);
      expect(remainingCatalogLinks).toHaveLength(0);
    });
  });
});
