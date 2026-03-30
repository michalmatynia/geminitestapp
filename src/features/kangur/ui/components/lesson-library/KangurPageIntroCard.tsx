'use client';

import { useLocale } from 'next-intl';

import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import {
  KangurResolvedPageIntroCard,
  type KangurResolvedPageIntroCardProps,
} from './KangurResolvedPageIntroCard';

export type KangurPageIntroCardProps = Omit<
  KangurResolvedPageIntroCardProps,
  'isCoarsePointer' | 'resolvedBackButtonLabel'
> & {
  backButtonLabel?: string;
};

const getKangurPageIntroFallbackLabel = (
  locale: ReturnType<typeof normalizeSiteLocale>
): string => {
  if (locale === 'uk') {
    return 'Повернутися на попередню сторінку';
  }

  if (locale === 'de') {
    return 'Zur vorherigen Seite zurück';
  }

  if (locale === 'en') {
    return 'Back to the previous page';
  }

  return 'Wróć do poprzedniej strony';
};

function KangurPageIntroCardWithResolvedBackButton(
  props: KangurPageIntroCardProps
): React.JSX.Element {
  const locale = normalizeSiteLocale(useLocale());
  const isCoarsePointer = useKangurCoarsePointer();
  const resolvedBackButtonLabel =
    props.backButtonLabel ?? getKangurPageIntroFallbackLabel(locale);

  return (
    <KangurResolvedPageIntroCard
      {...props}
      isCoarsePointer={Boolean(isCoarsePointer)}
      resolvedBackButtonLabel={resolvedBackButtonLabel}
    />
  );
}

export function KangurPageIntroCard(props: KangurPageIntroCardProps): React.JSX.Element {
  if (props.showBackButton === false || props.backButtonContent) {
    return <KangurResolvedPageIntroCard {...props} />;
  }

  return <KangurPageIntroCardWithResolvedBackButton {...props} />;
}
