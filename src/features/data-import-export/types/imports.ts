import type {
  InventoryOptionDto,
  WarehouseOptionDto,
  CatalogOptionDto,
  ImportListItemDto,
  ImportListStatsDto,
  ExportParameterDocDto,
  WarehouseDebugRawDto,
  InventoryDebugRawDto,
  DebugWarehousesDto,
  ImportExportTemplateDto,
  ImportExportTemplateMappingDto,
  ImportTemplateParameterImportDto,
} from '@/shared/contracts/data-import-export';
import type {
  BaseImportRunDetailResponseDto,
  BaseImportStartResponseDto,
  ImageBase64ModeDto,
  ImageTransformOptionsDto,
  ImageRetryPresetDto,
  BaseInventoryDto,
} from '@/shared/contracts/integrations';

export type ImageBase64Mode = ImageBase64ModeDto;
export type ImageTransformOptions = ImageTransformOptionsDto;
export type ImageRetryPreset = ImageRetryPresetDto;
export type BaseInventory = BaseInventoryDto;

export type InventoryOption = InventoryOptionDto;

export type WarehouseOption = WarehouseOptionDto;

export type CatalogOption = CatalogOptionDto;

export type ImportListItem = ImportListItemDto;

export type ImportResponse = BaseImportStartResponseDto;

export type ImportRunDetail = BaseImportRunDetailResponseDto;

export type TemplateMapping = ImportExportTemplateMappingDto;

export type Template = ImportExportTemplateDto;

export type ImportTemplateParameterImport = ImportTemplateParameterImportDto;

export type ExportParameterDoc = ExportParameterDocDto;

export type ImportListStats = ImportListStatsDto;

export type WarehouseDebugRaw = WarehouseDebugRawDto;

export type InventoryDebugRaw = InventoryDebugRawDto;

export type DebugWarehouses = DebugWarehousesDto;
