'use client';

import { useRouter } from 'nextjs-toploader/app';
import React, { startTransition, useCallback, useDeferredValue, useMemo, useState } from 'react';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import {
  getFilemakerListCounts,
  useFilemakerListData,
} from './AdminFilemakerListPage.data';
import { useFilemakerListColumns } from './AdminFilemakerListPage.columns';
import { FilemakerListHeader, FilemakerListTabs } from './AdminFilemakerListPage.parts';
import { FILEMAKER_DATABASE_KEY, parseFilemakerDatabase } from '../settings';

export function AdminFilemakerListPage(): React.JSX.Element {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());
  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const { persons, organizations, events } = useFilemakerListData(database, deferredQuery);
  const counts = getFilemakerListCounts(database, { persons, organizations, events });
  const navigate = useCallback(
    (href: string): void => {
      startTransition(() => {
        router.push(href);
      });
    },
    [router]
  );
  const columns = useFilemakerListColumns(navigate);

  return (
    <div className='page-section-compact space-y-6'>
      <FilemakerListHeader onNavigate={navigate} />
      <FilemakerListTabs
        columns={columns}
        counts={counts}
        events={events}
        isLoading={settingsStore.isLoading}
        organizations={organizations}
        persons={persons}
        query={query}
        onQueryChange={setQuery}
      />
    </div>
  );
}
