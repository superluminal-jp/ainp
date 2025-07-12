# Tools Page Component

A comprehensive custom tool management interface built with Next.js and AWS Amplify, featuring AI-powered Python code generation, interactive schema builder, real-time synchronization, and seamless integration with AWS Lambda functions for tool execution.

## Overview

The Tools Page (`/tools`) serves as the central hub for managing custom tools in the application, providing users with:

- **Custom Tool Management**: Create, edit, delete, and toggle tool status with comprehensive CRUD operations
- **AI-Powered Code Generation**: Intelligent Python Lambda function code creation with structured output
- **Interactive Schema Builder**: Visual schema property management with add/remove functionality
- **Requirements Management**: Python package dependency specification and validation
- **Real-time Synchronization**: Live updates across all connected sessions via AWS Amplify subscriptions
- **Copy & Share**: One-click code copying to clipboard with visual feedback
- **Active Status Management**: Enable/disable tools for chat integration
- **README Documentation**: Toggle-able comprehensive documentation display

## Features

### 🛠️ Custom Tool Management

- **Create Tools**: Add new custom tools with name, description, schema, and execution code
- **Edit Tools**: Modify existing tool specifications with form pre-population
- **Delete Tools**: Remove tools with confirmation and automatic cleanup
- **Toggle Status**: Enable/disable tools using Switch component for chat integration
- **Copy Code**: Navigator.clipboard integration with visual feedback and timeout
- **Real-time Updates**: Live synchronization using AWS Amplify observeQuery subscriptions

### 🐍 AI-Powered Code Generation

- **Structured Output**: AI assistant returns JSON with tool specifications
- **Lambda Functions**: Generate AWS Lambda-compatible Python code with proper structure
- **Error Handling**: Built-in exception handling and standardized response formatting
- **Template System**: Pre-built comprehensive code templates with proper type hints
- **Best Practices**: Code follows AWS Lambda, Python, and security best practices
- **Auto-Application**: Automatic application of AI suggestions to form fields

### 📊 Interactive Schema Builder

- **Property Management**: Add/remove schema properties with visual interface
- **Data Types**: Support for string, number, boolean, and array types with items specification
- **Required Fields**: Checkbox-based required field specification
- **Property Descriptions**: Detailed parameter descriptions for better usability
- **Real-time Validation**: Live schema validation with error feedback
- **Badge Display**: Visual property representation with type and requirement indicators

### 📦 Requirements Management

- **Package Dependencies**: Multi-line textarea for pip package requirements
- **Version Control**: Support for exact version specification and ranges
- **Validation**: Package format validation and compatibility checking
- **Template Examples**: Pre-filled examples for common package patterns
- **Documentation**: Inline help text and formatting guidelines

### 🤖 AI Assistant Integration

- **ChatAssistant Component**: Dedicated AI assistant with specialized system prompt
- **Structured Output**: JSON-formatted responses with tool specifications
- **Code Generation**: Comprehensive Python Lambda function generation
- **Schema Suggestions**: Intelligent input schema recommendations with property conversion
- **Requirements Analysis**: Automatic dependency detection and suggestions
- **Error Resolution**: Debugging assistance and code improvement suggestions

### 🎛️ User Interface

- **Three-Panel Layout**: Form panel (w-1/4), AI Assistant panel (w-1/3), Tools list (flex-1)
- **Code Editor**: Syntax-highlighted Python code editing with proper formatting
- **Schema Builder**: Interactive property management with grid layout
- **Real-time Preview**: Live preview of tool specifications and schema
- **Error Feedback**: Toast notifications and validation messages
- **Loading States**: Comprehensive loading feedback with disabled states

## Architecture

### State Management

The component uses comprehensive React state management with type safety:

```typescript
// Core tool state
const [toolSpecs, setToolSpecs] = useState<Schema["toolSpecs"]["type"][]>([]);
const [isEditing, setIsEditing] = useState(false);
const [editingTool, setEditingTool] = useState<
  Schema["toolSpecs"]["type"] | null
>(null);
const [loading, setLoading] = useState(false);

// Form state with comprehensive default template
const [formData, setFormData] = useState<ToolSpec>({
  name: "get_current_time",
  description:
    "A comprehensive time utility tool that retrieves the current date and time...",
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
  executionCode: `// Complete Python Lambda template with proper structure`,
  requirements: "",
  isActive: true,
});

// Schema property management
const [newProperty, setNewProperty] = useState({
  name: "",
  type: "string",
  description: "",
  required: false,
});

// UI state
const [copiedId, setCopiedId] = useState<string | null>(null);
const [showReadme, setShowReadme] = useState(false);
```

### Component Layout

```
ToolsPage
├── AppHeader
├── README Display Section (Toggle-able)
├── Main Content Flex Container
│   ├── Form Panel (w-1/4)
│   │   ├── Tool Form Card
│   │   │   ├── Name & Description Fields
│   │   │   ├── Interactive Schema Builder
│   │   │   │   ├── Property Addition Grid
│   │   │   │   ├── Property Type Selection
│   │   │   │   ├── Required Checkbox
│   │   │   │   └── Property List with Remove Actions
│   │   │   ├── Requirements Textarea
│   │   │   ├── Python Code Editor
│   │   │   └── Action Buttons (Create/Update/Cancel/Clear)
│   │   └── Documentation Toggle Button
│   ├── AI Assistant Panel (w-1/3)
│   │   ├── ChatAssistant Component
│   │   ├── Specialized System Prompt
│   │   ├── Structured Output Handling
│   │   └── Suggestion Auto-Application
│   └── Tools List Panel (flex-1)
│       ├── Tools Counter Badge
│       ├── Empty State with Icon
│       ├── Tool Cards with Actions
│       │   ├── Status Toggle Switch
│       │   ├── Schema Preview Badges
│       │   ├── Requirements Preview
│       │   ├── Code Preview
│       │   └── Action Buttons (Copy/Edit/Delete)
│       └── ScrollArea Container
```

### Data Flow

1. **Tool Creation** → Form validation → AWS Amplify API → Real-time subscription update → UI synchronization
2. **AI Assistant** → User input → ChatAssistant component → Structured output → Auto-application to form
3. **Schema Building** → Property addition → Real-time validation → JSON schema generation → Badge display
4. **Code Generation** → AI suggestions → handleSuggestionReceived → Form data update → Toast notification
5. **Real-time Updates** → observeQuery subscription → State updates → UI refresh

### Real-time Subscription System

```typescript
// Real-time subscription for tool updates
useEffect(() => {
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
```

### AI Assistant Integration

```typescript
// Specialized system prompt for tool development
const TOOLS_ASSISTANT_PROMPT = `You are an expert AI assistant specialized in helping users create custom tools with Python Lambda functions. Your role is to:

**Primary Functions:**
- Generate Python Lambda function code for custom tools
- Create comprehensive input schemas for tool parameters
- Suggest appropriate Python package requirements
- Provide optimization and best practice guidance
- Help users understand tool development concepts

**Response Format:**
You will use structured output to return a JSON object with the tool specification...`;

// Structured output handling
const handleSuggestionReceived = (suggestions: any) => {
  console.log("🔍 AI suggestions received:", suggestions);

  // Apply suggestions to form data
  setFormData((prev) => {
    const updated = { ...prev };

    if (suggestions.name) {
      updated.name = suggestions.name;
    }

    if (suggestions.description) {
      updated.description = suggestions.description;
    }

    if (suggestions.executionCode) {
      updated.executionCode = suggestions.executionCode;
    }

    if (suggestions.requirements) {
      updated.requirements = suggestions.requirements;
    }

    if (suggestions.inputSchema) {
      // Convert AI schema to internal format
      const schema =
        typeof suggestions.inputSchema === "string"
          ? JSON.parse(suggestions.inputSchema)
          : suggestions.inputSchema;

      // Property conversion logic
      const convertedProperties: Record<string, SchemaProperty> = {};
      Object.entries(schema.properties || {}).forEach(
        ([key, prop]: [string, any]) => {
          convertedProperties[key] = {
            type: prop.type || "string",
            description: prop.description || "",
            ...(prop.type === "array" && prop.items
              ? { items: prop.items }
              : {}),
          };
        }
      );

      updated.inputSchema = {
        type: "object",
        properties: convertedProperties,
        required: schema.required || [],
      };
    }

    return updated;
  });

  // Success notification
  toast.success(`Applied AI suggestions to: ${appliedFields.join(", ")}`);
};
```

## Usage

### Creating a New Custom Tool

1. Navigate to `/tools`
2. Fill in the tool name (following snake_case convention)
3. Add comprehensive description of tool functionality
4. Build the input schema using the interactive property builder:
   - Click "Add Property" to create new parameters
   - Select appropriate data types (string, number, boolean, array)
   - Add descriptive parameter descriptions
   - Mark required fields using checkboxes
5. Specify Python requirements (one package per line)
6. Write or generate Python Lambda execution code
7. Click "Create" to save the tool
8. Tool becomes available for use in chat sessions

### Interactive Schema Builder

```typescript
// Adding schema properties
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

  // Reset form
  setNewProperty({
    name: "",
    type: "string",
    description: "",
    required: false,
  });
};

// Removing schema properties
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
```

### Using the AI Assistant

1. Type your request in the AI assistant panel
2. Ask for help with:
   - Code generation: "Create a weather API tool"
   - Schema design: "Build a schema for user profile validation"
   - Requirements: "What packages do I need for web scraping?"
   - Optimization: "Improve this code for better performance"
3. Review AI suggestions in structured JSON format
4. Suggestions are automatically applied to the form fields
5. Modify as needed and save the tool

### Copy Code Functionality

```typescript
// Copy tool code to clipboard
const copyToolCode = async (code: string, id: string) => {
  await navigator.clipboard.writeText(code);
  setCopiedId(id);
  setTimeout(() => setCopiedId(null), 2000);
};

// Visual feedback with icon change
{copiedId === tool.id ? (
  <Check className="h-3 w-3" />
) : (
  <Code className="h-3 w-3" />
)}
```

## Tool Operations

### CRUD Operations

```typescript
// Create Tool
const handleAddTool = async () => {
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

    resetForm();
  } catch (error) {
    console.error("Error creating tool:", error);
  } finally {
    setLoading(false);
  }
};

// Update Tool
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

// Toggle Tool Status
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
```

### Form Management

```typescript
// Form reset with comprehensive default template
const resetForm = () => {
  setFormData({
    name: "get_current_time",
    description:
      "A comprehensive time utility tool that retrieves the current date and time in multiple formats...",
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
    executionCode: `// Complete Python Lambda template`,
    requirements: "",
    isActive: true,
  });
  setEditingTool(null);
  setIsEditing(false);
};

// Clear form for new tool
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
```

## Python Code Templates

### Comprehensive Default Template

```python
import json
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
    """AWS Lambda entry point returning the current time in various formats."""
    try:
        tool_input = (event or {}).get("tool_input", {})
        fmt: TimeFormat = tool_input.get("format", "iso")
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
        formatted_time = _format_time(current_time, fmt)

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

    except Exception as exc:
        error_body = {
            "success": False,
            "message": f"Error getting current time: {exc}",
            "error_type": type(exc).__name__,
        }
        return _build_response(500, error_body)
```

### Tool Preview and Display

```typescript
// Schema preview with badges
{(() => {
  const schema = typeof tool.inputSchema === "string"
    ? JSON.parse(tool.inputSchema)
    : (tool.inputSchema as InputSchema);
  return Object.entries(schema.properties || {}).map(([name, prop]) => (
    <Badge key={name} variant="outline" className="text-xs">
      {name}: {(prop as SchemaProperty).type}
      {schema.required?.includes(name) && " *"}
    </Badge>
  ));
})()}

// Requirements preview
{tool.requirements && (
  <div>
    <Label className="text-xs text-muted-foreground">Requirements:</Label>
    <div className="flex flex-wrap gap-1 mt-1">
      {tool.requirements.split("\n").filter((req) => req.trim()).map((req, index) => (
        <Badge key={index} variant="secondary" className="text-xs">
          {req.trim()}
        </Badge>
      ))}
    </div>
  </div>
)}

// Code preview with length check
{tool.executionCode && (
  <div className="mt-1 p-1 bg-muted rounded text-xs font-mono max-h-16 overflow-auto">
    {tool.executionCode.length > 100
      ? `${tool.executionCode.substring(0, 100)}...`
      : tool.executionCode}
  </div>
)}
```

## Schema Management

### Property Types and Validation

```typescript
interface SchemaProperty {
  type: string;
  description: string;
  items?: { type: string };
}

interface InputSchema {
  type: string;
  properties: Record<string, SchemaProperty>;
  required: string[];
}

// Schema property builder UI
<div className="grid grid-cols-5 gap-1">
  <div className="space-y-1">
    <Label className="text-xs">Property</Label>
    <Input
      placeholder="param_name"
      value={newProperty.name}
      onChange={(e) => setNewProperty((prev) => ({ ...prev, name: e.target.value }))}
      className="h-8 text-xs"
    />
  </div>
  <div className="space-y-1">
    <Label className="text-xs">Type</Label>
    <Select
      value={newProperty.type}
      onValueChange={(value) => setNewProperty((prev) => ({ ...prev, type: value }))}
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
      placeholder="Parameter description"
      value={newProperty.description}
      onChange={(e) => setNewProperty((prev) => ({ ...prev, description: e.target.value }))}
      className="h-8 text-xs"
    />
  </div>
  <div className="space-y-1">
    <Label className="text-xs">Required</Label>
    <div className="flex items-center justify-center h-8">
      <input
        type="checkbox"
        checked={newProperty.required}
        onChange={(e) => setNewProperty((prev) => ({ ...prev, required: e.target.checked }))}
        className="rounded"
      />
    </div>
  </div>
</div>
```

## Performance Optimization

### Efficient State Management

- **Real-time Subscriptions**: observeQuery for live updates without polling
- **Debounced Updates**: Form validation and API calls optimized
- **Lazy Loading**: Tools loaded on demand with proper cleanup
- **Memory Management**: Proper subscription cleanup and state reset

### Copy Operation Optimization

```typescript
// Efficient clipboard operation with timeout
const copyToolCode = async (code: string, id: string) => {
  await navigator.clipboard.writeText(code);
  setCopiedId(id);
  setTimeout(() => setCopiedId(null), 2000);
};
```

## Integration Points

### Chat System Integration

- **Active Tools**: Tools with `isActive: true` are available in chat
- **Tool Execution**: Lambda functions called during chat sessions
- **Schema Validation**: Input parameters validated against schema
- **Response Handling**: Standardized JSON response processing

### AWS Amplify Integration

```typescript
// Real-time subscriptions
const client = generateClient<Schema>();

// Tool operations
await client.models.toolSpecs.create({...});
await client.models.toolSpecs.update({...});
await client.models.toolSpecs.delete({...});

// Subscription management
const sub = client.models.toolSpecs.observeQuery().subscribe({
  next: ({ items }) => setToolSpecs([...items]),
  error: (error) => console.error("Error in real-time subscription:", error),
});
```

## Error Handling & Notifications

### Toast Notifications

```typescript
import { toast } from "sonner";

// Success notification
toast.success(`Applied AI suggestions to: ${appliedFields.join(", ")}`);

// Error handling
try {
  await client.models.toolSpecs.create({...});
} catch (error) {
  console.error("Error creating tool:", error);
  toast.error("Failed to create tool");
}
```

### Form Validation

- **Required Fields**: Name and description validation
- **Schema Validation**: Real-time property validation
- **Code Validation**: Python syntax checking (client-side)
- **Loading States**: Disabled buttons during operations

## Component Dependencies

### UI Components

```typescript
// Core UI components from shadcn/ui
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

// Custom components
import { AppHeader } from "@/components/app-header";
import { ReadmeDisplay } from "@/components/readme-display";
import ChatAssistant from "@/components/chat-assistant";
import { useSimpleHeader } from "@/components/use-page-header";
```

### Icons and Utilities

```typescript
// Lucide React icons
import {
  Edit,
  Trash2,
  Wrench,
  Save,
  X,
  Check,
  Code,
  FileText,
} from "lucide-react";

// AWS Amplify
import type { Schema } from "../../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

// Toast notifications
import { toast } from "sonner";
```

## Testing and Troubleshooting

### Console Logging

The component includes comprehensive logging for debugging:

```typescript
console.log("handleAddTool", formData);
console.log("🔍 AI suggestions received:", suggestions);
console.log("🔍 Suggestions type:", typeof suggestions);
console.log("✅ Applied name suggestion:", suggestions.name);
console.error("Error creating tool:", error);
```

### Common Issues

1. **Tool Creation Fails**: Check required fields and console errors
2. **AI Assistant Issues**: Verify structured output format and system prompt
3. **Schema Building**: Ensure property names are valid and types are correct
4. **Copy Functionality**: Check navigator.clipboard availability
5. **Real-time Updates**: Verify subscription setup and error handling

### Debug Features

- **Development Mode**: Enhanced logging in development environment
- **Form State Inspection**: Comprehensive state tracking for debugging
- **AI Response Analysis**: Detailed logging of AI suggestions and application
- **Performance Monitoring**: Built-in performance tracking for operations

## Future Enhancements

### Planned Features

- **Code Validation**: Real-time Python syntax checking
- **Tool Testing**: Built-in testing framework for tool validation
- **Template Library**: Pre-built tool templates for common use cases
- **Collaborative Editing**: Multi-user tool development capabilities
- **Version Control**: Tool change tracking and history management

### Technical Improvements

- **Monaco Editor**: Advanced code editor with syntax highlighting
- **Visual Schema Builder**: Drag-and-drop schema construction
- **Auto-completion**: Intelligent code completion and suggestions
- **Performance Optimization**: Code analysis and optimization recommendations
