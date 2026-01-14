declare module "pdf-parse" {
  export interface PdfParseResult {
    text: string;
    // pdf-parse returns more fields too, but you only use text
    numpages?: number;
    info?: unknown;
    metadata?: unknown;
    version?: string;
  }

  export default function pdfParse(
    data: Buffer | Uint8Array | ArrayBuffer
  ): Promise<PdfParseResult>;
}
