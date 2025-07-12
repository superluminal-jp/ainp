export interface Message {
  id: string;
  timestamp: Date;
  role: "user" | "assistant";
  text: string;
  files?: File[];
}

export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  isActive: boolean;
}

export interface Database {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  databases: string[];
  tools?: string[];
}

// AI Suggestion Types
export interface ToolSuggestion {
  name?: string;
  description?: string;
  executionCode?: string;
  requirements?: string;
  inputSchema?: {
    type: string;
    properties: Record<string, {
      type: string;
      description: string;
      items?: { type: string };
    }>;
    required: string[];
  };
}

export interface PromptSuggestion {
  name?: string;
  content?: string;
}

export interface JSONParseResult {
  [key: string]: unknown;
}

export interface SchemaPropertyInput {
  type: string;
  description: string;
  items?: { type: string };
}
