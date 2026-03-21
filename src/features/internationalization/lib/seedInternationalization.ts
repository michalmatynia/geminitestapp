import 'server-only';

import {
  countryMappings,
  defaultCountries,
  defaultCurrencies,
  defaultLanguages,
} from '@/features/internationalization/lib/internationalizationDefaults';

type CodeRecord = {
  code: string;
  id: string;
};

type InternationalizationSeedTransaction = {
  country: {
    createMany(args: { data: typeof defaultCountries; skipDuplicates: true }): Promise<unknown>;
    findMany(args: { select: { code: true; id: true } }): Promise<CodeRecord[]>;
  };
  countryCurrency: {
    createMany(args: {
      data: Array<{ countryId: string; currencyId: string }>;
      skipDuplicates: true;
    }): Promise<unknown>;
  };
  currency: {
    createMany(args: { data: typeof defaultCurrencies; skipDuplicates: true }): Promise<unknown>;
    findMany(args: { select: { code: true; id: true } }): Promise<CodeRecord[]>;
  };
  language: {
    createMany(args: { data: typeof defaultLanguages; skipDuplicates: true }): Promise<unknown>;
    findMany(args: { select: { code: true; id: true } }): Promise<CodeRecord[]>;
  };
  languageCountry: {
    createMany(args: {
      data: Array<{ countryId: string; languageId: string }>;
      skipDuplicates: true;
    }): Promise<unknown>;
  };
};

export async function ensureInternationalizationDefaults(
  tx: InternationalizationSeedTransaction
): Promise<void> {
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
    countries.map((country: { code: string; id: string }) => [country.code, country.id])
  );

  const currencyByCode = new Map<string, string>(
    currencies.map((currency: { code: string; id: string }) => [currency.code, currency.id])
  );

  const languageByCode = new Map<string, string>(
    languages.map((language: { code: string; id: string }) => [language.code, language.id])
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
