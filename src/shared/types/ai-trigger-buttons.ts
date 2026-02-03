export type AiTriggerButtonLocation =
  | "product_modal"
  | "product_list"
  | "note_modal"
  | "note_list";

export type AiTriggerButtonMode = "click" | "toggle";

export type AiTriggerButtonDisplay = "icon" | "icon_label";

export type AiTriggerButtonRecord = {
  id: string;
  name: string;
  iconId: string | null;
  locations: AiTriggerButtonLocation[];
  mode: AiTriggerButtonMode;
  display: AiTriggerButtonDisplay;
  createdAt: string;
  updatedAt: string;
};
