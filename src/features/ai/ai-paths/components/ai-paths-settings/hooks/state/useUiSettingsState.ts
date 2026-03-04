import { useState } from 'react';

export function useUiSettingsState() {
  const [loading, setLoading] = useState(true);
  const [isPathSwitching, setIsPathSwitching] = useState(false);
  const [loadNonce, setLoadNonce] = useState(0);
  const [expandedPaletteGroups, setExpandedPaletteGroups] = useState<Set<string>>(
    new Set(['Trigger', 'Data', 'AI', 'Logic', 'Output'])
  );
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [presetsModalOpen, setPresetsModalOpen] = useState(false);
  const [presetsJson, setPresetsJson] = useState('');

  return {
    loading,
    setLoading,
    isPathSwitching,
    setIsPathSwitching,
    loadNonce,
    setLoadNonce,
    expandedPaletteGroups,
    setExpandedPaletteGroups,
    paletteCollapsed,
    setPaletteCollapsed,
    presetsModalOpen,
    setPresetsModalOpen,
    presetsJson,
    setPresetsJson,
  };
}
