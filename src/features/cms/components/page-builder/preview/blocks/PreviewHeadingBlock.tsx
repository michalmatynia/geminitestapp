import React from 'react';
import { cn } from '@/shared/utils/ui-utils';
import { getBlockTypographyStyles } from '../../frontend/theme-styles';
import { type BlockInstance } from '@/shared/contracts/cms';

type PreviewHeadingBlockProps = {
  block: BlockInstance;
  containerClass: string;
  onSelect: (e: React.SyntheticEvent) => void;
  renderSelectionButton: (className?: string) => React.ReactNode;
  wrapInspector: (node: React.ReactNode) => React.ReactNode;
};

export const PreviewHeadingBlock: React.FC<PreviewHeadingBlockProps> = ({
  block,
  containerClass,
  onSelect,
  renderSelectionButton,
  wrapInspector,
}) => {
  const text = (block.settings['headingText'] as string) || 'Heading';
  const typoStyles = getBlockTypographyStyles(block.settings);

  return wrapInspector(
    <div
      onClick={onSelect}
      className={cn('relative group w-full text-left transition', containerClass)}
    >
      {renderSelectionButton('left-2 top-2')}
      <h2
        className='text-2xl font-bold leading-tight tracking-tight md:text-3xl text-gray-200'
        style={typoStyles}
      >
        {text}
      </h2>
    </div>
  );
};
