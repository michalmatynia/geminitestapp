import { useState } from 'react';

export function useUiSettingsState() {
  const [isPathSwitching, setIsPathSwitching] = useState(false);
  const [expandedPaletteGroups, setExpandedPaletteGroups] = useState<Set<string>>(
    new Set(['Trigger', 'Data', 'AI', 'Logic', 'Output'])
  );
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [presetsModalOpen, setPresetsModalOpen] = useState(false);
  const [presetsJson, setPresetsJson] = useState('');

  return {
    isPathSwitching,
    setIsPathSwitching,
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
