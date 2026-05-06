'use client';

import * as React from 'react';

import { useCmsEditor } from '@/features/cms/components/CmsEditorContext';
import type { Page } from '@/shared/contracts/cms';
import { Button } from '@/shared/ui/primitives.public';
import { SectionHeader, SidePanel } from '@/shared/ui/navigation-and-layout.public';

import RichTextBlock, { type RichTextContent } from './RichTextBlock';

type CmsSideMenuComponent = NonNullable<Page['components']>[number];

function ComponentList({
  components,
  handleContentChange,
  addComponent
}: {
  components: CmsSideMenuComponent[];
  handleContentChange: (index: number, content: RichTextContent) => void;
  addComponent: (type: string) => void;
}): React.JSX.Element {
  return (
    <>
      <h3 className='font-bold mb-2'>Template</h3>
      {components.map((component, index) => {
        if (component.type === 'RichText') {
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
    </>
  );
}

const useCmsComponentHandlers = (
  setPage: React.Dispatch<React.SetStateAction<Page | null>>
): {
  addComponent: (type: string) => void;
  handleContentChange: (index: number, content: RichTextContent) => void;
} => {
  const addComponent = (type: string): void => {
    setPage((prev: Page | null) => {
      if (!prev) return prev;
      const sectionId = `section-${Date.now()}-${prev.components.length}`;
      const newComponent: CmsSideMenuComponent = {
        type,
        order: prev.components.length,
        content: { zone: 'template', settings: {}, blocks: [], sectionId, parentSectionId: null },
      };
      return { ...prev, components: [...prev.components, newComponent] };
    });
  };

  const handleContentChange = (index: number, content: RichTextContent): void => {
    setPage((prev: Page | null) => {
      if (!prev) return prev;
      const nextComponents = [...prev.components];
      const component = nextComponents[index];
      if (!component) return prev;
      nextComponents[index] = { ...component, content: { ...component.content, settings: { ...content } } };
      return { ...prev, components: nextComponents };
    });
  };
  return { addComponent, handleContentChange };
};

export default function CmsSideMenu(): React.JSX.Element {
  const { page, setPage } = useCmsEditor();
  const { addComponent, handleContentChange } = useCmsComponentHandlers(setPage);

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
        <div><h3 className='font-bold mb-2'>Header</h3></div>
        <div>
          <ComponentList components={page.components} handleContentChange={handleContentChange} addComponent={addComponent} />
        </div>
        <div><h3 className='font-bold mb-2'>Footer</h3></div>
      </div>
    </SidePanel>
  );
}
