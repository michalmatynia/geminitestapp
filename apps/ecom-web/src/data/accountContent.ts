export interface AccountTabContent {
  id: 'overview' | 'orders' | 'settings' | 'admin';
  label: string;
}

export interface AccountStatContent {
  key: 'orders' | 'items' | 'wishlist' | 'memberSince';
  label: string;
  fallbackValue?: string;
}

export interface AccountPreferenceContent {
  label: string;
  checked: boolean;
}

export interface AccountSignedOutContent {
  brandName: string;
  brandSuffix: string;
  title: string;
  body: string;
  signInLabel: string;
  backToShopLabel: string;
  backToShopHref: string;
}

export interface AccountHeaderContent {
  watermark: string;
  eyebrow: string;
  welcomePrefix: string;
  superAdminPrefix: string;
  ordersLabel: string;
}

export interface AccountSidebarContent {
  memberRoleLabel: string;
  superAdminRoleLabel: string;
  wishlistLabel: string;
  signOutLabel: string;
}

export interface AccountOverviewContent {
  stats: AccountStatContent[];
  recentOrderLabel: string;
  viewAllOrdersLabel: string;
}

export type AccountOrderStatus = 'pending_payment' | 'processing' | 'in-transit' | 'delivered' | 'cancelled';

export interface AccountOrdersContent {
  title: string;
  qtyLabel: string;
  statuses: Record<AccountOrderStatus, string>;
}

export interface AccountSettingsContent {
  title: string;
  personalDetailsLabel: string;
  fullNameLabel: string;
  emailLabel: string;
  defaultShippingAddressLabel: string;
  defaultShippingAddressLines: string[];
  editLabel: string;
  communicationPreferencesLabel: string;
  preferences: AccountPreferenceContent[];
  saveChangesLabel: string;
}

export interface AccountAdminContent {
  title: string;
  badgeLabel: string;
  cmsLinkLabel: string;
  cmsLinkDescription: string;
  registeredUsersLabel: string;
  recentRegistrationsLabel: string;
  loadingLabel: string;
  loadUsersError: string;
  noUsersLabel: string;
  tableHeaders: string[];
}

export interface AccountContent {
  loadingLabel: string;
  signedOut: AccountSignedOutContent;
  tabs: AccountTabContent[];
  header: AccountHeaderContent;
  sidebar: AccountSidebarContent;
  overview: AccountOverviewContent;
  orders: AccountOrdersContent;
  settings: AccountSettingsContent;
  admin: AccountAdminContent;
}

export interface AccountContentValidationResult {
  content: AccountContent;
  errors: string[];
}

export const ACCOUNT_CONTENT_DEFAULTS: AccountContent = {
  loadingLabel: 'Loading...',
  signedOut: {
    brandName: 'STARGATER',
    brandSuffix: 'NEXUS',
    title: 'Members area',
    body: 'Sign in to view your orders, saved items, and account settings.',
    signInLabel: 'Sign In',
    backToShopLabel: 'Back to shop',
    backToShopHref: '/',
  },
  tabs: [
    { id: 'overview', label: 'Overview' },
    { id: 'orders', label: 'Orders' },
    { id: 'settings', label: 'Settings' },
    { id: 'admin', label: 'Admin' },
  ],
  header: {
    watermark: 'Account',
    eyebrow: 'Member',
    welcomePrefix: 'Welcome back,',
    superAdminPrefix: 'Super Admin',
    ordersLabel: 'orders',
  },
  sidebar: {
    memberRoleLabel: 'Member',
    superAdminRoleLabel: 'Super Admin',
    wishlistLabel: 'Wishlist',
    signOutLabel: 'Sign out',
  },
  overview: {
    stats: [
      { key: 'orders', label: 'Total orders' },
      { key: 'items', label: 'Items purchased', fallbackValue: '5' },
      { key: 'wishlist', label: 'Wishlist' },
      { key: 'memberSince', label: 'Member since', fallbackValue: 'Member' },
    ],
    recentOrderLabel: 'Most recent order',
    viewAllOrdersLabel: 'View all orders',
  },
  orders: {
    title: 'Order History',
    qtyLabel: 'Qty',
    statuses: {
      pending_payment: 'Pending payment',
      delivered: 'Delivered',
      'in-transit': 'In transit',
      processing: 'Processing',
      cancelled: 'Cancelled',
    },
  },
  settings: {
    title: 'Account Settings',
    personalDetailsLabel: 'Personal details',
    fullNameLabel: 'Full name',
    emailLabel: 'Email address',
    defaultShippingAddressLabel: 'Default shipping address',
    defaultShippingAddressLines: ['ul. Przykladowa 12/3', '00-001 Warszawa, Poland'],
    editLabel: 'Edit',
    communicationPreferencesLabel: 'Communication preferences',
    preferences: [
      { label: 'New arrivals and collections', checked: true },
      { label: 'Editorial and Lookbook releases', checked: true },
      { label: 'Order status updates', checked: true },
      { label: 'Exclusive member events', checked: false },
    ],
    saveChangesLabel: 'Save changes',
  },
  admin: {
    title: 'Admin Console',
    badgeLabel: 'Super Admin',
    cmsLinkLabel: 'Open CMS',
    cmsLinkDescription: 'Edit storefront copy, pages, stories, lookbook entries, and shared site content.',
    registeredUsersLabel: 'Registered users',
    recentRegistrationsLabel: 'Recent registrations',
    loadingLabel: 'Loading...',
    loadUsersError: 'Failed to load users',
    noUsersLabel: 'No users found.',
    tableHeaders: ['Name / Email', 'Email', 'Joined'],
  },
};

const TEXT_LIMITS = {
  short: 120,
  medium: 320,
};

const TAB_IDS = new Set<AccountTabContent['id']>(['overview', 'orders', 'settings', 'admin']);
const STAT_KEYS = new Set<AccountStatContent['key']>(['orders', 'items', 'wishlist', 'memberSince']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(
  source: Record<string, unknown>,
  key: string,
  fallback: string,
  maxLength: number,
  errors: string[],
  path: string,
): string {
  const value = source[key];
  if (value == null) return fallback;
  if (typeof value !== 'string') {
    errors.push(`${path} must be text.`);
    return fallback;
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    errors.push(`${path} must be ${maxLength} characters or fewer.`);
    return fallback;
  }
  return trimmed;
}

function readBoolean(source: Record<string, unknown>, key: string, fallback: boolean, errors: string[], path: string): boolean {
  const value = source[key];
  if (value == null) return fallback;
  if (typeof value !== 'boolean') {
    errors.push(`${path} must be true or false.`);
    return fallback;
  }
  return value;
}

function isAllowedHref(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  if (value.startsWith('#')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function readHref(source: Record<string, unknown>, key: string, fallback: string, errors: string[], path: string): string {
  const value = readString(source, key, fallback, TEXT_LIMITS.medium, errors, path);
  if (!value) return fallback;
  if (!isAllowedHref(value)) {
    errors.push(`${path} must be an internal path, anchor, or http(s) URL.`);
    return fallback;
  }
  return value;
}

function readStringList(
  input: unknown,
  fallback: string[],
  maxItems: number,
  errors: string[],
  path: string,
): string[] {
  if (input == null) return fallback;
  if (!Array.isArray(input)) {
    errors.push(`${path} must be a list.`);
    return fallback;
  }
  const items: string[] = [];
  for (const item of input) {
    if (typeof item !== 'string') {
      errors.push(`${path} can only contain text items.`);
      return fallback;
    }
    const trimmed = item.trim();
    if (trimmed) items.push(trimmed);
  }
  if (items.length > maxItems) {
    errors.push(`${path} can contain at most ${maxItems} items.`);
    return fallback;
  }
  return items.length > 0 ? items : fallback;
}

function readTabs(input: unknown, fallback: AccountTabContent[], errors: string[]): AccountTabContent[] {
  if (input == null) return fallback;
  if (!Array.isArray(input)) {
    errors.push('tabs must be a list.');
    return fallback;
  }
  const tabs: AccountTabContent[] = [];
  for (const [index, item] of input.entries()) {
    const fallbackTab = fallback[index] ?? fallback[0];
    if (!isRecord(item)) {
      errors.push('tabs items must be objects.');
      return fallback;
    }
    const id = readString(item, 'id', fallbackTab.id, TEXT_LIMITS.short, errors, `tabs.${index}.id`);
    if (!TAB_IDS.has(id as AccountTabContent['id'])) {
      errors.push(`tabs.${index}.id is not supported.`);
      return fallback;
    }
    tabs.push({
      id: id as AccountTabContent['id'],
      label: readString(item, 'label', fallbackTab.label, TEXT_LIMITS.short, errors, `tabs.${index}.label`),
    });
  }
  return tabs.length > 0 ? tabs : fallback;
}

function readStats(input: unknown, fallback: AccountStatContent[], errors: string[]): AccountStatContent[] {
  if (input == null) return fallback;
  if (!Array.isArray(input)) {
    errors.push('overview.stats must be a list.');
    return fallback;
  }
  const stats: AccountStatContent[] = [];
  for (const [index, item] of input.entries()) {
    const fallbackStat = fallback[index] ?? fallback[0];
    if (!isRecord(item)) {
      errors.push('overview.stats items must be objects.');
      return fallback;
    }
    const key = readString(item, 'key', fallbackStat.key, TEXT_LIMITS.short, errors, `overview.stats.${index}.key`);
    if (!STAT_KEYS.has(key as AccountStatContent['key'])) {
      errors.push(`overview.stats.${index}.key is not supported.`);
      return fallback;
    }
    stats.push({
      key: key as AccountStatContent['key'],
      label: readString(item, 'label', fallbackStat.label, TEXT_LIMITS.short, errors, `overview.stats.${index}.label`),
      fallbackValue: readString(
        item,
        'fallbackValue',
        fallbackStat.fallbackValue ?? '',
        TEXT_LIMITS.short,
        errors,
        `overview.stats.${index}.fallbackValue`,
      ),
    });
  }
  return stats.length > 0 ? stats : fallback;
}

function readPreferences(input: unknown, fallback: AccountPreferenceContent[], errors: string[]): AccountPreferenceContent[] {
  if (input == null) return fallback;
  if (!Array.isArray(input)) {
    errors.push('settings.preferences must be a list.');
    return fallback;
  }
  const preferences: AccountPreferenceContent[] = [];
  for (const [index, item] of input.entries()) {
    const fallbackPreference = fallback[index] ?? { label: '', checked: false };
    if (!isRecord(item)) {
      errors.push('settings.preferences items must be objects.');
      return fallback;
    }
    preferences.push({
      label: readString(item, 'label', fallbackPreference.label, TEXT_LIMITS.short, errors, `settings.preferences.${index}.label`),
      checked: readBoolean(item, 'checked', fallbackPreference.checked, errors, `settings.preferences.${index}.checked`),
    });
  }
  if (preferences.length > 12) {
    errors.push('settings.preferences can contain at most 12 items.');
    return fallback;
  }
  return preferences.length > 0 ? preferences : fallback;
}

export function validateAccountContent(input: unknown): AccountContentValidationResult {
  const errors: string[] = [];
  const root = isRecord(input) ? input : {};
  const signedOut = isRecord(root['signedOut']) ? root['signedOut'] : {};
  const header = isRecord(root['header']) ? root['header'] : {};
  const sidebar = isRecord(root['sidebar']) ? root['sidebar'] : {};
  const overview = isRecord(root['overview']) ? root['overview'] : {};
  const orders = isRecord(root['orders']) ? root['orders'] : {};
  const statuses = isRecord(orders['statuses']) ? orders['statuses'] : {};
  const settings = isRecord(root['settings']) ? root['settings'] : {};
  const admin = isRecord(root['admin']) ? root['admin'] : {};

  const content: AccountContent = {
    loadingLabel: readString(root, 'loadingLabel', ACCOUNT_CONTENT_DEFAULTS.loadingLabel, TEXT_LIMITS.short, errors, 'loadingLabel'),
    signedOut: {
      brandName: readString(signedOut, 'brandName', ACCOUNT_CONTENT_DEFAULTS.signedOut.brandName, TEXT_LIMITS.short, errors, 'signedOut.brandName'),
      brandSuffix: readString(signedOut, 'brandSuffix', ACCOUNT_CONTENT_DEFAULTS.signedOut.brandSuffix, TEXT_LIMITS.short, errors, 'signedOut.brandSuffix'),
      title: readString(signedOut, 'title', ACCOUNT_CONTENT_DEFAULTS.signedOut.title, TEXT_LIMITS.short, errors, 'signedOut.title'),
      body: readString(signedOut, 'body', ACCOUNT_CONTENT_DEFAULTS.signedOut.body, TEXT_LIMITS.medium, errors, 'signedOut.body'),
      signInLabel: readString(signedOut, 'signInLabel', ACCOUNT_CONTENT_DEFAULTS.signedOut.signInLabel, TEXT_LIMITS.short, errors, 'signedOut.signInLabel'),
      backToShopLabel: readString(signedOut, 'backToShopLabel', ACCOUNT_CONTENT_DEFAULTS.signedOut.backToShopLabel, TEXT_LIMITS.short, errors, 'signedOut.backToShopLabel'),
      backToShopHref: readHref(signedOut, 'backToShopHref', ACCOUNT_CONTENT_DEFAULTS.signedOut.backToShopHref, errors, 'signedOut.backToShopHref'),
    },
    tabs: readTabs(root['tabs'], ACCOUNT_CONTENT_DEFAULTS.tabs, errors),
    header: {
      watermark: readString(header, 'watermark', ACCOUNT_CONTENT_DEFAULTS.header.watermark, TEXT_LIMITS.short, errors, 'header.watermark'),
      eyebrow: readString(header, 'eyebrow', ACCOUNT_CONTENT_DEFAULTS.header.eyebrow, TEXT_LIMITS.short, errors, 'header.eyebrow'),
      welcomePrefix: readString(header, 'welcomePrefix', ACCOUNT_CONTENT_DEFAULTS.header.welcomePrefix, TEXT_LIMITS.short, errors, 'header.welcomePrefix'),
      superAdminPrefix: readString(header, 'superAdminPrefix', ACCOUNT_CONTENT_DEFAULTS.header.superAdminPrefix, TEXT_LIMITS.short, errors, 'header.superAdminPrefix'),
      ordersLabel: readString(header, 'ordersLabel', ACCOUNT_CONTENT_DEFAULTS.header.ordersLabel, TEXT_LIMITS.short, errors, 'header.ordersLabel'),
    },
    sidebar: {
      memberRoleLabel: readString(sidebar, 'memberRoleLabel', ACCOUNT_CONTENT_DEFAULTS.sidebar.memberRoleLabel, TEXT_LIMITS.short, errors, 'sidebar.memberRoleLabel'),
      superAdminRoleLabel: readString(sidebar, 'superAdminRoleLabel', ACCOUNT_CONTENT_DEFAULTS.sidebar.superAdminRoleLabel, TEXT_LIMITS.short, errors, 'sidebar.superAdminRoleLabel'),
      wishlistLabel: readString(sidebar, 'wishlistLabel', ACCOUNT_CONTENT_DEFAULTS.sidebar.wishlistLabel, TEXT_LIMITS.short, errors, 'sidebar.wishlistLabel'),
      signOutLabel: readString(sidebar, 'signOutLabel', ACCOUNT_CONTENT_DEFAULTS.sidebar.signOutLabel, TEXT_LIMITS.short, errors, 'sidebar.signOutLabel'),
    },
    overview: {
      stats: readStats(overview['stats'], ACCOUNT_CONTENT_DEFAULTS.overview.stats, errors),
      recentOrderLabel: readString(overview, 'recentOrderLabel', ACCOUNT_CONTENT_DEFAULTS.overview.recentOrderLabel, TEXT_LIMITS.short, errors, 'overview.recentOrderLabel'),
      viewAllOrdersLabel: readString(overview, 'viewAllOrdersLabel', ACCOUNT_CONTENT_DEFAULTS.overview.viewAllOrdersLabel, TEXT_LIMITS.short, errors, 'overview.viewAllOrdersLabel'),
    },
    orders: {
      title: readString(orders, 'title', ACCOUNT_CONTENT_DEFAULTS.orders.title, TEXT_LIMITS.short, errors, 'orders.title'),
      qtyLabel: readString(orders, 'qtyLabel', ACCOUNT_CONTENT_DEFAULTS.orders.qtyLabel, TEXT_LIMITS.short, errors, 'orders.qtyLabel'),
      statuses: {
        pending_payment: readString(statuses, 'pending_payment', ACCOUNT_CONTENT_DEFAULTS.orders.statuses.pending_payment, TEXT_LIMITS.short, errors, 'orders.statuses.pending_payment'),
        delivered: readString(statuses, 'delivered', ACCOUNT_CONTENT_DEFAULTS.orders.statuses.delivered, TEXT_LIMITS.short, errors, 'orders.statuses.delivered'),
        'in-transit': readString(statuses, 'in-transit', ACCOUNT_CONTENT_DEFAULTS.orders.statuses['in-transit'], TEXT_LIMITS.short, errors, 'orders.statuses.in-transit'),
        processing: readString(statuses, 'processing', ACCOUNT_CONTENT_DEFAULTS.orders.statuses.processing, TEXT_LIMITS.short, errors, 'orders.statuses.processing'),
        cancelled: readString(statuses, 'cancelled', ACCOUNT_CONTENT_DEFAULTS.orders.statuses.cancelled, TEXT_LIMITS.short, errors, 'orders.statuses.cancelled'),
      },
    },
    settings: {
      title: readString(settings, 'title', ACCOUNT_CONTENT_DEFAULTS.settings.title, TEXT_LIMITS.short, errors, 'settings.title'),
      personalDetailsLabel: readString(settings, 'personalDetailsLabel', ACCOUNT_CONTENT_DEFAULTS.settings.personalDetailsLabel, TEXT_LIMITS.short, errors, 'settings.personalDetailsLabel'),
      fullNameLabel: readString(settings, 'fullNameLabel', ACCOUNT_CONTENT_DEFAULTS.settings.fullNameLabel, TEXT_LIMITS.short, errors, 'settings.fullNameLabel'),
      emailLabel: readString(settings, 'emailLabel', ACCOUNT_CONTENT_DEFAULTS.settings.emailLabel, TEXT_LIMITS.short, errors, 'settings.emailLabel'),
      defaultShippingAddressLabel: readString(settings, 'defaultShippingAddressLabel', ACCOUNT_CONTENT_DEFAULTS.settings.defaultShippingAddressLabel, TEXT_LIMITS.short, errors, 'settings.defaultShippingAddressLabel'),
      defaultShippingAddressLines: readStringList(settings['defaultShippingAddressLines'], ACCOUNT_CONTENT_DEFAULTS.settings.defaultShippingAddressLines, 8, errors, 'settings.defaultShippingAddressLines'),
      editLabel: readString(settings, 'editLabel', ACCOUNT_CONTENT_DEFAULTS.settings.editLabel, TEXT_LIMITS.short, errors, 'settings.editLabel'),
      communicationPreferencesLabel: readString(settings, 'communicationPreferencesLabel', ACCOUNT_CONTENT_DEFAULTS.settings.communicationPreferencesLabel, TEXT_LIMITS.short, errors, 'settings.communicationPreferencesLabel'),
      preferences: readPreferences(settings['preferences'], ACCOUNT_CONTENT_DEFAULTS.settings.preferences, errors),
      saveChangesLabel: readString(settings, 'saveChangesLabel', ACCOUNT_CONTENT_DEFAULTS.settings.saveChangesLabel, TEXT_LIMITS.short, errors, 'settings.saveChangesLabel'),
    },
    admin: {
      title: readString(admin, 'title', ACCOUNT_CONTENT_DEFAULTS.admin.title, TEXT_LIMITS.short, errors, 'admin.title'),
      badgeLabel: readString(admin, 'badgeLabel', ACCOUNT_CONTENT_DEFAULTS.admin.badgeLabel, TEXT_LIMITS.short, errors, 'admin.badgeLabel'),
      cmsLinkLabel: readString(admin, 'cmsLinkLabel', ACCOUNT_CONTENT_DEFAULTS.admin.cmsLinkLabel, TEXT_LIMITS.short, errors, 'admin.cmsLinkLabel'),
      cmsLinkDescription: readString(admin, 'cmsLinkDescription', ACCOUNT_CONTENT_DEFAULTS.admin.cmsLinkDescription, TEXT_LIMITS.medium, errors, 'admin.cmsLinkDescription'),
      registeredUsersLabel: readString(admin, 'registeredUsersLabel', ACCOUNT_CONTENT_DEFAULTS.admin.registeredUsersLabel, TEXT_LIMITS.short, errors, 'admin.registeredUsersLabel'),
      recentRegistrationsLabel: readString(admin, 'recentRegistrationsLabel', ACCOUNT_CONTENT_DEFAULTS.admin.recentRegistrationsLabel, TEXT_LIMITS.short, errors, 'admin.recentRegistrationsLabel'),
      loadingLabel: readString(admin, 'loadingLabel', ACCOUNT_CONTENT_DEFAULTS.admin.loadingLabel, TEXT_LIMITS.short, errors, 'admin.loadingLabel'),
      loadUsersError: readString(admin, 'loadUsersError', ACCOUNT_CONTENT_DEFAULTS.admin.loadUsersError, TEXT_LIMITS.short, errors, 'admin.loadUsersError'),
      noUsersLabel: readString(admin, 'noUsersLabel', ACCOUNT_CONTENT_DEFAULTS.admin.noUsersLabel, TEXT_LIMITS.short, errors, 'admin.noUsersLabel'),
      tableHeaders: readStringList(admin['tableHeaders'], ACCOUNT_CONTENT_DEFAULTS.admin.tableHeaders, 6, errors, 'admin.tableHeaders'),
    },
  };

  return { content, errors };
}

export function normalizeAccountContent(input: unknown): AccountContent {
  return validateAccountContent(input).content;
}
