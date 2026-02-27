'use client';

import { SaveIcon } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { Button, useToast, SectionHeader, FormSection, Badge, LoadingState } from '@/shared/ui';
import { cn } from '@/shared/utils';


type FrontAppOption = 'products' | 'chatbot' | 'notes';

const FRONT_PAGE_SETTING_KEY = 'front_page_app';

export function AdminFrontManagePage(): React.ReactNode {
  const settingsQuery = useSettingsMap();

  if (settingsQuery.isPending || !settingsQuery.data) {
    return (
      <div className='container mx-auto py-10'>
        <LoadingState message='Loading front page settings...' />
      </div>
    );
  }

  const current = settingsQuery.data.get(FRONT_PAGE_SETTING_KEY);
  const initialSelected: FrontAppOption =
    current === 'products' || current === 'chatbot' || current === 'notes'
      ? current
      : 'products';

  return <AdminFrontManageContent initialSelected={initialSelected} />;
}

function AdminFrontManageContent({
  initialSelected,
}: {
  initialSelected: FrontAppOption;
}): React.ReactNode {
  const { toast } = useToast();
  const [selected, setSelected] = useState<FrontAppOption>(initialSelected);
  const updateSetting = useUpdateSetting();

  const options = useMemo(
    () => [
      {
        id: 'products' as const,
        title: 'Products',
        description: 'Show the public product listing when visitors open the site.',
        route: '/',
      },
      {
        id: 'chatbot' as const,
        title: 'Chatbot',
        description: 'Open the admin chatbot workspace on the home page.',
        route: '/admin/chatbot',
      },
      {
        id: 'notes' as const,
        title: 'Notes',
        description: 'Open the admin notes workspace on the home page.',
        route: '/admin/notes',
      },
    ],
    []
  );

  const handleSave = async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: FRONT_PAGE_SETTING_KEY,
        value: selected,
      });
      toast('Front page updated', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AdminFrontManagePage', action: 'saveSettings' } });
      toast('Failed to save front page setting', { variant: 'error' });
    }
  };

  return (
    <div className='container mx-auto max-w-4xl py-10'>
      <SectionHeader
        title='Front Manage'
        description='Pick which app should open when users land on the home page.'
        eyebrow={(
          <Link href='/admin' className='text-blue-300 hover:text-blue-200'>
            ← Back to dashboard
          </Link>
        )}
        className='mb-6'
      />

      <FormSection
        title='Front Page Destination'
        description='Choose one application to serve as the entry point for your site.'
        className='p-6'
      >
        <div className='space-y-4'>
          <div className='grid gap-3'>
            {options.map((option: { id: FrontAppOption; title: string; description: string; route: string }) => (
              <Button
                key={option.id}
                type='button'
                onClick={() => setSelected(option.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors',
                  selected === option.id
                    ? 'border-blue-500/60 bg-blue-500/10 text-white'
                    : 'border-border bg-card/40 text-gray-200 hover:border'
                )}
              >
                <div>
                  <div className='text-base font-semibold'>{option.title}</div>
                  <div className='text-xs text-gray-400'>{option.description}</div>
                </div>
                <Badge
                  variant={selected === option.id ? 'active' : 'outline'}
                  className={cn(
                    'h-auto px-2 py-0.5 text-[10px] uppercase tracking-wide',
                    selected === option.id
                      ? 'border-blue-500/60 text-blue-200'
                      : 'border-white/10 text-gray-400'
                  )}
                >
                  {option.route}
                </Badge>
              </Button>
            ))}
          </div>

          <div className='flex justify-end pt-4'>
            <Button
              onClick={() => void handleSave()}
              disabled={updateSetting.isPending}
              variant='solid'
              className='min-w-[140px]'
            >
              {updateSetting.isPending ? 'Saving...' : (
                <>
                  <SaveIcon className='mr-2 size-4' />
                  Save Selection
                </>
              )}
            </Button>
          </div>
        </div>
      </FormSection>
    </div>
  );
}
