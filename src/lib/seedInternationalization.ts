import type { Prisma } from "@prisma/client";
import {
  countryMappings,
  defaultCountries,
  defaultCurrencies,
  defaultLanguages,
} from "@/lib/internationalizationDefaults";

export async function ensureInternationalizationDefaults(
  tx: Prisma.TransactionClient
) {
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

  const countryByCode = new Map<string, string>(
    countries.map((country) => [country.code, country.id])
  );

  const currencyByCode = new Map<string, string>(
    currencies.map((currency) => [currency.code, currency.id])
  );

  const languageByCode = new Map<string, string>(
    languages.map((language) => [language.code, language.id])
  );

  const countryCurrencyRows: Array<{
    countryId: string;
    currencyId: string;
  }> = [];
  const languageCountryRows: Array<{
    countryId: string;
    languageId: string;
  }> = [];

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
}
