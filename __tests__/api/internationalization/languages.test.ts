import { GET, POST } from "../../../app/api/languages/route";
import { DELETE, PUT } from "../../../app/api/languages/[id]/route";
import prisma from "@/lib/prisma";

type LanguageResponse = {
  code: string;
  name: string;
  nativeName?: string | null;
  countries?: Array<{ countryId: string }>;
};

describe("Languages API", () => {
  beforeEach(async () => {
    await prisma.languageCountry.deleteMany({});
    await prisma.language.deleteMany({});
    await prisma.country.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("GET /api/languages", () => {
    it("should seed default languages on first call", async () => {
      const res = await GET();
      const languages = (await res.json()) as LanguageResponse[];

      expect(res.status).toEqual(200);
      expect(languages.length).toBeGreaterThan(0);

      const dbLanguages = await prisma.language.findMany();
      expect(dbLanguages.length).toBeGreaterThan(0);

      const en = languages.find((l: any) => l.code === "EN");
      expect(en).toBeDefined();
      expect(en.name).toBe("English");
      expect(en.nativeName).toBe("English");
    });
  });

  describe("POST /api/languages", () => {
    it("should create a new language", async () => {
      const newLanguage = {
        code: "fr", // Will be uppercased
        name: "French",
        nativeName: "Français",
      };

      const req = new Request("http://localhost/api/languages", {
        method: "POST",
        body: JSON.stringify(newLanguage),
      });

      const res = await POST(req);
      const language = await res.json();

      expect(res.status).toEqual(200);
      expect(language.code).toBe("FR");
      expect(language.name).toBe("French");
    });

    it("should create a language with country assignments", async () => {
        // Need a country first
        const country = await prisma.country.create({
            data: { code: "PL", name: "Poland" }
        });

        const newLanguage = {
            code: "pl",
            name: "Polish",
            countryIds: [country.id]
        };

        const req = new Request("http://localhost/api/languages", {
            method: "POST",
            body: JSON.stringify(newLanguage),
        });

        const res = await POST(req);
        const language = await res.json();

        expect(res.status).toEqual(200);
        expect(language.countries).toHaveLength(1);
        expect(language.countries[0].countryId).toBe(country.id);
    });

    it("should reject invalid payload", async () => {
      const invalidLanguage = {
        name: "Missing Code",
      };

      const req = new Request("http://localhost/api/languages", {
        method: "POST",
        body: JSON.stringify(invalidLanguage),
      });

      const res = await POST(req);
      expect(res.status).toEqual(400);
    });
  });

  describe("PUT /api/languages/[id]", () => {
    it("should update language fields and countries", async () => {
      const language = await prisma.language.create({
        data: { code: "PL", name: "Polish", nativeName: "Polski" },
      });
      const country = await prisma.country.create({
        data: { code: "PL", name: "Poland" },
      });

      const req = new Request(`http://localhost/api/languages/${language.id}`, {
        method: "PUT",
        body: JSON.stringify({
          code: "PL",
          name: "Polish Updated",
          nativeName: "Polski",
          countryIds: [country.id],
        }),
      });

      const res = await PUT(req, { params: Promise.resolve({ id: language.id }) });
      const updated = await res.json();

      expect(res.status).toEqual(200);
      expect(updated.name).toBe("Polish Updated");
      expect(updated.countries).toHaveLength(1);
      expect(updated.countries[0].countryId).toBe(country.id);
    });
  });

  describe("DELETE /api/languages/[id]", () => {
    it("should delete language and remove assignments", async () => {
      const language = await prisma.language.create({
        data: { code: "SV", name: "Swedish", nativeName: "Svenska" },
      });
      const country = await prisma.country.create({
        data: { code: "SE", name: "Sweden" },
      });
      const catalog = await prisma.catalog.create({
        data: { name: "Nordic", description: "Nordic catalog" },
      });

      await prisma.languageCountry.create({
        data: { languageId: language.id, countryId: country.id },
      });
      await prisma.catalogLanguage.create({
        data: { catalogId: catalog.id, languageId: language.id },
      });

      const res = await DELETE(new Request("http://localhost/api/languages/" + language.id), {
        params: Promise.resolve({ id: language.id }),
      });

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
