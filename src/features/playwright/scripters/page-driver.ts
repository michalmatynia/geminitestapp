export type GotoOptions = {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
};

export type WaitForOptions = {
  selector?: string;
  timeoutMs?: number;
  state?: 'attached' | 'visible' | 'hidden' | 'networkidle';
};

export type ExtractFieldSpec = {
  selector?: string;
  attribute?: string;
  text?: boolean;
  html?: boolean;
  many?: boolean;
};

export type ExtractedFieldValue = string | string[] | null;

export type PageDriver = {
  goto(url: string, options?: GotoOptions): Promise<void>;
  currentUrl(): Promise<string>;
  waitFor(options: WaitForOptions): Promise<void>;
  tryClick(selectors: string[]): Promise<string | null>;
  extractJsonLd(): Promise<unknown[]>;
  extractList(
    itemSelector: string,
    fields: Record<string, ExtractFieldSpec>
  ): Promise<Array<Record<string, ExtractedFieldValue>>>;
  scrollToBottom(): Promise<void>;
};
