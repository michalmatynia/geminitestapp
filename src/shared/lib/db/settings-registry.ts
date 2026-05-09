/**
 * Settings Registry
 * 
 * Provides a global registry for settings providers.
 * This allows different features or modules to register their own settings
 * storage logic, which can then be discovered and used by shared components 
 * without requiring direct dependencies on feature-specific repositories.
 */

/**
 * Interface for a settings provider.
 */
export type SettingsProvider = {
  /**
   * Determines if this provider is responsible for a given settings key.
   * 
   * @param key - The settings key.
   * @returns True if the provider handles this key.
   */
  isKey: (key: string) => boolean;

  /**
   * Reads a value for a given key.
   * 
   * @param key - The settings key.
   * @returns The raw string value or null if not found.
   */
  readValue: (key: string) => Promise<string | null>;

  /**
   * Upserts (updates or inserts) a value for a given key.
   * 
   * @param key - The settings key.
   * @param value - The new string value.
   * @returns True if the operation was successful.
   */
  upsertValue: (key: string, value: string) => Promise<boolean>;

  /**
   * Deletes a value for a given key.
   * 
   * @param key - The settings key.
   * @returns True if the deletion was successful.
   */
  deleteValue: (key: string) => Promise<boolean>;
};

/**
 * Set of registered settings providers.
 */
const providers = new Set<SettingsProvider>();

/**
 * Register a global settings provider (e.g. from a feature repository).
 * This allows shared logic to read/write settings without knowing
 * feature-specific storage details.
 * 
 * @param provider - The provider instance to register.
 */
export function registerSettingsProvider(provider: SettingsProvider): void {
  providers.add(provider);
}

/**
 * Finds the appropriate settings provider for a given key.
 * 
 * @param key - The settings key.
 * @returns The matching provider or null if none is found.
 */
export function findProviderForKey(key: string): Promise<SettingsProvider | null> {
  for (const provider of providers) {
    if (provider.isKey(key)) {
      return Promise.resolve(provider);
    }
  }
  return Promise.resolve(null);
}
