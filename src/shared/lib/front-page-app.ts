export const FRONT_PAGE_ALLOWED = new Set(['cms', 'products', 'kangur', 'chatbot', 'notes']);

export type FrontPageStoredApp = 'cms' | 'products' | 'kangur' | 'chatbot' | 'notes';
export type FrontPageSelectableApp = Exclude<FrontPageStoredApp, 'products'>;
export const FRONT_PAGE_APP_ROUTE: Record<FrontPageSelectableApp, string> = {
  cms: '/',
  kangur: '/kangur',
  chatbot: '/admin/chatbot',
  notes: '/admin/notes',
};

export const normalizeFrontPageApp = (
  value: string | null | undefined
): FrontPageSelectableApp | null => {
  if (value === 'products') return 'cms';
  if (value === 'cms' || value === 'kangur' || value === 'chatbot' || value === 'notes') {
    return value;
  }
  return null;
};

export const getFrontPageRedirectPath = (
  value: string | null | undefined
): string | null => {
  const app = normalizeFrontPageApp(value);
  if (!app || app === 'cms') {
    return null;
  }
  return FRONT_PAGE_APP_ROUTE[app];
};
