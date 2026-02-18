import type {
  BaseImportRunDetailResponse,
  BaseImportStartResponse,
} from '@/features/integrations/types/base-import-runs';
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
} from '@/shared/contracts/data-import-export';
import type {
  ImageBase64Mode, 
  ImageTransformOptions, 
  ImageRetryPreset,
  BaseInventory,
  ImportExportTemplate as DomainImportExportTemplate,
  ImportExportTemplateMapping as DomainImportExportTemplateMapping,
  ImportTemplateParameterImport as DomainImportExportTemplateParameterImport,
} from '@/shared/types/domain/integrations';

export type {
  ImageBase64Mode,
  ImageTransformOptions,
  ImageRetryPreset,
  BaseInventory,
};

export type InventoryOption = InventoryOptionDto;

export type WarehouseOption = WarehouseOptionDto;

export type CatalogOption = CatalogOptionDto;

export type ImportListItem = ImportListItemDto;

export type ImportResponse = BaseImportStartResponse;

export type ImportRunDetail = BaseImportRunDetailResponse;

export type TemplateMapping = DomainImportExportTemplateMapping;

export type Template = DomainImportExportTemplate;

export type ImportTemplateParameterImport = DomainImportExportTemplateParameterImport;

export type ExportParameterDoc = ExportParameterDocDto;

export type ImportListStats = ImportListStatsDto;

export type WarehouseDebugRaw = WarehouseDebugRawDto;

export type InventoryDebugRaw = InventoryDebugRawDto;

export type DebugWarehouses = DebugWarehousesDto;
