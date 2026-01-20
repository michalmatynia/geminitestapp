export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  images?: string[] | undefined;
  timestamp?: Date | undefined;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  settings?: {
    model?: string | undefined;
    webSearchEnabled?: boolean | undefined;
    useGlobalContext?: boolean | undefined;
    useLocalContext?: boolean | undefined;
  } | undefined;
}

export interface CreateSessionInput {
  title: string;
  settings?: ChatSession["settings"] | undefined;
}

export interface UpdateSessionInput {
  title?: string | undefined;
  messages?: ChatMessage[] | undefined;
  settings?: ChatSession["settings"] | undefined;
}
