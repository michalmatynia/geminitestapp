'use client';

import { useEffect, useRef } from 'react';
import type { 
  IntegrationConnectionBasic, 
  ImageRetryPreset 
} from '@/shared/contracts/integrations';
import { normalizeImageRetryPresets } from '@/features/data-import-export/utils/image-retry-presets';

export function useImportExportPreferences({
  lastImportTemplatePref,
  defaultExportInventoryPref,
  defaultConnectionPref,
  exportStockFallbackPref,
  imageRetryPresetsPref,
  sampleProductPref,
  baseConnections,
  setImportTemplateId,
  setExportInventoryId,
  setSelectedBaseConnectionId,
  setExportStockFallbackEnabled,
  setImageRetryPresets,
  setInventoryId,
}: {
  lastImportTemplatePref: { templateId?: string | null } | undefined | null;
  defaultExportInventoryPref: { inventoryId?: string | null } | undefined | null;
  defaultConnectionPref: { connectionId?: string | null } | undefined | null;
  exportStockFallbackPref: { enabled?: boolean } | undefined | null;
  imageRetryPresetsPref: { presets?: unknown } | undefined | null;
  sampleProductPref: { inventoryId?: string | null } | undefined | null;
  baseConnections: IntegrationConnectionBasic[];
  setImportTemplateId: (id: string) => void;
  setExportInventoryId: (id: string) => void;
  setSelectedBaseConnectionId: (id: string) => void;
  setExportStockFallbackEnabled: (enabled: boolean) => void;
  setImageRetryPresets: (presets: ImageRetryPreset[]) => void;
  setInventoryId: (id: string) => void;
}) {
  const hasInitializedPrefs = useRef(false);

  useEffect(() => {
    if (!hasInitializedPrefs.current) {
      const timer = setTimeout(() => {
        if (lastImportTemplatePref?.templateId) {
          setImportTemplateId(lastImportTemplatePref.templateId);
        }
        if (defaultExportInventoryPref?.inventoryId) {
          setExportInventoryId(defaultExportInventoryPref.inventoryId);
        }
        if (defaultConnectionPref?.connectionId && baseConnections.some((c: IntegrationConnectionBasic) => c.id === defaultConnectionPref.connectionId)) {
          setSelectedBaseConnectionId(defaultConnectionPref.connectionId);
        }
        if (exportStockFallbackPref?.enabled !== undefined) {
          setExportStockFallbackEnabled(exportStockFallbackPref.enabled);
        }
        if (imageRetryPresetsPref?.presets) {
          setImageRetryPresets(normalizeImageRetryPresets(imageRetryPresetsPref.presets));
        }
        if (sampleProductPref?.inventoryId) {
          setInventoryId(sampleProductPref.inventoryId);
        }
        hasInitializedPrefs.current = true;
      }, 0);
      return (): void => clearTimeout(timer);
    }
    return undefined;
  }, [
    lastImportTemplatePref, 
    defaultExportInventoryPref, 
    defaultConnectionPref, 
    exportStockFallbackPref, 
    imageRetryPresetsPref, 
    sampleProductPref, 
    baseConnections,
    setImportTemplateId,
    setExportInventoryId,
    setSelectedBaseConnectionId,
    setExportStockFallbackEnabled,
    setImageRetryPresets,
    setInventoryId
  ]);
}
