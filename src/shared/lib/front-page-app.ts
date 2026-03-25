export const FRONT_PAGE_ALLOWED = new Set(['cms', 'products', 'kangur', 'chatbot', 'notes']);

export type FrontPageStoredApp = 'cms' | 'products' | 'kangur' | 'chatbot' | 'notes';
export type FrontPageSelectableApp = Exclude<FrontPageStoredApp, 'products'>;
export type FrontPagePublicOwner = 'cms' | 'kangur';
export type FrontPageOption = {
  id: FrontPageSelectableApp;
  title: string;
  description: string;
  route: string;
};
export const FRONT_PAGE_APP_ROUTE: Record<FrontPageSelectableApp, string> = {
  cms: '/',
  kangur: '/',
  chatbot: '/admin/chatbot',
  notes: '/admin/notes',
};
export const FRONT_PAGE_OPTIONS: FrontPageOption[] = [
  {
    id: 'cms',
    title: 'CMS Home',
    description:
      'Render the CMS-owned home page so zoning, default slugs, and App Embed blocks stay in control.',
    route: FRONT_PAGE_APP_ROUTE.cms,
  },
  {
    id: 'kangur',
    title: 'StudiQ',
    description: 'Mount StudiQ at / and let it own the full public frontend.',
    route: FRONT_PAGE_APP_ROUTE.kangur,
  },
  {
    id: 'chatbot',
    title: 'Chatbot',
    description: 'Open the admin chatbot workspace on the home page.',
    route: FRONT_PAGE_APP_ROUTE.chatbot,
  },
  {
    id: 'notes',
    title: 'Notes',
    description: 'Open the admin notes workspace on the home page.',
    route: FRONT_PAGE_APP_ROUTE.notes,
  },
];

const FRONT_PAGE_APP_ALIASES: Record<string, FrontPageSelectableApp> = {
  products: 'cms',
  studiq: 'kangur',
};

export const normalizeFrontPageApp = (
  value: string | null | undefined
): FrontPageSelectableApp | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const alias = FRONT_PAGE_APP_ALIASES[normalized];
  if (alias) {
    return alias;
  }

  if (
    normalized === 'cms' ||
    normalized === 'kangur' ||
    normalized === 'chatbot' ||
    normalized === 'notes'
  ) {
    return normalized;
  }
  return null;
};

export const getFrontPageRedirectPath = (
  value: string | null | undefined
): string | null => {
  const app = normalizeFrontPageApp(value);
  if (!app || app === 'cms' || app === 'kangur') {
    return null;
  }
  return FRONT_PAGE_APP_ROUTE[app];
};

export const getFrontPagePublicOwner = (
  value: string | null | undefined
): FrontPagePublicOwner => {
  const app = normalizeFrontPageApp(value);
  return app === 'kangur' ? 'kangur' : 'cms';
};
