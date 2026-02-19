import type {
  ErrorCategoryDto,
  SuggestedActionDto,
  ErrorContextDto,
} from '../contracts/observability';
import { ERROR_CATEGORY as ERROR_CATEGORY_DTO } from '../contracts/observability';

export type ErrorCategory = ErrorCategoryDto;
export const ERROR_CATEGORY = ERROR_CATEGORY_DTO;

export type SuggestedAction = SuggestedActionDto;

export type ErrorContext = ErrorContextDto;
