export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  images?: string[];
  timestamp?: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  settings?: {
    model?: string;
    webSearchEnabled?: boolean;
    useGlobalContext?: boolean;
    useLocalContext?: boolean;
  };
}

export interface CreateSessionInput {
  title: string;
  settings?: ChatSession["settings"];
}

export interface UpdateSessionInput {
  title?: string;
  messages?: ChatMessage[];
  settings?: ChatSession["settings"];
}
