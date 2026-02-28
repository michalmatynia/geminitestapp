import { getProductRepository } from '@/features/products/services/product-repository';
import { noteService } from '@/features/notesapp/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export const normalizeEntityType = (value?: string | null): string | null => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'product' || normalized === 'products') return 'product';
  if (normalized === 'note' || normalized === 'notes') return 'note';
  return normalized;
};

export const fetchEntityByType = async (
  entityType: string,
  entityId: string
): Promise<Record<string, unknown> | null> => {
  if (!entityType || !entityId) return null;
  const normalized = normalizeEntityType(entityType);
  try {
    if (normalized === 'product') {
      const repo = await getProductRepository();
      return (await repo.getProductById(entityId)) as Record<string, unknown> | null;
    }
    if (normalized === 'note') {
      return (await noteService.getById(entityId)) as Record<string, unknown> | null;
    }
  } catch (error) {
    void ErrorSystem.logWarning(`Failed to fetch entity ${entityType} ${entityId}`, {
      service: 'ai-paths-runtime',
      error,
      entityType,
      entityId,
    });
    return null;
  }
  return null;
};
