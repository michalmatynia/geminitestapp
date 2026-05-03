import type { SelectorRegistryNamespace } from '@/shared/contracts/integrations/selector-registry';

export const SELECTOR_REGISTRY_NAMESPACES: SelectorRegistryNamespace[] = [
  'tradera',
  'amazon',
  '1688',
  'custom',
  'vinted',
];

export const SELECTOR_REGISTRY_DEFAULT_PROFILES: Record<SelectorRegistryNamespace, string> = {
  tradera: 'default',
  amazon: 'amazon',
  '1688': '1688',
  custom: 'custom',
  vinted: 'vinted',
};

export const isSelectorRegistryNamespace = (
  value: string | null | undefined
): value is SelectorRegistryNamespace =>
  value === 'tradera' ||
  value === 'amazon' ||
  value === '1688' ||
  value === 'custom' ||
  value === 'vinted';

const inferNamespaceFromSelectorKey = (
  selectorKey: string | null | undefined
): SelectorRegistryNamespace | null => {
  const key = selectorKey?.trim() ?? '';
  if (key.startsWith('amazon.')) return 'amazon';
  if (key.startsWith('supplier1688.')) return '1688';
  if (key.startsWith('custom.')) return 'custom';
  if (key.startsWith('vinted.')) return 'vinted';
  return key.length > 0 ? 'tradera' : null;
};

const inferNamespaceFromProfile = (
  selectorProfile: string | null | undefined
): SelectorRegistryNamespace | null => {
  if (selectorProfile === 'amazon') return 'amazon';
  if (selectorProfile === '1688') return '1688';
  if (selectorProfile === 'custom') return 'custom';
  if (selectorProfile === 'vinted') return 'vinted';
  return null;
};

export const inferSelectorRegistryNamespace = (input: {
  namespace?: string | null;
  selectorKey?: string | null;
  selectorProfile?: string | null;
}): SelectorRegistryNamespace => {
  return (
    (isSelectorRegistryNamespace(input.namespace) ? input.namespace : null) ??
    inferNamespaceFromSelectorKey(input.selectorKey) ??
    inferNamespaceFromProfile(input.selectorProfile) ??
    'tradera'
  );
};

export const formatSelectorRegistryNamespaceLabel = (
  namespace: SelectorRegistryNamespace
): string => {
  if (namespace === '1688') return '1688';
  if (namespace === 'amazon') return 'Amazon';
  if (namespace === 'custom') return 'Custom';
  if (namespace === 'tradera') return 'Tradera';
  return 'Vinted';
};

export const buildCustomSelectorRegistryProfileSuggestion = (
  url: string | null | undefined
): string => {
  try {
    const hostname = new URL(url ?? '').hostname.toLowerCase().replace(/^www\./, '');
    const normalized = hostname.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return normalized.length > 0 ? normalized : SELECTOR_REGISTRY_DEFAULT_PROFILES.custom;
  } catch {
    return SELECTOR_REGISTRY_DEFAULT_PROFILES.custom;
  }
};

export const getSelectorRegistryAdminHref = (
  namespace?: SelectorRegistryNamespace | null,
  options?: {
    profile?: string | null;
    includeArchived?: boolean;
    hash?: string | null;
  }
): string => {
  const params = new URLSearchParams();
  if (isSelectorRegistryNamespace(namespace)) {
    params.set('namespace', namespace);
  }
  const profile = options?.profile?.trim() ?? '';
  if (profile.length > 0) {
    params.set('profile', profile);
  }
  if (options?.includeArchived === true) {
    params.set('includeArchived', 'true');
  }
  const query = params.toString();
  const hash = options?.hash?.trim() ?? '';
  return `/admin/integrations/selectors${query.length > 0 ? `?${query}` : ''}${hash.length > 0 ? `#${hash}` : ''}`;
};
