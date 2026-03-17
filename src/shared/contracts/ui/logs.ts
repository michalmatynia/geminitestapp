export type LogListEntryDto = {
  id: string;
  timestamp: string | number | Date;
  level: string;
  message: string;
  context?: Record<string, unknown> | null | undefined;
  source?: string | undefined;
};
export type LogListEntry = LogListEntryDto;
