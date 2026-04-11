// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useImportExportPreferences } from './useImportExportPreferences';

describe('useImportExportPreferences', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not overwrite saved import settings when preferences hydrate later', () => {
    const setImportTemplateId = vi.fn();
    const setExportInventoryId = vi.fn();
    const setSelectedBaseConnectionId = vi.fn();
    const setExportStockFallbackEnabled = vi.fn();
    const setImageRetryPresets = vi.fn();
    const setInventoryId = vi.fn();

    renderHook(() =>
      useImportExportPreferences({
        lastImportTemplatePref: { templateId: 'pref-template' },
        defaultExportInventoryPref: { inventoryId: 'export-inv-1' },
        defaultConnectionPref: { connectionId: 'conn-default' },
        exportStockFallbackPref: { enabled: true },
        imageRetryPresetsPref: {
          presets: [{ token: 'image', retries: 2, delayMs: 250, backoffFactor: 2 }],
        },
        sampleProductPref: { inventoryId: 'sample-inv-1', productId: 'sample-1' },
        baseConnections: [
          { id: 'saved-conn', name: 'Saved connection' },
          { id: 'conn-default', name: 'Default connection' },
        ],
        importTemplateIdRef: { current: 'saved-template' },
        inventoryIdRef: { current: 'saved-inv' },
        selectedBaseConnectionIdRef: { current: 'saved-conn' },
        setImportTemplateId,
        setExportInventoryId,
        setSelectedBaseConnectionId,
        setExportStockFallbackEnabled,
        setImageRetryPresets,
        setInventoryId,
      })
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(setImportTemplateId).not.toHaveBeenCalled();
    expect(setSelectedBaseConnectionId).not.toHaveBeenCalled();
    expect(setInventoryId).not.toHaveBeenCalled();
    expect(setExportInventoryId).toHaveBeenCalledWith('export-inv-1');
    expect(setExportStockFallbackEnabled).toHaveBeenCalledWith(true);
    expect(setImageRetryPresets).toHaveBeenCalledTimes(1);
  });
});
