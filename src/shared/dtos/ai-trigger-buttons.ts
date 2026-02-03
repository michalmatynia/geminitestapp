import { NamedDto } from '../types/base';

/**
 * Trigger button locations in the UI
 */
export type AiTriggerButtonLocation =
  | "product_modal"
  | "product_list"
  | "note_modal"
  | "note_list";

/**
 * Trigger button activation mode
 */
export type AiTriggerButtonMode = "click" | "toggle";

/**
 * Trigger button display style
 */
export type AiTriggerButtonDisplay = "icon" | "icon_label";

/**
 * DTO for AI Trigger Button record
 */
export interface AiTriggerButtonDto extends NamedDto {
  iconId: string | null;
  locations: AiTriggerButtonLocation[];
  mode: AiTriggerButtonMode;
  display: AiTriggerButtonDisplay;
}

/**
 * DTO for creating a new AI Trigger Button
 */
export interface CreateAiTriggerButtonDto {
  name: string;
  iconId?: string | null;
  locations: AiTriggerButtonLocation[];
  mode?: AiTriggerButtonMode;
  display?: AiTriggerButtonDisplay;
}

/**
 * DTO for updating an existing AI Trigger Button
 */
export interface UpdateAiTriggerButtonDto {
  name?: string;
  iconId?: string | null;
  locations?: AiTriggerButtonLocation[];
  mode?: AiTriggerButtonMode;
  display?: AiTriggerButtonDisplay;
}
