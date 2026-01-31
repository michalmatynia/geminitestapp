import {
  countryMappings,
  defaultCountries,
  defaultCurrencies,
  defaultLanguages,
} from "@/features/internationalization/lib/internationalizationDefaults";

const currencyByCode = new Map(
  defaultCurrencies.map((currency: { code: string; name: string; symbol?: string | null }) => [currency.code, currency])
);

const countryByCode = new Map(
  defaultCountries.map((country: { code: string; name: string }) => [country.code, country])
);

export const fallbackCurrencies = defaultCurrencies.map((currency: { code: string; name: string; symbol?: string | null }) => ({
  id: currency.code,
  code: currency.code,
  name: currency.name,
  symbol: currency.symbol ?? null,
}));

export const fallbackCountries = defaultCountries.map((country: { code: string; name: string }) => {
  const matchingMappings = countryMappings.filter(
    (mapping: { countryCode: string; currencyCode: string; languageCodes: string[] }) => mapping.countryCode === country.code
  );
  const currencies = matchingMappings
    .map((mapping: { currencyCode: string }) => currencyByCode.get(mapping.currencyCode))
    .filter((c: any): c is { code: string; name: string; symbol?: string | null } => !!c)
    .map((currency: { code: string; name: string; symbol?: string | null }) => ({
      currencyId: currency.code,
      currency: {
        id: currency.code,
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol ?? null,
      },
    }));

  return {
    id: country.code,
    code: country.code,
    name: country.name,
    currencies,
  };
});

export const fallbackLanguages = defaultLanguages.map((language: { code: string; name: string; nativeName: string }) => {
  const matchingMappings = countryMappings.filter((mapping: { countryCode: string; currencyCode: string; languageCodes: string[] }) =>
    mapping.languageCodes.includes(language.code)
  );
  const countries = matchingMappings
    .map((mapping: { countryCode: string }) => countryByCode.get(mapping.countryCode))
    .filter((c: any): c is { code: string; name: string } => !!c)
    .map((country: { code: string; name: string }) => ({
      countryId: country.code,
      country: {
        id: country.code,
        code: country.code,
        name: country.name,
      },
    }));

  return {
    id: language.code,
    code: language.code,
    name: language.name,
    nativeName: language.nativeName,
    countries,
  };
});