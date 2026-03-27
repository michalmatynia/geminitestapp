'use client';

import type { JSX, ReactNode } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { cn } from '@/shared/utils';

import { FormActions } from './FormActions';
import { SectionHeader } from './section-header';
import { Tabs, TabsList, TabsTrigger } from './tabs';

interface PageLayoutProps {
  title: string;
  description?: string | undefined;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  headerActions?: ReactNode;
  refresh?:
    | {
        onRefresh: () => void;
        isRefreshing: boolean;
      }
    | undefined;
  children: ReactNode;
  tabs?: {
    activeTab: string;
    onTabChange: (value: string) => void;
    tabsList: Array<LabeledOptionDto<string>>;
  };
  wrapInPanel?: boolean;
  panelClassName?: string;
  onSave?: () => Promise<void> | void;
  isSaving?: boolean;
  saveText?: string;
  stickyFooter?: boolean;
  containerClassName?: string;
}

type PageLayoutTabsProps = {
  tabs?: {
    activeTab: string;
    onTabChange: (value: string) => void;
    tabsList: Array<LabeledOptionDto<string>>;
  };
};

type PageLayoutRenderProps = {
  children: ReactNode;
  containerClassName: string;
  description: string | undefined;
  eyebrow: ReactNode;
  headerActions: ReactNode;
  icon: ReactNode;
  isSaving: boolean;
  onSave: (() => Promise<void> | void) | undefined;
  panelClassName: string | undefined;
  refresh:
    | {
        onRefresh: () => void;
        isRefreshing: boolean;
      }
    | undefined;
  saveText: string;
  stickyFooter: boolean;
  tabs: PageLayoutTabsProps['tabs'];
  title: string;
  wrapInPanel: boolean;
};

function PageLayoutTabs({ tabs }: PageLayoutTabsProps): JSX.Element | null {
  if (!tabs) return null;

  return (
    <Tabs value={tabs.activeTab} onValueChange={tabs.onTabChange} className='mb-6'>
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
  );
}

const renderPageLayout = ({
  children,
  containerClassName,
  description,
  eyebrow,
  headerActions,
  icon,
  isSaving,
  onSave,
  panelClassName,
  refresh,
  saveText,
  stickyFooter,
  tabs,
  title,
  wrapInPanel,
}: PageLayoutRenderProps): JSX.Element => (
  <div className={cn(containerClassName, stickyFooter && 'pb-32')}>
    <PageLayoutTabs tabs={tabs} />
    <SectionHeader
      title={title}
      className='mb-6'
      description={description}
      eyebrow={eyebrow}
      icon={icon}
      actions={headerActions}
      refresh={refresh}
    />
    {wrapInPanel ? (
      <div className={cn('rounded-lg border border-border bg-card p-4 sm:p-6', panelClassName)}>
        {children}
      </div>
    ) : (
      children
    )}
    {onSave ? (
      <div
        className={cn(
          'mt-6',
          stickyFooter &&
            'fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-background/80 p-4 sm:p-6 backdrop-blur-md'
        )}
      >
        <div className={cn(stickyFooter && 'page-container')}>
          <FormActions
            onSave={() => void onSave()}
            isSaving={isSaving}
            saveText={saveText}
            className={cn(stickyFooter ? 'justify-end' : '')}
          />
        </div>
      </div>
    ) : null}
  </div>
);

export function PageLayout({
  title,
  description,
  eyebrow,
  icon,
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
  containerClassName = 'page-section',
}: PageLayoutProps): JSX.Element {
  return renderPageLayout({
    children,
    containerClassName,
    description,
    eyebrow,
    headerActions,
    icon,
    isSaving,
    onSave,
    panelClassName,
    refresh,
    saveText,
    stickyFooter,
    tabs,
    title,
    wrapInPanel,
  });
}
