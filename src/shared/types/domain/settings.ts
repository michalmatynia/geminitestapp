import type { AdminSettingsDto, UpdateAdminSettingsDto } from '../../contracts/admin';
import type { ChatbotSettingsRecordDto } from '../../contracts/chatbot';
import type { SettingRecordDto } from '../../contracts/settings';

export type { AdminSettingsDto, UpdateAdminSettingsDto, SettingRecordDto, ChatbotSettingsRecordDto };

export type SystemSetting = SettingRecordDto;

export type ChatbotSettingsRecord = ChatbotSettingsRecordDto;
