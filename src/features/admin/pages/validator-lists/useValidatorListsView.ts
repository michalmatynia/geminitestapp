'use client';

import { useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import { type ValidatorListsView } from './types';
import { toValidatorListsView } from './utils';

export function useValidatorListsView(): {
  activeView: ValidatorListsView;
  handleSelectView: (view: ValidatorListsView) => void;
} {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView = toValidatorListsView(searchParams.get('view'));

  const handleSelectView = useCallback(
    (view: ValidatorListsView): void => {
      const nextParams = new URLSearchParams(searchParams.toString());
      if (view === 'lists') {
        nextParams.delete('view');
      } else {
        nextParams.set('view', view);
      }
      const nextQuery = nextParams.toString();
      const nextUrl = nextQuery !== '' ? `${pathname}?${nextQuery}` : pathname;
      router.push(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return {
    activeView,
    handleSelectView,
  };
}
