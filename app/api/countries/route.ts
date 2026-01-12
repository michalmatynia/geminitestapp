import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";

const countrySchema = z.object({
  code: z.enum(["PL", "DE", "GB", "US", "SE"]),
  name: z.string().trim().min(1),
  currencyIds: z.array(z.string()).optional(),
});

const defaultCountries = [
  { code: "PL", name: "Poland" },
  { code: "DE", name: "Germany" },
  { code: "GB", name: "United Kingdom" },
  { code: "SE", name: "Sweden" },
];

const defaultLanguages = [
  { code: "EN", name: "English", nativeName: "English" },
  { code: "PL", name: "Polish", nativeName: "Polski" },
  { code: "DE", name: "German", nativeName: "Deutsch" },
  { code: "SV", name: "Swedish", nativeName: "Svenska" },
];

const defaultCurrencies = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "GBP", name: "British Pound" },
  { code: "SEK", name: "Swedish Krona" },
];

const countryMappings = [
  { countryCode: "PL", currencyCode: "PLN", languageCodes: ["PL"] },
  { countryCode: "DE", currencyCode: "EUR", languageCodes: ["DE"] },
  { countryCode: "GB", currencyCode: "GBP", languageCodes: ["EN"] },
  { countryCode: "SE", currencyCode: "SEK", languageCodes: ["SV"] },
];

/**
 * GET /api/countries
 * Fetches all countries.
 */
export async function GET() {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.currency.createMany({
        data: defaultCurrencies,
        skipDuplicates: true,
      });
      await tx.language.createMany({
        data: defaultLanguages,
        skipDuplicates: true,
      });
      await tx.country.createMany({
        data: defaultCountries,
        skipDuplicates: true,
      });

      const [countries, currencies, languages] = await Promise.all([
        tx.country.findMany({ select: { id: true, code: true } }),
        tx.currency.findMany({ select: { id: true, code: true } }),
        tx.language.findMany({ select: { id: true, code: true } }),
      ]);

      const countryByCode = new Map(
        countries.map((country) => [country.code, country.id])
      );
      const currencyByCode = new Map(
        currencies.map((currency) => [currency.code, currency.id])
      );
      const languageByCode = new Map(
        languages.map((language) => [language.code, language.id])
      );

      const countryCurrencyRows = [];
      const languageCountryRows = [];

      for (const mapping of countryMappings) {
        const countryId = countryByCode.get(mapping.countryCode);
        const currencyId = currencyByCode.get(mapping.currencyCode);
        if (countryId && currencyId) {
          countryCurrencyRows.push({ countryId, currencyId });
        }

        for (const languageCode of mapping.languageCodes) {
          const languageId = languageByCode.get(languageCode);
          if (countryId && languageId) {
            languageCountryRows.push({ countryId, languageId });
          }
        }
      }

      if (countryCurrencyRows.length) {
        await tx.countryCurrency.createMany({
          data: countryCurrencyRows,
          skipDuplicates: true,
        });
      }

      if (languageCountryRows.length) {
        await tx.languageCountry.createMany({
          data: languageCountryRows,
          skipDuplicates: true,
        });
      }
    });

    const countries = await prisma.country.findMany({
      orderBy: { name: "asc" },
      include: {
        currencies: {
          include: {
            currency: true,
          },
        },
      },
    });
    return NextResponse.json(countries);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[countries][GET] Failed to fetch countries", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to fetch countries", errorId },
      { status: 500 }
    );
  }
}

/**
 * POST /api/countries
 * Creates a country.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = countrySchema.parse(body);
    const { currencyIds, ...countryData } = data;
    const country = await prisma.country.create({
      data: {
        ...countryData,
        currencies: currencyIds?.length
          ? {
              createMany: {
                data: currencyIds.map((currencyId) => ({ currencyId })),
              },
            }
          : undefined,
      },
      include: {
        currencies: {
          include: {
            currency: true,
          },
        },
      },
    });
    return NextResponse.json(country);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof z.ZodError) {
      console.warn("[countries][POST] Invalid payload", {
        errorId,
        issues: error.flatten(),
      });
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten(), errorId },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      console.error("[countries][POST] Failed to create country", {
        errorId,
        message: error.message,
      });
      return NextResponse.json({ error: error.message, errorId }, { status: 400 });
    }
    console.error("[countries][POST] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}
