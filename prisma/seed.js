import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
  const currencies = [
    { code: "PLN", name: "Polish Zloty", symbol: "zł" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  ];

  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: { name: currency.name, symbol: currency.symbol },
      create: currency,
    });
  }

  const products = [
    {
      name_en: "Laptop",
      price: 1200,
      sku: "LP1200",
      description_en: "A powerful laptop for all your needs.",
    },
    {
      name_en: "Mouse",
      price: 50,
      sku: "MS50",
      description_en: "A comfortable and responsive mouse.",
    },
    {
      name_en: "Keyboard",
      price: 100,
      sku: "KB100",
      description_en: "A mechanical keyboard with customizable RGB lighting.",
    },
    {
      name_en: "Monitor",
      price: 400,
      sku: "MN400",
      description_en: "A 27-inch 4K monitor with stunning visuals.",
    },
    {
      name_en: "Webcam",
      price: 80,
      sku: "WC80",
      description_en: "A 1080p webcam with a built-in microphone.",
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: product,
      create: product,
    });
  }

  const countries = [
    { code: "PL", name: "Poland" },
    { code: "DE", name: "Germany" },
    { code: "GB", name: "United Kingdom" },
    { code: "US", name: "United States" },
    { code: "SE", name: "Sweden" },
  ];

  for (const country of countries) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: { name: country.name },
      create: country,
    });
  }

  const languages = [
    { code: "EN", name: "English", nativeName: "English" },
    { code: "PL", name: "Polish", nativeName: "Polski" },
    { code: "DE", name: "German", nativeName: "Deutsch" },
    { code: "SV", name: "Swedish", nativeName: "Svenska" },
  ];

  for (const language of languages) {
    await prisma.language.upsert({
      where: { code: language.code },
      update: { name: language.name, nativeName: language.nativeName },
      create: language,
    });
  }

  const [countryRows, currencyRows, languageRows] = await Promise.all([
    prisma.country.findMany({ select: { id: true, code: true } }),
    prisma.currency.findMany({ select: { id: true, code: true } }),
    prisma.language.findMany({ select: { id: true, code: true } }),
  ]);

  const countryByCode = new Map(
    countryRows.map((country) => [country.code, country.id])
  );
  const currencyByCode = new Map(
    currencyRows.map((currency) => [currency.code, currency.id])
  );
  const languageByCode = new Map(
    languageRows.map((language) => [language.code, language.id])
  );

  const countryMappings = [
    { countryCode: "PL", currencyCode: "PLN", languageCodes: ["PL"] },
    { countryCode: "DE", currencyCode: "EUR", languageCodes: ["DE"] },
    { countryCode: "GB", currencyCode: "GBP", languageCodes: ["EN"] },
    { countryCode: "SE", currencyCode: "SEK", languageCodes: ["SV"] },
  ];

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
    await prisma.countryCurrency.createMany({
      data: countryCurrencyRows,
      skipDuplicates: true,
    });
  }

  if (languageCountryRows.length) {
    await prisma.languageCountry.createMany({
      data: languageCountryRows,
      skipDuplicates: true,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
