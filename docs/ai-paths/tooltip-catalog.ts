import { AI_PATHS_TOOLTIP_CATALOG_CHUNK_01 } from './tooltip-catalog.chunk-01';
import { AI_PATHS_TOOLTIP_CATALOG_CHUNK_02 } from './tooltip-catalog.chunk-02';
import { AI_PATHS_TOOLTIP_CATALOG_CHUNK_03 } from './tooltip-catalog.chunk-03';
import { AI_PATHS_TOOLTIP_CATALOG_CHUNK_04 } from './tooltip-catalog.chunk-04';
import { AI_PATHS_TOOLTIP_CATALOG_CHUNK_05 } from './tooltip-catalog.chunk-05';
import { AI_PATHS_TOOLTIP_CATALOG_CHUNK_06 } from './tooltip-catalog.chunk-06';
import { AI_PATHS_TOOLTIP_CATALOG_CHUNK_07 } from './tooltip-catalog.chunk-07';
import { AI_PATHS_TOOLTIP_CATALOG_CHUNK_08 } from './tooltip-catalog.chunk-08';
import { AI_PATHS_TOOLTIP_CATALOG_CHUNK_09 } from './tooltip-catalog.chunk-09';
import { AI_PATHS_TOOLTIP_CATALOG_CHUNK_10 } from './tooltip-catalog.chunk-10';
import { AI_PATHS_TOOLTIP_CATALOG_CHUNK_11 } from './tooltip-catalog.chunk-11';
import { AI_PATHS_TOOLTIP_CATALOG_CHUNK_12 } from './tooltip-catalog.chunk-12';
import { AI_PATHS_TOOLTIP_CATALOG_CHUNK_13 } from './tooltip-catalog.chunk-13';
import { AI_PATHS_TOOLTIP_CATALOG_CHUNK_14 } from './tooltip-catalog.chunk-14';

export type AiPathsTooltipDocEntry = {
  id: string;
  title: string;
  summary: string;
  section: string;
  aliases: string[];
  docPath: string;
  tags?: string[];
  uiTargets?: string[];
};

export const AI_PATHS_TOOLTIP_CATALOG: AiPathsTooltipDocEntry[] = [
  ...AI_PATHS_TOOLTIP_CATALOG_CHUNK_01,
  ...AI_PATHS_TOOLTIP_CATALOG_CHUNK_02,
  ...AI_PATHS_TOOLTIP_CATALOG_CHUNK_03,
  ...AI_PATHS_TOOLTIP_CATALOG_CHUNK_04,
  ...AI_PATHS_TOOLTIP_CATALOG_CHUNK_05,
  ...AI_PATHS_TOOLTIP_CATALOG_CHUNK_06,
  ...AI_PATHS_TOOLTIP_CATALOG_CHUNK_07,
  ...AI_PATHS_TOOLTIP_CATALOG_CHUNK_08,
  ...AI_PATHS_TOOLTIP_CATALOG_CHUNK_09,
  ...AI_PATHS_TOOLTIP_CATALOG_CHUNK_10,
  ...AI_PATHS_TOOLTIP_CATALOG_CHUNK_11,
  ...AI_PATHS_TOOLTIP_CATALOG_CHUNK_12,
  ...AI_PATHS_TOOLTIP_CATALOG_CHUNK_13,
  ...AI_PATHS_TOOLTIP_CATALOG_CHUNK_14,
];
