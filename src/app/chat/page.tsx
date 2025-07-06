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
import { Skeleton } from "@/components/ui/skeleton";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Toggle } from "@/components/ui/toggle";
import { Switch } from "@/components/ui/switch";
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
  Code,
} from "lucide-react";
import {
  Message,
  SystemPrompt,
  Database as DatabaseType,
  Template,
} from "@/lib/types";

import type { Schema } from "../../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

// Available model options
const AVAILABLE_MODELS = [
  {
    id: "apac.anthropic.claude-sonnet-4-20250514-v1:0",
    name: "Claude 4 Sonnet",
    description: "Advanced reasoning and analysis capabilities",
  },
  {
    id: "apac.amazon.nova-pro-v1:0",
    name: "Amazon Nova Pro",
    description: "High-performance multimodal AI model",
  },
];

export default function ChatPage() {
  const { setHeaderProps } = useHeader();
  const [systemPrompt, setSystemPrompt] = useState<string>("default");
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("none");
  const [selectedModelId, setSelectedModelId] = useState<string>(
    "apac.anthropic.claude-sonnet-4-20250514-v1:0"
  );

  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [customDatabases, setCustomDatabases] = useState<DatabaseType[]>([]);
  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);
  const [customTools, setCustomTools] = useState<
    { id: string; name: string; description: string; isActive: boolean }[]
  >([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [useStructuredOutput, setUseStructuredOutput] = useState(false);
  const [structuredOutputSchema, setStructuredOutputSchema] =
    useState<string>(`{
  "type": "object",
  "properties": {
    "answer": {
      "type": "string",
      "description": "The main response to the user's question"
    },
    "confidence": {
      "type": "number",
      "description": "Confidence level from 0 to 1"
    },
    "sources": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of sources used for the response"
    }
  },
  "required": ["answer"]
}`);

  // Tools are automatically enabled when tools are selected
  const useTools = useMemo(() => selectedTools.length > 0, [selectedTools]);

  const [showTemplateCreator, setShowTemplateCreator] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    systemPrompt: "default",
    databases: [] as string[],
    tools: [] as string[],
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messageMode, setMessageMode] = useState<"text" | "voice">("text");
  const [activeTab, setActiveTab] = useState<"chat" | "history">("chat");
  const [showConfiguration, setShowConfiguration] = useState(true);

  useEffect(() => {
    // Load all data from Amplify
    const loadData = async () => {
      console.log("🔄 [ChatPage] Starting data load from Amplify...");
      try {
        // Load system prompts
        console.log("📝 [ChatPage] Loading system prompts...");
        const { data: promptsData } = await client.models.systemPrompts.list();
        if (promptsData) {
          const prompts: SystemPrompt[] = promptsData.map((prompt) => ({
            id: prompt.id,
            name: prompt.name,
            content: prompt.content,
            isActive: prompt.isActive || false,
          }));
          setSystemPrompts(prompts);
          console.log(
            `✅ [ChatPage] Loaded ${prompts.length} system prompts:`,
            prompts.map((p) => p.name)
          );
        } else {
          console.log("⚠️ [ChatPage] No system prompts data received");
        }

        // Load databases
        console.log("🗄️ [ChatPage] Loading databases...");
        const { data: databasesData } = await client.models.databases.list();
        if (databasesData) {
          const databases: DatabaseType[] = databasesData.map((db) => ({
            id: db.id,
            name: db.name,
            description: db.description,
            isActive: db.isActive || false,
          }));
          setCustomDatabases(databases);
          console.log(
            `✅ [ChatPage] Loaded ${databases.length} databases:`,
            databases.map((db) => db.name)
          );
        } else {
          console.log("⚠️ [ChatPage] No databases data received");
        }

        // Load templates
        console.log("📋 [ChatPage] Loading templates...");
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
          console.log(
            `✅ [ChatPage] Loaded ${templates.length} templates:`,
            templates.map((t) => t.name)
          );
        } else {
          console.log("⚠️ [ChatPage] No templates data received");
        }

        // Load tools
        console.log("🛠️ [ChatPage] Loading tools...");
        const { data: toolsData } = await client.models.toolSpecs.list();
        if (toolsData) {
          const tools = toolsData.map((tool) => ({
            id: tool.id,
            name: tool.name,
            description: tool.description,
            isActive: tool.isActive || false,
          }));
          setCustomTools(tools);
          console.log(
            `✅ [ChatPage] Loaded ${tools.length} tools:`,
            tools.map((t) => t.name)
          );
        } else {
          console.log("⚠️ [ChatPage] No tools data received");
        }

        console.log("🎉 [ChatPage] Data loading completed successfully");
      } catch (error) {
        console.error("❌ [ChatPage] Error loading data:", error);
        toast.error("Failed to load configuration data");
      }
    };

    loadData();
  }, []);

  // Apply template configuration when template is selected
  const applyTemplate = useCallback(
    (templateId: string) => {
      console.log(`🔄 [ChatPage] Applying template: ${templateId}`);
      const template = customTemplates.find((t) => t.id === templateId);
      if (template) {
        console.log(`📋 [ChatPage] Template found:`, {
          name: template.name,
          systemPrompt: template.systemPrompt,
          databases: template.databases,
        });

        // Apply system prompt
        const systemPromptToUse = template.systemPrompt;
        setSystemPrompt(systemPromptToUse);

        // Log the system prompt that will be used
        const selectedPrompt = systemPrompts.find(
          (p) => p.id === systemPromptToUse
        );
        if (selectedPrompt) {
          console.log(
            `📝 [ChatPage] Template will use system prompt: "${selectedPrompt.name}" - "${selectedPrompt.content.substring(0, 100)}..."`
          );
        } else {
          console.log(
            `📝 [ChatPage] Template uses system prompt ID: ${systemPromptToUse}`
          );
        }

        setSelectedDatabases(template.databases);

        // Apply tools from template if available
        if (template.tools && Array.isArray(template.tools)) {
          setSelectedTools(template.tools);
          console.log(
            `🛠️ [ChatPage] Applied ${template.tools.length} tools from template: ${template.tools.join(", ")}`
          );
        } else {
          setSelectedTools([]);
          console.log(
            "🛠️ [ChatPage] No tools in template, cleared tool selection"
          );
        }

        // Reset structured output when applying template
        setUseStructuredOutput(false);
        console.log("🔧 [ChatPage] Structured output disabled for template application");

        console.log(
          `✅ [ChatPage] Template applied successfully: ${template.name}`
        );
        toast.success(`Applied template: ${template.name}`);
      } else {
        console.warn(`⚠️ [ChatPage] Template not found: ${templateId}`);
      }
    },
    [customTemplates, systemPrompts]
  );

  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    console.log(`🔄 [ChatPage] Template selection changed: ${templateId}`);
    setSelectedTemplate(templateId);
    if (templateId && templateId !== "none") {
      applyTemplate(templateId);
    } else if (templateId === "none") {
      // Clear template selections
      console.log("🔄 [ChatPage] Clearing template selections");
      setSystemPrompt("default");
      setSelectedDatabases([]);
      setSelectedTools([]);
      setSelectedModelId("apac.anthropic.claude-sonnet-4-20250514-v1:0"); // Reset to default model
      setUseStructuredOutput(false); // Reset structured output
      console.log("✅ [ChatPage] Template selections cleared");
      toast.info("Template cleared");
    }
  };

  const clearChat = useCallback(() => {
    console.log("🔄 [ChatPage] Clearing chat conversation");
    setMessages([]);
    console.log("✅ [ChatPage] Chat conversation cleared successfully");
  }, []);

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
                <Zap className="h-3 w-3 mr-1" />
                {selectedTools.length} Tool
                {selectedTools.length > 1 ? "s" : ""}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Selected tools:{" "}
                {selectedTools
                  .map((toolId) => {
                    const tool = customTools.find((t) => t.id === toolId);
                    return tool ? tool.name : toolId;
                  })
                  .join(", ")}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {useStructuredOutput && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="text-xs cursor-pointer">
                <Code className="h-3 w-3 mr-1" />
                JSON Schema
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Structured output enabled with JSON schema</p>
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
    [selectedDatabases, selectedTools, customTools, clearChat, useStructuredOutput]
  );

  // Memoize description to prevent unnecessary re-renders
  const headerDescription = useMemo(() => {
    const parts = [];

    // Add model info
    const selectedModel = AVAILABLE_MODELS.find(
      (m) => m.id === selectedModelId
    );
    if (selectedModel) {
      parts.push(`${selectedModel.name}`);
    }

    // Add tools info
    if (useTools) {
      parts.push("with tools enabled");
    }

    // Add structured output info
    if (useStructuredOutput) {
      parts.push("with structured output");
    }

    if (selectedTemplate && selectedTemplate !== "none") {
      const template = customTemplates.find((t) => t.id === selectedTemplate);
      if (template) {
        parts.push(`using ${template.name} template`);
      }
    }

    // Add system prompt info
    if (systemPrompt && systemPrompt !== "default") {
      const selectedPrompt = systemPrompts.find((p) => p.id === systemPrompt);
      if (selectedPrompt) {
        parts.push(`with ${selectedPrompt.name} prompt`);
      }
    } else if (!selectedTemplate || selectedTemplate === "none") {
      parts.push("with default assistant");
    }

    return parts.length > 0 ? parts.join(" ") : "AI conversation interface";
  }, [
    selectedTemplate,
    customTemplates,
    systemPrompt,
    systemPrompts,
    selectedModelId,
    useTools,
    useStructuredOutput,
  ]);

  useEffect(() => {
    console.log("🔄 [ChatPage] Updating header props:", {
      title: "Chat",
      description: headerDescription,
      hasActions: !!headerActions,
    });
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
      } else {
        console.warn("⚠️ [ChatPage] Scroll container not found");
      }
    } else {
      console.warn("⚠️ [ChatPage] Scroll area ref not available");
    }
  }, [messages]);

  const handleSendMessage = async () => {
    console.log("🔄 [ChatPage] handleSendMessage called");

    const trimmedInput = inputMessage.trim();

    // Ensure we have actual text input (not just file attachment)
    if (!trimmedInput && !attachedFile) {
      console.log("⚠️ [ChatPage] No message or file to send, returning early");
      return;
    }

    // Ensure we have meaningful content (either text or file)
    if (!trimmedInput && !attachedFile) {
      console.log("⚠️ [ChatPage] No meaningful content to send");
      toast.error("Please enter a message or attach a file");
      return;
    }

    let text = trimmedInput;
    const files: File[] = [];

    if (attachedFile) {
      files.push(attachedFile);
      // If no text input, create a meaningful message about the file
      if (!trimmedInput) {
        text = `I've attached a file: ${attachedFile.name}. Please help me with this file.`;
      } else {
        text += `\n📎 ${attachedFile.name}`;
      }
      console.log(
        `📎 [ChatPage] File attached: ${attachedFile.name} (${attachedFile.size} bytes)`
      );
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      role: "user",
      timestamp: new Date(),
      files: files.length > 0 ? files : undefined,
    };

    console.log("💬 [ChatPage] New user message:", {
      id: newMessage.id,
      text: newMessage.text,
      hasFiles: !!newMessage.files,
      fileCount: newMessage.files?.length || 0,
    });

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage("");
    setAttachedFile(null);
    setIsTyping(true);

    console.log(
      "🔄 [ChatPage] UI state updated, starting AI response generation"
    );

    // Call Bedrock AI response
    try {
      console.log("🤖 [ChatPage] Starting Bedrock AI response generation");

      // Get system prompt content
      let systemPromptContent = "You are a helpful AI assistant.";
      let systemPromptName = "Default";

      if (systemPrompt && systemPrompt !== "default") {
        const selectedPrompt = systemPrompts.find((p) => p.id === systemPrompt);
        if (selectedPrompt) {
          systemPromptContent = selectedPrompt.content;
          systemPromptName = selectedPrompt.name;
          console.log(
            `📝 [ChatPage] Using custom system prompt: "${selectedPrompt.name}" (ID: ${systemPrompt})`
          );
          console.log(
            `📝 [ChatPage] System prompt content: "${systemPromptContent}"`
          );
        } else {
          console.warn(
            `⚠️ [ChatPage] System prompt ID "${systemPrompt}" not found in ${systemPrompts.length} available prompts, using default`
          );
          console.log(
            "Available system prompts:",
            systemPrompts.map((p) => `${p.name} (ID: ${p.id})`)
          );
        }
      } else {
        console.log("📝 [ChatPage] Using default system prompt");
      }

      console.log(`💭 [ChatPage] Preparing request:`, {
        totalMessages: messages.length,
        selectedDatabases: selectedDatabases.length,
      });

      // Validate message content before sending to Bedrock
      if (!newMessage.text || newMessage.text.trim().length === 0) {
        console.error(
          "❌ [ChatPage] Message text is empty, cannot send to Bedrock"
        );
        throw new Error("Message text is empty");
      }

      // Prepare messages array including the new message
      const allMessages = [...messages, newMessage];

      // Filter out any invalid messages and ensure we have content
      const validMessages = allMessages.filter(
        (msg) => msg && msg.role && msg.text && msg.text.trim().length > 0
      );

      if (validMessages.length === 0) {
        console.error("❌ [ChatPage] No valid messages to send");
        throw new Error("No valid messages to send");
      }

      // Debug: Log RAG configuration
      console.log("🔍 [ChatPage] RAG Configuration Debug:", {
        selectedDatabases,
        selectedDatabasesCount: selectedDatabases.length,
        selectedDatabasesType: typeof selectedDatabases,
        isArrayEmpty:
          Array.isArray(selectedDatabases) && selectedDatabases.length === 0,
        databaseNames: selectedDatabases.map((id) => {
          const db = customDatabases.find((d) => d.id === id);
          return db ? db.name : `Unknown(${id})`;
        }),
      });

            // Parse structured output schema if enabled
      let responseFormat = undefined;
      if (useStructuredOutput) {
        try {
          responseFormat = { json: JSON.parse(structuredOutputSchema) };
        } catch (error) {
          console.error("❌ [ChatPage] Invalid JSON schema for structured output:", error);
          toast.error("Invalid JSON schema for structured output. Please check the format.");
          setIsTyping(false);
          return;
        }
      }

      const requestPayload = {
        messages: validMessages.map((msg) => ({
          role: msg.role,
          text: msg.text.trim(),
          timestamp: msg.timestamp.toISOString(),
        })),
        systemPrompt: systemPromptContent,
        modelId: selectedModelId,
        databaseIds: selectedDatabases, // Add selected databases for RAG
        useTools: useTools, // Enable/disable tool functionality
        selectedToolIds: selectedTools, // Add selected custom tools
        responseFormat: responseFormat, // Add structured output format
      };

      console.log("📤 [ChatPage] Calling Bedrock function with payload:", {
        messageCount: requestPayload.messages.length,
        systemPromptLength: requestPayload.systemPrompt.length,
        systemPromptName: systemPromptName,
        systemPromptContent:
          requestPayload.systemPrompt.substring(0, 100) +
          (requestPayload.systemPrompt.length > 100 ? "..." : ""),
        modelId: requestPayload.modelId,
        selectedModel:
          AVAILABLE_MODELS.find((m) => m.id === selectedModelId)?.name ||
          "Unknown",

        // fullPayload: requestPayload, // Log the full payload for debugging (commented out to reduce noise)
      });

      // Call the Bedrock function
      console.log("🔄 [ChatPage] Executing chatWithBedrockTools query...");
      console.log("requestPayload summary:", {
        messagesCount: requestPayload.messages.length,
        systemPromptLength: requestPayload.systemPrompt.length,
        modelId: requestPayload.modelId,
        databaseIdsCount: requestPayload.databaseIds.length,
        useTools: requestPayload.useTools,
        selectedToolsCount: requestPayload.selectedToolIds.length,
      });

      try {
        // Validate payload before sending
        JSON.stringify(requestPayload);
        console.log("✅ [ChatPage] Payload serialization validation passed");
      } catch (serializationError) {
        console.error(
          "❌ [ChatPage] Payload serialization failed:",
          serializationError
        );
        throw new Error(`Invalid payload structure: ${serializationError}`);
      }

      const result = await client.queries.chatWithBedrockTools(requestPayload);

      console.log("📥 [ChatPage] Received response from Bedrock:", {
        hasData: !!result.data,
        hasErrors: !!(result.errors && result.errors.length > 0),
        errorsCount: result.errors?.length || 0,
        dataType: typeof result.data,
        responseLength: result.data?.response?.length || 0,
        modelId: result.data?.modelId || "unknown",
      });

      console.log("result", result);

      if (result.errors && result.errors.length > 0) {
        console.log(
          "❌ [ChatPage] Error details:",
          result.errors?.[0]?.message
        );
      }

      if (result.errors && result.errors.length > 0) {
        console.error(
          "❌ [ChatPage] GraphQL errors in response:",
          result.errors
        );
        // Log each error in detail
        result.errors.forEach((error, index) => {
          console.error(`❌ [ChatPage] Error ${index + 1}:`, {
            message: error.message,
            locations: error.locations,
            path: error.path,
            extensions: error.extensions,
            fullError: error,
          });
        });
        throw new Error(
          `GraphQL errors: ${result.errors.map((e) => e.message).join(", ")}`
        );
      }

      if (result.data) {
        // With the new typed schema, result.data is already a structured ChatResponse object
        const responseData = result.data;

        console.log("📊 [ChatPage] Response data structure:", {
          hasResponse: !!responseData.response,
          responseLength: responseData.response?.length || 0,
          modelId: responseData.modelId,
          hasUsage: !!responseData.usage,
          toolsUsed: responseData.toolsUsed || 0,
          responseType: typeof responseData,
        });

        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text:
            responseData.response ||
            "I apologize, but I couldn't generate a response.",
          role: "assistant",
          timestamp: new Date(),
        };

        console.log("✅ [ChatPage] AI response created:", {
          id: aiResponse.id,
          textLength: aiResponse.text.length,
          role: aiResponse.role,
        });

        setMessages((prev) => [...prev, aiResponse]);

        // Show success message with tool usage and structured output info
        const toolsUsedCount = responseData.toolsUsed || 0;
        const isStructuredOutput = responseData.structuredOutput || false;
        
        let successMessage = "Response generated";
        const features = [];
        
        if (toolsUsedCount > 0) {
          const toolNames = selectedTools
            .map((toolId) => {
              const tool = customTools.find((t) => t.id === toolId);
              return tool ? tool.name : toolId;
            })
            .join(", ");
          features.push(`using ${toolsUsedCount} tool${toolsUsedCount > 1 ? "s" : ""}: ${toolNames}`);
        }
        
        if (isStructuredOutput) {
          features.push("with structured output");
        }
        
        if (features.length > 0) {
          successMessage += " " + features.join(" ");
        }
        
        toast.success(successMessage + "!");

        console.log(
          "🎉 [ChatPage] AI response added to conversation successfully"
        );
      } else {
        console.error("❌ [ChatPage] No response data received from Bedrock");
        throw new Error("No response data received");
      }
    } catch (error) {
      console.error("❌ [ChatPage] Error calling Bedrock:", {
        error: error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error,
        errorName: error instanceof Error ? error.name : undefined,
        errorConstructor:
          error instanceof Error ? error.constructor.name : undefined,
        stringifiedError: JSON.stringify(
          error,
          Object.getOwnPropertyNames(error)
        ),
      });

      // Additional logging for GraphQL errors
      if (error && typeof error === "object" && "graphQLErrors" in error) {
        console.error(
          "❌ [ChatPage] GraphQL Errors:",
          (error as { graphQLErrors: unknown }).graphQLErrors
        );
      }
      if (error && typeof error === "object" && "networkError" in error) {
        console.error(
          "❌ [ChatPage] Network Error:",
          (error as { networkError: unknown }).networkError
        );
      }

      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "I apologize, but I encountered an error while processing your request. Please try again.",
        role: "assistant",
        timestamp: new Date(),
      };

      console.log("💔 [ChatPage] Error response created:", errorResponse);
      setMessages((prev) => [...prev, errorResponse]);
      toast.error("Failed to generate response");
    } finally {
      setIsTyping(false);
      console.log("🏁 [ChatPage] handleSendMessage completed");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      console.log("⌨️ [ChatPage] Enter key pressed, sending message");
      handleSendMessage();
    }
  };

  const handleFileSelect = () => {
    console.log("📁 [ChatPage] File selection triggered");
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("📎 [ChatPage] File selected:", {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString(),
      });
      setAttachedFile(file);
      toast.success(`File attached: ${file.name}`);
    } else {
      console.log("⚠️ [ChatPage] No file selected");
    }
  };

  const removeAttachedFile = () => {
    if (attachedFile) {
      console.log(`🗑️ [ChatPage] Removing attached file: ${attachedFile.name}`);
      setAttachedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast.info("File removed");
    }
  };

  const copyToClipboard = (text: string) => {
    console.log(
      `📋 [ChatPage] Copying text to clipboard (${text.length} characters)`
    );
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const regenerateResponse = () => {
    console.log("🔄 [ChatPage] Regenerate response requested");
    toast.info("Regenerating response...");
    // Implementation for regenerating response
  };

  const renderChatContent = () => (
    <ScrollArea ref={scrollAreaRef} className="h-full p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} group`}
          >
            <div className="max-w-[80%]">
              <div
                className={`px-4 py-3 rounded-lg relative ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              </div>
              <div
                className={`flex items-center ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }  gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity`}
              >
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

      {/* Main Layout Container */}
      <div className="flex flex-col h-[calc(100vh-5rem)]">
        {/* Main Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === "chat" ? renderChatContent() : renderHistoryContent()}
        </div>

        {/* Bottom Bar with Message Input */}
        <div className="border-t border-border bg-background p-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Configuration Toggle */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newValue = !showConfiguration;
                  console.log(
                    `⚙️ [ChatPage] Configuration visibility changed: ${showConfiguration} -> ${newValue}`
                  );
                  setShowConfiguration(newValue);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-3 w-3 mr-1" />
                {showConfiguration
                  ? "Hide Configuration"
                  : "Show Configuration"}
              </Button>
            </div>

            {/* Model Selection and Tools */}
            {showConfiguration && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    AI Model:
                  </Label>
                  <Select
                    value={selectedModelId}
                    onValueChange={(value) => {
                      console.log(
                        `🤖 [ChatPage] Model changed from "${selectedModelId}" to "${value}"`
                      );
                      const selectedModel = AVAILABLE_MODELS.find(
                        (m) => m.id === value
                      );
                      if (selectedModel) {
                        console.log(
                          `🤖 [ChatPage] Selected model: "${selectedModel.name}" - ${selectedModel.description}`
                        );
                      }
                      setSelectedModelId(value);
                    }}
                  >
                    <SelectTrigger className="min-w-fit max-w-md h-9">
                      <SelectValue placeholder="Select model">
                        {(() => {
                          const selectedModel = AVAILABLE_MODELS.find(
                            (m) => m.id === selectedModelId
                          );
                          return selectedModel ? (
                            <div className="flex flex-col text-left">
                              <span className="text-sm font-medium">
                                {selectedModel.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {selectedModel.description}
                              </span>
                            </div>
                          ) : (
                            "Select model"
                          );
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_MODELS.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {model.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {model.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Configuration Section */}
            {showConfiguration && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                {/* Template Selection - Full Width */}
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

                {/* System Prompt - Full Width */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">
                    System Prompt
                  </Label>
                  <Select
                    value={systemPrompt}
                    onValueChange={(value) => {
                      console.log(
                        `📝 [ChatPage] System prompt changed from "${systemPrompt}" to "${value}"`
                      );
                      const selectedPrompt = systemPrompts.find(
                        (p) => p.id === value
                      );
                      if (selectedPrompt) {
                        console.log(
                          `📝 [ChatPage] Selected prompt: "${selectedPrompt.name}" - "${selectedPrompt.content.substring(0, 100)}..."`
                        );
                      }
                      setSystemPrompt(value);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select prompt" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default Assistant</SelectItem>
                      {systemPrompts.map((prompt) => (
                        <SelectItem key={prompt.id} value={prompt.id}>
                          {prompt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Databases Section */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Databases
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-8 text-xs justify-start w-full"
                      >
                        {selectedDatabases.length > 0
                          ? `${selectedDatabases.length} database${selectedDatabases.length > 1 ? "s" : ""} selected`
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
                                console.log(
                                  `🗄️ [ChatPage] Database ${e.target.checked ? "selected" : "deselected"}: ${database.name} (ID: ${database.id})`
                                );
                                console.log(
                                  `🗄️ [ChatPage] Current selectedDatabases before change:`,
                                  selectedDatabases
                                );
                                if (e.target.checked) {
                                  setSelectedDatabases((prev) => {
                                    const newSelection = [...prev, database.id];
                                    console.log(
                                      `🗄️ [ChatPage] ✅ Added database - New selection:`,
                                      newSelection
                                    );
                                    console.log(
                                      `🗄️ [ChatPage] ✅ Database names in selection:`,
                                      newSelection.map((id) => {
                                        const db = customDatabases.find(
                                          (d) => d.id === id
                                        );
                                        return db ? db.name : `Unknown(${id})`;
                                      })
                                    );
                                    return newSelection;
                                  });
                                } else {
                                  setSelectedDatabases((prev) => {
                                    const newSelection = prev.filter(
                                      (id) => id !== database.id
                                    );
                                    console.log(
                                      `🗄️ [ChatPage] ❌ Removed database - New selection:`,
                                      newSelection
                                    );
                                    console.log(
                                      `🗄️ [ChatPage] ❌ Database names in selection:`,
                                      newSelection.map((id) => {
                                        const db = customDatabases.find(
                                          (d) => d.id === id
                                        );
                                        return db ? db.name : `Unknown(${id})`;
                                      })
                                    );
                                    return newSelection;
                                  });
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

                {/* Tools Section - Configuration Level 4 */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Tools
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-8 text-xs justify-start w-full"
                      >
                        {selectedTools.length > 0
                          ? `${selectedTools.length} tool${selectedTools.length > 1 ? "s" : ""} selected`
                          : "Select tools"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Select Tools</div>
                        {customTools
                          .filter((tool) => tool.isActive)
                          .map((tool) => (
                            <div
                              key={tool.id}
                              className="flex items-center space-x-2"
                            >
                              <input
                                type="checkbox"
                                id={`tool-${tool.id}`}
                                checked={selectedTools.includes(tool.id)}
                                onChange={(e) => {
                                  console.log(
                                    `🛠️ [ChatPage] Tool ${e.target.checked ? "selected" : "deselected"}: ${tool.name} (ID: ${tool.id})`
                                  );
                                  console.log(
                                    `🛠️ [ChatPage] Current selectedTools before change:`,
                                    selectedTools
                                  );
                                  if (e.target.checked) {
                                    setSelectedTools((prev) => {
                                      const newSelection = [...prev, tool.id];
                                      console.log(
                                        `🛠️ [ChatPage] ✅ Added tool - New selection:`,
                                        newSelection
                                      );
                                      console.log(
                                        `🛠️ [ChatPage] ✅ Tool names in selection:`,
                                        newSelection.map((id) => {
                                          const t = customTools.find(
                                            (t) => t.id === id
                                          );
                                          return t ? t.name : `Unknown(${id})`;
                                        })
                                      );
                                      return newSelection;
                                    });
                                  } else {
                                    setSelectedTools((prev) => {
                                      const newSelection = prev.filter(
                                        (id) => id !== tool.id
                                      );
                                      console.log(
                                        `🛠️ [ChatPage] ❌ Removed tool - New selection:`,
                                        newSelection
                                      );
                                      console.log(
                                        `🛠️ [ChatPage] ❌ Tool names in selection:`,
                                        newSelection.map((id) => {
                                          const t = customTools.find(
                                            (t) => t.id === id
                                          );
                                          return t ? t.name : `Unknown(${id})`;
                                        })
                                      );
                                      return newSelection;
                                    });
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
                        {customTools.filter((tool) => tool.isActive).length ===
                          0 && (
                          <div className="text-sm text-muted-foreground">
                            No active tools available
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Structured Output Section */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Structured Output
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={useStructuredOutput}
                      onCheckedChange={setUseStructuredOutput}
                      className="scale-75"
                    />
                    <Label className="text-xs">
                      Enable JSON Schema Response
                    </Label>
                  </div>

                  {useStructuredOutput && (
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground">
                        JSON Schema
                      </Label>
                      <Textarea
                        value={structuredOutputSchema}
                        onChange={(e) =>
                          setStructuredOutputSchema(e.target.value)
                        }
                        placeholder="Enter JSON schema for structured output..."
                        className="min-h-24 text-xs font-mono"
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        Define the JSON schema for structured responses. The
                        model will return responses following this format.
                      </p>
                    </div>
                  )}
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
                onPressedChange={(pressed) => {
                  const newTab = pressed ? "history" : "chat";
                  console.log(
                    `🔄 [ChatPage] Tab switched from ${activeTab} to ${newTab}`
                  );
                  setActiveTab(newTab);
                }}
                aria-label={
                  activeTab === "chat" ? "Switch to History" : "Switch to Chat"
                }
                className="border"
              >
                <Clock className="h-4 w-4" />
              </Toggle>

              {/* Clear Conversation Button - Only show when on chat tab and has messages */}
              {activeTab === "chat" && messages.length > 0 && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={clearChat}
                        className="border"
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clear Conversation</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}

              <Separator orientation="vertical" className="h-6" />

              {/* Text/Voice Mode Selector - Only show when on chat tab */}
              {activeTab === "chat" && (
                <>
                  <ToggleGroup
                    type="single"
                    value={messageMode}
                    onValueChange={(value) => {
                      if (value) {
                        console.log(
                          `🎙️ [ChatPage] Message mode changed from ${messageMode} to ${value}`
                        );
                        setMessageMode(value as "text" | "voice");
                      }
                    }}
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
                <div className="flex gap-2 flex-1 items-end">
                  <Textarea
                    placeholder={
                      messageMode === "text"
                        ? "Type your message here... (Shift+Enter for new line, Enter to send)"
                        : "Voice mode - click to record"
                    }
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                    disabled={messageMode === "voice"}
                    rows={1}
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
                      <p>Send message (Enter)</p>
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
