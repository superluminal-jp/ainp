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
import { Edit, Trash2, Wrench, Save, X, Check, Code } from "lucide-react";

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
    name: "get_current_time",
    description:
      "A comprehensive time utility tool that retrieves the current date and time in multiple formats with timezone support. This tool can return time in ISO format for standardized timestamps, human-readable format for display purposes, Unix timestamp for system operations, or custom formatted strings for specific use cases. It supports timezone conversion using standard timezone identifiers (e.g., America/New_York, Europe/London, Asia/Tokyo) and automatically handles daylight saving time transitions. The tool is particularly useful for logging, scheduling, user interfaces, and any application requiring accurate time information across different geographical locations.",
    inputSchema: {
      type: "object",
      properties: {
        format: {
          type: "string",
          description: "Time format (iso, readable, timestamp, or custom)",
        },
        timezone: {
          type: "string",
          description: "Timezone (e.g., UTC, America/New_York)",
        },
      },
      required: [],
    },
    executionCode: `import json
from datetime import datetime, timezone
from typing import Any, Dict, Literal
from zoneinfo import ZoneInfo

# ---------------------------------------------------------------------------
# Typing helpers
# ---------------------------------------------------------------------------

TimeFormat = Literal["iso", "readable", "timestamp", "custom"]
DEFAULT_TIMEZONE = "UTC"


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def _format_time(dt: datetime, fmt: TimeFormat) -> str:
    """Return *dt* formatted according to *fmt*."""

    return {
        "iso": dt.isoformat(),
        "readable": dt.strftime("%Y-%m-%d %H:%M:%S %Z"),
        "timestamp": str(int(dt.timestamp())),
        "custom": dt.strftime("%B %d, %Y at %I:%M %p %Z"),
    }.get(fmt, dt.isoformat())


def _build_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Construct an AWS Lambda proxy integration response."""

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, default=str),
    }


# ---------------------------------------------------------------------------
# Lambda entry point
# ---------------------------------------------------------------------------

def handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    """AWS Lambda entry point returning the current time in various formats.

    The *event* payload may include::

        {
            "tool_input": {
                "format": "iso|readable|timestamp|custom",
                "timezone": "Area/City"
            }
        }
    """

    try:
        tool_input = (event or {}).get("tool_input", {})

        fmt: TimeFormat = tool_input.get("format", "iso")  # type: ignore[assignment]
        tz_name: str = tool_input.get("timezone", DEFAULT_TIMEZONE)

        # Obtain current UTC time (timezone aware)
        utc_now = datetime.now(timezone.utc)

        # Resolve requested timezone, falling back to UTC on failure
        try:
            tz = ZoneInfo(tz_name)
        except Exception:
            tz = timezone.utc
            tz_name = f"UTC (invalid timezone: {tz_name})"

        current_time = utc_now.astimezone(tz)
        formatted_time = _format_time(current_time, fmt)  # type: ignore[arg-type]

        body = {
            "success": True,
            "message": "Current time retrieved successfully",
            "data": {
                "current_time": formatted_time,
                "timezone": tz_name,
                "format": fmt,
                "utc_time": utc_now.isoformat(),
                "unix_timestamp": int(current_time.timestamp()),
                "request_id": getattr(context, "aws_request_id", "local-test"),
            },
        }
        return _build_response(200, body)

    except Exception as exc:  # pylint: disable=broad-except
        error_body = {
            "success": False,
            "message": f"Error getting current time: {exc}",
            "error_type": type(exc).__name__,
        }
        return _build_response(500, error_body)
`,
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
    setFormData({
      name: "get_current_time",
      description:
        "A tool that returns the current date and time in various formats",
      inputSchema: {
        type: "object",
        properties: {
          format: {
            type: "string",
            description: "Time format (iso, readable, timestamp, or custom)",
          },
          timezone: {
            type: "string",
            description: "Timezone (e.g., UTC, America/New_York)",
          },
        },
        required: [],
      },
      executionCode: `import json
import datetime
from zoneinfo import ZoneInfo

def handler(event, context):
    """
    AWS Lambda function to get current time in various formats
    
    Args:
        event: Contains the tool input parameters
        context: Lambda runtime information
    
    Returns:
        dict: Response with statusCode, body containing the result
    """
    try:
        # Extract tool input from event
        tool_input = event.get('tool_input', {})
        
        format_type = tool_input.get("format", "iso")
        timezone_name = tool_input.get("timezone", "UTC")
        
        # Get current time in UTC
        utc_now = datetime.datetime.now(datetime.timezone.utc)
        
        # Apply timezone if specified
        if timezone_name and timezone_name != "UTC":
            try:
                tz = ZoneInfo(timezone_name)
                current_time = utc_now.astimezone(tz)
            except Exception:
                current_time = utc_now
                timezone_name = "UTC (invalid timezone specified)"
        else:
            current_time = utc_now
        
        # Format the time based on user preference
        if format_type == "iso":
            formatted_time = current_time.isoformat()
        elif format_type == "readable":
            formatted_time = current_time.strftime("%Y-%m-%d %H:%M:%S %Z")
        elif format_type == "timestamp":
            formatted_time = str(int(current_time.timestamp()))
        elif format_type == "custom":
            formatted_time = current_time.strftime("%B %d, %Y at %I:%M %p %Z")
        else:
            formatted_time = current_time.isoformat()
        
        # Success response
        response_body = {
            "success": True,
            "message": "Current time retrieved successfully",
            "data": {
                "current_time": formatted_time,
                "timezone": timezone_name,
                "format": format_type,
                "utc_time": utc_now.isoformat(),
                "unix_timestamp": int(current_time.timestamp()),
                "request_id": context.aws_request_id if context else "local-test"
            }
        }
        
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps(response_body)
        }
        
    except Exception as e:
        # Error response
        error_response = {
            "success": False,
            "message": f"Error getting current time: {str(e)}",
            "error_type": type(e).__name__
        }
        
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps(error_response)
        }`,
      requirements: "",
      isActive: true,
    });
    setEditingTool(null);
    setIsEditing(false);
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

  return (
    <>
      <AppHeader />
      <div className="h-screen bg-background text-foreground flex flex-col">
        <div className="flex-1 flex">
          {/* Form Panel */}
          <div className="w-1/3 border-r border-border p-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  {isEditing ? "Edit Tool" : "Create New Tool"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs">
                    Tool Name
                  </Label>
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
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="min-h-16 text-xs"
                  />
                </div>

                {/* Input Schema Section */}
                <div className="space-y-2">
                  <Label className="text-xs">Input Schema</Label>

                  {/* Add new property */}
                  <div className="grid grid-cols-5 gap-1 items-end">
                    <div>
                      <Label className="text-xs">Property</Label>
                      <Input
                        placeholder="param_name"
                        value={newProperty.name}
                        onChange={(e) =>
                          setNewProperty((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="h-6 text-xs"
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
                        <SelectTrigger className="h-6 text-xs">
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
                        className="h-6 text-xs"
                      />
                    </div>
                    <div className="flex items-center space-x-1">
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
                    placeholder="requests\npandas>=1.5.0\nnumpy\nbeautifulsoup4==4.11.1\npython-dateutil"
                    value={formData.requirements}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        requirements: e.target.value,
                      }))
                    }
                    className="min-h-16 text-xs font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    List pip packages (one per line) that this tool requires.
                  </p>
                </div>

                {/* Execution Code Section */}
                <div className="space-y-1">
                  <Label htmlFor="executionCode" className="text-xs">
                    Execution Code (Python)
                  </Label>
                  <Textarea
                    id="executionCode"
                    placeholder={`import json

def handler(event, context):
    """
    AWS Lambda function handler
    
    Args:
        event: Contains the tool input parameters
        context: Lambda runtime information
    
    Returns:
        dict: Response with statusCode and body
    """
    try:
        tool_input = event.get('tool_input', {})
        param1 = tool_input.get("param1", "")
        param2 = tool_input.get("param2", 0)
        
        # Your tool logic here
        result_data = {"processed": True, "param1": param1, "param2": param2}
        
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "success": True,
                "message": f"Processed {param1} with value {param2}",
                "data": result_data
            })
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
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
                    className="min-h-32 text-xs font-mono"
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

          {/* Tools List */}
          <div className="flex-1 p-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Custom Tools</h2>
              <Badge variant="outline" className="text-xs">
                {toolSpecs.length} Tools
              </Badge>
            </div>

            <ScrollArea className="h-full">
              {toolSpecs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No custom tools created yet</p>
                  <p className="text-xs">Create your first custom tool above</p>
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
    </>
  );
}
