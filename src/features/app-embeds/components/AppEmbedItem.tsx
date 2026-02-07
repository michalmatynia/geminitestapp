'use client';

import Link from 'next/link';
import React from 'react';

import { useAppEmbeds } from '@/features/app-embeds/providers/AppEmbedsProvider';
import { Checkbox } from '@/shared/ui';

import { type APP_EMBED_OPTIONS } from '../lib/constants';

interface AppEmbedItemProps {
  option: typeof APP_EMBED_OPTIONS[number];
}

export function AppEmbedItem({ option }: AppEmbedItemProps): React.ReactNode {
  const { enabled, toggleOption } = useAppEmbeds();
  const isEnabled = enabled.has(option.id);

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border/50 bg-card/40 px-4 py-3"
    >
      <div className="min-w-[220px]">
        <div className="text-base font-semibold text-white">{option.label}</div>
        <div className="text-xs text-gray-400">{option.description}</div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-gray-300">
          <Checkbox
            checked={isEnabled}
            onCheckedChange={(checked: boolean | 'indeterminate') => toggleOption(option.id, checked === true)}
          />
          Enable
        </label>
        <Link
          href={option.settingsRoute}
          className="text-xs text-blue-300 hover:text-blue-200"
        >
          Open settings
        </Link>
      </div>
    </div>
  );
}
