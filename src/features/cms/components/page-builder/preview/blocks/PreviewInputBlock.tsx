import React from 'react';
import { cn } from '@/shared/utils/ui-utils';
import { Input } from '@/shared/ui/primitives.public';
import { type BlockInstance } from '@/shared/contracts/cms';

type PreviewInputBlockProps = {
  block: BlockInstance;
  containerClass: string;
  onSelect: (e: React.SyntheticEvent) => void;
  renderSelectionButton: (className?: string) => React.ReactNode;
  wrapInspector: (node: React.ReactNode) => React.ReactNode;
};

export const PreviewInputBlock: React.FC<PreviewInputBlockProps> = ({
  block,
  containerClass,
  onSelect,
  renderSelectionButton,
  wrapInspector,
}) => {
  const resolvedSettings = block.settings;
  const value = typeof resolvedSettings['inputValue'] === 'string' ? resolvedSettings['inputValue'] : '';
  const placeholder = typeof resolvedSettings['inputPlaceholder'] === 'string' ? resolvedSettings['inputPlaceholder'] : '';
  const inputAriaLabel = typeof resolvedSettings['inputAriaLabel'] === 'string' ? (resolvedSettings['inputAriaLabel']).trim() : '';

  return wrapInspector(
    <div
      onClick={onSelect}
      className={cn('relative group w-full text-left transition', containerClass)}
    >
      {renderSelectionButton('left-2 top-2')}
      <Input
        readOnly
        value={value}
        placeholder={placeholder || 'Input'}
        aria-label={inputAriaLabel || placeholder || 'Input field'}
        className='pointer-events-none w-full'
        title={placeholder || 'Input'}
      />
    </div>
  );
};
