import { useState } from 'react';
import type { AiNode, Edge, PathConfig, PathMeta } from '@/shared/lib/ai-paths';
import { initialEdges, initialNodes, triggers } from '@/shared/lib/ai-paths';

export function useCoreSettingsState() {
  const [nodes, setNodes] = useState<AiNode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [paths, setPaths] = useState<PathMeta[]>([]);
  const [pathConfigs, setPathConfigs] = useState<Record<string, PathConfig>>({});
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [isPathLocked, setIsPathLocked] = useState(false);
  const [isPathActive, setIsPathActive] = useState(true);
  const [pathName, setPathName] = useState('AI Description Path');
  const [pathDescription, setPathDescription] = useState(
    'Visual analysis + description generation with structured updates.'
  );
  const [activeTrigger, setActiveTrigger] = useState(triggers[0] ?? '');

  return {
    nodes,
    setNodes,
    edges,
    setEdges,
    paths,
    setPaths,
    pathConfigs,
    setPathConfigs,
    activePathId,
    setActivePathId,
    isPathLocked,
    setIsPathLocked,
    isPathActive,
    setIsPathActive,
    pathName,
    setPathName,
    pathDescription,
    setPathDescription,
    activeTrigger,
    setActiveTrigger,
  };
}
