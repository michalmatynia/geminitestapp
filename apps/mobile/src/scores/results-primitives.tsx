import {
  type KangurMobileScoreFamily,
} from './mobileScoreSummary';
import {
  KangurMobilePill as Pill,
} from '../shared/KangurMobileUi';
import type { KangurMobileResultsBadgeItem } from './useKangurMobileResultsBadges';

export const getAccuracyTone = (
  accuracyPercent: number,
): {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
} => {
  if (accuracyPercent >= 90) {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#047857',
    };
  }
  if (accuracyPercent >= 70) {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }
  return {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    textColor: '#b91c1c',
  };
};

export const getOperationTone = (
  family: Exclude<KangurMobileScoreFamily, 'all'>,
): {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
} => {
  if (family === 'logic') {
    return {
      backgroundColor: '#eef2ff',
      borderColor: '#c7d2fe',
      textColor: '#4338ca',
    };
  }
  if (family === 'time') {
    return {
      backgroundColor: '#fff7ed',
      borderColor: '#fdba74',
      textColor: '#c2410c',
    };
  }
  return {
    backgroundColor: '#ecfeff',
    borderColor: '#a5f3fc',
    textColor: '#0f766e',
  };
};

export const resolveResultsFilterFamily = (
  value: string | string[] | undefined,
): KangurMobileScoreFamily => {
  const resolved = Array.isArray(value) ? value[0] : value;
  if (
    resolved === 'all' ||
    resolved === 'arithmetic' ||
    resolved === 'logic' ||
    resolved === 'time'
  ) {
    return resolved;
  }

  return 'all';
};

export const resolveResultsFilterOperation = (
  value: string | string[] | undefined,
): string | null => {
  const resolved = Array.isArray(value) ? value[0] : value;
  const trimmed = typeof resolved === 'string' ? resolved.trim() : undefined;
  if (trimmed === undefined || trimmed === '') {
    return null;
  }
  return trimmed;
};

export function ResultsBadgeChip({
  item,
}: {
  item: KangurMobileResultsBadgeItem;
}): React.JSX.Element {
  return (
    <Pill
      label={`${item.emoji} ${item.name}`}
      tone={{
        backgroundColor: '#eef2ff',
        borderColor: '#c7d2fe',
        textColor: '#4338ca',
      }}
    />
  );
}
