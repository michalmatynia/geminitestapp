'use client';

import * as React from 'react';

import { useCmsEditor } from '@/features/cms/components/CmsEditorContext';
import type { Page } from '@/shared/contracts/cms';
import { Button } from '@/shared/ui/primitives.public';
import { SectionHeader, SidePanel } from '@/shared/ui/navigation-and-layout.public';

import RichTextBlock, { type RichTextContent } from './RichTextBlock';

type CmsSideMenuComponent = NonNullable<Page['components']>[number];

export default function CmsSideMenu(): React.JSX.Element {
  const { page, setPage } = useCmsEditor();

  const addComponent = (type: string): void => {
    setPage((prev) => {
      if (!prev) return prev; // nothing to update yet
      const sectionId = `section-${Date.now()}-${prev.components.length}`;
      const newComponent: CmsSideMenuComponent = {
        type,
        order: prev.components.length,
        content: {
          zone: 'template',
          settings: {},
          blocks: [],
          sectionId,
          parentSectionId: null,
        },
      };
      return {
        ...prev,
        components: [...prev.components, newComponent],
      };
    });
  };

  const handleContentChange = (index: number, content: RichTextContent): void => {
    setPage((prev) => {
      if (!prev) return prev;
      const nextComponents = [...prev.components];

      if (!nextComponents[index]) return prev; // out of range safety
      const component = nextComponents[index];
      nextComponents[index] = {
        ...component,
        content: {
          ...component.content,
          settings: { ...content },
        },
      };

      return {
        ...prev,
        components: nextComponents,
      };
    });
  };

  if (!page) {
    return (
      <SidePanel
        width={320}
        header={<SectionHeader title='Loading page…' size='sm' className='p-4' />}
        contentClassName='p-4'
      >
        <p className='text-sm text-gray-300'>Select a page or wait for data to load.</p>
      </SidePanel>
    );
  }

  return (
    <SidePanel
      width={320}
      header={<SectionHeader title={`Editing: ${page.name}`} size='sm' className='p-4' />}
      contentClassName='p-4'
    >
      <div className='space-y-4'>
        <div>
          <h3 className='font-bold mb-2'>Header</h3>
          {/* Header components will be listed here */}
        </div>

        <div>
          <h3 className='font-bold mb-2'>Template</h3>

          {page.components.map((component: CmsSideMenuComponent, index: number) => {
            if (component?.type === 'RichText') {
              return (
                <RichTextBlock
                  key={index}
                  content={component.content.settings as RichTextContent}
                  onChange={(content: RichTextContent): void => handleContentChange(index, content)}
                />
              );
            }
            return null;
          })}

          <Button onClick={() => addComponent('RichText')}>Add Section</Button>
        </div>

        <div>
          <h3 className='font-bold mb-2'>Footer</h3>
          {/* Footer components will be listed here */}
        </div>
      </div>
    </SidePanel>
  );
}
