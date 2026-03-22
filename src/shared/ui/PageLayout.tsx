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

type PageLayoutHeaderProps = {
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
};

type PageLayoutContentProps = {
  children: ReactNode;
  wrapInPanel: boolean;
  panelClassName?: string | undefined;
};

type PageLayoutSaveFooterProps = {
  onSave?: (() => Promise<void> | void) | undefined;
  isSaving: boolean;
  saveText: string;
  stickyFooter: boolean;
};

type PageLayoutRuntimeProps = PageLayoutProps & {
  wrapInPanel: boolean;
  isSaving: boolean;
  saveText: string;
  stickyFooter: boolean;
  containerClassName: string;
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

function PageLayoutHeader({
  title,
  description,
  eyebrow,
  icon,
  headerActions,
  refresh,
}: PageLayoutHeaderProps): JSX.Element {
  return (
    <SectionHeader
      title={title}
      className='mb-6'
      description={description}
      eyebrow={eyebrow}
      icon={icon}
      actions={headerActions}
      refresh={refresh}
    />
  );
}

function PageLayoutContent({
  children,
  panelClassName,
  wrapInPanel,
}: PageLayoutContentProps): JSX.Element {
  if (!wrapInPanel) {
    return <>{children}</>;
  }

  return (
    <div className={cn('rounded-lg border border-border bg-card p-4 sm:p-6', panelClassName)}>
      {children}
    </div>
  );
}

function PageLayoutSaveFooter({
  isSaving,
  onSave,
  saveText,
  stickyFooter,
}: PageLayoutSaveFooterProps): JSX.Element | null {
  if (!onSave) return null;

  return (
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
  );
}

function PageLayoutRuntime({
  title,
  description,
  eyebrow,
  icon,
  headerActions,
  refresh,
  children,
  tabs,
  wrapInPanel,
  panelClassName,
  onSave,
  isSaving,
  saveText,
  stickyFooter,
  containerClassName,
}: PageLayoutRuntimeProps): JSX.Element {
  return (
    <div className={cn(containerClassName, stickyFooter && 'pb-32')}>
      <PageLayoutTabs tabs={tabs} />
      <PageLayoutHeader
        title={title}
        description={description}
        eyebrow={eyebrow}
        icon={icon}
        headerActions={headerActions}
        refresh={refresh}
      />
      <PageLayoutContent
        children={children}
        panelClassName={panelClassName}
        wrapInPanel={wrapInPanel}
      />
      <PageLayoutSaveFooter
        isSaving={isSaving}
        onSave={onSave}
        saveText={saveText}
        stickyFooter={stickyFooter}
      />
    </div>
  );
}

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
  return (
    <PageLayoutRuntime
      title={title}
      description={description}
      eyebrow={eyebrow}
      icon={icon}
      headerActions={headerActions}
      refresh={refresh}
      children={children}
      tabs={tabs}
      wrapInPanel={wrapInPanel}
      panelClassName={panelClassName}
      onSave={onSave}
      isSaving={isSaving}
      saveText={saveText}
      stickyFooter={stickyFooter}
      containerClassName={containerClassName}
    />
  );
}
