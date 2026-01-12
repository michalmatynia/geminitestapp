ALTER TYPE "CurrencyCode" ADD VALUE IF NOT EXISTS 'SEK';
ALTER TYPE "CountryCode" ADD VALUE IF NOT EXISTS 'SE';

CREATE TABLE IF NOT EXISTS "CountryCurrency" (
  "countryId" TEXT NOT NULL,
  "currencyId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CountryCurrency_pkey" PRIMARY KEY ("countryId", "currencyId"),
  CONSTRAINT "CountryCurrency_countryId_fkey"
    FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CountryCurrency_currencyId_fkey"
    FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
