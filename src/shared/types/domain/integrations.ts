export type IntegrationConnectionBasic = {
  id: string;
  name: string;
  integrationId: string;
};

export type IntegrationWithConnections = {
  id: string;
  name: string;
  slug: string;
  connections: IntegrationConnectionBasic[];
};

export type IntegrationWithConnectionsBasic = IntegrationWithConnections;

export type ImageBase64Mode = "base-only" | "full-data-uri";

export type ImageTransformOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp";
  forceJpeg?: boolean;
  maxDimension?: number;
  jpegQuality?: number;
};

export type ImageRetryPreset = {
  id: string;
  label: string;
  description: string;
  imageBase64Mode: ImageBase64Mode;
  transform: ImageTransformOptions;
};
