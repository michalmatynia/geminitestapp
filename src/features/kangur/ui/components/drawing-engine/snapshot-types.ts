export type KangurDrawingSnapshotDto<TStroke> = {
  logicalHeight: number;
  logicalWidth: number;
  strokes: TStroke[];
  version: 1;
};

export type KangurDrawingSnapshotInputDto<TStroke> = Omit<
  KangurDrawingSnapshotDto<TStroke>,
  'version'
>;
