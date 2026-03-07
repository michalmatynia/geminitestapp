'use client';

import React, { useState } from 'react';
import { BookOpen, Trophy, type LucideIcon } from 'lucide-react';

import { Breadcrumbs, SectionHeader } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { AdminKangurLessonsManagerPage } from './AdminKangurLessonsManagerPage';
import { AdminKangurTestSuitesManagerPage } from './AdminKangurTestSuitesManagerPage';

type ContentTab = 'lessons' | 'tests';

const TAB_STORAGE_KEY = 'kangur_content_manager_tab_v1';

const readPersistedTab = (): ContentTab => {
  if (typeof window === 'undefined') return 'lessons';
  try {
    const v = window.localStorage.getItem(TAB_STORAGE_KEY);
    return v === 'tests' ? 'tests' : 'lessons';
  } catch {
    return 'lessons';
  }
};

const TABS: Array<{ id: ContentTab; label: string; Icon: LucideIcon }> = [
  { id: 'lessons', label: 'Lessons', Icon: BookOpen },
  { id: 'tests', label: 'Tests', Icon: Trophy },
];

export function AdminKangurContentManagerPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<ContentTab>(() => readPersistedTab());

  const handleTabChange = (tab: ContentTab): void => {
    setActiveTab(tab);
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      // ignore
    }
  };

  return (
    <div className='flex h-full flex-col gap-4 overflow-hidden'>
      <SectionHeader
        title='Kangur Content Manager'
        description='Manage lessons and test suites for the Kangur learning app.'
      >
        <Breadcrumbs
          items={[
            { label: 'Admin', href: '/admin' },
            { label: 'Kangur', href: '/admin/kangur' },
            { label: 'Content Manager' },
          ]}
        />
      </SectionHeader>

      {/* Tab bar */}
      <div className='flex shrink-0 items-center gap-1 rounded-xl border border-border/50 bg-card/30 p-1 self-start'>
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type='button'
            onClick={() => handleTabChange(id)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
              activeTab === id
                ? 'bg-sky-500/20 text-sky-100 shadow-sm'
                : 'text-gray-400 hover:bg-muted/40 hover:text-gray-200'
            )}
          >
            <Icon className='size-3.5' />
            {label}
          </button>
        ))}
      </div>

      {/* Content — each sub-page manages its own FolderTree, modals, and state */}
      <div className='min-h-0 flex-1 overflow-hidden'>
        {activeTab === 'lessons' ? (
          <AdminKangurLessonsManagerPage standalone={false} />
        ) : (
          <AdminKangurTestSuitesManagerPage standalone={false} />
        )}
      </div>
    </div>
  );
}
