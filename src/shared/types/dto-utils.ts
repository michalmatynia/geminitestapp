import { DtoBase } from './base';

/**
 * Standard structure for localized fields across the app
 * Maps language codes (e.g., 'en', 'pl') to their respective translations
 */
export type Localized<T = string> = Record<string, T | null>;

/**
 * Automatically derives a Creation DTO by omitting system-managed fields
 * from the base DTO definition.
 */
export type CreateDto<T extends DtoBase> = Omit<T, keyof DtoBase>;

/**
 * Automatically derives an Update DTO by making creation fields optional.
 */
export type UpdateDto<T extends DtoBase> = Partial<CreateDto<T>>;
