'use client';

import { Globe } from 'lucide-react';
import React from 'react';

import { usePageBuilder } from '@/features/cms/hooks/usePageBuilderContext';
import { Input, Label } from '@/shared/ui/primitives.public';

export function PageSeoTabContent(): React.JSX.Element {
  const { state, dispatch } = usePageBuilder();
  const page = state.currentPage!;

  const handleSeoChange = (key: string, value: string): void => {
    dispatch({ type: 'UPDATE_SEO', seo: { [key]: value || undefined } });
  };

  return (
    <div className='space-y-4'>
      <div className='rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400'>
        <Globe className='mr-1.5 inline size-3' />
        Search Engine Optimization
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='seo-title' className='text-xs text-gray-400'>
          Page title
        </Label>
        <Input
          id='seo-title'
          value={page.seoTitle ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            handleSeoChange('seoTitle', e.target.value)
          }
          placeholder={page.name}
          className='h-8 text-xs'
         aria-label={page.name} title={page.name}/>
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='seo-desc' className='text-xs text-gray-400'>
          Meta description
        </Label>
        <Input
          id='seo-desc'
          value={page.seoDescription ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            handleSeoChange('seoDescription', e.target.value)
          }
          placeholder='Page description for search engines'
          className='h-8 text-xs'
         aria-label='Page description for search engines' title='Page description for search engines'/>
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='seo-canonical' className='text-xs text-gray-400'>
          Canonical URL
        </Label>
        <Input
          id='seo-canonical'
          value={page.seoCanonical ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            handleSeoChange('seoCanonical', e.target.value)
          }
          placeholder='https://example.com/page'
          className='h-8 text-xs'
         aria-label='https://example.com/page' title='https://example.com/page'/>
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='seo-og' className='text-xs text-gray-400'>
          OG Image URL
        </Label>
        <Input
          id='seo-og'
          value={page.seoOgImage ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            handleSeoChange('seoOgImage', e.target.value)
          }
          placeholder='https://example.com/image.png'
          className='h-8 text-xs'
         aria-label='https://example.com/image.png' title='https://example.com/image.png'/>
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='seo-robots' className='text-xs text-gray-400'>
          Robots meta
        </Label>
        <Input
          id='seo-robots'
          value={page.robotsMeta ?? 'index,follow'}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            handleSeoChange('robotsMeta', e.target.value)
          }
          placeholder='index,follow'
          className='h-8 text-xs'
         aria-label='index,follow' title='index,follow'/>
      </div>

      {/* SEO Preview */}
      <div className='space-y-1.5 rounded border border-border/30 bg-gray-800/20 p-3'>
        <p className='text-[10px] font-medium uppercase tracking-wide text-gray-500'>
          Search preview
        </p>
        <p className='text-sm font-medium text-blue-400 truncate'>{page.seoTitle || page.name}</p>
        <p className='text-xs text-gray-400 line-clamp-2'>
          {page.seoDescription || 'No description set'}
        </p>
      </div>
    </div>
  );
}
