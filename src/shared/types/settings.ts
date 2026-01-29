export type SystemSetting = {
  key: string;
  value: string;
};

export type ChatbotSettingsRecord = {
  id: string;
  key: string;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};
