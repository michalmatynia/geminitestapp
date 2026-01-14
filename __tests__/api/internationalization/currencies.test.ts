import { GET, POST } from "../../../app/api/currencies/route";
import prisma from "@/lib/prisma";

type CurrencyResponse = {
  code: string;
  name: string;
  symbol: string;
};

describe("Currencies API", () => {
  beforeEach(async () => {
    await prisma.countryCurrency.deleteMany({});
    await prisma.currency.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("GET /api/currencies", () => {
    it("should seed default currencies on first call", async () => {
      const res = await GET();
      const currencies = (await res.json()) as CurrencyResponse[];

      expect(res.status).toEqual(200);
      expect(currencies.length).toBeGreaterThan(0);

      const dbCurrencies = await prisma.currency.findMany();
      expect(dbCurrencies.length).toBeGreaterThan(0);

      const usd = currencies.find((c: any) => c.code === "USD");
      if (!usd) {
        throw new Error("Expected seeded currency USD.");
      }
      expect(usd.name).toBe("US Dollar");
      expect(usd.symbol).toBe("$");
    });
  });

  describe("POST /api/currencies", () => {
    it("should create a new currency", async () => {
      // The schema restricts code to specific ENUMs: USD, EUR, PLN, GBP, SEK.
      // So we can only create one of these if it doesn't exist.
      // Since beforeEach cleans up, we can create one.
      const newCurrency = {
        code: "USD",
        name: "US Dollar Custom",
        symbol: "$",
      };

      const req = new Request("http://localhost/api/currencies", {
        method: "POST",
        body: JSON.stringify(newCurrency),
      });

      const res = await POST(req);
      const currency = await res.json();

      expect(res.status).toEqual(200);
      expect(currency.code).toBe("USD");
      expect(currency.name).toBe("US Dollar Custom");
    });

    it("should reject invalid payload", async () => {
      const invalidCurrency = {
        code: "XYZ", // Not in ENUM
        name: "Invalid",
      };

      const req = new Request("http://localhost/api/currencies", {
        method: "POST",
        body: JSON.stringify(invalidCurrency),
      });

      const res = await POST(req);
      expect(res.status).toEqual(400);
    });
  });
});
