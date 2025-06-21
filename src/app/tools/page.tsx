"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  Send,
  X,
  Wrench,
  Code,
  Globe,
  Calculator,
  FileText,
} from "lucide-react";
import Link from "next/link";

// Metadata not needed for client components

interface CustomTool {
  id: string;
  name: string;
  description: string;
  category: "web" | "code" | "file" | "calc" | "custom";
  endpoint?: string;
  parameters: ToolParameter[];
  isActive: boolean;
  createdAt: Date;
}

interface ToolParameter {
  id: string;
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required: boolean;
  defaultValue?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

const toolCategories = {
  web: {
    name: "Web Tools",
    icon: Globe,
    description: "Web scraping, API calls, HTTP requests",
  },
  code: {
    name: "Code Tools",
    icon: Code,
    description: "Code execution, compilation, analysis",
  },
  file: {
    name: "File Tools",
    icon: FileText,
    description: "File operations, processing, conversion",
  },
  calc: {
    name: "Calculator Tools",
    icon: Calculator,
    description: "Mathematical calculations, data analysis",
  },
  custom: {
    name: "Custom Tools",
    icon: Wrench,
    description: "Custom functionality and integrations",
  },
};

const chatHelperPrompts = [
  {
    id: "tool-structure",
    title: "Tool Structure",
    content:
      "Help me understand the basic structure of a custom tool with parameters and endpoints.",
  },
  {
    id: "web-tool",
    title: "Web Tool Example",
    content:
      "Show me how to create a web scraping tool with URL and selector parameters.",
  },
  {
    id: "api-tool",
    title: "API Integration",
    content:
      "Help me create a tool that calls external APIs with authentication and parameters.",
  },
  {
    id: "file-processor",
    title: "File Processor",
    content:
      "Create a tool that processes uploaded files (CSV, JSON, text) and extracts data.",
  },
  {
    id: "calculator",
    title: "Calculator Tool",
    content:
      "Help me build a mathematical calculation tool with multiple operations.",
  },
];

export default function ToolsPage() {
  const [isDark, setIsDark] = useState(true);
  const [customTools, setCustomTools] = useState<CustomTool[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTool, setEditingTool] = useState<CustomTool | null>(null);
  const [showChatHelper, setShowChatHelper] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "custom" as keyof typeof toolCategories,
    endpoint: "",
  });
  const [parameters, setParameters] = useState<ToolParameter[]>([]);

  useEffect(() => {
    const darkClass = document.documentElement.classList.contains("dark");
    setIsDark(darkClass);

    // Load custom tools from localStorage
    const saved = localStorage.getItem("customTools");
    if (saved) {
      const parsedTools = JSON.parse(saved).map(
        (tool: CustomTool & { createdAt: string }) => ({
          ...tool,
          createdAt: new Date(tool.createdAt),
        })
      );
      setCustomTools(parsedTools);
    }

    // Initialize chat helper
    setChatMessages([
      {
        id: "1",
        content:
          "Hi! I'm here to help you create custom tools. I can assist with tool structure, parameters, endpoints, and provide examples for different types of tools. What would you like to build?",
        sender: "assistant",
        timestamp: new Date(),
      },
    ]);
  }, []);

  const toggleTheme = (checked: boolean) => {
    setIsDark(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const saveTools = (tools: CustomTool[]) => {
    setCustomTools(tools);
    localStorage.setItem("customTools", JSON.stringify(tools));
  };

  const addParameter = () => {
    const newParam: ToolParameter = {
      id: Date.now().toString(),
      name: "",
      type: "string",
      description: "",
      required: false,
    };
    setParameters([...parameters, newParam]);
  };

  const updateParameter = (
    id: string,
    field: keyof ToolParameter,
    value: string | boolean
  ) => {
    setParameters((prev) =>
      prev.map((param) =>
        param.id === id ? { ...param, [field]: value } : param
      )
    );
  };

  const removeParameter = (id: string) => {
    setParameters((prev) => prev.filter((param) => param.id !== id));
  };

  const handleAddTool = () => {
    if (!formData.name.trim() || !formData.description.trim()) return;

    const newTool: CustomTool = {
      id: Date.now().toString(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      category: formData.category,
      endpoint: formData.endpoint.trim() || undefined,
      parameters: parameters.filter((p) => p.name.trim()),
      isActive: true,
      createdAt: new Date(),
    };

    saveTools([...customTools, newTool]);
    resetForm();
  };

  const handleEditTool = (tool: CustomTool) => {
    setEditingTool(tool);
    setFormData({
      name: tool.name,
      description: tool.description,
      category: tool.category,
      endpoint: tool.endpoint || "",
    });
    setParameters(tool.parameters);
    setIsEditing(true);
  };

  const handleUpdateTool = () => {
    if (!editingTool || !formData.name.trim() || !formData.description.trim())
      return;

    const updated = customTools.map((tool) =>
      tool.id === editingTool.id
        ? {
            ...tool,
            name: formData.name.trim(),
            description: formData.description.trim(),
            category: formData.category,
            endpoint: formData.endpoint.trim() || undefined,
            parameters: parameters.filter((p) => p.name.trim()),
          }
        : tool
    );

    saveTools(updated);
    resetForm();
  };

  const handleDeleteTool = (id: string) => {
    const filtered = customTools.filter((tool) => tool.id !== id);
    saveTools(filtered);
  };

  const toggleToolActive = (id: string) => {
    const updated = customTools.map((tool) =>
      tool.id === id ? { ...tool, isActive: !tool.isActive } : tool
    );
    saveTools(updated);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "custom",
      endpoint: "",
    });
    setParameters([]);
    setEditingTool(null);
    setIsEditing(false);
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: chatInput.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        'Here\'s a basic tool structure:\n\n```json\n{\n  "name": "My Tool",\n  "description": "Tool description",\n  "parameters": [\n    {\n      "name": "input",\n      "type": "string",\n      "required": true\n    }\n  ]\n}\n```',
        "For a web scraping tool, you'll need:\n\n1. URL parameter (string, required)\n2. CSS selector parameter (string, required)\n3. Optional headers parameter (object)\n\nEndpoint: `/api/scrape`",
        "API integration tools typically need:\n\n• API endpoint URL\n• Authentication method (API key, OAuth)\n• Request parameters\n• Response format specification",
        "File processing tools should include:\n\n• File input parameter\n• Processing type (parse, convert, analyze)\n• Output format specification\n• Error handling for unsupported files",
        "Calculator tools can have:\n\n• Expression parameter (string)\n• Variables parameter (object)\n• Precision parameter (number)\n• Result format (decimal, fraction, scientific)",
      ];

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: responses[Math.floor(Math.random() * responses.length)],
        sender: "assistant",
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  const applyChatSuggestion = (suggestion: string) => {
    // Parse and apply suggestions to the form
    if (suggestion.includes("web scraping")) {
      setFormData((prev) => ({
        ...prev,
        name: "Web Scraper",
        description: "Extract content from web pages using CSS selectors",
        category: "web",
        endpoint: "/api/scrape",
      }));
      setParameters([
        {
          id: "1",
          name: "url",
          type: "string",
          description: "Target URL to scrape",
          required: true,
        },
        {
          id: "2",
          name: "selector",
          type: "string",
          description: "CSS selector for content extraction",
          required: true,
        },
      ]);
    }
    // Add more suggestion parsing logic here
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border shrink-0">
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <ArrowLeft className="h-3 w-3" />
              </Button>
            </Link>
            <h1 className="text-sm font-medium">Custom Tools</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChatHelper(!showChatHelper)}
              className={`h-6 w-6 p-0 ${showChatHelper ? "bg-muted" : ""}`}
            >
              <MessageSquare className="h-3 w-3" />
            </Button>
            <Switch
              checked={isDark}
              onCheckedChange={toggleTheme}
              className="scale-75"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Form Panel */}
        <div
          className={`${
            showChatHelper ? "w-1/4" : "w-1/3"
          } border-r border-border p-3`}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {isEditing ? "Edit Tool" : "Add New Tool"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs">
                  Tool Name
                </Label>
                <Input
                  id="name"
                  placeholder="My Custom Tool"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="h-7 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="description" className="text-xs">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this tool does..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="min-h-20 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="category" className="text-xs">
                  Category
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: keyof typeof toolCategories) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(toolCategories).map(([key, category]) => (
                      <SelectItem key={key} value={key}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="endpoint" className="text-xs">
                  API Endpoint (Optional)
                </Label>
                <Input
                  id="endpoint"
                  placeholder="/api/my-tool"
                  value={formData.endpoint}
                  onChange={(e) =>
                    setFormData({ ...formData, endpoint: e.target.value })
                  }
                  className="h-7 text-xs"
                />
              </div>

              {/* Parameters Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Parameters</Label>
                  <Button
                    type="button"
                    onClick={addParameter}
                    variant="outline"
                    size="sm"
                    className="h-5 px-2 text-xs"
                  >
                    <Plus className="h-2 w-2 mr-1" />
                    Add
                  </Button>
                </div>

                {parameters.length > 0 && (
                  <ScrollArea className="max-h-40">
                    <div className="space-y-2">
                      {parameters.map((param) => (
                        <div
                          key={param.id}
                          className="border rounded p-2 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <Input
                              placeholder="Parameter name"
                              value={param.name}
                              onChange={(e) =>
                                updateParameter(
                                  param.id,
                                  "name",
                                  e.target.value
                                )
                              }
                              className="h-5 text-xs flex-1 mr-1"
                            />
                            <Button
                              type="button"
                              onClick={() => removeParameter(param.id)}
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                            >
                              <X className="h-2 w-2" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <Select
                              value={param.type}
                              onValueChange={(value: string) =>
                                updateParameter(param.id, "type", value)
                              }
                            >
                              <SelectTrigger className="h-5 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="string">String</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="boolean">Boolean</SelectItem>
                                <SelectItem value="array">Array</SelectItem>
                                <SelectItem value="object">Object</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex items-center space-x-1">
                              <input
                                type="checkbox"
                                checked={param.required}
                                onChange={(e) =>
                                  updateParameter(
                                    param.id,
                                    "required",
                                    e.target.checked
                                  )
                                }
                                className="scale-75"
                              />
                              <span className="text-xs">Required</span>
                            </div>
                          </div>
                          <Input
                            placeholder="Parameter description"
                            value={param.description}
                            onChange={(e) =>
                              updateParameter(
                                param.id,
                                "description",
                                e.target.value
                              )
                            }
                            className="h-5 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button
                      onClick={handleUpdateTool}
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      disabled={
                        !formData.name.trim() || !formData.description.trim()
                      }
                    >
                      Update
                    </Button>
                    <Button
                      onClick={resetForm}
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleAddTool}
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    disabled={
                      !formData.name.trim() || !formData.description.trim()
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Tool
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Helper Panel */}
        {showChatHelper && (
          <div className="w-1/3 border-r border-border p-3">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Tool Helper</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChatHelper(false)}
                    className="h-5 w-5 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-3 pt-0">
                {/* Quick Prompts */}
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Quick Help:
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {chatHelperPrompts.slice(0, 3).map((prompt) => (
                      <Button
                        key={prompt.id}
                        variant="outline"
                        size="sm"
                        onClick={() => setChatInput(prompt.content)}
                        className="h-6 text-xs justify-start"
                      >
                        {prompt.title}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Chat Messages */}
                <ScrollArea className="flex-1 mb-3">
                  <div className="space-y-2">
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] px-2 py-1 rounded text-xs ${
                            message.sender === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <div className="whitespace-pre-wrap">
                            {message.content}
                          </div>
                          {message.sender === "assistant" && (
                            <Button
                              onClick={() =>
                                applyChatSuggestion(message.content)
                              }
                              variant="ghost"
                              size="sm"
                              className="h-4 px-1 mt-1 text-xs"
                            >
                              Apply
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-muted px-2 py-1 rounded">
                          <div className="flex space-x-1">
                            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"></div>
                            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce delay-75"></div>
                            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce delay-150"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Chat Input */}
                <div className="flex space-x-1">
                  <Input
                    placeholder="Ask about tool creation..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSend();
                      }
                    }}
                    className="flex-1 h-6 text-xs"
                  />
                  <Button
                    onClick={handleChatSend}
                    disabled={!chatInput.trim() || isTyping}
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    <Send className="h-2 w-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tools List */}
        <div className="flex-1 p-3">
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {customTools.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  No custom tools yet. Add one to get started.
                </div>
              ) : (
                customTools.map((tool) => {
                  const CategoryIcon = toolCategories[tool.category].icon;
                  return (
                    <Card
                      key={tool.id}
                      className={!tool.isActive ? "opacity-50" : ""}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center space-x-2">
                              <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                              <h3 className="text-sm font-medium">
                                {tool.name}
                              </h3>
                              <Switch
                                checked={tool.isActive}
                                onCheckedChange={() =>
                                  toggleToolActive(tool.id)
                                }
                                className="scale-75"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {tool.description}
                            </p>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>
                                Category: {toolCategories[tool.category].name}
                              </div>
                              {tool.endpoint && (
                                <div className="font-mono">
                                  Endpoint: {tool.endpoint}
                                </div>
                              )}
                              {tool.parameters.length > 0 && (
                                <div>Parameters: {tool.parameters.length}</div>
                              )}
                              <div>
                                Created: {tool.createdAt.toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTool(tool)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTool(tool.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
