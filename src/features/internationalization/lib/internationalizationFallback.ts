import {
  countryMappings,
  defaultCountries,
  defaultCurrencies,
  defaultLanguages,
} from "@/features/internationalization/lib/internationalizationDefaults";

type CurrencyType = (typeof defaultCurrencies)[number];
type CountryType = (typeof defaultCountries)[number];
type LanguageType = (typeof defaultLanguages)[number];
type CountryMappingType = (typeof countryMappings)[number];

const currencyByCode = new Map(
  defaultCurrencies.map((currency: CurrencyType) => [currency.code, currency]),
);

const countryByCode = new Map(
  defaultCountries.map((country: CountryType) => [country.code, country]),
);

export const fallbackCurrencies = defaultCurrencies.map(
  (currency: CurrencyType) => ({
    id: currency.code,
    code: currency.code,
    name: currency.name,
    symbol: currency.symbol ?? null,
  }),
);

export const fallbackCountries = defaultCountries.map(
  (country: CountryType) => {
    const matchingMappings = countryMappings.filter(
      (mapping: CountryMappingType) => mapping.countryCode === country.code,
    );
    const currencies = matchingMappings
      .map((mapping: CountryMappingType) =>
        currencyByCode.get(mapping.currencyCode),
      )
      .filter((c: CurrencyType | undefined): c is CurrencyType => !!c)
      .map((currency: CurrencyType) => ({
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
  },
);

export const fallbackLanguages = defaultLanguages.map(
  (language: LanguageType) => {
    const matchingMappings = countryMappings.filter(
      (mapping: CountryMappingType) =>
        mapping.languageCodes.includes(language.code),
    );
    const countries = matchingMappings
      .map((mapping: CountryMappingType) =>
        countryByCode.get(mapping.countryCode),
      )
      .filter((c: CountryType | undefined): c is CountryType => !!c)
      .map((country: CountryType) => ({
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
  },
);
