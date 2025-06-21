// Shared types and interfaces for the AINP application

export interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

export interface CustomPrompt {
  id: string;
  name: string;
  content: string;
  isActive: boolean;
}

export interface CustomDatabase {
  id: string;
  name: string;
  description: string;
  type?: "docs" | "code" | "wiki" | "papers" | "custom";
  connectionString?: string;
  isActive: boolean;
  vectorDimensions?: number;
  indexType?: "flat" | "hnsw" | "ivf";
  uploadedFiles?: UploadedFile[];
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
  uploadDate: Date;
}

export interface CustomTool {
  id: string;
  name: string;
  description: string;
  category: "web" | "code" | "file" | "calc" | "custom";
  endpoint?: string;
  parameters?: ToolParameter[];
  isActive: boolean;
  createdAt: Date;
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
  category?: string;
  systemPrompt?: string;
  databases?: string[];
  tools?: string[];
  features?: string[];
  previewHref?: string;
  href?: string;
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

export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

// System prompt options
export type SystemPromptType =
  | "default"
  | "helpful"
  | "creative"
  | "technical"
  | "casual"
  | "professional";

// Database options
export type DatabaseType =
  | "none"
  | "docs"
  | "code"
  | "wiki"
  | "papers"
  | "custom";

// Tool options
export type ToolType = "none" | "basic" | "web" | "code" | "file" | "mcp";

// Tool categories
export type ToolCategory = "web" | "code" | "file" | "calc" | "custom";
