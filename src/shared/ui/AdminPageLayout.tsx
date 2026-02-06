import { SectionHeader } from './section-header';
import { Tabs, TabsList, TabsTrigger } from './tabs';

import type { ReactNode } from 'react';

interface AdminPageLayoutProps {
  title: string;
  description?: string;
  eyebrow?: ReactNode; // Optional eyebrow content
  mainActions?: ReactNode; // Actions for the main SectionHeader
  children: ReactNode; // Main content of the page (e.g., SectionPanels, forms, tables)
  // Optional tabs configuration
  tabs?: {
    activeTab: string;
    onTabChange: (value: string) => void;
    tabsList: { value: string; label: string }[];
  };
}

export function AdminPageLayout({
  title,
  description,
  eyebrow,
  mainActions,
  children,
  tabs,
}: AdminPageLayoutProps): React.JSX.Element {
  return (
    <div className="container mx-auto py-10">
      {tabs && (
        <Tabs
          value={tabs.activeTab}
          onValueChange={tabs.onTabChange}
          className="mb-6"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
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
        className="mb-6"
        {...(description ? { description } : {})}
        {...(eyebrow ? { eyebrow } : {})}
        {...(mainActions ? { actions: mainActions } : {})}
      />

      {children}
    </div>
  );
}
