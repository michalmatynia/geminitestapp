export const countryCodes = ["PL", "DE", "GB", "SE"] as const;
export const currencyCodes = ["USD", "EUR", "PLN", "GBP", "SEK"] as const;
export const languageCodes = ["EN", "PL", "DE", "SV"] as const;

export type CountryCode = (typeof countryCodes)[number];
export type CurrencyCode = (typeof currencyCodes)[number];
export type LanguageCode = (typeof languageCodes)[number];

export const defaultCountries: Array<{ code: CountryCode; name: string }> = [
  { code: "PL", name: "Poland" },
  { code: "DE", name: "Germany" },
  { code: "GB", name: "United Kingdom" },
  { code: "SE", name: "Sweden" },
];

export const defaultLanguages: Array<{
  code: LanguageCode;
  name: string;
  nativeName: string;
}> = [
  { code: "EN", name: "English", nativeName: "English" },
  { code: "PL", name: "Polish", nativeName: "Polski" },
  { code: "DE", name: "German", nativeName: "Deutsch" },
  { code: "SV", name: "Swedish", nativeName: "Svenska" },
];

export const defaultCurrencies: Array<{
  code: CurrencyCode;
  name: string;
  symbol?: string;
}> = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
];

export const countryMappings: Array<{
  countryCode: CountryCode;
  currencyCode: CurrencyCode;
  languageCodes: LanguageCode[];
}> = [
  { countryCode: "PL", currencyCode: "PLN", languageCodes: ["PL"] },
  { countryCode: "DE", currencyCode: "EUR", languageCodes: ["DE"] },
  { countryCode: "GB", currencyCode: "GBP", languageCodes: ["EN"] },
  { countryCode: "SE", currencyCode: "SEK", languageCodes: ["SV"] },
];
