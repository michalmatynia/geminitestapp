import type { UserPreferencesDto, UpdateUserPreferencesDto, JsonValue } from '../dtos';

export type { UserPreferencesDto, UpdateUserPreferencesDto, JsonValue };

/**
 * Legacy interface for backward compatibility. 
 * Use UserPreferencesDto for new code.
 */
export interface UserPreferences extends UserPreferencesDto {}

export type UserPreferencesUpdate = UpdateUserPreferencesDto;