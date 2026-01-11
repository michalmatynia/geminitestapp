import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
  const currencies = [
    { code: "PLN", name: "Polish Zloty" },
    { code: "EUR", name: "Euro" },
    { code: "USD", name: "US Dollar" },
    { code: "GBP", name: "British Pound" },
  ];

  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: { name: currency.name },
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
  ];

  for (const country of countries) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: { name: country.name },
      create: country,
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
