import { noteService } from '@/server/notes/note-service';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const LOG_SOURCE = 'ai-paths-runtime';

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
  const fetchStart = Date.now();
  try {
    let result: Record<string, unknown> | null = null;
    if (normalized === 'product') {
      const repo = await getProductRepository();
      result = (await repo.getProductById(entityId)) as Record<string, unknown> | null;
    } else if (normalized === 'note') {
      result = (await noteService.getById(entityId)) as Record<string, unknown> | null;
    }
    const durationMs = Date.now() - fetchStart;
    void logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: `Entity fetch: ${entityType}/${entityId} → ${result ? 'found' : 'not found'} (${durationMs}ms)`,
      context: {
        event: 'entity.fetch',
        entityType: normalized ?? entityType,
        entityId,
        found: result !== null,
        durationMs,
      },
    });
    return result;
  } catch (error) {
    const durationMs = Date.now() - fetchStart;
    void ErrorSystem.logWarning(`Failed to fetch entity ${entityType} ${entityId}`, {
      service: LOG_SOURCE,
      error,
      entityType,
      entityId,
      durationMs,
    });
    return null;
  }
};
