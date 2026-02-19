import type {
  ProductValidationInstanceDenyBehaviorMap,
  ProductValidationPattern,
} from '@/shared/types/domain/products';
import type { 
  CreateProductValidationPatternDto, 
  UpdateProductValidationPatternDto 
} from '@/shared/contracts/products';

export type CreateProductValidationPatternInput = CreateProductValidationPatternDto;

export type UpdateProductValidationPatternInput = UpdateProductValidationPatternDto;

export type ProductValidationPatternRepository = {
  listPatterns(): Promise<ProductValidationPattern[]>;
  getPatternById(id: string): Promise<ProductValidationPattern | null>;
  createPattern(data: CreateProductValidationPatternInput): Promise<ProductValidationPattern>;
  updatePattern(id: string, data: UpdateProductValidationPatternInput): Promise<ProductValidationPattern>;
  deletePattern(id: string): Promise<void>;
  getEnabledByDefault(): Promise<boolean>;
  setEnabledByDefault(enabled: boolean): Promise<boolean>;
  getInstanceDenyBehavior(): Promise<ProductValidationInstanceDenyBehaviorMap>;
  setInstanceDenyBehavior(
    value: ProductValidationInstanceDenyBehaviorMap
  ): Promise<ProductValidationInstanceDenyBehaviorMap>;
};
