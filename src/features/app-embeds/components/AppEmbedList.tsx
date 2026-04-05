'use client';

import Link from 'next/link';
import React, { useMemo } from 'react';

import { useAppEmbeds } from '@/features/app-embeds/providers/AppEmbedsProvider';
import { SimpleSettingsList } from '@/shared/ui/templates.public';
import { ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { UI_CENTER_ROW_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import { APP_EMBED_OPTIONS } from '../lib/constants';

export function AppEmbedList(): React.ReactNode {
  const { enabled, toggleOption } = useAppEmbeds();
  const options = useMemo(() => APP_EMBED_OPTIONS, []);

  return (
    <SimpleSettingsList
      items={options.map((option) => ({
        id: option.id,
        title: option.label,
        description: option.description,
        original: option,
      }))}
      renderActions={(item) => {
        const isEnabled = enabled.has(item.id);
        return (
          <div className={UI_CENTER_ROW_RELAXED_CLASSNAME}>
            <ToggleRow
              label='Enabled'
              checked={isEnabled}
              onCheckedChange={(checked: boolean) => toggleOption(item.id, checked)}
              className='border-none bg-transparent hover:bg-transparent p-0'
            />
            <Link
              href={item.original.settingsRoute}
              className='text-xs text-blue-300 hover:text-blue-200'
            >
              Open settings
            </Link>
          </div>
        );
      }}
    />
  );
}
