import { normalizeCaseResolverComparable } from '../../utils';

export const normalizeText = (text: string): string => normalizeCaseResolverComparable(text) || '';
