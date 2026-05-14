import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/shared/ui/primitives.public';

export const SortOrderControl = ({
  sortOrder,
  onToggle,
}: {
  sortOrder: 'asc' | 'desc';
  onToggle: () => void;
}): React.JSX.Element => (
  <div className='flex items-center gap-2'>
    <span className='text-sm font-medium text-gray-400'>Sort Order:</span>
    <Button
      variant={sortOrder === 'desc' ? 'default' : 'outline'}
      onClick={onToggle}
      className='h-8 gap-1.5 px-2.5'
      title={`Click to sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
    >
      {sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
      {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
    </Button>
  </div>
);

export const ViewModeControl = ({
  viewMode,
  gridDensity,
  onUpdate,
}: {
  viewMode: 'list' | 'grid';
  gridDensity: number;
  onUpdate: (settings: { viewMode: 'list' | 'grid'; gridDensity?: number }) => void;
}): React.JSX.Element => (
  <div className='flex items-center gap-2'>
    <span className='text-sm font-medium text-gray-400'>View Mode:</span>
    <Button
      variant={viewMode === 'list' ? 'default' : 'outline'}
      onClick={() => onUpdate({ viewMode: 'list' })}
      className='h-8 px-2.5'
    >
      List
    </Button>
    <Button
      variant={viewMode === 'grid' && gridDensity === 4 ? 'default' : 'outline'}
      onClick={() => onUpdate({ viewMode: 'grid', gridDensity: 4 })}
      className='h-8 px-2.5'
    >
      Grid 4
    </Button>
    <Button
      variant={viewMode === 'grid' && gridDensity === 8 ? 'default' : 'outline'}
      onClick={() => onUpdate({ viewMode: 'grid', gridDensity: 8 })}
      className='h-8 px-2.5'
    >
      Grid 8
    </Button>
  </div>
);
