import type {
  ProductValidationPattern,
  ProductValidationSeverity,
  ProductValidationTarget,
} from '@/shared/types/domain/products';

export type CreateProductValidationPatternInput = {
  label: string;
  target: ProductValidationTarget;
  locale?: string | null;
  regex: string;
  flags?: string | null;
  message: string;
  severity?: ProductValidationSeverity | null;
  enabled?: boolean;
  replacementEnabled?: boolean;
  replacementValue?: string | null;
  replacementFields?: string[];
};

export type UpdateProductValidationPatternInput = {
  label?: string;
  target?: ProductValidationTarget;
  locale?: string | null;
  regex?: string;
  flags?: string | null;
  message?: string;
  severity?: ProductValidationSeverity;
  enabled?: boolean;
  replacementEnabled?: boolean;
  replacementValue?: string | null;
  replacementFields?: string[];
};

export type ProductValidationPatternRepository = {
  listPatterns(): Promise<ProductValidationPattern[]>;
  getPatternById(id: string): Promise<ProductValidationPattern | null>;
  createPattern(data: CreateProductValidationPatternInput): Promise<ProductValidationPattern>;
  updatePattern(id: string, data: UpdateProductValidationPatternInput): Promise<ProductValidationPattern>;
  deletePattern(id: string): Promise<void>;
  getEnabledByDefault(): Promise<boolean>;
  setEnabledByDefault(enabled: boolean): Promise<boolean>;
};
