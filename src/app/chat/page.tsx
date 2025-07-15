"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ReadmeDisplay } from "@/components/readme-display";

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
import { useState, useEffect, useMemo, useCallback } from "react";
import { useHeader } from "@/components/header-context";
import { Progress } from "@/components/ui/progress";

import { AppHeader } from "@/components/app-header";
import ChatDisplay from "@/components/chat-display";
import ChatInput from "@/components/chat-input";
import {
  Database,
  Settings,
  MessageSquare,
  Clock,
  MoreVertical,
  RefreshCcw,
  Zap,
  Mic,
  Code,
  FileText,
  Plus,
  Trash2,
  Edit,
  Activity,
  AlertTriangle,
} from "lucide-react";
import {
  Message,
  SystemPrompt,
  Database as DatabaseType,
  Template,
} from "@/lib/types";

// Define types for schema properties
type SchemaPropertyType = "string" | "number" | "boolean" | "array" | "object";
type SchemaArrayItemType = "string" | "number" | "boolean" | "object";

interface SchemaProperty {
  id: string;
  name: string;
  type: SchemaPropertyType;
  description: string;
  required: boolean;
  arrayItemType: SchemaArrayItemType;
}

// Define usage data type based on userUsage model
interface UsageData {
  id?: string;
  userId?: string;
  totalTokens: number;
  totalRequests: number;
  inputTokens: number;
  outputTokens: number;
  tokenLimit: number;
  requestLimit: number;
  period: string;
  limitExceeded: boolean;
  tokenLimitExceeded: boolean;
  requestLimitExceeded: boolean;
  lastUpdated?: Date;
  error?: string;
}

import type { Schema } from "../../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { useAuthenticator } from "@aws-amplify/ui-react";

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
  const { user } = useAuthenticator((context) => [context.user]);
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

  // Schema Builder UI State
  const [schemaProperties, setSchemaProperties] = useState<SchemaProperty[]>([
    {
      id: "1",
      name: "answer",
      type: "string",
      description: "The main response to the user's question",
      required: true,
      arrayItemType: "string",
    },
    {
      id: "2",
      name: "confidence",
      type: "number",
      description: "Confidence level from 0 to 1",
      required: false,
      arrayItemType: "string",
    },
    {
      id: "3",
      name: "sources",
      type: "array",
      description: "List of sources used for the response",
      required: false,
      arrayItemType: "string",
    },
  ]);

  const [showSchemaBuilder, setShowSchemaBuilder] = useState(false);

  // Generate JSON Schema from UI properties
  const generateJsonSchema = useCallback(() => {
    const properties: Record<
      string,
      {
        type: SchemaPropertyType;
        description: string;
        items?: { type: SchemaArrayItemType };
      }
    > = {};
    const required: string[] = [];

    schemaProperties.forEach((prop) => {
      if (prop.name.trim()) {
        properties[prop.name] = {
          type: prop.type,
          description: prop.description,
        };

        if (prop.type === "array") {
          properties[prop.name].items = {
            type: prop.arrayItemType,
          };
        }

        if (prop.required) {
          required.push(prop.name);
        }
      }
    });

    const schema = {
      type: "object" as const,
      properties,
      ...(required.length > 0 && { required }),
    };

    return JSON.stringify(schema, null, 2);
  }, [schemaProperties]);

  // Update JSON schema when properties change
  useEffect(() => {
    if (useStructuredOutput) {
      const newSchema = generateJsonSchema();
      setStructuredOutputSchema(newSchema);
    }
  }, [schemaProperties, useStructuredOutput, generateJsonSchema]);

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
  const [isTyping, setIsTyping] = useState(false);
  const [messageMode, setMessageMode] = useState<"text" | "voice">("text");
  const [activeTab, setActiveTab] = useState<"chat" | "history">("chat");
  const [showConfiguration, setShowConfiguration] = useState(true);
  const [showReadme, setShowReadme] = useState(false);

  // Usage tracking state
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [lastUsageUpdate, setLastUsageUpdate] = useState<Date | null>(null);

  // Function to update usage data after API calls
  const updateUsageData = useCallback(
    async (apiUsage?: any) => {
      if (!apiUsage) return;

      console.log(
        "📊 [ChatPage] Updating usage data with API response:",
        apiUsage
      );

      try {
        const today = new Date().toISOString().split("T")[0];

        // Try to find existing record for today
        const existingResult = await client.models.userUsage.list({
          filter: {
            period: { eq: today },
          },
        });
        console.log("🔄 [ChatPage] Existing result:", existingResult);
        console.log("[ChatPage] Existing result:", await client.models.userUsage.list());

        if (existingResult.data && existingResult.data.length > 0) {
          // Update existing record
          const existingRecord = existingResult.data[0];
          const updatedRecord = await client.models.userUsage.update({
            id: existingRecord.id,
            totalTokens:
              (existingRecord.totalTokens || 0) +
              (apiUsage.totalTokens ||
                apiUsage.inputTokens + apiUsage.outputTokens ||
                0),
            totalRequests: (existingRecord.totalRequests || 0) + 1,
            inputTokens:
              (existingRecord.inputTokens || 0) + (apiUsage.inputTokens || 0),
            outputTokens:
              (existingRecord.outputTokens || 0) + (apiUsage.outputTokens || 0),
            lastUpdated: new Date().toISOString(),
          });

          console.log(
            "✅ [ChatPage] Updated existing usage record:",
            updatedRecord
          );
        } else {
          // Create new record for today
          const newRecord = await client.models.userUsage.create({
            userId: user?.userId || user?.username || "unknown",
            period: today,
            totalTokens:
              apiUsage.totalTokens ||
              apiUsage.inputTokens + apiUsage.outputTokens ||
              0,
            totalRequests: 1,
            inputTokens: apiUsage.inputTokens || 0,
            outputTokens: apiUsage.outputTokens || 0,
            tokenLimit: 50000,
            requestLimit: 100,
            lastUpdated: new Date().toISOString(),
          });

          console.log("✅ [ChatPage] Created new usage record:", newRecord);
        }

        // Refresh the display
        fetchUsageData();
      } catch (error) {
        console.error("❌ [ChatPage] Failed to update usage data:", error);
      }
    },
    [user]
  );

  // Function to fetch usage data
  const fetchUsageData = useCallback(async () => {
    console.log("📊 [ChatPage] Fetching usage data...");
    setIsLoadingUsage(true);
    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

      // Query userUsage model for current user and today's period
      const result = await client.models.userUsage.list({
        filter: {
          period: { eq: today },
        },
      });
      console.log("🔄 [ChatPage] Usage data:", result);
      console.log(
        "🔄 [ChatPage] Usage data:",
        await client.models.userUsage.list()
      );

      if (result.errors && result.errors.length > 0) {
        console.error(
          "❌ [ChatPage] Error fetching usage data:",
          result.errors
        );
        throw new Error(result.errors.map((e) => e.message).join(", "));
      }

      if (result.data && result.data.length > 0) {
        // Get the first (and should be only) usage record for today
        const userUsageRecord = result.data[0];

        const usage: UsageData = {
          id: userUsageRecord.id,
          userId: userUsageRecord.userId,
          totalTokens: userUsageRecord.totalTokens || 0,
          totalRequests: userUsageRecord.totalRequests || 0,
          inputTokens: userUsageRecord.inputTokens || 0,
          outputTokens: userUsageRecord.outputTokens || 0,
          tokenLimit: userUsageRecord.tokenLimit || 50000,
          requestLimit: userUsageRecord.requestLimit || 100,
          period: userUsageRecord.period,
          limitExceeded:
            (userUsageRecord.totalTokens || 0) >=
              (userUsageRecord.tokenLimit || 50000) ||
            (userUsageRecord.totalRequests || 0) >=
              (userUsageRecord.requestLimit || 100),
          tokenLimitExceeded:
            (userUsageRecord.totalTokens || 0) >=
            (userUsageRecord.tokenLimit || 50000),
          requestLimitExceeded:
            (userUsageRecord.totalRequests || 0) >=
            (userUsageRecord.requestLimit || 100),
          lastUpdated: userUsageRecord.lastUpdated
            ? new Date(userUsageRecord.lastUpdated)
            : undefined,
        };

        setUsageData(usage);
        setLastUsageUpdate(new Date());
        console.log("✅ [ChatPage] Usage data updated:", {
          tokens: `${usage.totalTokens}/${usage.tokenLimit}`,
          requests: `${usage.totalRequests}/${usage.requestLimit}`,
          limitExceeded: usage.limitExceeded,
        });
      } else {
        // No usage record found for today, create default
        const usage: UsageData = {
          totalTokens: 0,
          totalRequests: 0,
          inputTokens: 0,
          outputTokens: 0,
          tokenLimit: 50000,
          requestLimit: 100,
          period: today,
          limitExceeded: false,
          tokenLimitExceeded: false,
          requestLimitExceeded: false,
        };

        setUsageData(usage);
        setLastUsageUpdate(new Date());
        console.log("✅ [ChatPage] No usage data found, using defaults");
      }
    } catch (error) {
      console.error("❌ [ChatPage] Failed to fetch usage data:", error);
      toast.error("Failed to load usage data");
    } finally {
      setIsLoadingUsage(false);
    }
  }, []);

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

    // Load usage data on mount
    fetchUsageData();
  }, [fetchUsageData]);

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
        console.log(
          "🔧 [ChatPage] Structured output disabled for template application"
        );

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
    [
      selectedDatabases,
      selectedTools,
      customTools,
      clearChat,
      useStructuredOutput,
    ]
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

  const handleSendMessage = async (message: string, files?: File[]) => {
    console.log("🔄 [ChatPage] handleSendMessage called");

    const newMessage: Message = {
      id: Date.now().toString(),
      text: message,
      role: "user",
      timestamp: new Date(),
      files: files,
    };

    console.log("💬 [ChatPage] New user message:", {
      id: newMessage.id,
      text: newMessage.text,
      hasFiles: !!newMessage.files,
      fileCount: newMessage.files?.length || 0,
    });

    setMessages((prev) => [...prev, newMessage]);
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
          console.error(
            "❌ [ChatPage] Invalid JSON schema for structured output:",
            error
          );
          toast.error(
            "Invalid JSON schema for structured output. Please check the format."
          );
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
          features.push(
            `using ${toolsUsedCount} tool${toolsUsedCount > 1 ? "s" : ""}: ${toolNames}`
          );
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

        // Update usage data after successful response
        await updateUsageData(responseData.usage);
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
    <ChatDisplay
      messages={messages}
      isTyping={isTyping}
      onCopy={copyToClipboard}
      onRegenerate={regenerateResponse}
    />
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

  // Usage display component
  const renderUsageDisplay = () => {
    if (!usageData) {
      return (
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">
            Daily Usage
          </Label>
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded text-xs">
            {isLoadingUsage ? (
              <>
                <Activity className="h-3 w-3 animate-pulse" />
                <span className="text-muted-foreground">Loading usage...</span>
              </>
            ) : (
              <>
                <Activity className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Usage data unavailable
                </span>
              </>
            )}
          </div>
        </div>
      );
    }

    const tokenUsagePercent = Math.min(
      (usageData.totalTokens / usageData.tokenLimit) * 100,
      100
    );
    const requestUsagePercent = Math.min(
      (usageData.totalRequests / usageData.requestLimit) * 100,
      100
    );

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground">
            Daily Usage
          </Label>
          <div className="flex items-center gap-1">
            {usageData.limitExceeded && (
              <AlertTriangle className="h-3 w-3 text-red-500" />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchUsageData}
              disabled={isLoadingUsage}
              className="h-5 w-5 p-0"
            >
              <Activity
                className={`h-3 w-3 ${isLoadingUsage ? "animate-pulse" : ""}`}
              />
            </Button>
          </div>
        </div>

        <div className="space-y-2 p-2 bg-muted/30 rounded">
          {/* Token Usage */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Tokens</span>
              <span
                className={`font-mono ${usageData.tokenLimitExceeded ? "text-red-500" : "text-foreground"}`}
              >
                {usageData.totalTokens.toLocaleString()}/
                {usageData.tokenLimit.toLocaleString()}
              </span>
            </div>
            <Progress value={tokenUsagePercent} className="h-1" />
          </div>

          {/* Request Usage */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Requests</span>
              <span
                className={`font-mono ${usageData.requestLimitExceeded ? "text-red-500" : "text-foreground"}`}
              >
                {usageData.totalRequests}/{usageData.requestLimit}
              </span>
            </div>
            <Progress value={requestUsagePercent} className="h-1" />
          </div>

          {/* Token Breakdown */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Input: {usageData.inputTokens.toLocaleString()}</span>
            <span>Output: {usageData.outputTokens.toLocaleString()}</span>
          </div>

          {/* Period and Last Updated */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Period: {usageData.period}</span>
            {lastUsageUpdate && (
              <span>Updated: {lastUsageUpdate.toLocaleTimeString()}</span>
            )}
          </div>

          {/* Error Display */}
          {usageData.error && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950 p-1 rounded">
              Error: {usageData.error}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* App Header */}
      <AppHeader />

      {/* Main Layout Container */}
      <div className="flex flex-col h-[calc(100vh-5rem)]">
        {/* README Display Section */}
        {showReadme && (
          <div className="border-b border-border p-4 bg-muted/30">
            <ReadmeDisplay
              path="/app/chat/README.md"
              title="Chat Documentation"
              className="max-w-4xl mx-auto"
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === "chat" ? renderChatContent() : renderHistoryContent()}
        </div>

        {/* Bottom Bar with Message Input */}
        <div className="border-t border-border bg-background p-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Configuration and README Toggles */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReadme(!showReadme)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  {showReadme ? "Hide Documentation" : "Show Documentation"}
                </Button>
              </div>
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
                {/* Usage Display */}
                {renderUsageDisplay()}

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
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Response Structure
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setShowSchemaBuilder(!showSchemaBuilder)
                          }
                          className="h-6 text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          {showSchemaBuilder ? "Hide Builder" : "Show Builder"}
                        </Button>
                      </div>

                      {showSchemaBuilder && (
                        <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                          <div className="space-y-2">
                            {schemaProperties.map((property, index) => (
                              <div
                                key={property.id}
                                className="flex items-center gap-2 p-2 border rounded bg-background"
                              >
                                <div className="grid grid-cols-3 gap-2 flex-1">
                                  <Input
                                    placeholder="Property name"
                                    value={property.name}
                                    onChange={(e) => {
                                      const newProperties = [
                                        ...schemaProperties,
                                      ];
                                      newProperties[index].name =
                                        e.target.value;
                                      setSchemaProperties(newProperties);
                                    }}
                                    className="h-7 text-xs"
                                  />
                                  <Select
                                    value={property.type}
                                    onValueChange={(value) => {
                                      const newProperties = [
                                        ...schemaProperties,
                                      ];
                                      newProperties[index].type =
                                        value as SchemaPropertyType;
                                      setSchemaProperties(newProperties);
                                    }}
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="string">
                                        String
                                      </SelectItem>
                                      <SelectItem value="number">
                                        Number
                                      </SelectItem>
                                      <SelectItem value="boolean">
                                        Boolean
                                      </SelectItem>
                                      <SelectItem value="array">
                                        Array
                                      </SelectItem>
                                      <SelectItem value="object">
                                        Object
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {property.type === "array" && (
                                    <Select
                                      value={property.arrayItemType}
                                      onValueChange={(value) => {
                                        const newProperties = [
                                          ...schemaProperties,
                                        ];
                                        newProperties[index].arrayItemType =
                                          value as SchemaArrayItemType;
                                        setSchemaProperties(newProperties);
                                      }}
                                    >
                                      <SelectTrigger className="h-7 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="string">
                                          String items
                                        </SelectItem>
                                        <SelectItem value="number">
                                          Number items
                                        </SelectItem>
                                        <SelectItem value="boolean">
                                          Boolean items
                                        </SelectItem>
                                        <SelectItem value="object">
                                          Object items
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                  {property.type !== "array" && (
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={property.required}
                                        onChange={(e) => {
                                          const newProperties = [
                                            ...schemaProperties,
                                          ];
                                          newProperties[index].required =
                                            e.target.checked;
                                          setSchemaProperties(newProperties);
                                        }}
                                        className="rounded border-border scale-75"
                                      />
                                      <Label className="text-xs">
                                        Required
                                      </Label>
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const newProperties =
                                      schemaProperties.filter(
                                        (_, i) => i !== index
                                      );
                                    setSchemaProperties(newProperties);
                                  }}
                                  className="h-7 w-7"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            {schemaProperties.map((property, index) => (
                              <Input
                                key={property.id}
                                placeholder={`Description for ${property.name || "property"}`}
                                value={property.description}
                                onChange={(e) => {
                                  const newProperties = [...schemaProperties];
                                  newProperties[index].description =
                                    e.target.value;
                                  setSchemaProperties(newProperties);
                                }}
                                className="h-7 text-xs"
                              />
                            ))}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newProperty: SchemaProperty = {
                                id: Date.now().toString(),
                                name: "",
                                type: "string",
                                description: "",
                                required: false,
                                arrayItemType: "string",
                              };
                              setSchemaProperties([
                                ...schemaProperties,
                                newProperty,
                              ]);
                            }}
                            className="h-7 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Property
                          </Button>
                        </div>
                      )}

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Generated JSON Schema
                        </Label>
                        <Textarea
                          value={structuredOutputSchema}
                          onChange={(e) =>
                            setStructuredOutputSchema(e.target.value)
                          }
                          placeholder="Generated JSON schema..."
                          className="min-h-24 text-xs font-mono"
                          rows={4}
                          readOnly={showSchemaBuilder}
                        />
                        <p className="text-xs text-muted-foreground">
                          {showSchemaBuilder
                            ? "This schema is automatically generated from the builder above."
                            : "You can edit this schema directly or use the visual builder above."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
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
                <div className="flex-1">
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    placeholder={
                      messageMode === "text"
                        ? "Type your message here... (Shift+Enter for new line, Enter to send)"
                        : "Voice mode - click to record"
                    }
                    disabled={messageMode === "voice" || isTyping}
                    allowFileAttach={true}
                  />
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
