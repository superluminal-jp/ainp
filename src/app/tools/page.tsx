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
import { useState, useEffect } from "react";
import { useSimpleHeader } from "@/components/use-page-header";
import { AppHeader } from "@/components/app-header";
import {
  Edit,
  Trash2,
  Wrench,
  Save,
  X,
  Check,
  Play,
  Code,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

import type { Schema } from "../../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

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
    name: "example_tool",
    description:
      "An example tool that processes text input and returns a result",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The text to process",
        },
        count: {
          type: "number",
          description: "Number of times to repeat the operation",
        },
      },
      required: ["text"],
    },
    executionCode: `# Example tool implementation
text = tool_input.get("text", "")
count = tool_input.get("count", 1)

if not text:
    result = {
        "success": False,
        "message": "Text input is required"
    }
else:
    # Process the text (example: repeat it)
    processed_text = text * count
    
    result = {
        "success": True,
        "message": f"Processed text successfully",
        "data": {
            "original": text,
            "processed": processed_text,
            "length": len(processed_text)
        }
    }`,
    isActive: true,
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    data?: Record<string, unknown>;
  } | null>(null);

  // Schema property management
  const [newProperty, setNewProperty] = useState({
    name: "",
    type: "string",
    description: "",
    required: false,
  });

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

  const handleAddTool = async () => {
    if (!formData.name.trim() || !formData.description.trim()) return;

    setLoading(true);
    try {
      await client.models.toolSpecs.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        inputSchema: formData.inputSchema,
        executionCode: formData.executionCode || "",
        isActive: formData.isActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

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
      inputSchema: tool.inputSchema as InputSchema,
      executionCode: tool.executionCode || "",
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
        inputSchema: formData.inputSchema,
        executionCode: formData.executionCode || "",
        isActive: formData.isActive,
        updatedAt: new Date().toISOString(),
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
        updatedAt: new Date().toISOString(),
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
    setFormData({
      name: "example_tool",
      description:
        "An example tool that processes text input and returns a result",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The text to process",
          },
          count: {
            type: "number",
            description: "Number of times to repeat the operation",
          },
        },
        required: ["text"],
      },
      executionCode: `# Example tool implementation
text = tool_input.get("text", "")
count = tool_input.get("count", 1)

if not text:
    result = {
        "success": False,
        "message": "Text input is required"
    }
else:
    # Process the text (example: repeat it)
    processed_text = text * count
    
    result = {
        "success": True,
        "message": f"Processed text successfully",
        "data": {
            "original": text,
            "processed": processed_text,
            "length": len(processed_text)
        }
    }`,
      isActive: true,
    });
    setEditingTool(null);
    setIsEditing(false);
    setTestResult(null);
  };

  const clearForm = () => {
    setFormData({
      name: "",
      description: "",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
      executionCode: "",
      isActive: true,
    });
    setTestResult(null);
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

  const testTool = async () => {
    if (!formData.executionCode) {
      setTestResult({
        success: false,
        message: "No execution code provided",
      });
      return;
    }

    setLoading(true);
    try {
      // Create a test tool input based on the schema
      const testInput: Record<string, unknown> = {};
      Object.keys(formData.inputSchema.properties).forEach((key) => {
        const prop = formData.inputSchema.properties[key];
        switch (prop.type) {
          case "string":
            testInput[key] = "test_value";
            break;
          case "number":
            testInput[key] = 42;
            break;
          case "boolean":
            testInput[key] = true;
            break;
          case "array":
            testInput[key] = ["test_item"];
            break;
          default:
            testInput[key] = "test_value";
        }
      });

      // Call the Lambda function to test the tool
      const response = await fetch("/api/test-tool", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toolName: formData.name,
          toolInput: testInput,
          executionCode: formData.executionCode,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTestResult({
          success: true,
          message: "Tool executed successfully",
          data: result.data,
        });
      } else {
        setTestResult({
          success: false,
          message: result.error || "Tool execution failed",
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `Test failed: ${error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-8">
            {/* Add/Edit Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  {isEditing ? "Edit Tool" : "Create New Tool"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tool Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., weather_check, calculator"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this tool does..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={2}
                  />
                </div>

                {/* Input Schema Section */}
                <div className="space-y-4">
                  <Label>Input Schema</Label>

                  {/* Add new property */}
                  <div className="grid grid-cols-5 gap-2 items-end">
                    <div>
                      <Label className="text-xs">Property Name</Label>
                      <Input
                        placeholder="param_name"
                        value={newProperty.name}
                        onChange={(e) =>
                          setNewProperty((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={newProperty.type}
                        onValueChange={(value) =>
                          setNewProperty((prev) => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger className="text-xs">
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
                    <div className="col-span-2">
                      <Label className="text-xs">Description</Label>
                      <Input
                        placeholder="Parameter description"
                        value={newProperty.description}
                        onChange={(e) =>
                          setNewProperty((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="text-xs"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
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
                      <Label htmlFor="required" className="text-xs">
                        Required
                      </Label>
                    </div>
                  </div>

                  <Button
                    onClick={addSchemaProperty}
                    size="sm"
                    variant="outline"
                    disabled={!newProperty.name.trim()}
                  >
                    Add Property
                  </Button>

                  {/* Schema properties list */}
                  {Object.keys(formData.inputSchema.properties).length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs">Schema Properties:</Label>
                      <div className="space-y-1">
                        {Object.entries(formData.inputSchema.properties).map(
                          ([name, prop]) => (
                            <div
                              key={name}
                              className="flex items-center justify-between p-2 bg-muted rounded text-xs"
                            >
                              <div className="flex items-center space-x-2">
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
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Execution Code Section */}
                <div className="space-y-2">
                  <Label htmlFor="executionCode">Execution Code (Python)</Label>
                  <Textarea
                    id="executionCode"
                    placeholder={`# Example execution code
param1 = tool_input.get("param1", "")
param2 = tool_input.get("param2", 0)

# Your tool logic here
result = {
    "success": True,
    "message": f"Processed {param1} with value {param2}",
    "data": {"processed": True}
}`}
                    value={formData.executionCode}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        executionCode: e.target.value,
                      }))
                    }
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>

                {/* Test Result */}
                {testResult && (
                  <div
                    className={`p-3 rounded-md ${
                      testResult.success
                        ? "bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800"
                        : "bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {testResult.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium">
                        {testResult.success ? "Test Passed" : "Test Failed"}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{testResult.message}</p>
                    {testResult.data && (
                      <pre className="text-xs mt-2 bg-muted p-2 rounded overflow-auto">
                        {JSON.stringify(testResult.data, null, 2)}
                      </pre>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={isEditing ? handleUpdateTool : handleAddTool}
                    disabled={
                      !formData.name.trim() ||
                      !formData.description.trim() ||
                      loading
                    }
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading
                      ? "Saving..."
                      : isEditing
                        ? "Update"
                        : "Create"}{" "}
                    Tool
                  </Button>

                  <Button
                    onClick={testTool}
                    variant="outline"
                    disabled={!formData.executionCode || loading}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Test Tool
                  </Button>

                  {isEditing && (
                    <Button
                      variant="outline"
                      onClick={cancelEdit}
                      disabled={loading}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  )}

                  {!isEditing && (
                    <Button
                      variant="outline"
                      onClick={clearForm}
                      disabled={loading}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Form
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tools List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Custom Tools</CardTitle>
                  <Badge variant="outline">{toolSpecs.length} Tools</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {toolSpecs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No custom tools created yet</p>
                    <p className="text-sm">
                      Create your first custom tool above
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {toolSpecs.map((tool) => (
                        <div
                          key={tool.id}
                          className="flex items-start justify-between p-4 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{tool.name}</h4>
                              <Switch
                                checked={tool.isActive ?? true}
                                onCheckedChange={() =>
                                  toggleToolActive(tool.id)
                                }
                              />
                              <Label className="text-xs">Active</Label>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {tool.description}
                            </p>

                            {/* Schema Preview */}
                            <div className="mb-3">
                              <Label className="text-xs text-muted-foreground">
                                Input Schema:
                              </Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(
                                  (tool.inputSchema as InputSchema)
                                    .properties || {}
                                ).map(([name, prop]) => (
                                  <Badge
                                    key={name}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {name}: {(prop as SchemaProperty).type}
                                    {(
                                      tool.inputSchema as InputSchema
                                    ).required?.includes(name) && " *"}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            {/* Execution Code Preview */}
                            {tool.executionCode && (
                              <div className="mb-3">
                                <Label className="text-xs text-muted-foreground">
                                  Execution Code:
                                </Label>
                                <div className="mt-1 p-2 bg-muted rounded text-xs font-mono max-h-20 overflow-auto">
                                  {tool.executionCode.length > 100
                                    ? `${tool.executionCode.substring(0, 100)}...`
                                    : tool.executionCode}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                copyToolCode(tool.executionCode || "", tool.id)
                              }
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
                              title="Edit tool"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTool(tool.id)}
                              title="Delete tool"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
