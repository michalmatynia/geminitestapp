import { z } from 'zod';

export const CMS_MENU_SETTINGS_KEY = 'cms_menu_settings';

export const menuItemSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    linkType: z.enum(['page', 'external', 'anchor', 'none']),
    pageId: z.string().nullable(),
    url: z.string().nullable(),
    children: z.array(menuItemSchema).optional(),
  })
);

export type MenuItem = z.infer<typeof menuItemSchema>;

export const menuSettingsSchema = z.object({
  items: z.array(menuItemSchema),
  showMenu: z.boolean().optional(),
});

export type MenuSettings = z.infer<typeof menuSettingsSchema>;

export const DEFAULT_MENU_SETTINGS: MenuSettings = {
  items: [],
  showMenu: true,
};

export function getCmsMenuSettingsKey(domainId?: string | null): string {
  return domainId ? `cms_menu_settings:${domainId}` : CMS_MENU_SETTINGS_KEY;
}

export function normalizeMenuSettings(input: unknown): MenuSettings {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const record = input as any;
    return {
      items: Array.isArray(record.items) ? record.items : [],
      showMenu: typeof record.showMenu === 'boolean' ? record.showMenu : DEFAULT_MENU_SETTINGS.showMenu,
    };
  }
  return DEFAULT_MENU_SETTINGS;
}
