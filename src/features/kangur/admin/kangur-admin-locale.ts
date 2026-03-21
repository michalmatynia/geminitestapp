export const KANGUR_ADMIN_LOCALES = ['en', 'pl'] as const;

export type KangurAdminLocaleDto = (typeof KANGUR_ADMIN_LOCALES)[number];
