import { useCallback } from 'react';
import type { DatabaseConfig, UpdaterMapping } from '@/shared/lib/ai-paths';

export function useDatabaseMappingState(args: {
  databaseConfig: DatabaseConfig;
  mappings: UpdaterMapping[];
  availablePorts: string[];
  bundleKeys: string[];
  targetPaths: string[];
  updateSelectedNodeConfig: (config: { database: DatabaseConfig }) => void;
}) {
  const updateMapping = useCallback(
    (index: number, patch: Partial<UpdaterMapping>) => {
      const nextMappings = args.mappings.map((m, idx) => (idx === index ? { ...m, ...patch } : m));
      args.updateSelectedNodeConfig({
        database: { ...args.databaseConfig, mappings: nextMappings },
      });
    },
    [args]
  );

  const removeMapping = useCallback(
    (index: number) => {
      args.updateSelectedNodeConfig({
        database: {
          ...args.databaseConfig,
          mappings: args.mappings.filter((_, idx) => idx !== index),
        },
      });
    },
    [args]
  );

  const addMapping = useCallback(() => {
    args.updateSelectedNodeConfig({
      database: {
        ...args.databaseConfig,
        mappings: [
          ...args.mappings,
          { targetPath: '', sourcePort: args.availablePorts[0] ?? 'result', sourcePath: '' },
        ],
      },
    });
  }, [args]);

  const mapInputsToTargets = useCallback(() => {
    const nextMappings: UpdaterMapping[] = [];
    args.availablePorts.forEach((port) => {
      if (port === args.databaseConfig.idField) return;
      if (port === 'bundle') {
        args.bundleKeys.forEach((key) =>
          nextMappings.push({ targetPath: key, sourcePort: 'bundle', sourcePath: key })
        );
      } else {
        const normalized = port.toLowerCase();
        const target =
          args.targetPaths.find(
            (p) => p.toLowerCase().endsWith(normalized) || p.toLowerCase().includes(normalized)
          ) ?? port;
        nextMappings.push({ targetPath: target, sourcePort: port });
      }
    });
    if (nextMappings.length > 0)
      args.updateSelectedNodeConfig({
        database: { ...args.databaseConfig, mappings: nextMappings },
      });
  }, [args]);

  return {
    updateMapping,
    removeMapping,
    addMapping,
    mapInputsToTargets,
  };
}
