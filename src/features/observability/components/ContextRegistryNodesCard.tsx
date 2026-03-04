'use client';

import React from 'react';
import { Card, Hint, StatusBadge } from '@/shared/ui';
import { type ContextRegistryNodeDisplay } from '../types';

export function ContextRegistryNodesCard({
  nodes,
}: {
  nodes: ContextRegistryNodeDisplay[];
}): React.JSX.Element | null {
  if (!nodes.length) return null;

  return (
    <Card variant='glass' padding='md' className='space-y-3 bg-white/5'>
      <Hint uppercase variant='muted' className='font-semibold'>
        Related Registry Nodes
      </Hint>
      <div className='flex flex-wrap gap-2'>
        {nodes.map((node) => (
          <StatusBadge
            key={node.id}
            status={`${node.kind ?? 'node'}: ${node.name}`}
            variant='neutral'
            size='sm'
            className='max-w-full'
          />
        ))}
      </div>
    </Card>
  );
}
