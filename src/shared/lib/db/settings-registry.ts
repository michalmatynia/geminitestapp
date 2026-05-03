export type SettingsProvider = {
  isKey: (key: string) => boolean;
  readValue: (key: string) => Promise<string | null>;
  upsertValue: (key: string, value: string) => Promise<boolean>;
  deleteValue: (key: string) => Promise<boolean>;
};

const providers = new Set<SettingsProvider>();

/**
 * Register a global settings provider (e.g. from a feature repository).
 * This allows shared logic to read/write settings without knowing
 * feature-specific storage details.
 */
export function registerSettingsProvider(provider: SettingsProvider): void {
  providers.add(provider);
}

export function findProviderForKey(key: string): Promise<SettingsProvider | null> {
  for (const provider of providers) {
    if (provider.isKey(key)) {
      return Promise.resolve(provider);
    }
  }
  return Promise.resolve(null);
}
