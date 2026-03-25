import { useMemo } from 'react';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  getKangurMobileLessonCheckpoints,
  type KangurMobileLessonCheckpointItem as KangurMobileHomeLessonCheckpointItem,
} from '../lessons/useKangurMobileLessonCheckpoints';
import { useKangurMobileHomeProgressSnapshot } from './KangurMobileHomeProgressSnapshotContext';

type UseKangurMobileHomeLessonCheckpointsOptions = {
  limit?: number;
};

type UseKangurMobileHomeLessonCheckpointsResult = {
  recentCheckpoints: KangurMobileHomeLessonCheckpointItem[];
};

export const useKangurMobileHomeLessonCheckpoints = (
  options: UseKangurMobileHomeLessonCheckpointsOptions = {},
): UseKangurMobileHomeLessonCheckpointsResult => {
  const { locale } = useKangurMobileI18n();
  const progress = useKangurMobileHomeProgressSnapshot();

  return useMemo(
    () => getKangurMobileLessonCheckpoints(progress, locale, options),
    [locale, options.limit, progress],
  );
};

export type { KangurMobileHomeLessonCheckpointItem };
