import { GET, POST } from "../../../app/api/countries/route";
import { PUT } from "../../../app/api/countries/[id]/route";
import prisma from "@/lib/prisma";

type CountryResponse = {
  code: string;
  name: string;
  currencies: Array<{ currency: { code: string } }>;
};

describe("Countries API", () => {
  beforeEach(async () => {
    // Clear the database before each test
    await prisma.countryCurrency.deleteMany({});
    await prisma.languageCountry.deleteMany({});
    await prisma.country.deleteMany({});
    await prisma.currency.deleteMany({});
    await prisma.language.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("GET /api/countries", () => {
    it("should seed default countries, currencies, and languages on first call", async () => {
      const res = await GET();
      const countries = (await res.json()) as CountryResponse[];

      expect(res.status).toEqual(200);
      expect(countries.length).toBeGreaterThan(0);

      // Verify seeding
      const dbCountries = await prisma.country.findMany();
      expect(dbCountries.length).toBeGreaterThan(0);
      
      const dbCurrencies = await prisma.currency.findMany();
      expect(dbCurrencies.length).toBeGreaterThan(0);

      const dbLanguages = await prisma.language.findMany();
      expect(dbLanguages.length).toBeGreaterThan(0);

      // Check specific seeded data
      const pl = countries.find((c: any) => c.code === "PL");
      expect(pl).toBeDefined();
      expect(pl.name).toBe("Poland");
      expect(pl.currencies.length).toBeGreaterThan(0);
      expect(pl.currencies[0].currency.code).toBe("PLN");
    });

    it("should return existing countries without duplicating on subsequent calls", async () => {
      // First call to seed
      await GET();
      const initialCount = await prisma.country.count();

      // Second call
      const res = await GET();
      const countries = (await res.json()) as CountryResponse[];
      const secondCount = await prisma.country.count();

      expect(res.status).toEqual(200);
      expect(countries.length).toEqual(initialCount);
      expect(secondCount).toEqual(initialCount);
    });
  });

  describe("POST /api/countries", () => {
    it("should create a new country", async () => {
      const newCountry = {
        code: "DE", // Re-using a valid code from enum but for a "new" entry test context (though ENUM constraint applies)
        // Wait, schema has specific ENUM for CountryCode.
        // The enum is: PL, DE, GB, US, SE.
        // So I can only create countries with these codes.
        // If GET seeds them, I might conflict if I don't clean up or if I try to create one that already exists.
        // In beforeEach I clean up.
        name: "Germany Custom",
      };

      const req = new Request("http://localhost/api/countries", {
        method: "POST",
        body: JSON.stringify(newCountry),
      });

      const res = await POST(req);
      const country = await res.json();

      expect(res.status).toEqual(200);
      expect(country.code).toBe("DE");
      expect(country.name).toBe("Germany Custom");
    });

    it("should create a country with currencies", async () => {
       // Need to create currency first
       const currency = await prisma.currency.create({
         data: { code: "EUR", name: "Euro", symbol: "€" }
       });

       const newCountry = {
        code: "DE",
        name: "Germany with Euro",
        currencyIds: [currency.id]
      };

      const req = new Request("http://localhost/api/countries", {
        method: "POST",
        body: JSON.stringify(newCountry),
      });

      const res = await POST(req);
      const country = await res.json();

      expect(res.status).toEqual(200);
      expect(country.currencies).toHaveLength(1);
      expect(country.currencies[0].currencyId).toBe(currency.id);
    });

    it("should reject invalid payload", async () => {
      const invalidCountry = {
        code: "INVALID_CODE", // Not in ENUM
        name: "Invalid",
      };

      const req = new Request("http://localhost/api/countries", {
        method: "POST",
        body: JSON.stringify(invalidCountry),
      });

      const res = await POST(req);
      expect(res.status).toEqual(400);
    });
  });

  describe("PUT /api/countries/[id]", () => {
    it("should update country currencies", async () => {
      const country = await prisma.country.create({
        data: { code: "PL", name: "Poland" },
      });
      const currency = await prisma.currency.create({
        data: { code: "PLN", name: "Polish Zloty", symbol: "zł" },
      });

      const req = new Request("http://localhost/api/countries/" + country.id, {
        method: "PUT",
        body: JSON.stringify({
          code: "PL",
          name: "Poland",
          currencyIds: [currency.id],
        }),
      });

      const res = await PUT(req, { params: Promise.resolve({ id: country.id }) });
      const updated = await res.json();

      expect(res.status).toEqual(200);
      expect(updated.currencies).toHaveLength(1);
      expect(updated.currencies[0].currencyId).toBe(currency.id);
    });
  });
});
