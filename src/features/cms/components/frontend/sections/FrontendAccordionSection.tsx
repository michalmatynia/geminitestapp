'use client';

import React, { useId, useState } from 'react';

import type { BlockInstance } from '@/features/cms/types/page-builder';
import { CompactEmptyState } from '@/shared/ui/navigation-and-layout.public';

import { FrontendBlockRenderer } from './FrontendBlockRenderer';
import { useSectionBlockData } from './SectionBlockContext';
import { useCmsPageContext } from '../CmsPageContext';
import { getSectionContainerClass, getSectionStyles } from '../theme-styles';


export function FrontendAccordionSection(): React.ReactNode {
  const { settings, blocks } = useSectionBlockData();
  const { colorSchemes, layout } = useCmsPageContext();
  const sectionStyles = getSectionStyles(settings, colorSchemes);

  // Group blocks into pairs: Heading + Text = one accordion item
  const items: { heading: BlockInstance; text?: BlockInstance }[] = [];
  let i = 0;
  while (i < blocks.length) {
    const current = blocks[i];
    if (!current) {
      i += 1;
      continue;
    }
    if (current.type === 'Heading') {
      const next = blocks[i + 1];
      if (next?.type === 'Text') {
        items.push({ heading: current, text: next });
        i += 2;
      } else {
        items.push({ heading: current });
        i += 1;
      }
    } else {
      i += 1;
    }
  }

  if (items.length === 0) {
    return (
      <section style={sectionStyles}>
        <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth })}>
          <CompactEmptyState
            title='No accordion items'
            description='Add Heading and Text blocks to create accordion items.'
            className='bg-card/20 py-8'
           />
        </div>
      </section>
    );
  }

  return (
    <section style={sectionStyles}>
      <div
        className={getSectionContainerClass({
          fullWidth: layout?.fullWidth,
          maxWidthClass: 'max-w-3xl',
        })}
      >
        <div className='divide-y divide-gray-700/50'>
          {items.map((item: { heading: BlockInstance; text?: BlockInstance }, index: number) => (
            <AccordionItem key={item.heading.id} item={item} defaultOpen={index === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AccordionItem({
  item,
  defaultOpen,
}: {
  item: { heading: BlockInstance; text?: BlockInstance };
  defaultOpen: boolean;
}): React.ReactNode {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const buttonId = useId();
  const panelId = `${buttonId}-panel`;
  const headingBlock = item.heading;
  const textBlock = item.text;
  const headingLabel =
    typeof headingBlock.settings?.['headingText'] === 'string'
      ? headingBlock.settings['headingText']
      : 'Accordion section';
  return (
    <div className='py-4'>
      <button
        type='button'
        onClick={() => setIsOpen(!isOpen)}
        className='flex w-full items-center justify-between text-left'
        id={buttonId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={headingLabel}
      >
        <FrontendBlockRenderer block={headingBlock} />
        <span className='cms-appearance-muted-text ml-4 shrink-0 text-xl'>
          {isOpen ? '−' : '+'}
        </span>
      </button>
      {isOpen && textBlock && (
        <div className='mt-3' id={panelId} role='region' aria-labelledby={buttonId}>
          <FrontendBlockRenderer block={textBlock} />
        </div>
      )}
    </div>
  );
}
