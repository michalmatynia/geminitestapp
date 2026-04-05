import type { ProductValidationInstanceDenyBehaviorMap, UpdateProductValidatorSettings } from '@/shared/contracts/products/validation';
import type { ProductValidationPatternRepository } from '@/shared/contracts/products/drafts';
import { normalizeProductValidationInstanceDenyBehaviorMap } from '@/shared/lib/products/utils/validator-instance-behavior';

export const resolveValidatorEnabledByDefault = async (
  repository: ProductValidationPatternRepository,
  body: UpdateProductValidatorSettings
): Promise<boolean> =>
  typeof body.enabledByDefault === 'boolean'
    ? await repository.setEnabledByDefault(body.enabledByDefault)
    : await repository.getEnabledByDefault();

export const resolveValidatorFormatterEnabledByDefault = async (
  repository: ProductValidationPatternRepository,
  body: UpdateProductValidatorSettings
): Promise<boolean> =>
  typeof body.formatterEnabledByDefault === 'boolean'
    ? await repository.setFormatterEnabledByDefault(body.formatterEnabledByDefault)
    : await repository.getFormatterEnabledByDefault();

export const resolveValidatorInstanceDenyBehavior = async (
  repository: ProductValidationPatternRepository,
  body: UpdateProductValidatorSettings
): Promise<ProductValidationInstanceDenyBehaviorMap> =>
  body.instanceDenyBehavior
    ? await repository.setInstanceDenyBehavior(
        normalizeProductValidationInstanceDenyBehaviorMap(body.instanceDenyBehavior)
      )
    : await repository.getInstanceDenyBehavior();

export const buildValidatorSettingsResponse = (settings: {
  enabledByDefault: boolean;
  formatterEnabledByDefault: boolean;
  instanceDenyBehavior: ProductValidationInstanceDenyBehaviorMap;
}) => settings;
