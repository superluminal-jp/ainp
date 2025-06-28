"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useHeader } from "@/components/header-context";
import { AppHeader } from "@/components/app-header";
import {
  Send,
  Paperclip,
  X,
  Database,
  Wrench,
  Settings,
  MessageSquare,
  Clock,
  MoreVertical,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCcw,
  Zap,
  Mic,
} from "lucide-react";
import {
  Message,
  SystemPrompt,
  Database as DatabaseType,
  Tool,
  Template,
} from "@/lib/types";

import type { Schema } from "../../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

export default function ChatPage() {
  const { setHeaderProps } = useHeader();
  const [systemPrompt, setSystemPrompt] = useState<string>("default");
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("none");
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [customDatabases, setCustomDatabases] = useState<DatabaseType[]>([]);
  const [customTools, setCustomTools] = useState<Tool[]>([]);
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
      text: "Hello! I'm your AI assistant. How can I help you today?",
      role: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messageMode, setMessageMode] = useState<"text" | "voice">("text");
  const [typingProgress, setTypingProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<"chat" | "history">("chat");
  const [showConfiguration, setShowConfiguration] = useState(true);

  useEffect(() => {
    // Load all data from Amplify
    const loadData = async () => {
      try {
        // Load system prompts
        const { data: promptsData } = await client.models.systemPrompts.list();
        if (promptsData) {
          const prompts: SystemPrompt[] = promptsData.map((prompt) => ({
            id: prompt.id,
            name: prompt.name,
            content: prompt.content,
            isActive: prompt.isActive || false,
          }));
          setSystemPrompts(prompts);
        }

        // Load databases
        const { data: databasesData } = await client.models.databases.list();
        if (databasesData) {
          const databases: DatabaseType[] = databasesData.map((db) => ({
            id: db.id,
            name: db.name,
            description: db.description,
            isActive: db.isActive || false,
          }));
          setCustomDatabases(databases);
        }

        // Load tools
        const { data: toolsData } = await client.models.tools.list();
        if (toolsData) {
          const tools: Tool[] = toolsData.map((tool) => ({
            id: tool.id,
            name: tool.name,
            description: tool.description,
            parameters: Array.isArray(tool.parameters) ? tool.parameters : [],
            pythonCodeKey: tool.pythonCodeKey,
            isActive: tool.isActive || false,
            createdAt: new Date(tool.createdAt),
            owner: tool.owner || undefined,
          }));
          setCustomTools(tools);
        }

        // Load templates
        const { data: templatesData } = await client.models.templates.list();
        if (templatesData) {
          const templates: Template[] = templatesData.map((template) => ({
            id: template.id,
            name: template.name,
            description: template.description,
            systemPrompt: template.systemPromptId,
            databases: Array.isArray(template.databaseIds)
              ? template.databaseIds
              : [],
            tools: Array.isArray(template.toolIds) ? template.toolIds : [],
          }));
          setCustomTemplates(templates);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load configuration data");
      }
    };

    loadData();
  }, []);

  // Apply template configuration when template is selected
  const applyTemplate = useCallback(
    (templateId: string) => {
      const template = customTemplates.find((t) => t.id === templateId);
      if (template) {
        setSystemPrompt(template.systemPrompt);
        setSelectedDatabases(template.databases);
        setSelectedTools(template.tools);
        toast.success(`Applied template: ${template.name}`);
      }
    },
    [customTemplates]
  );

  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId && templateId !== "none") {
      applyTemplate(templateId);
    } else if (templateId === "none") {
      // Clear template selections
      setSystemPrompt("default");
      setSelectedDatabases([]);
      setSelectedTools([]);
      toast.info("Template cleared");
    }
  };

  const clearChat = useCallback(() => {
    let content: string;
    if (
      systemPrompt &&
      systemPrompt !== "default" &&
      systemPrompts.length > 0
    ) {
      const selectedPrompt = systemPrompts.find((p) => p.id === systemPrompt);
      content = selectedPrompt
        ? selectedPrompt.content
        : "Hello! I'm your AI assistant. How can I help you today?";
    } else {
      content = "Hello! I'm your AI assistant. How can I help you today?";
    }

    setMessages([
      {
        id: "1",
        text: content,
        role: "assistant",
        timestamp: new Date(),
      },
    ]);
  }, [systemPrompt, systemPrompts]);

  // Memoize header actions to prevent re-renders
  const headerActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        {selectedDatabases.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="text-xs cursor-pointer">
                <Database className="h-3 w-3 mr-1" />
                {selectedDatabases.length} DB
                {selectedDatabases.length > 1 ? "s" : ""}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Connected databases: {selectedDatabases.join(", ")}</p>
            </TooltipContent>
          </Tooltip>
        )}
        {selectedTools.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="text-xs cursor-pointer">
                <Wrench className="h-3 w-3 mr-1" />
                {selectedTools.length} Tool
                {selectedTools.length > 1 ? "s" : ""}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Active tools: {selectedTools.join(", ")}</p>
            </TooltipContent>
          </Tooltip>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={clearChat}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Clear Chat
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    ),
    [selectedDatabases, selectedTools, clearChat]
  );

  // Memoize description to prevent unnecessary re-renders
  const headerDescription = useMemo(() => {
    if (selectedTemplate && selectedTemplate !== "none") {
      const template = customTemplates.find((t) => t.id === selectedTemplate);
      return template
        ? `Using ${template.name} template`
        : "AI conversation interface";
    }
    return "AI conversation interface";
  }, [selectedTemplate, customTemplates]);

  useEffect(() => {
    setHeaderProps({
      title: "Chat",
      description: headerDescription,
      // headerActions,
    });
  }, [setHeaderProps, headerDescription, headerActions]);

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

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !attachedFile) return;

    let text = inputMessage.trim();
    const files: File[] = [];

    if (attachedFile) {
      files.push(attachedFile);
      text += text ? `\n📎 ${attachedFile.name}` : `📎 ${attachedFile.name}`;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      role: "user",
      timestamp: new Date(),
      files: files.length > 0 ? files : undefined,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage("");
    setAttachedFile(null);
    setIsTyping(true);
    setTypingProgress(0);

    // Simulate typing progress
    const progressInterval = setInterval(() => {
      setTypingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 100);

    // Simulate AI response
    setTimeout(
      () => {
        clearInterval(progressInterval);
        const responses = [
          "That's an interesting question! Let me think about that...",
          "I understand what you're saying. Here's my perspective:",
          "Great point! I'd like to add that...",
          "Thanks for sharing that with me. My thoughts are:",
          "I appreciate your input. Let me respond to that:",
        ];

        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: responses[Math.floor(Math.random() * responses.length)],
          role: "assistant",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiResponse]);
        setIsTyping(false);
        setTypingProgress(0);
        toast.success("Response generated!");
      },
      1000 + Math.random() * 2000
    );
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const regenerateResponse = () => {
    toast.info("Regenerating response...");
    // Implementation for regenerating response
  };

  const renderChatContent = () => (
    <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} group`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-lg relative ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>

              <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(message.text)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                {message.role === "assistant" && (
                  <>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => regenerateResponse()}
                    >
                      <RefreshCcw className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted px-4 py-3 rounded-lg max-w-[80%]">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );

  const renderHistoryContent = () => (
    <div className="flex-1 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold">Chat History</h3>
            <p className="text-sm text-muted-foreground">
              Previous conversations will appear here
            </p>
          </div>
          {/* Skeleton placeholders for chat history */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 p-4 border rounded-lg">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* App Header */}
      <AppHeader />

      {/* Typing indicator - show below header when typing */}
      {isTyping && (
        <div className="border-b border-border bg-background/95 px-4 pb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce delay-75"></div>
              <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce delay-150"></div>
            </div>
            <span>AI is thinking...</span>
          </div>
          <Progress value={typingProgress} className="h-1 mt-1" />
        </div>
      )}

      {/* Main Layout Container */}
      <div className="flex flex-col h-[calc(100vh-5rem)]">
        {/* Main Content Area */}
        <div className="flex-1 min-h-0">
          {activeTab === "chat" ? renderChatContent() : renderHistoryContent()}
        </div>

        {/* Bottom Bar with Message Input */}
        <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 ">
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Configuration Toggle */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfiguration(!showConfiguration)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-3 w-3 mr-1" />
                {showConfiguration
                  ? "Hide Configuration"
                  : "Show Configuration"}
              </Button>
            </div>

            {/* Configuration Section */}
            {showConfiguration && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Template
                  </Label>
                  <Select
                    value={selectedTemplate}
                    onValueChange={handleTemplateChange}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {customTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">
                    System Prompt
                  </Label>
                  <Select value={systemPrompt} onValueChange={setSystemPrompt}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select prompt" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      {systemPrompts.map((prompt) => (
                        <SelectItem key={prompt.id} value={prompt.id}>
                          {prompt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Databases
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-8 text-xs justify-start"
                      >
                        {selectedDatabases.length > 0
                          ? `${selectedDatabases.length} selected`
                          : "Select databases"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          Select Databases
                        </div>
                        {customDatabases.map((database) => (
                          <div
                            key={database.id}
                            className="flex items-center space-x-2"
                          >
                            <input
                              type="checkbox"
                              id={`db-${database.id}`}
                              checked={selectedDatabases.includes(database.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDatabases((prev) => [
                                    ...prev,
                                    database.id,
                                  ]);
                                } else {
                                  setSelectedDatabases((prev) =>
                                    prev.filter((id) => id !== database.id)
                                  );
                                }
                              }}
                              className="rounded border-border"
                            />
                            <label
                              htmlFor={`db-${database.id}`}
                              className="text-sm"
                            >
                              {database.name}
                            </label>
                          </div>
                        ))}
                        {customDatabases.length === 0 && (
                          <div className="text-sm text-muted-foreground">
                            No databases available
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Tools
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-8 text-xs justify-start"
                      >
                        {selectedTools.length > 0
                          ? `${selectedTools.length} selected`
                          : "Select tools"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Select Tools</div>
                        {customTools.map((tool) => (
                          <div
                            key={tool.id}
                            className="flex items-center space-x-2"
                          >
                            <input
                              type="checkbox"
                              id={`tool-${tool.id}`}
                              checked={selectedTools.includes(tool.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTools((prev) => [
                                    ...prev,
                                    tool.id,
                                  ]);
                                } else {
                                  setSelectedTools((prev) =>
                                    prev.filter((id) => id !== tool.id)
                                  );
                                }
                              }}
                              className="rounded border-border"
                            />
                            <label
                              htmlFor={`tool-${tool.id}`}
                              className="text-sm"
                            >
                              {tool.name}
                            </label>
                          </div>
                        ))}
                        {customTools.length === 0 && (
                          <div className="text-sm text-muted-foreground">
                            No tools available
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {attachedFile && (
              <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground truncate">
                    {attachedFile.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeAttachedFile}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2">
              {/* Chat/History Toggle Button */}
              <Toggle
                pressed={activeTab === "history"}
                onPressedChange={(pressed) =>
                  setActiveTab(pressed ? "history" : "chat")
                }
                aria-label={
                  activeTab === "chat" ? "Switch to History" : "Switch to Chat"
                }
                className="border"
              >
                <Clock className="h-4 w-4" />
              </Toggle>

              <Separator orientation="vertical" className="h-6" />

              {/* Text/Voice Mode Selector - Only show when on chat tab */}
              {activeTab === "chat" && (
                <>
                  <ToggleGroup
                    type="single"
                    value={messageMode}
                    onValueChange={(value) =>
                      value && setMessageMode(value as "text" | "voice")
                    }
                  >
                    <ToggleGroupItem value="text" aria-label="Text mode">
                      <MessageSquare className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="voice" aria-label="Voice mode">
                      <Mic className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>

                  <Separator orientation="vertical" className="h-6" />
                </>
              )}

              {/* Message Input - Only show when on chat tab */}
              {activeTab === "chat" ? (
                <div className="flex gap-2 flex-1">
                  <Input
                    placeholder={
                      messageMode === "text"
                        ? "Type your message here..."
                        : "Voice mode - click to record"
                    }
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                    disabled={messageMode === "voice"}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleFileSelect}
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Attach file</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleSendMessage}
                        disabled={
                          (!inputMessage.trim() && !attachedFile) || isTyping
                        }
                        size="icon"
                        className="shrink-0"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Send message (⌘+Enter)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                  <span>Viewing chat history</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Template Creator Modal */}
      <Dialog open={showTemplateCreator} onOpenChange={setShowTemplateCreator}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Create Template
            </DialogTitle>
            <DialogDescription>
              Save your current configuration as a reusable template for future
              use.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., My Research Assistant"
                  value={templateForm.name}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
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
                    setTemplateForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Selected Databases</Label>
                  <div className="text-sm text-muted-foreground">
                    {selectedDatabases.length > 0
                      ? selectedDatabases.map((db) => (
                          <Badge
                            key={db}
                            variant="secondary"
                            className="mr-1 mb-1"
                          >
                            {db}
                          </Badge>
                        ))
                      : "No databases selected"}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Selected Tools</Label>
                  <div className="text-sm text-muted-foreground">
                    {selectedTools.length > 0
                      ? selectedTools.map((tool) => (
                          <Badge
                            key={tool}
                            variant="secondary"
                            className="mr-1 mb-1"
                          >
                            {tool}
                          </Badge>
                        ))
                      : "No tools selected"}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTemplateCreator(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => {}} disabled={!templateForm.name.trim()}>
              <Zap className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
