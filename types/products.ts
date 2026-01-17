export type PriceGroupType = "standard" | "dependent";

export type PriceGroup = {
  id: string;
  groupId: string;
  name: string;
  description: string;
  currencyId: string;
  currencyCode: string;
  isDefault: boolean;
  groupType: PriceGroupType;
  basePriceField: string;
  sourceGroupId?: string | null;
  priceMultiplier: number;
  addToPrice: number;
};

export type CurrencyOption = {
  id: string;
  code: string;
  name: string;
  symbol?: string | null;
};

export type CountryOption = {
  id: string;
  code: string;
  name: string;
  currencies?: { currencyId: string; currency: CurrencyOption }[];
};

export type Catalog = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  languageIds: string[];
  defaultLanguageId?: string | null;
};

export type ProductDbProvider = "prisma" | "mongodb";
export type ProductMigrationDirection = "prisma-to-mongo" | "mongo-to-prisma";

export type Language = {
  id: string;
  code: string;
  name: string;
  nativeName?: string | null;
  countries?: { countryId: string; country: CountryOption }[];
};

export type ProductCategory = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  parentId: string | null;
  catalogId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductCategoryWithChildren = ProductCategory & {
  children: ProductCategoryWithChildren[];
};
