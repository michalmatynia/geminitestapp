'use client';

import { FileText, Pencil, Check, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';


import { useCmsAllSlugs } from '@/features/cms/hooks/useCmsQueries';
import { usePageBuilder } from '@/features/cms/hooks/usePageBuilderContext';
import type { Slug } from '@/features/cms/types';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent, Input } from '@/shared/ui';

import { CmsDomainSelector } from '../../CmsDomainSelector';
import { PageAiTabContent } from './page-settings/PageAiTabContent';
import { PageSeoTabContent } from './page-settings/PageSeoTabContent';
import { PageSettingsTabContent } from './page-settings/PageSettingsTabContent';

function PageSettingsTab(): React.ReactNode {
  const { state, dispatch } = usePageBuilder();
  const page = state.currentPage;
  const allSlugsQuery = useCmsAllSlugs(Boolean(page));
  const [activeTab, setActiveTab] = useState<'page' | 'seo' | 'ai'>('page');
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const allSlugs = useMemo((): Slug[] => allSlugsQuery.data ?? [], [allSlugsQuery.data]);

  useEffect((): void => {
    if (!isEditingName) return;
    if (nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select?.();
    }
  }, [isEditingName]);

  const handleNameChange = (value: string): void => {
    dispatch({ type: 'SET_PAGE_NAME', name: value });
  };

  if (!page) return null;

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value: string): void => setActiveTab(value as 'page' | 'seo' | 'ai')}
      className='flex flex-1 flex-col overflow-hidden'
    >
      <div className='space-y-4 px-4 pt-4'>
        <div className='rounded border border-border/40 bg-gray-800/30 px-3 py-2'>
          <div className='flex items-center gap-2'>
            <FileText className='size-3 text-gray-500' />
            {isEditingName ? (
              <Input
                id='page-name'
                ref={nameInputRef}
                value={page.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  handleNameChange(e.target.value)
                }
                aria-label='Page name'
                onBlur={(): void => setIsEditingName(false)}
                onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>): void => {
                  if (event.key === 'Enter' || event.key === 'Escape') {
                    event.currentTarget.blur();
                  }
                }}
                placeholder='Page name'
                className='h-7 flex-1 bg-transparent px-2 text-xs'
               title='Page name'/>
            ) : (
              <span className='flex-1 truncate text-xs text-gray-200'>
                {page.name || 'Untitled page'}
              </span>
            )}
            {isEditingName ? (
              <div className='flex items-center gap-1'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  onClick={() => setIsEditingName(false)}
                  className='h-6 w-6 text-emerald-300 hover:text-emerald-100'
                  aria-label='Save page name'
                  title={'Save page name'}>
                  <Check className='size-3.5' />
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  onClick={() => setIsEditingName(false)}
                  className='h-6 w-6 text-rose-300 hover:text-rose-100'
                  aria-label='Cancel editing page name'
                  title={'Cancel editing page name'}>
                  <X className='size-3.5' />
                </Button>
              </div>
            ) : (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => setIsEditingName(true)}
                className='h-6 w-6 text-gray-400 hover:text-white'
                aria-label='Edit page name'
                title={'Edit page name'}>
                <Pencil className='size-3.5' />
              </Button>
            )}
          </div>
        </div>

        <div className='rounded border border-border/40 bg-gray-800/20 px-3 py-2'>
          <CmsDomainSelector label='Zone' triggerClassName='h-8 w-full' />
        </div>
      </div>

      <TabsList className='mx-4 mt-3 w-[calc(100%-2rem)]' aria-label='Page settings tabs'>
        <TabsTrigger value='page' className='flex-1 text-xs'>
          Page
        </TabsTrigger>
        <TabsTrigger value='seo' className='flex-1 text-xs'>
          SEO
        </TabsTrigger>
        <TabsTrigger value='ai' className='flex-1 text-xs'>
          AI
        </TabsTrigger>
      </TabsList>

      <TabsContent value='page' className='flex-1 overflow-y-auto p-4 mt-0'>
        <PageSettingsTabContent allSlugs={allSlugs} />
      </TabsContent>

      <TabsContent value='seo' className='flex-1 overflow-y-auto p-4 mt-0'>
        <PageSeoTabContent />
      </TabsContent>

      <TabsContent value='ai' className='flex-1 overflow-y-auto p-4 mt-0'>
        <PageAiTabContent activeTab={activeTab} />
      </TabsContent>
    </Tabs>
  );
}

export { PageSettingsTab };
