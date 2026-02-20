import type { ProductImageRecordDto } from '../products';

export type ExpandedImageFile = ProductImageRecordDto & {
  products: {
    product: {
      id: string;
      name: string;
    };
  }[];
};

export type DebugInfo = {
  action: string;
  message: string;
  slotIndex?: number | undefined;
  filename?: string | undefined;
  timestamp: string;
};

export type ProductFormData = any; // Placeholder

export type ProductListPreferencesDto = {
  nameLocale: 'name_en' | 'name_pl' | 'name_de';
  catalogFilter: string;
  currencyCode: string | null;
  pageSize: number;
  thumbnailSource: 'file' | 'link' | 'base64';
  filtersCollapsedByDefault: boolean;
};

export type ProductListPreferences = ProductListPreferencesDto;
