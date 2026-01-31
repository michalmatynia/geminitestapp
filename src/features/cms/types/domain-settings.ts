export const CMS_DOMAIN_SETTINGS_KEY = "cms_domain_settings.v1";

export interface CmsDomainSettings {
  zoningEnabled: boolean;
}

export const DEFAULT_CMS_DOMAIN_SETTINGS: CmsDomainSettings = {
  zoningEnabled: true,
};

export const normalizeCmsDomainSettings = (
  input?: Partial<CmsDomainSettings> | null
): CmsDomainSettings => ({
  zoningEnabled:
    typeof input?.zoningEnabled === "boolean"
      ? input.zoningEnabled
      : DEFAULT_CMS_DOMAIN_SETTINGS.zoningEnabled,
});
