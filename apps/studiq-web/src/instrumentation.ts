export const register = async (): Promise<void> => {
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    const { prewarmLiteSettingsServerCache } = await import(
      '@/shared/server/api/settings/lite/handler'
    );
    void prewarmLiteSettingsServerCache();
  }
};
