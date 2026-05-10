import type { ContextNode } from '@/shared/contracts/ai-context-registry';
import { componentNodesPart1 } from './components.part1';
import { componentNodesPart2 } from './components.part2';
import { componentNodesPart3 } from './components.part3';
import { componentNodesPart4 } from './components.part4';

export const componentNodes: ContextNode[] = [
  ...componentNodesPart1,
  ...componentNodesPart2,
  ...componentNodesPart3,
  ...componentNodesPart4,
];
