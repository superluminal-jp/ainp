"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useSimpleHeader } from "@/components/use-page-header";
import { AppHeader } from "@/components/app-header";
import { ReadmeDisplay } from "@/components/readme-display";
import ChatAssistant from "@/components/chat-assistant";
import {
  Edit,
  Trash2,
  Wrench,
  Save,
  X,
  Check,
  Code,
  FileText,
  Play,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

import type { Schema } from "../../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { toast } from "sonner";
import type { ToolSuggestion } from "@/lib/types";

const client = generateClient<Schema>();

// Type definitions for testing
type ToolInputValue =
  | string
  | number
  | boolean
  | unknown[]
  | Record<string, unknown>;

interface TestResultData {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  error?: string;
  error_type?: string;
  validation_errors?: Record<string, unknown>;
  input_used?: Record<string, unknown>;
  request_id?: string;
  execution_time_ms?: number;
}

interface TestToolResult {
  data: TestResultData;
}

/**
 * Interface for tool input schema property
 */
interface SchemaProperty {
  type: string;
  description: string;
  items?: { type: string };
}

/**
 * Interface for tool input schema
 */
interface InputSchema {
  type: string;
  properties: Record<string, SchemaProperty>;
  required: string[];
}

/**
 * Interface for tool specification
 */
interface ToolSpec {
  name: string;
  description: string;
  inputSchema: InputSchema;
  executionCode?: string;
  requirements?: string;
  isActive: boolean;
}

export default function ToolsPage() {
  useSimpleHeader(
    "Custom Tools",
    "Manage custom tools and their execution code"
  );

  const [toolSpecs, setToolSpecs] = useState<Schema["toolSpecs"]["type"][]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTool, setEditingTool] = useState<
    Schema["toolSpecs"]["type"] | null
  >(null);
  const [formData, setFormData] = useState<ToolSpec>({
    name: "",
    description: "",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    executionCode: "",
    requirements: "",
    isActive: true,
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Schema property management
  const [newProperty, setNewProperty] = useState({
    name: "",
    type: "string",
    description: "",
    required: false,
  });

  // UI state
  const [showReadme, setShowReadme] = useState(false);

  // Testing state
  const [testingTool, setTestingTool] = useState<
    Schema["toolSpecs"]["type"] | null
  >(null);
  const [testInput, setTestInput] = useState<Record<string, ToolInputValue>>(
    {}
  );
  const [testResult, setTestResult] = useState<TestToolResult | null>(null);
  const [isTestingLoading, setIsTestingLoading] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);

  // AI Assistant system prompt
  const TOOLS_ASSISTANT_PROMPT = `You are an expert AI assistant specialized in helping users create custom tools with Python Lambda functions. Your role is to:

**Primary Functions:**
- Generate Python Lambda function code for custom tools
- Create comprehensive input schemas for tool parameters
- Suggest appropriate Python package requirements
- Provide optimization and best practice guidance
- Help users understand tool development concepts

**Response Format:**
You will use structured output to return a JSON object with the tool specification. The response will be automatically formatted as JSON with the following fields:

- **name**: Tool name in snake_case format (e.g., "generate_random_number", "validate_email_address") (string)
- **description**: Detailed tool description (string)
- **requirements**: Python package requirements, one per line (string)
- **executionCode**: Complete Python Lambda function code (string)
- **inputSchema**: JSON schema object with type, properties, and required fields

**Example Response:**
When a user asks "Create a simple greeting tool", you would return:

{
  "name": "hello_world",
  "description": "A simple tool that returns a personalized greeting message",
  "requirements": "",
  "executionCode": "import json\\n\\ndef handler(event, context):\\n    \\"\\"\\"\\n    Simple hello world tool\\n    \\"\\"\\"\\n    try:\\n        # Get the input parameters\\n        tool_input = event.get('tool_input', {})\\n        name = tool_input.get('name', 'World')\\n        \\n        # Create the greeting\\n        greeting = f\\"Hello, {name}!\\"\\n        \\n        # Return success response\\n        return {\\n            \\"statusCode\\": 200,\\n            \\"headers\\": {\\n                \\"Content-Type\\": \\"application/json\\",\\n                \\"Access-Control-Allow-Origin\\": \\"*\\"\\n            },\\n            \\"body\\": json.dumps({\\n                \\"success\\": True,\\n                \\"message\\": \\"Greeting created successfully\\",\\n                \\"data\\": {\\n                    \\"greeting\\": greeting,\\n                    \\"name\\": name\\n                }\\n            })\\n        }\\n        \\n    except Exception as e:\\n        # Return error response\\n        return {\\n            \\"statusCode\\": 500,\\n            \\"headers\\": {\\n                \\"Content-Type\\": \\"application/json\\",\\n                \\"Access-Control-Allow-Origin\\": \\"*\\"\\n            },\\n            \\"body\\": json.dumps({\\n                \\"success\\": False,\\n                \\"message\\": f\\"Error: {str(e)}\\"\\n            })\\n        }",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "The name to greet"
      }
    },
    "required": ["name"]
  }
}

**Code Standards:**
- Generate AWS Lambda-compatible Python code
- Tool name must be in snake_case format (e.g., "generate_random_number", "validate_email_address")
- Handler function must be named handler
- Include proper error handling and response formatting
- Use type hints and docstrings
- Follow security best practices
- Return standardized JSON responses
- Use proper line breaks and formatting in code

**Important Notes:**
- Response will be automatically formatted as structured JSON
- Include all required fields: name, description, requirements, executionCode, inputSchema
- Requirements should list Python packages one per line
- Make tools practical and immediately usable

Be helpful, practical, and provide actionable suggestions that users can immediately apply to their tool development.`;

  useEffect(() => {
    // Subscribe to real-time updates for all tool specs
    const sub = client.models.toolSpecs.observeQuery().subscribe({
      next: ({ items }) => {
        setToolSpecs([...items]);
      },
      error: (error) => {
        console.error("Error in real-time subscription:", error);
      },
    });

    return () => sub.unsubscribe();
  }, []);

  // Initialize form with default values only when there are no tools
  useEffect(() => {
    if (toolSpecs.length === 0 && !isEditing) {
      setFormData({
        name: "hello_world",
        description: "A simple tool that returns a greeting message",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name to greet",
            },
          },
          required: ["name"],
        },
        executionCode: `import json

def handler(event, context):
    """
    Simple hello world tool
    """
    try:
        # Get the input parameters
        tool_input = event.get('tool_input', {})
        name = tool_input.get('name', 'World')
        
        # Create the greeting
        greeting = f"Hello, {name}!"
        
        # Return success response
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "success": True,
                "message": "Greeting created successfully",
                "data": {
                    "greeting": greeting,
                    "name": name
                }
            })
        }
        
    except Exception as e:
        # Return error response
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "success": False,
                "message": f"Error: {str(e)}"
            })
        }`,
        requirements: "",
        isActive: true,
      });
    }
  }, [toolSpecs.length, isEditing]);

  const handleAddTool = async () => {
    console.log("handleAddTool", formData);
    if (!formData.name.trim() || !formData.description.trim()) return;

    setLoading(true);
    try {
      const response = await client.models.toolSpecs.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        inputSchema: JSON.stringify(formData.inputSchema),
        executionCode: formData.executionCode || "",
        requirements: formData.requirements || "",
        isActive: formData.isActive,
      });
      console.log("response", response);
      resetForm();
    } catch (error) {
      console.error("Error creating tool:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTool = (tool: Schema["toolSpecs"]["type"]) => {
    setEditingTool(tool);
    setFormData({
      name: tool.name,
      description: tool.description,
      inputSchema:
        typeof tool.inputSchema === "string"
          ? JSON.parse(tool.inputSchema)
          : (tool.inputSchema as InputSchema),
      executionCode: tool.executionCode || "",
      requirements: tool.requirements || "",
      isActive: tool.isActive ?? true,
    });
    setIsEditing(true);
  };

  const handleUpdateTool = async () => {
    if (!editingTool || !formData.name.trim() || !formData.description.trim())
      return;

    setLoading(true);
    try {
      await client.models.toolSpecs.update({
        id: editingTool.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        inputSchema: JSON.stringify(formData.inputSchema),
        executionCode: formData.executionCode || "",
        requirements: formData.requirements || "",
        isActive: formData.isActive,
      });

      resetForm();
    } catch (error) {
      console.error("Error updating tool:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTool = async (id: string) => {
    setLoading(true);
    try {
      await client.models.toolSpecs.delete({ id });
    } catch (error) {
      console.error("Error deleting tool:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleToolActive = async (id: string) => {
    const tool = toolSpecs.find((t) => t.id === id);
    if (!tool) return;

    setLoading(true);
    try {
      await client.models.toolSpecs.update({
        id,
        isActive: !tool.isActive,
      });
    } catch (error) {
      console.error("Error updating tool:", error);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    resetForm();
  };

  const resetForm = () => {
    // Only show default values if there are no tools
    if (toolSpecs.length === 0) {
      setFormData({
        name: "hello_world",
        description: "A simple tool that returns a greeting message",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name to greet",
            },
          },
          required: ["name"],
        },
        executionCode: `import json

def handler(event, context):
    """
    Simple hello world tool
    """
    try:
        # Get the input parameters
        tool_input = event.get('tool_input', {})
        name = tool_input.get('name', 'World')
        
        # Create the greeting
        greeting = f"Hello, {name}!"
        
        # Return success response
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "success": True,
                "message": "Greeting created successfully",
                "data": {
                    "greeting": greeting,
                    "name": name
                }
            })
        }
        
    except Exception as e:
        # Return error response
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "success": False,
                "message": f"Error: {str(e)}"
            })
        }`,
        requirements: "",
        isActive: true,
      });
    } else {
      // If there are existing tools, start with empty form
      setFormData({
        name: "",
        description: "",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
        executionCode: "",
        requirements: "",
        isActive: true,
      });
    }
    setEditingTool(null);
    setIsEditing(false);
  };

  const clearForm = () => {
    console.log("🗑️ Clearing form data");
    setFormData({
      name: "",
      description: "",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
      executionCode: "",
      requirements: "",
      isActive: true,
    });
  };

  const copyToolCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const addSchemaProperty = () => {
    if (!newProperty.name.trim()) return;

    const property: SchemaProperty = {
      type: newProperty.type,
      description: newProperty.description,
    };

    if (newProperty.type === "array") {
      property.items = { type: "string" };
    }

    setFormData((prev) => ({
      ...prev,
      inputSchema: {
        ...prev.inputSchema,
        properties: {
          ...prev.inputSchema.properties,
          [newProperty.name]: property,
        },
        required: newProperty.required
          ? [...prev.inputSchema.required, newProperty.name]
          : prev.inputSchema.required,
      },
    }));

    setNewProperty({
      name: "",
      type: "string",
      description: "",
      required: false,
    });
  };

  const handleSuggestionReceived = (suggestions: ToolSuggestion) => {
    console.log("🔍 AI suggestions received:", suggestions);
    console.log("🔍 Suggestions type:", typeof suggestions);
    console.log("🔍 Suggestions keys:", Object.keys(suggestions || {}));

    // Apply suggestions to form data
    setFormData((prev) => {
      const updated = { ...prev };

      if (suggestions.name) {
        updated.name = suggestions.name;
        console.log("✅ Applied name suggestion:", suggestions.name);
      }

      if (suggestions.description) {
        updated.description = suggestions.description;
        console.log(
          "✅ Applied description suggestion:",
          suggestions.description
        );
      }

      if (suggestions.executionCode) {
        // Use structured output directly (no escape conversion needed)
        updated.executionCode = suggestions.executionCode;
        console.log(
          "✅ Applied execution code suggestion (length):",
          suggestions.executionCode.length
        );
        console.log(
          "✅ Execution code preview:",
          updated.executionCode?.substring(0, 100) + "..."
        );
      } else {
        console.log("❌ No executionCode found in suggestions");
      }

      if (suggestions.requirements) {
        // Use structured output directly (no escape conversion needed)
        updated.requirements = suggestions.requirements;
        console.log(
          "✅ Applied requirements suggestion:",
          updated.requirements
        );
      }

      if (suggestions.inputSchema) {
        // Handle input schema suggestions
        try {
          const schema =
            typeof suggestions.inputSchema === "string"
              ? JSON.parse(suggestions.inputSchema)
              : suggestions.inputSchema;

          if (schema.properties) {
            // Convert schema properties to the expected format
            const convertedProperties: Record<string, SchemaProperty> = {};

            Object.entries(schema.properties).forEach(([key, propValue]) => {
              const prop = propValue as {
                type?: string;
                description?: string;
                items?: { type: string };
              };
              convertedProperties[key] = {
                type: prop.type || "string",
                description: prop.description || "",
                ...(prop.type === "array" && prop.items
                  ? { items: prop.items }
                  : {}),
              };
            });

            updated.inputSchema = {
              type: "object",
              properties: convertedProperties,
              required: schema.required || [],
            };

            console.log("Applied input schema suggestion:", {
              properties: convertedProperties,
              required: schema.required || [],
              originalSchema: schema,
              propertyCount: Object.keys(convertedProperties).length,
            });

            // Force a re-render by updating form data in next tick
            setTimeout(() => {
              console.log("Current form data after schema update:", {
                schemaProperties: Object.keys(updated.inputSchema.properties),
                propertyCount: Object.keys(updated.inputSchema.properties)
                  .length,
              });
            }, 0);
          }
        } catch (error) {
          console.error("Error parsing input schema suggestion:", error);
        }
      }

      return updated;
    });

    // Show success message
    const appliedFields = [];
    if (suggestions.name) appliedFields.push("name");
    if (suggestions.description) appliedFields.push("description");
    if (suggestions.executionCode) appliedFields.push("code");
    if (suggestions.requirements) appliedFields.push("requirements");
    if (suggestions.inputSchema) appliedFields.push("schema");

    if (appliedFields.length > 0) {
      toast.success(`Applied AI suggestions to: ${appliedFields.join(", ")}`);
    }
  };

  const removeSchemaProperty = (propertyName: string) => {
    setFormData((prev) => {
      const newProperties = { ...prev.inputSchema.properties };
      delete newProperties[propertyName];

      const newRequired = prev.inputSchema.required.filter(
        (req) => req !== propertyName
      );

      return {
        ...prev,
        inputSchema: {
          ...prev.inputSchema,
          properties: newProperties,
          required: newRequired,
        },
      };
    });
  };

  const handleTestTool = (tool: Schema["toolSpecs"]["type"]) => {
    setTestingTool(tool);
    setTestInput({});
    setTestResult(null);
    setShowTestDialog(true);
  };

  const executeTest = async () => {
    if (!testingTool) return;

    setIsTestingLoading(true);
    setTestResult(null);

    try {
      console.log("🔍 Testing tool:", testingTool);
      console.log("🔍 Test input:", testInput);

      // Ensure testInput is a plain object that can be serialized to JSON
      const cleanInput = JSON.parse(JSON.stringify(testInput));
      console.log("🔍 Clean input:", cleanInput);

      const response = await client.queries.testTool({
        toolId: testingTool.id,
        toolInput: JSON.stringify(cleanInput),
      });
      console.log("🔍 Test tool response:", response);

      setTestResult(response as TestToolResult);
    } catch (error) {
      console.error("Error testing tool:", error);
      setTestResult({
        data: {
          success: false,
          error: `Failed to test tool: ${error}`,
          error_type: "client_error",
        },
      });
    } finally {
      setIsTestingLoading(false);
    }
  };

  const generateTestInputForm = () => {
    if (!testingTool) return null;

    const schema =
      typeof testingTool.inputSchema === "string"
        ? JSON.parse(testingTool.inputSchema)
        : (testingTool.inputSchema as InputSchema);

    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Fill in the input parameters to test the tool:
        </div>

        {Object.entries(schema.properties || {}).map(([name, prop]) => {
          const property = prop as SchemaProperty;
          const isRequired = schema.required?.includes(name);

          return (
            <div key={name} className="space-y-2">
              <Label className="text-sm font-medium">
                {name}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <p className="text-xs text-muted-foreground">
                {property.description}
              </p>

              {property.type === "string" && (
                <Input
                  value={
                    typeof testInput[name] === "string"
                      ? (testInput[name] as string)
                      : ""
                  }
                  onChange={(e) =>
                    setTestInput((prev) => ({
                      ...prev,
                      [name]: e.target.value,
                    }))
                  }
                  placeholder={`Enter ${name}`}
                  className="text-sm"
                />
              )}

              {property.type === "number" && (
                <Input
                  type="number"
                  value={
                    typeof testInput[name] === "number"
                      ? (testInput[name] as number)
                      : ""
                  }
                  onChange={(e) =>
                    setTestInput((prev) => ({
                      ...prev,
                      [name]: e.target.value ? Number(e.target.value) : 0,
                    }))
                  }
                  placeholder={`Enter ${name}`}
                  className="text-sm"
                />
              )}

              {property.type === "boolean" && (
                <Select
                  value={
                    typeof testInput[name] === "boolean"
                      ? testInput[name].toString()
                      : ""
                  }
                  onValueChange={(value) =>
                    setTestInput((prev) => ({
                      ...prev,
                      [name]: value === "true",
                    }))
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder={`Select ${name}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {property.type === "array" && (
                <Textarea
                  value={testInput[name] ? JSON.stringify(testInput[name]) : ""}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setTestInput((prev) => ({ ...prev, [name]: parsed }));
                    } catch {
                      setTestInput((prev) => ({
                        ...prev,
                        [name]: e.target.value,
                      }));
                    }
                  }}
                  placeholder={`Enter ${name} as JSON array`}
                  className="text-sm font-mono"
                  rows={3}
                />
              )}

              {property.type === "object" && (
                <Textarea
                  value={
                    testInput[name]
                      ? JSON.stringify(testInput[name], null, 2)
                      : ""
                  }
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setTestInput((prev) => ({ ...prev, [name]: parsed }));
                    } catch {
                      setTestInput((prev) => ({
                        ...prev,
                        [name]: e.target.value,
                      }));
                    }
                  }}
                  placeholder={`Enter ${name} as JSON object`}
                  className="text-sm font-mono"
                  rows={4}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const formatJsonValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return String(value);
    }

    // If it's already a string, try to parse it as JSON
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return JSON.stringify(parsed, null, 2);
      } catch {
        // If parsing fails, return as-is
        return value;
      }
    }

    // If it's an object, stringify it with formatting
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }

    // For primitive values, return as string
    return String(value);
  };

  const renderTestResult = () => {
    if (!testResult) return null;

    const result = (testResult as TestToolResult)?.data;
    const isSuccess = result?.success;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {isSuccess ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <span
            className={`text-sm font-medium ${isSuccess ? "text-green-700" : "text-red-700"}`}
          >
            {isSuccess ? "Test Passed" : "Test Failed"}
          </span>
          {result?.execution_time_ms && (
            <Badge variant="outline" className="ml-auto">
              <Clock className="h-3 w-3 mr-1" />
              {result.execution_time_ms}ms
            </Badge>
          )}
        </div>

        {result?.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm font-medium text-red-800">Error:</p>
            <p className="text-sm text-red-700">{String(result.error)}</p>
            {result.error_type && (
              <p className="text-xs text-red-600 mt-1">
                Type: {String(result.error_type)}
              </p>
            )}
          </div>
        )}

        {result?.validation_errors && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm font-medium text-yellow-800">
              Validation Errors:
            </p>
            <pre className="text-sm text-yellow-700 mt-1">
              {formatJsonValue(result.validation_errors) as string}
            </pre>
          </div>
        )}

        {result?.data && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-sm font-medium text-gray-800">Result:</p>
            <pre className="text-sm text-gray-700 mt-1 max-h-64 overflow-auto">
              {formatJsonValue(result.data) as string}
            </pre>
          </div>
        )}

        {result?.input_used && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-medium text-blue-800">Input Used:</p>
            <pre className="text-sm text-blue-700 mt-1">
              {formatJsonValue(result.input_used) as string}
            </pre>
          </div>
        )}

        {result?.request_id && (
          <p className="text-xs text-muted-foreground">
            Request ID: {String(result.request_id)}
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <AppHeader />
      <div className="h-[calc(100vh-5rem)] bg-background text-foreground flex flex-col">
        {/* README Display Section */}
        {showReadme && (
          <div className="border-b border-border p-4 bg-muted/30">
            <ReadmeDisplay
              path="/app/tools/README.md"
              title="Tools Documentation"
              className="max-w-6xl mx-auto"
            />
          </div>
        )}

        <div className="flex-1 flex">
          {/* Form Panel */}
          <div className="w-1/4 border-r border-border p-3">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    {isEditing ? "Edit Tool" : "Create New Tool"}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReadme(!showReadme)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    {showReadme ? "Hide Docs" : "Show Docs"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-3 overflow-y-auto">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs">
                    Tool Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., hello_world, simple_calculator"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
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
                    placeholder="A simple tool that..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="min-h-20 text-xs resize-none"
                  />
                </div>

                {/* Input Schema Section */}
                <div className="space-y-2">
                  <Label className="text-xs">Input Schema</Label>

                  {/* Add new property */}
                  <div className="grid grid-cols-5 gap-1">
                    <div className="space-y-1">
                      <Label className="text-xs">Property</Label>
                      <Input
                        placeholder="name"
                        value={newProperty.name}
                        onChange={(e) =>
                          setNewProperty((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={newProperty.type}
                        onValueChange={(value) =>
                          setNewProperty((prev) => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="array">Array</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input
                        placeholder="The name to greet"
                        value={newProperty.description}
                        onChange={(e) =>
                          setNewProperty((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Required</Label>
                      <div className="flex items-center justify-center h-8">
                        <input
                          type="checkbox"
                          id="required"
                          checked={newProperty.required}
                          onChange={(e) =>
                            setNewProperty((prev) => ({
                              ...prev,
                              required: e.target.checked,
                            }))
                          }
                          className="rounded"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={addSchemaProperty}
                    size="sm"
                    variant="outline"
                    disabled={!newProperty.name.trim()}
                    className="h-6 text-xs"
                  >
                    Add Property
                  </Button>

                  {/* Schema properties list */}
                  {Object.keys(formData.inputSchema.properties).length > 0 && (
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      <Label className="text-xs">Schema Properties:</Label>
                      <div className="space-y-1">
                        {Object.entries(formData.inputSchema.properties).map(
                          ([name, prop]) => (
                            <div
                              key={name}
                              className="flex items-center justify-between p-1 bg-muted rounded text-xs"
                            >
                              <div className="flex items-center space-x-1">
                                <span className="font-medium">{name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {prop.type}
                                </Badge>
                                {formData.inputSchema.required.includes(
                                  name
                                ) && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    Required
                                  </Badge>
                                )}
                                <span className="text-muted-foreground">
                                  {prop.description}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeSchemaProperty(name)}
                                className="h-4 w-4 p-0"
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Requirements Section */}
                <div className="space-y-1">
                  <Label htmlFor="requirements" className="text-xs">
                    Requirements (pip packages)
                  </Label>
                  <Textarea
                    id="requirements"
                    placeholder={`# No external packages needed for simple tools
# Example packages:
# requests
# pandas
# numpy
# beautifulsoup4==4.11.1
# python-dateutil`}
                    value={formData.requirements}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        requirements: e.target.value,
                      }))
                    }
                    className="min-h-20 text-xs font-mono resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    List pip packages (one per line) that this tool requires.
                  </p>
                </div>

                {/* Execution Code Section */}
                <div className="space-y-1 flex-1 flex flex-col">
                  <Label htmlFor="executionCode" className="text-xs">
                    Execution Code (Python)
                  </Label>
                  <Textarea
                    id="executionCode"
                    placeholder={`import json

def handler(event, context):
    """
    Simple hello world tool
    """
    try:
        # Get the input parameters
        tool_input = event.get('tool_input', {})
        name = tool_input.get('name', 'World')
        
        # Create the greeting
        greeting = f"Hello, {name}!"
        
        # Return success response
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "success": True,
                "message": "Greeting created successfully",
                "data": {
                    "greeting": greeting,
                    "name": name
                }
            })
        }
        
    except Exception as e:
        # Return error response
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "success": False,
                "message": f"Error: {str(e)}"
            })
        }`}
                    value={formData.executionCode}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        executionCode: e.target.value,
                      }))
                    }
                    className="flex-1 text-xs font-mono resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={isEditing ? handleUpdateTool : handleAddTool}
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    disabled={
                      !formData.name.trim() ||
                      !formData.description.trim() ||
                      loading
                    }
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {loading ? "Saving..." : isEditing ? "Update" : "Create"}
                  </Button>

                  {isEditing && (
                    <Button
                      variant="outline"
                      onClick={cancelEdit}
                      size="sm"
                      className="h-7 text-xs"
                      disabled={loading}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  )}

                  {!isEditing && (
                    <Button
                      variant="outline"
                      onClick={clearForm}
                      size="sm"
                      className="h-7 text-xs"
                      disabled={loading}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Assistant Panel */}
          <div className="w-1/3 border-r border-border p-3">
            <ChatAssistant
              title="Tools Assistant"
              placeholder="Ask me to help create a tool, generate code, or suggest improvements..."
              systemPrompt={TOOLS_ASSISTANT_PROMPT}
              onSuggestionReceived={handleSuggestionReceived}
              suggestionType="tool"
            />
          </div>

          {/* Tools List */}
          <div className="flex-1 p-3 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Custom Tools</h2>
              <Badge variant="outline" className="text-xs">
                {toolSpecs.length} Tools
              </Badge>
            </div>

            <ScrollArea className="flex-1">
              {toolSpecs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No custom tools created yet</p>
                  <p className="text-xs">
                    Create your first custom tool using the form
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {toolSpecs.map((tool) => (
                    <Card
                      key={tool.id}
                      className={`hover:bg-muted/50 ${
                        !(tool.isActive ?? true) ? "opacity-50" : ""
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-medium">
                                {tool.name}
                              </h4>
                              <Switch
                                checked={tool.isActive ?? true}
                                onCheckedChange={() =>
                                  toggleToolActive(tool.id)
                                }
                                className="scale-75"
                              />
                              <Label className="text-xs">Active</Label>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {tool.description}
                            </p>

                            {/* Schema Preview */}
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Input Schema:
                              </Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(() => {
                                  const schema =
                                    typeof tool.inputSchema === "string"
                                      ? JSON.parse(tool.inputSchema)
                                      : (tool.inputSchema as InputSchema);
                                  return Object.entries(
                                    schema.properties || {}
                                  ).map(([name, prop]) => (
                                    <Badge
                                      key={name}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {name}: {(prop as SchemaProperty).type}
                                      {schema.required?.includes(name) && " *"}
                                    </Badge>
                                  ));
                                })()}
                              </div>
                            </div>

                            {/* Requirements Preview */}
                            {tool.requirements && (
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Requirements:
                                </Label>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {tool.requirements
                                    .split("\n")
                                    .filter((req) => req.trim())
                                    .map((req, index) => (
                                      <Badge
                                        key={index}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {req.trim()}
                                      </Badge>
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* Execution Code Preview */}
                            {tool.executionCode && (
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Execution Code:
                                </Label>
                                <div className="mt-1 p-1 bg-muted rounded text-xs font-mono max-h-16 overflow-auto">
                                  {tool.executionCode.length > 100
                                    ? `${tool.executionCode.substring(0, 100)}...`
                                    : tool.executionCode}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleTestTool(tool)}
                              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                              title="Test tool"
                              disabled={!(tool.isActive ?? true)}
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                copyToolCode(tool.executionCode || "", tool.id)
                              }
                              className="h-6 w-6 p-0"
                              title="Copy execution code"
                            >
                              {copiedId === tool.id ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Code className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditTool(tool)}
                              className="h-6 w-6 p-0"
                              title="Edit tool"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTool(tool.id)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              title="Delete tool"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Test Tool Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Test Tool: {testingTool?.name}
            </DialogTitle>
            <DialogDescription>
              Test your custom tool with sample inputs to verify it works
              correctly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Input Form */}
            <div>
              <h3 className="text-sm font-medium mb-3">Tool Input</h3>
              {generateTestInputForm()}
            </div>

            {/* Test Button */}
            <div className="flex justify-between items-center">
              <Button
                onClick={executeTest}
                disabled={isTestingLoading}
                className="flex items-center gap-2"
              >
                {isTestingLoading ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Test
                  </>
                )}
              </Button>

              {testResult ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setTestResult(null);
                    setTestInput({});
                  }}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear Results
                </Button>
              ) : null}
            </div>

            {/* Test Results */}
            {testResult !== null && (
              <div>
                <h3 className="text-sm font-medium mb-3">Test Results</h3>
                {renderTestResult()}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
