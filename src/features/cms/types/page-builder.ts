import type {
  CmsBlockInstanceDto,
  CmsSectionInstanceDto,
  PageZoneDto,
  ClipboardDataDto,
  PageBuilderSnapshotDto,
} from '@/shared/contracts/cms';

export type BlockInstance = CmsBlockInstanceDto;
export type SectionInstance = CmsSectionInstanceDto;
export type PageZone = PageZoneDto;
export type ClipboardData = ClipboardDataDto;
export type PageBuilderSnapshot = PageBuilderSnapshotDto;

export { DEFAULT_INSPECTOR_SETTINGS } from '@/shared/contracts/cms';
