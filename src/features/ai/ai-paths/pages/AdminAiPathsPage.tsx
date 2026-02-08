'use client';

import { useEffect, useState } from 'react';

import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import { Tabs, TabsList, TabsTrigger, SectionPanel } from '@/shared/ui';

import { AiPathsSettings } from '../components/AiPathsSettings';



export function AdminAiPathsPage(): React.JSX.Element {
  const { isMenuCollapsed } = useAdminLayout();
  const [activeTab, setActiveTab] = useState<'canvas' | 'paths' | 'docs'>(
    'canvas'
  );
  const [mounted, setMounted] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  useEffect((): void | (() => void) => {
    const id = requestAnimationFrame(() => setMounted(true));
    return (): void => cancelAnimationFrame(id);
  }, []);

  const wrapperClass = isFocusMode
    ? 'h-[calc(100%+2rem)] w-[calc(100%+2rem)] -m-4'
    : isMenuCollapsed
      ? 'w-full py-6'
      : 'container mx-auto py-10';

  return (
    <div className={wrapperClass}>
      <div className={`mb-4 flex items-center justify-between gap-4 ${isFocusMode ? 'hidden' : ''}`}>
        {mounted ? (
          <Tabs
            value={activeTab}
            onValueChange={(value: string) =>
              setActiveTab(value as 'canvas' | 'paths' | 'docs')
            }
          >
            <TabsList className='bg-card/70'>
              <TabsTrigger value='canvas'>Canvas</TabsTrigger>
              <TabsTrigger value='paths'>Paths</TabsTrigger>
              <TabsTrigger value='docs'>Docs</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : (
          <div className='h-9 w-[180px]' />
        )}
        <div id='ai-paths-name' className='text-sm text-gray-300' />
      </div>
      <SectionPanel className={isFocusMode ? 'h-full p-0 border-0 rounded-none' : 'p-6'}>
        <div className={`mb-4 flex items-center ${isFocusMode ? 'hidden' : ''}`}>
          <div id='ai-paths-actions' className='flex w-full items-center' />
        </div>
        <AiPathsSettings
          activeTab={activeTab}
          renderActions={(actions: React.ReactNode) => (
            <div className='w-full'>{actions}</div>
          )}
          onTabChange={setActiveTab}
          isFocusMode={isFocusMode}
          onFocusModeChange={setIsFocusMode}
        />
      </SectionPanel>
    </div>
  );
}
