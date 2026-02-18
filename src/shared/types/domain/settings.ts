import type { AdminSettingsDto, UpdateAdminSettingsDto } from '@/shared/contracts/admin';
import type { ChatbotSettingsRecordDto } from '@/shared/contracts/chatbot';
import type { SettingRecordDto } from '@/shared/contracts/settings';

export type { AdminSettingsDto, UpdateAdminSettingsDto, SettingRecordDto, ChatbotSettingsRecordDto };

export type SystemSetting = SettingRecordDto;

export type ChatbotSettingsRecord = ChatbotSettingsRecordDto;
