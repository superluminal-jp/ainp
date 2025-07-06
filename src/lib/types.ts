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
