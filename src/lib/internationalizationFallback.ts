import {
  countryMappings,
  defaultCountries,
  defaultCurrencies,
  defaultLanguages,
} from "@/lib/internationalizationDefaults";

const currencyByCode = new Map(
  defaultCurrencies.map((currency) => [currency.code, currency])
);

const countryByCode = new Map(
  defaultCountries.map((country) => [country.code, country])
);

export const fallbackCurrencies = defaultCurrencies.map((currency) => ({
  id: currency.code,
  code: currency.code,
  name: currency.name,
  symbol: currency.symbol ?? null,
}));

export const fallbackCountries = defaultCountries.map((country) => {
  const matchingMappings = countryMappings.filter(
    (mapping) => mapping.countryCode === country.code
  );
  const currencies = matchingMappings
    .map((mapping) => currencyByCode.get(mapping.currencyCode))
    .filter(Boolean)
    .map((currency) => ({
      currencyId: currency!.code,
      currency: {
        id: currency!.code,
        code: currency!.code,
        name: currency!.name,
        symbol: currency!.symbol ?? null,
      },
    }));

  return {
    id: country.code,
    code: country.code,
    name: country.name,
    currencies,
  };
});

export const fallbackLanguages = defaultLanguages.map((language) => {
  const matchingMappings = countryMappings.filter((mapping) =>
    mapping.languageCodes.includes(language.code)
  );
  const countries = matchingMappings
    .map((mapping) => countryByCode.get(mapping.countryCode))
    .filter(Boolean)
    .map((country) => ({
      countryId: country!.code,
      country: {
        id: country!.code,
        code: country!.code,
        name: country!.name,
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
