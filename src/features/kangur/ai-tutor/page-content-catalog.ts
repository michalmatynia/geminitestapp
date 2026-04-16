import { type KangurPageContentStore } from '@/features/kangur/shared/contracts/kangur-page-content';
import { buildDefaultKangurPageContentStore } from './segments/builders';

export * from './segments/lesson-details';
export * from './segments/question-fragments';
export * from './segments/builders';

export const DEFAULT_KANGUR_PAGE_CONTENT_STORE: Readonly<KangurPageContentStore> = Object.freeze(
  buildDefaultKangurPageContentStore('pl')
);
