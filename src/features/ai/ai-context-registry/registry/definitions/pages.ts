import type { ContextNode } from '@/shared/contracts/ai-context-registry';
import { pageNodesPart1 } from './pages.part1';
import { pageNodesPart2 } from './pages.part2';
import { pageNodesPart3 } from './pages.part3';

export const pageNodes: ContextNode[] = [
  ...pageNodesPart1,
  ...pageNodesPart2,
  ...pageNodesPart3,
];
