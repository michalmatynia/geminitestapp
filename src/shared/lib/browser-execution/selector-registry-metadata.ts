import type { SelectorRegistryNamespace } from '@/shared/contracts/integrations/selector-registry';

export const SELECTOR_REGISTRY_NAMESPACES: SelectorRegistryNamespace[] = [
  'tradera',
  'amazon',
  '1688',
  'vinted',
];

export const SELECTOR_REGISTRY_DEFAULT_PROFILES: Record<SelectorRegistryNamespace, string> = {
  tradera: 'default',
  amazon: 'amazon',
  '1688': '1688',
  vinted: 'vinted',
};

export const isSelectorRegistryNamespace = (
  value: string | null | undefined
): value is SelectorRegistryNamespace =>
  value === 'tradera' || value === 'amazon' || value === '1688' || value === 'vinted';

const inferNamespaceFromSelectorKey = (
  selectorKey: string | null | undefined
): SelectorRegistryNamespace | null => {
  const key = selectorKey?.trim() ?? '';
  if (key.startsWith('amazon.')) return 'amazon';
  if (key.startsWith('supplier1688.')) return '1688';
  if (key.startsWith('vinted.')) return 'vinted';
  return key.length > 0 ? 'tradera' : null;
};

const inferNamespaceFromProfile = (
  selectorProfile: string | null | undefined
): SelectorRegistryNamespace | null => {
  if (selectorProfile === 'amazon') return 'amazon';
  if (selectorProfile === '1688') return '1688';
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
  if (namespace === 'tradera') return 'Tradera';
  return 'Vinted';
};

export const getSelectorRegistryAdminHref = (
  namespace?: SelectorRegistryNamespace | null
): string => {
  if (isSelectorRegistryNamespace(namespace)) {
    return `/admin/integrations/selectors?namespace=${namespace}`;
  }
  return '/admin/integrations/selectors';
};
