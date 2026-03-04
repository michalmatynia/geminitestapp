import { useState } from 'react';
import { initialNodes } from '@/shared/lib/ai-paths';

export function useUiSettingsState() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialNodes[0]?.id ?? null);
  const [loading, setLoading] = useState(true);
  const [isPathSwitching, setIsPathSwitching] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [nodeConfigDirty, setNodeConfigDirty] = useState(false);
  const [simulationOpenNodeId, setSimulationOpenNodeId] = useState<string | null>(null);
  const [loadNonce, setLoadNonce] = useState(0);
  const [expandedPaletteGroups, setExpandedPaletteGroups] = useState<Set<string>>(
    new Set(['Trigger', 'Data', 'AI', 'Logic', 'Output'])
  );
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [presetsModalOpen, setPresetsModalOpen] = useState(false);
  const [presetsJson, setPresetsJson] = useState('');

  return {
    selectedNodeId,
    setSelectedNodeId,
    loading,
    setLoading,
    isPathSwitching,
    setIsPathSwitching,
    configOpen,
    setConfigOpen,
    nodeConfigDirty,
    setNodeConfigDirty,
    simulationOpenNodeId,
    setSimulationOpenNodeId,
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
