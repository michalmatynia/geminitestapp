'use client';

import { ReactNode } from 'react';

import { Button } from './button';
import { SectionHeader } from './section-header';
import { SectionPanel } from './section-panel';
import { Tabs, TabsList, TabsTrigger } from './tabs';

interface PageLayoutProps {
  title: string;
  description: string | undefined;
  eyebrow?: ReactNode;
  headerActions?: ReactNode;
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
  
  containerClassName?: string;
}

export function PageLayout({
  title,
  description,
  eyebrow,
  headerActions,
  children,
  tabs,
  wrapInPanel = false,
  panelClassName,
  onSave,
  isSaving = false,
  saveText = 'Save Configuration',
  containerClassName = 'container mx-auto py-10',
}: PageLayoutProps): React.JSX.Element {
  return (
    <div className={containerClassName}>
      {tabs && (
        <Tabs
          value={tabs.activeTab}
          onValueChange={tabs.onTabChange}
          className='mb-6'
        >
          <TabsList className='grid w-full max-w-md grid-cols-2'>
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
      />

      {wrapInPanel ? (
        <SectionPanel className={panelClassName}>
          {children}
        </SectionPanel>
      ) : (
        children
      )}

      {onSave && (
        <div className='flex justify-end mt-6'>
          <Button 
            onClick={() => void onSave()} 
            disabled={isSaving} 
            variant='primary'
            className='min-w-[140px]'
          >
            {isSaving ? 'Saving...' : saveText}
          </Button>
        </div>
      )}
    </div>
  );
}
