'use client';

import { SaveIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  FRONT_PAGE_OPTIONS,
  normalizeFrontPageApp,
  type FrontPageOption,
  type FrontPageSelectableApp,
} from '@/shared/lib/front-page-app';
import {
  Button,
  useToast,
  SectionHeader,
  SectionHeaderBackLink,
  FormSection,
  Badge,
  LoadingState,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type FrontAppOption = FrontPageSelectableApp;

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
  const initialSelected: FrontAppOption = normalizeFrontPageApp(current) ?? 'cms';

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

  const handleSave = async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: FRONT_PAGE_SETTING_KEY,
        value: selected,
      });
      toast('Front page updated', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: { source: 'AdminFrontManagePage', action: 'saveSettings' },
      });
      toast('Failed to save front page setting', { variant: 'error' });
    }
  };

  return (
    <div className='container mx-auto max-w-4xl py-10'>
      <SectionHeader
        title='Front Manage'
        description='Pick which app should own the public home route.'
        eyebrow={
          <SectionHeaderBackLink href='/admin' arrow>
            Back to dashboard
          </SectionHeaderBackLink>
        }
        className='mb-6'
      />

      <FormSection
        title='Front Page Destination'
        description='Choose whether HOME stays CMS-controlled, mounts StudiQ, or redirects into an admin workspace.'
        className='p-6'
      >
        <div className='space-y-4'>
          <div className='grid gap-3'>
            {FRONT_PAGE_OPTIONS.map(
              (option: FrontPageOption) => (
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
              )
            )}
          </div>

          {selected === 'cms' ? (
            <div className='rounded-xl border border-border/40 bg-card/20 px-4 py-3 text-sm text-gray-300'>
              <div className='font-medium text-white'>StudiQ on HOME</div>
              <div className='mt-1 text-gray-400'>
                Select <span className='font-medium text-white'>StudiQ</span> above for the full app
                as HOME. Keep CMS Home only when you want StudiQ embedded inside the default HOME
                page template zone with CMS content around it.
              </div>
              <div className='mt-3 flex flex-wrap gap-3 text-xs'>
                <Link href='/admin/cms/pages' className='text-blue-300 hover:text-blue-200'>
                  Open CMS pages
                </Link>
                <Link href='/admin/app-embeds' className='text-blue-300 hover:text-blue-200'>
                  Open App Embeds
                </Link>
              </div>
            </div>
          ) : null}

          <div className='flex justify-end pt-4'>
            <Button
              onClick={() => void handleSave()}
              disabled={updateSetting.isPending}
              variant='solid'
              className='min-w-[140px]'
            >
              {updateSetting.isPending ? (
                'Saving...'
              ) : (
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
