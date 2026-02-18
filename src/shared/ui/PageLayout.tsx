'use client';

import { ReactNode } from 'react';

import { cn } from '@/shared/utils';

import { Button } from './button';
import { SectionHeader } from './section-header';
import { Tabs, TabsList, TabsTrigger } from './tabs';

interface PageLayoutProps {
  title: string;
  description: string | undefined;
  eyebrow?: ReactNode;
  headerActions?: ReactNode;
  refresh?: {
    onRefresh: () => void;
    isRefreshing: boolean;
  } | undefined;
  children: ReactNode;
  
  // Tabs configuration (optional)
  tabs?: {
    activeTab: string;
    onTabChange: (value: string) => void;
    tabsList: { value: string; label: string }[];
  };

  // Content wrapping (optional)
  wrapInPanel?: boolean;
  panelClassName?: string;

  // Save button configuration (optional)
  onSave?: () => Promise<void> | void;
  isSaving?: boolean;
  saveText?: string;
  stickyFooter?: boolean;
  
  containerClassName?: string;
}

export function PageLayout({
  title,
  description,
  eyebrow,
  headerActions,
  refresh,
  children,
  tabs,
  wrapInPanel = false,
  panelClassName,
  onSave,
  isSaving = false,
  saveText = 'Save Configuration',
  stickyFooter = false,
  containerClassName = 'container mx-auto py-10',
}: PageLayoutProps): React.JSX.Element {
  return (
    <div className={cn(containerClassName, stickyFooter && 'pb-32')}>
      {tabs && (
        <Tabs
          value={tabs.activeTab}
          onValueChange={tabs.onTabChange}
          className='mb-6'
        >
          <TabsList 
            className='grid w-full max-w-md'
            style={{ gridTemplateColumns: `repeat(${tabs.tabsList.length}, minmax(0, 1fr))` }}
          >
            {tabs.tabsList.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <SectionHeader
        title={title}
        className='mb-6'
        description={description}
        eyebrow={eyebrow}
        actions={headerActions}
        refresh={refresh}
      />

      {wrapInPanel ? (
        <div className={cn('rounded-lg border border-border bg-card p-6', panelClassName)}>
          {children}
        </div>
      ) : (
        children
      )}

      {onSave && (
        <div className={cn(
          'flex justify-end mt-6',
          stickyFooter && 'fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-background/80 p-6 backdrop-blur-md'
        )}>
          <div className={cn(stickyFooter && 'container mx-auto flex justify-end')}>
            <Button 
              onClick={() => void onSave()} 
              disabled={isSaving} 
              variant='default'
              className='min-w-[140px]'
            >
              {isSaving ? 'Saving...' : saveText}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
