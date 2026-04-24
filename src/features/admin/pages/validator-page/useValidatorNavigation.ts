import { useRouter } from 'nextjs-toploader/app';
import { usePathname, useSearchParams } from 'next/navigation';
import { startTransition } from 'react';
import type { GlobalValidatorView } from './types';

export function useValidatorNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pushValidatorRoute = (queryString: string): void => {
    const nextHref = queryString !== '' ? `${pathname}?${queryString}` : pathname;
    startTransition(() => {
      router.push(nextHref, { scroll: false });
    });
  };

  const getListQueryString = (listId: string): string => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('list', listId);
    return nextParams.toString();
  };

  const getViewQueryString = (view: GlobalValidatorView): string => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (view === 'patterns') {
      nextParams.delete('view');
    } else {
      nextParams.set('view', view);
    }
    return nextParams.toString();
  };

  return {
    handleSelectList: (listId: string) => pushValidatorRoute(getListQueryString(listId)),
    handleSelectView: (view: GlobalValidatorView) => pushValidatorRoute(getViewQueryString(view)),
  };
}
