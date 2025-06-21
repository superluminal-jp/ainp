"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import {
  Send,
  Paperclip,
  X,
  Settings,
  Database,
  Wrench,
  ChevronDown,
  Save,
  Zap,
  FileText,
  Layout,
} from "lucide-react";
import Link from "next/link";

interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

interface CustomPrompt {
  id: string;
  name: string;
  content: string;
  isActive: boolean;
}

interface CustomDatabase {
  id: string;
  name: string;
  description: string;
  type: "docs" | "code" | "wiki" | "papers" | "custom";
  connectionString: string;
  isActive: boolean;
  vectorDimensions: number;
  indexType: "flat" | "hnsw" | "ivf";
}

interface CustomTool {
  id: string;
  name: string;
  description: string;
  category: "web" | "code" | "file" | "calc" | "custom";
  endpoint?: string;
  isActive: boolean;
}

interface Template {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  databases: string[];
  tools: string[];
}

const systemPrompts = {
  default: "I'm your AI assistant. How can I help you today?",
  helpful:
    "I'm a helpful assistant focused on providing clear, practical solutions.",
  creative:
    "I'm a creative assistant here to help with brainstorming and innovative ideas.",
  technical:
    "I'm a technical assistant specialized in programming and technical problems.",
  casual: "Hey! I'm your friendly AI buddy here to chat and help out.",
  professional:
    "I'm a professional assistant providing formal, business-oriented support.",
};

const databases = {
  none: { name: "None", description: "No RAG database" },
  docs: { name: "Docs", description: "Documentation database" },
  code: { name: "Code", description: "Codebase knowledge" },
  wiki: { name: "Wiki", description: "Wikipedia articles" },
  papers: { name: "Papers", description: "Research papers" },
  custom: { name: "Custom", description: "Custom knowledge base" },
};

const tools = {
  none: { name: "None", description: "No tools available" },
  basic: { name: "Basic", description: "Basic tools (calc, search)" },
  web: { name: "Web", description: "Web browsing tools" },
  code: { name: "Code", description: "Code execution tools" },
  file: { name: "File", description: "File system tools" },
  mcp: { name: "MCP", description: "Model Context Protocol" },
};

const templates: Template[] = [
  {
    id: "research",
    name: "Research Assistant",
    description: "For research and analysis tasks",
    systemPrompt: "helpful",
    databases: ["wiki", "papers"],
    tools: ["web", "basic"],
  },
  {
    id: "developer",
    name: "Code Helper",
    description: "For programming and development",
    systemPrompt: "technical",
    databases: ["code", "docs"],
    tools: ["code", "file"],
  },
  {
    id: "creative",
    name: "Creative Writer",
    description: "For creative writing and brainstorming",
    systemPrompt: "creative",
    databases: [],
    tools: ["basic"],
  },
  {
    id: "business",
    name: "Business Pro",
    description: "For professional and business tasks",
    systemPrompt: "professional",
    databases: ["docs"],
    tools: ["web", "basic", "file"],
  },
  {
    id: "student",
    name: "Study Buddy",
    description: "For learning and education",
    systemPrompt: "helpful",
    databases: ["wiki", "docs"],
    tools: ["basic"],
  },
  {
    id: "casual",
    name: "Chat Friend",
    description: "For casual conversation",
    systemPrompt: "casual",
    databases: [],
    tools: [],
  },
];

export default function Home() {
  const [isDark, setIsDark] = useState(true);
  const [systemPrompt, setSystemPrompt] =
    useState<keyof typeof systemPrompts>("default");
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [customDatabases, setCustomDatabases] = useState<CustomDatabase[]>([]);
  const [customTools, setCustomTools] = useState<CustomTool[]>([]);
  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);
  const [showTemplateCreator, setShowTemplateCreator] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    systemPrompt: "default",
    databases: [] as string[],
    tools: [] as string[],
  });
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: systemPrompts.default,
      sender: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const darkClass = document.documentElement.classList.contains("dark");
    setIsDark(darkClass);

    // Load custom prompts from localStorage
    const saved = localStorage.getItem("customPrompts");
    if (saved) {
      setCustomPrompts(JSON.parse(saved));
    }

    // Load custom databases from localStorage
    const savedDatabases = localStorage.getItem("customDatabases");
    if (savedDatabases) {
      setCustomDatabases(JSON.parse(savedDatabases));
    }

    // Load custom tools from localStorage
    const savedTools = localStorage.getItem("customTools");
    if (savedTools) {
      setCustomTools(JSON.parse(savedTools));
    }

    // Load custom templates from localStorage
    const savedTemplates = localStorage.getItem("customTemplates");
    if (savedTemplates) {
      setCustomTemplates(JSON.parse(savedTemplates));
    }
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const toggleTheme = (checked: boolean) => {
    setIsDark(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !attachedFile) return;

    let content = inputMessage.trim();
    if (attachedFile) {
      content += content
        ? `\n📎 ${attachedFile.name}`
        : `📎 ${attachedFile.name}`;
    }
    if (selectedDatabases.length > 0) {
      content += `\n🔍 RAG: ${selectedDatabases
        .map((db) => {
          if (db.startsWith("db-")) {
            const dbId = db.replace("db-", "");
            const customDb = customDatabases.find((db) => db.id === dbId);
            return customDb ? customDb.name : "Custom DB";
          } else {
            return databases[db as keyof typeof databases].name;
          }
        })
        .join(", ")}`;
    }
    if (selectedTools.length > 0) {
      content += `\n🛠️ Tools: ${selectedTools
        .map((tool) => {
          if (tool.startsWith("tool-")) {
            const toolId = tool.replace("tool-", "");
            const customTool = customTools.find((tool) => tool.id === toolId);
            return customTool ? customTool.name : "Custom Tool";
          } else {
            return tools[tool as keyof typeof tools].name;
          }
        })
        .join(", ")}`;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage("");
    setAttachedFile(null);
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "That's an interesting question! Let me think about that...",
        "I understand what you're saying. Here's my perspective:",
        "Great point! I'd like to add that...",
        "Thanks for sharing that with me. My thoughts are:",
        "I appreciate your input. Let me respond to that:",
      ];

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: responses[Math.floor(Math.random() * responses.length)],
        sender: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearChat = () => {
    let content: string;
    if (systemPrompt.toString().startsWith("custom-")) {
      const customId = systemPrompt.toString().replace("custom-", "");
      const customPrompt = customPrompts.find((p) => p.id === customId);
      content = customPrompt ? customPrompt.content : systemPrompts.default;
    } else {
      content = systemPrompts[systemPrompt as keyof typeof systemPrompts];
    }

    setMessages([
      {
        id: "1",
        content,
        sender: "assistant",
        timestamp: new Date(),
      },
    ]);
  };

  const handleSystemPromptChange = (value: string) => {
    setSystemPrompt(value as keyof typeof systemPrompts);
    setSelectedTemplate(""); // Clear template when manually changing system prompt

    let content: string;
    if (value.startsWith("custom-")) {
      const customId = value.replace("custom-", "");
      const customPrompt = customPrompts.find((p) => p.id === customId);
      content = customPrompt ? customPrompt.content : systemPrompts.default;
    } else {
      content = systemPrompts[value as keyof typeof systemPrompts];
    }

    setMessages([
      {
        id: "1",
        content,
        sender: "assistant",
        timestamp: new Date(),
      },
    ]);
  };

  const handleDatabaseChange = (value: string) => {
    if (selectedDatabases.includes(value)) {
      setSelectedDatabases(selectedDatabases.filter((db) => db !== value));
    } else {
      setSelectedDatabases([...selectedDatabases, value]);
    }
    setSelectedTemplate(""); // Clear template when manually changing databases
  };

  const handleToolsChange = (value: string) => {
    if (selectedTools.includes(value)) {
      setSelectedTools(selectedTools.filter((tool) => tool !== value));
    } else {
      setSelectedTools([...selectedTools, value]);
    }
    setSelectedTemplate(""); // Clear template when manually changing tools
  };

  const applyTemplate = (templateId: string) => {
    const template =
      templates.find((t) => t.id === templateId) ||
      customTemplates.find((t) => t.id === templateId);
    if (!template) return;

    setSelectedTemplate(templateId);
    setSystemPrompt(template.systemPrompt as keyof typeof systemPrompts);
    setSelectedDatabases(template.databases);
    setSelectedTools(template.tools);

    // Update messages with new system prompt
    let content: string;
    if (template.systemPrompt.startsWith("custom-")) {
      const customId = template.systemPrompt.replace("custom-", "");
      const customPrompt = customPrompts.find((p) => p.id === customId);
      content = customPrompt ? customPrompt.content : systemPrompts.default;
    } else {
      content =
        systemPrompts[template.systemPrompt as keyof typeof systemPrompts];
    }

    setMessages([
      {
        id: "1",
        content,
        sender: "assistant",
        timestamp: new Date(),
      },
    ]);
  };

  const openTemplateCreatorFromCurrent = () => {
    setTemplateForm({
      name: "",
      description: "",
      systemPrompt: systemPrompt,
      databases: [...selectedDatabases],
      tools: [...selectedTools],
    });
    setShowTemplateCreator(true);
  };

  const handleTemplateFormChange = (field: string, value: string) => {
    setTemplateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTemplateFormArrayToggle = (
    field: "databases" | "tools",
    value: string
  ) => {
    setTemplateForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value],
    }));
  };

  const saveTemplate = () => {
    if (!templateForm.name.trim()) return;

    const newTemplate: Template = {
      id: Date.now().toString(),
      name: templateForm.name.trim(),
      description: templateForm.description.trim(),
      systemPrompt: templateForm.systemPrompt,
      databases: templateForm.databases,
      tools: templateForm.tools,
    };

    const updatedTemplates = [...customTemplates, newTemplate];
    setCustomTemplates(updatedTemplates);
    localStorage.setItem("customTemplates", JSON.stringify(updatedTemplates));

    setShowTemplateCreator(false);
    setTemplateForm({
      name: "",
      description: "",
      systemPrompt: "default",
      databases: [],
      tools: [],
    });
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      {/* Minimal Header */}
      <header className="border-b border-border shrink-0">
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-sm font-medium">Chat</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Select
                      value={selectedTemplate}
                      onValueChange={applyTemplate}
                    >
                      <SelectTrigger className="h-6 text-xs min-w-0 w-fit px-2">
                        <SelectValue placeholder="Template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                        {customTemplates.length > 0 && (
                          <>
                            <div className="px-2 py-1 text-xs text-muted-foreground">
                              Custom Templates
                            </div>
                            {customTemplates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Quick presets for common AI assistant configurations</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              size="sm"
              onClick={openTemplateCreatorFromCurrent}
              className="h-6 w-6 p-0"
              title="Save current config as template"
            >
              <Save className="h-3 w-3" />
            </Button>
            <div className="h-4 w-px bg-border" />
            <Select
              value={systemPrompt}
              onValueChange={handleSystemPromptChange}
            >
              <SelectTrigger className="h-6 text-xs min-w-0 w-fit px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="helpful">Helpful</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
                <SelectItem value="technical">Tech</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="professional">Pro</SelectItem>
                {customPrompts
                  .filter((p) => p.isActive)
                  .map((prompt) => (
                    <SelectItem key={prompt.id} value={`custom-${prompt.id}`}>
                      {prompt.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-6 text-xs min-w-0 px-2">
                  {selectedDatabases.length === 0
                    ? "No DB"
                    : selectedDatabases.length === 1
                    ? (() => {
                        const db = selectedDatabases[0];
                        if (db.startsWith("db-")) {
                          const dbId = db.replace("db-", "");
                          const customDb = customDatabases.find(
                            (d) => d.id === dbId
                          );
                          return customDb ? customDb.name : "Custom";
                        }
                        return (
                          databases[db as keyof typeof databases]?.name || db
                        );
                      })()
                    : `${selectedDatabases.length} DBs`}
                  <ChevronDown className="h-2 w-2 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuCheckboxItem
                  checked={selectedDatabases.includes("docs")}
                  onCheckedChange={() => handleDatabaseChange("docs")}
                >
                  Docs
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedDatabases.includes("code")}
                  onCheckedChange={() => handleDatabaseChange("code")}
                >
                  Code
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedDatabases.includes("wiki")}
                  onCheckedChange={() => handleDatabaseChange("wiki")}
                >
                  Wiki
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedDatabases.includes("papers")}
                  onCheckedChange={() => handleDatabaseChange("papers")}
                >
                  Papers
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedDatabases.includes("custom")}
                  onCheckedChange={() => handleDatabaseChange("custom")}
                >
                  Custom
                </DropdownMenuCheckboxItem>
                {customDatabases
                  .filter((db) => db.isActive)
                  .map((database) => (
                    <DropdownMenuCheckboxItem
                      key={database.id}
                      checked={selectedDatabases.includes(`db-${database.id}`)}
                      onCheckedChange={() =>
                        handleDatabaseChange(`db-${database.id}`)
                      }
                    >
                      {database.name}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-6 text-xs min-w-0 px-2">
                  {selectedTools.length === 0
                    ? "No Tools"
                    : selectedTools.length === 1
                    ? (() => {
                        const tool = selectedTools[0];
                        if (tool.startsWith("tool-")) {
                          const toolId = tool.replace("tool-", "");
                          const customTool = customTools.find(
                            (t) => t.id === toolId
                          );
                          return customTool ? customTool.name : "Custom";
                        }
                        return tools[tool as keyof typeof tools]?.name || tool;
                      })()
                    : `${selectedTools.length} Tools`}
                  <ChevronDown className="h-2 w-2 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuCheckboxItem
                  checked={selectedTools.includes("basic")}
                  onCheckedChange={() => handleToolsChange("basic")}
                >
                  Basic
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedTools.includes("web")}
                  onCheckedChange={() => handleToolsChange("web")}
                >
                  Web
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedTools.includes("code")}
                  onCheckedChange={() => handleToolsChange("code")}
                >
                  Code
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedTools.includes("file")}
                  onCheckedChange={() => handleToolsChange("file")}
                >
                  File
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedTools.includes("mcp")}
                  onCheckedChange={() => handleToolsChange("mcp")}
                >
                  MCP
                </DropdownMenuCheckboxItem>
                {customTools
                  .filter((tool) => tool.isActive)
                  .map((tool) => (
                    <DropdownMenuCheckboxItem
                      key={tool.id}
                      checked={selectedTools.includes(`tool-${tool.id}`)}
                      onCheckedChange={() =>
                        handleToolsChange(`tool-${tool.id}`)
                      }
                    >
                      {tool.name}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/generator">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                title="Page Generator"
              >
                <Zap className="h-3 w-3" />
              </Button>
            </Link>
            <Link href="/generated">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                title="Generated Pages"
              >
                <FileText className="h-3 w-3" />
              </Button>
            </Link>
            <Link href="/templates">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                title="Page Templates"
              >
                <Layout className="h-3 w-3" />
              </Button>
            </Link>
            <Link href="/components">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                title="Components"
              >
                <div className="h-3 w-3 grid grid-cols-2 gap-px">
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                </div>
              </Button>
            </Link>
            <Link href="/databases">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Database className="h-3 w-3" />
              </Button>
            </Link>
            <Link href="/tools">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Wrench className="h-3 w-3" />
              </Button>
            </Link>
            <Link href="/prompts">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Settings className="h-3 w-3" />
              </Button>
            </Link>
            <Switch
              checked={isDark}
              onCheckedChange={toggleTheme}
              className="scale-75"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="h-6 px-2 text-xs"
            >
              Clear
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 px-3 py-2 flex flex-col">
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="space-y-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted px-3 py-2 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="border-t border-border p-2">
          {attachedFile && (
            <div className="mb-2 flex items-center justify-between bg-muted rounded px-2 py-1">
              <span className="text-xs text-muted-foreground truncate">
                📎 {attachedFile.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeAttachedFile}
                className="h-4 w-4 p-0"
              >
                <X className="h-2 w-2" />
              </Button>
            </div>
          )}
          <div className="flex space-x-2">
            <Input
              placeholder="Type message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 h-8 text-sm"
            />
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              onClick={handleFileSelect}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Paperclip className="h-3 w-3" />
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={(!inputMessage.trim() && !attachedFile) || isTyping}
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Template Creator Modal */}
      <Dialog open={showTemplateCreator} onOpenChange={setShowTemplateCreator}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
            <DialogDescription>
              Create a reusable template with your preferred AI configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g., My Research Assistant"
                value={templateForm.name}
                onChange={(e) =>
                  handleTemplateFormChange("name", e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                placeholder="Describe what this template is for..."
                value={templateForm.description}
                onChange={(e) =>
                  handleTemplateFormChange("description", e.target.value)
                }
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>System Prompt</Label>
              <Select
                value={templateForm.systemPrompt}
                onValueChange={(value) =>
                  handleTemplateFormChange("systemPrompt", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="helpful">Helpful</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  {customPrompts
                    .filter((p) => p.isActive)
                    .map((prompt) => (
                      <SelectItem key={prompt.id} value={`custom-${prompt.id}`}>
                        {prompt.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Databases</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
                  {Object.entries(databases)
                    .filter(([key]) => key !== "none")
                    .map(([key, db]) => (
                      <label
                        key={key}
                        className="flex items-center space-x-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={templateForm.databases.includes(key)}
                          onChange={() =>
                            handleTemplateFormArrayToggle("databases", key)
                          }
                          className="rounded"
                        />
                        <span>{db.name}</span>
                      </label>
                    ))}
                  {customDatabases
                    .filter((db) => db.isActive)
                    .map((database) => (
                      <label
                        key={database.id}
                        className="flex items-center space-x-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={templateForm.databases.includes(
                            `db-${database.id}`
                          )}
                          onChange={() =>
                            handleTemplateFormArrayToggle(
                              "databases",
                              `db-${database.id}`
                            )
                          }
                          className="rounded"
                        />
                        <span>{database.name}</span>
                      </label>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tools</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
                  {Object.entries(tools)
                    .filter(([key]) => key !== "none")
                    .map(([key, tool]) => (
                      <label
                        key={key}
                        className="flex items-center space-x-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={templateForm.tools.includes(key)}
                          onChange={() =>
                            handleTemplateFormArrayToggle("tools", key)
                          }
                          className="rounded"
                        />
                        <span>{tool.name}</span>
                      </label>
                    ))}
                  {customTools
                    .filter((tool) => tool.isActive)
                    .map((tool) => (
                      <label
                        key={tool.id}
                        className="flex items-center space-x-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={templateForm.tools.includes(
                            `tool-${tool.id}`
                          )}
                          onChange={() =>
                            handleTemplateFormArrayToggle(
                              "tools",
                              `tool-${tool.id}`
                            )
                          }
                          className="rounded"
                        />
                        <span>{tool.name}</span>
                      </label>
                    ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTemplateCreator(false)}
            >
              Cancel
            </Button>
            <Button onClick={saveTemplate} disabled={!templateForm.name.trim()}>
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
