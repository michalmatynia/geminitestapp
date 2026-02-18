import Link from 'next/link';
import React, { useMemo } from 'react';

import { useAppEmbeds } from '@/features/app-embeds/providers/AppEmbedsProvider';
import { SimpleSettingsList, Checkbox } from '@/shared/ui';

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
          <div className='flex items-center gap-4'>
            <label className='flex items-center gap-2 text-xs text-gray-300 cursor-pointer'>
              <Checkbox
                checked={isEnabled}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  toggleOption(item.id, checked === true)
                }
              />
              Enable
            </label>
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
