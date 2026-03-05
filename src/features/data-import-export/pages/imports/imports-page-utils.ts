import { PRODUCT_PARAMETER_TARGET_PREFIX } from '@/features/data-import-export/components/imports/constants';
import type { ParameterReference as ParsedParameterTarget } from '@/shared/contracts/integrations/parameter-reference';

export type { ParsedParameterTarget };

export const parseParameterTarget = (value: string): ParsedParameterTarget | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.toLowerCase().startsWith(PRODUCT_PARAMETER_TARGET_PREFIX)) {
    return null;
  }

  const payload = trimmed.slice(PRODUCT_PARAMETER_TARGET_PREFIX.length).trim();
  if (!payload) return null;

  const languageDelimiterIndex = payload.indexOf('|');
  if (languageDelimiterIndex < 0) {
    return {
      parameterId: payload,
      languageCode: null,
    };
  }

  const parameterId = payload.slice(0, languageDelimiterIndex).trim();
  if (!parameterId) return null;
  const languageCode = payload.slice(languageDelimiterIndex + 1).trim();
  if (!languageCode) return null;
  return {
    parameterId,
    languageCode: languageCode.toLowerCase(),
  };
};

export const toParameterTargetValue = (parameterId: string): string =>
  `${PRODUCT_PARAMETER_TARGET_PREFIX}${parameterId}`.toLowerCase();

export const getParameterDisplayName = (parameter: {
  id: string;
  name_en?: string | null;
  name_pl?: string | null;
  name_de?: string | null;
}): string =>
  parameter.name_en?.trim() ||
  parameter.name_pl?.trim() ||
  parameter.name_de?.trim() ||
  parameter.id.trim();
