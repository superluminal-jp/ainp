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

export interface Tool {
  id: string;
  name: string;
  description: string;
  parameters: ToolParameter[];
  pythonCodeKey: string;
  isActive: boolean;
  createdAt: Date;
  owner?: string;
}

export interface ToolParameter {
  id: string;
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required: boolean;
  defaultValue?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  databases: string[];
  tools: string[];
}

export interface GeneratedPage {
  id: string;
  name: string;
  path: string;
  template: string;
  customCode: string;
  createdAt: Date;
  description: string;
}
