import React from 'react';
import { cn } from '@/shared/utils/ui-utils';
import { getBlockTypographyStyles } from '../../../frontend/theme-styles';
import { type BlockInstance } from '@/shared/contracts/cms';

type PreviewTextBlockProps = {
  block: BlockInstance;
  isSelected: boolean;
  className: string;
  onSelect: (e: React.SyntheticEvent) => void;
  renderSelectionButton: (className?: string) => React.ReactNode;
};

export const PreviewTextBlock: React.FC<PreviewTextBlockProps> = ({
  block,
  isSelected,
  className,
  onSelect,
  renderSelectionButton,
}) => {
  const text = (block.settings['textContent'] as string) || '';
  const typoStyles = getBlockTypographyStyles(block.settings);

  return (
    <div
      onClick={onSelect}
      className={cn(
        'relative group w-full text-left transition rounded',
        isSelected ? 'ring-2 ring-inset ring-blue-500/40 bg-blue-500/15' : 'ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50',
        className
      )}
    >
      {renderSelectionButton('left-2 top-2')}
      {text.trim() !== '' ? (
        <p className='text-base leading-relaxed text-gray-300 md:text-lg' style={typoStyles}>
          {text}
        </p>
      ) : (
        <p className='text-sm italic text-gray-500'>Add text content...</p>
      )}
    </div>
  );
};
