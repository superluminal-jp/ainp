# Tools Page Component

A comprehensive custom tool management interface built with Next.js and AWS Amplify, featuring AI-powered tool assistance, Python code generation, and seamless integration with AWS Lambda functions for tool execution.

## Overview

The Tools Page (`/tools`) is the central hub for managing custom tools in the application, providing users with:

- **Custom Tool Management**: Create, edit, and delete custom tools with execution code
- **Python Code Generation**: AI-powered Python Lambda function code creation
- **Input Schema Designer**: Visual schema builder for tool parameters
- **Requirements Management**: Manage Python package dependencies
- **AI-Powered Assistant**: Built-in AI helper for tool development and optimization
- **Real-time Synchronization**: Live updates across all connected sessions
- **Lambda Integration**: Seamless integration with AWS Lambda for tool execution
- **Copy & Share**: Easy code sharing and clipboard operations
- **Active Status Management**: Enable/disable tools for different contexts

## Features

### 🛠️ Custom Tool Management

- **Create Tools**: Add new custom tools with name, description, and execution code
- **Edit Tools**: Modify existing tool specifications and code
- **Delete Tools**: Remove tools with confirmation dialogs
- **Toggle Status**: Enable/disable tools for use in chat sessions
- **Copy Code**: One-click copying of tool execution code to clipboard
- **Real-time Updates**: Live synchronization across browser sessions

### 🐍 Python Code Generation

- **Lambda Functions**: Generate AWS Lambda-compatible Python code
- **Error Handling**: Built-in exception handling and response formatting
- **Response Structure**: Standardized JSON response format
- **Best Practices**: Code follows AWS Lambda and Python best practices
- **Template System**: Pre-built code templates for common tool patterns
- **Validation**: Input validation and parameter extraction

### 📊 Input Schema Designer

- **Visual Builder**: Interactive schema property management
- **Data Types**: Support for string, number, boolean, and array types
- **Required Fields**: Specify which parameters are mandatory
- **Property Descriptions**: Add helpful descriptions for each parameter
- **Schema Validation**: Real-time schema validation and error checking
- **JSON Schema**: Standards-compliant JSON schema generation

### 📦 Requirements Management

- **Package Dependencies**: Manage Python pip package requirements
- **Version Control**: Specify exact package versions
- **Validation**: Check package availability and compatibility
- **Auto-suggestions**: AI-powered package recommendations
- **Documentation**: Package usage examples and documentation links

### 🤖 AI-Powered Tool Assistant

- **Code Generation**: AI-generated Python Lambda function code
- **Schema Suggestions**: Intelligent input schema recommendations
- **Requirements Analysis**: Automatic dependency detection and suggestions
- **Optimization Advice**: Code improvement and best practice recommendations
- **Error Resolution**: Help with debugging and fixing tool issues
- **Interactive Chat**: Conversational interface for tool development

### 🎛️ User Interface

- **Three-Panel Layout**: Form, assistant, and tools list panels
- **Code Editor**: Syntax-highlighted Python code editing
- **Schema Builder**: Visual interface for schema construction
- **Real-time Preview**: Live preview of tool specifications
- **Error Feedback**: Comprehensive error reporting and validation
- **Loading States**: Visual feedback during operations

## Architecture

### State Management

```typescript
// Core tool state
const [toolSpecs, setToolSpecs] = useState<Schema["toolSpecs"]["type"][]>([]);
const [isEditing, setIsEditing] = useState(false);
const [editingTool, setEditingTool] = useState<
  Schema["toolSpecs"]["type"] | null
>(null);

// Form state
const [formData, setFormData] = useState<ToolSpec>({
  name: "get_current_time",
  description: "A tool that returns the current date and time",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
  executionCode: "",
  requirements: "",
  isActive: true,
});

// UI state
const [copiedId, setCopiedId] = useState<string | null>(null);
const [loading, setLoading] = useState(false);

// Chat assistant state
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [inputMessage, setInputMessage] = useState("");
const [isLoading, setIsLoading] = useState(false);

// Schema management
const [newProperty, setNewProperty] = useState({
  name: "",
  type: "string",
  description: "",
  required: false,
});
```

### Data Flow

1. **Tool Creation** → Form submission → AWS Amplify API → Database storage → Real-time updates
2. **AI Assistant** → User input → Bedrock processing → Code generation → Auto-application
3. **Schema Building** → Property addition → Schema validation → JSON schema generation
4. **Code Execution** → Tool selection in chat → Lambda invocation → Response processing
5. **Requirements** → Package specification → Dependency resolution → Lambda deployment

### Component Structure

```
ToolsPage
├── AppHeader (Global navigation)
├── Main Layout (Three-panel design)
│   ├── Form Panel (Left 1/4)
│   │   ├── Tool Form
│   │   ├── Name & Description
│   │   ├── Input Schema Builder
│   │   ├── Requirements Editor
│   │   ├── Python Code Editor
│   │   └── Action Buttons
│   ├── Assistant Panel (Center 1/3)
│   │   ├── Chat Interface
│   │   ├── AI Responses
│   │   ├── Code Suggestions
│   │   └── Input Controls
│   └── Tools List (Right)
│       ├── Tool Cards
│       ├── Status Toggles
│       ├── Action Buttons
│       └── Code Preview
```

## Usage

### Creating a New Custom Tool

1. Navigate to `/tools`
2. Fill in the tool name (e.g., "weather_check")
3. Add a comprehensive description of tool functionality
4. Build the input schema using the property builder
5. Add Python requirements if needed
6. Write or generate the Python execution code
7. Click "Create" to save the tool
8. Tool becomes available for use in chat sessions

### Building Input Schemas

1. Use the schema property builder in the form panel
2. Add properties with name, type, and description
3. Mark properties as required if necessary
4. Support for string, number, boolean, and array types
5. Schema automatically validates and generates JSON
6. Preview schema in the tools list

### Using the AI Assistant

1. Type your request in the assistant chat panel
2. Ask for help with code generation, schema design, or requirements
3. Review AI suggestions and generated code
4. Suggestions are automatically applied to the form
5. Modify as needed and save the tool

### Example Tool Creation Workflow

```typescript
// AI Assistant interaction
const userQuery = "Create a tool that fetches weather data for a given city";

// AI Response (structured)
{
  "message": "I'll help you create a weather fetching tool...",
  "suggestions": {
    "name": "get_weather",
    "description": "Fetches current weather data for a specified city using a weather API",
    "executionCode": `import json
import requests
from typing import Any, Dict

def handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    try:
        tool_input = event.get('tool_input', {})
        city = tool_input.get('city', '')

        if not city:
            raise ValueError("City parameter is required")

        # Weather API call logic here
        weather_data = fetch_weather(city)

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "success": True,
                "data": weather_data
            })
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "success": False,
                "message": str(e)
            })
        }`,
    "requirements": "requests\npython-dateutil",
    "inputSchema": {
      "properties": {
        "city": {
          "type": "string",
          "description": "Name of the city to get weather for"
        },
        "units": {
          "type": "string",
          "description": "Temperature units (celsius or fahrenheit)"
        }
      },
      "required": ["city"]
    }
  },
  "tips": [
    "Always include proper error handling",
    "Validate input parameters thoroughly",
    "Return standardized response format"
  ]
}
```

## API Integration

### Tool Operations

```typescript
// Create Custom Tool
const createTool = async () => {
  await client.models.toolSpecs.create({
    name: formData.name.trim(),
    description: formData.description.trim(),
    inputSchema: JSON.stringify(formData.inputSchema),
    executionCode: formData.executionCode || "",
    requirements: formData.requirements || "",
    isActive: formData.isActive,
  });
};

// Update Custom Tool
const updateTool = async () => {
  await client.models.toolSpecs.update({
    id: editingTool.id,
    name: formData.name.trim(),
    description: formData.description.trim(),
    inputSchema: JSON.stringify(formData.inputSchema),
    executionCode: formData.executionCode || "",
    requirements: formData.requirements || "",
    isActive: formData.isActive,
  });
};

// Delete Custom Tool
const deleteTool = async (id: string) => {
  await client.models.toolSpecs.delete({ id });
};

// Toggle Active Status
const toggleActive = async (id: string) => {
  await client.models.toolSpecs.update({
    id,
    isActive: !tool.isActive,
  });
};
```

### Real-time Subscriptions

```typescript
// Subscribe to tool updates
useEffect(() => {
  const subscription = client.models.toolSpecs.observeQuery().subscribe({
    next: ({ items }) => {
      setToolSpecs([...items]);
    },
    error: (error) => {
      console.error("Tool subscription error:", error);
    },
  });

  return () => subscription.unsubscribe();
}, []);
```

### Tool Execution Integration

```typescript
// Tools are executed via chat system
const executeToolInChat = async (toolId: string, input: any) => {
  const response = await client.queries.chatWithBedrockTools({
    messages: conversationHistory,
    systemPrompt: systemPrompt,
    modelId: selectedModelId,
    useTools: true,
    selectedToolIds: [toolId],
    // ... other parameters
  });
};
```

## Python Code Templates

### Basic Tool Template

```python
import json
from typing import Any, Dict

def handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    """
    AWS Lambda function handler for custom tool execution

    Args:
        event: Contains the tool input parameters
        context: Lambda runtime information

    Returns:
        dict: Response with statusCode and body
    """
    try:
        # Extract tool input from event
        tool_input = event.get('tool_input', {})

        # Extract and validate parameters
        param1 = tool_input.get("param1", "")
        param2 = tool_input.get("param2", 0)

        # Validate required parameters
        if not param1:
            raise ValueError("param1 is required")

        # Your tool logic here
        result = perform_tool_operation(param1, param2)

        # Success response
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "success": True,
                "message": "Operation completed successfully",
                "data": result,
                "request_id": getattr(context, 'aws_request_id', 'local-test')
            })
        }

    except Exception as e:
        # Error response
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "success": False,
                "message": f"Error: {str(e)}",
                "error_type": type(e).__name__
            })
        }

def perform_tool_operation(param1: str, param2: int) -> Dict[str, Any]:
    """
    Implement your tool's main functionality here
    """
    return {
        "processed": True,
        "param1": param1,
        "param2": param2
    }
```

### Advanced Tool Template with External APIs

```python
import json
import requests
import datetime
from typing import Any, Dict, Optional
from zoneinfo import ZoneInfo

def handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    """
    Advanced tool template with external API integration
    """
    try:
        tool_input = event.get('tool_input', {})

        # Extract parameters with defaults
        query = tool_input.get("query", "")
        api_key = tool_input.get("api_key", "")
        timeout = tool_input.get("timeout", 30)

        # Validate inputs
        if not query:
            raise ValueError("Query parameter is required")

        # Make external API call
        result = call_external_api(query, api_key, timeout)

        return build_success_response(result, context)

    except requests.RequestException as e:
        return build_error_response(f"API request failed: {str(e)}", 502)
    except ValueError as e:
        return build_error_response(f"Invalid input: {str(e)}", 400)
    except Exception as e:
        return build_error_response(f"Unexpected error: {str(e)}", 500)

def call_external_api(query: str, api_key: str, timeout: int) -> Dict[str, Any]:
    """
    Make external API call with proper error handling
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    response = requests.get(
        f"https://api.example.com/search?q={query}",
        headers=headers,
        timeout=timeout
    )

    response.raise_for_status()
    return response.json()

def build_success_response(data: Any, context: Any) -> Dict[str, Any]:
    """Build standardized success response"""
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps({
            "success": True,
            "data": data,
            "timestamp": datetime.datetime.now(ZoneInfo("UTC")).isoformat(),
            "request_id": getattr(context, 'aws_request_id', 'local-test')
        }, default=str)
    }

def build_error_response(message: str, status_code: int = 500) -> Dict[str, Any]:
    """Build standardized error response"""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps({
            "success": False,
            "message": message,
            "timestamp": datetime.datetime.now(ZoneInfo("UTC")).isoformat()
        })
    }
```

## Input Schema Design

### Schema Structure

```typescript
interface InputSchema {
  type: "object";
  properties: Record<string, SchemaProperty>;
  required: string[];
}

interface SchemaProperty {
  type: "string" | "number" | "boolean" | "array";
  description: string;
  items?: { type: string }; // For array types
}
```

### Schema Examples

```typescript
// Simple tool schema
const simpleSchema = {
  type: "object",
  properties: {
    message: {
      type: "string",
      description: "The message to process",
    },
  },
  required: ["message"],
};

// Complex tool schema
const complexSchema = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "Search query string",
    },
    limit: {
      type: "number",
      description: "Maximum number of results to return",
    },
    include_metadata: {
      type: "boolean",
      description: "Whether to include metadata in results",
    },
    categories: {
      type: "array",
      description: "List of categories to search within",
      items: { type: "string" },
    },
  },
  required: ["query"],
};
```

### Schema Building Interface

```typescript
// Add property to schema
const addSchemaProperty = () => {
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
};

// Remove property from schema
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

## Requirements Management

### Package Specification

```bash
# Basic requirements
requests
pandas
numpy

# Version-specific requirements
requests>=2.28.0
pandas>=1.5.0,<2.0.0
numpy==1.24.0

# Git dependencies
git+https://github.com/user/repo.git

# Extra dependencies
requests[security]
```

### Common Tool Dependencies

```bash
# HTTP requests
requests>=2.28.0
urllib3>=1.26.0

# Data processing
pandas>=1.5.0
numpy>=1.24.0
openpyxl>=3.0.0

# Date/time handling
python-dateutil>=2.8.0
pytz>=2022.0

# JSON/YAML processing
pyyaml>=6.0.0
jsonschema>=4.0.0

# Web scraping
beautifulsoup4>=4.11.0
lxml>=4.9.0

# AWS services
boto3>=1.26.0
botocore>=1.29.0

# Machine learning
scikit-learn>=1.2.0
tensorflow>=2.11.0
torch>=1.13.0

# Image processing
Pillow>=9.0.0
opencv-python>=4.7.0

# Database connectivity
psycopg2-binary>=2.9.0
pymongo>=4.3.0
```

## AI Assistant Capabilities

### Code Generation

- **Template Selection**: Choose appropriate code templates
- **Parameter Extraction**: Generate parameter validation code
- **Error Handling**: Add comprehensive exception handling
- **Response Formatting**: Standardized JSON response structure
- **Documentation**: Add proper docstrings and comments
- **Best Practices**: Follow Python and AWS Lambda conventions

### Schema Suggestions

- **Type Inference**: Suggest appropriate parameter types
- **Required Fields**: Identify mandatory parameters
- **Descriptions**: Generate helpful parameter descriptions
- **Validation Rules**: Add input validation suggestions
- **Default Values**: Suggest sensible default values

### Requirements Analysis

- **Dependency Detection**: Identify required packages from code
- **Version Recommendations**: Suggest stable package versions
- **Compatibility Checking**: Ensure package compatibility
- **Security Assessment**: Flag potentially insecure packages
- **Performance Optimization**: Suggest lightweight alternatives

### Optimization Advice

- **Performance Tips**: Code optimization suggestions
- **Security Best Practices**: Security improvement recommendations
- **Error Handling**: Better exception management
- **Testing Strategies**: Unit testing recommendations
- **Documentation**: Code documentation improvements

## Integration Points

### Chat System Integration

```typescript
// Tools are automatically available in chat when active
const availableTools = toolSpecs.filter((tool) => tool.isActive);

// Selected tools are executed during chat
const chatConfiguration = {
  useTools: true,
  selectedToolIds: selectedTools.map((tool) => tool.id),
  // ... other configurations
};
```

### Lambda Deployment

- **Automatic Deployment**: Tools deployed as Lambda functions
- **Environment Setup**: Python environment with requirements
- **Execution Context**: Proper AWS Lambda context handling
- **Monitoring**: CloudWatch logs and metrics
- **Scaling**: Automatic scaling based on usage

### Database Integration

- **Tool Storage**: Secure storage in AWS Amplify
- **Version History**: Track tool changes over time
- **Usage Analytics**: Monitor tool performance and usage
- **Backup & Recovery**: Automatic tool backup and restoration

## User Interface Features

### Form Panel

- **Tool Metadata**: Name and description editing
- **Schema Builder**: Visual input schema construction
- **Code Editor**: Syntax-highlighted Python editor
- **Requirements Editor**: Package dependency management
- **Validation**: Real-time form validation and error display

### Assistant Panel

- **Code Generation**: AI-powered Python code creation
- **Interactive Help**: Conversational assistance
- **Auto-application**: Automatic suggestion implementation
- **Code Review**: AI-powered code analysis and improvement
- **Best Practices**: Coding guidelines and recommendations

### Tools List

- **Tool Cards**: Visual tool organization with metadata
- **Status Indicators**: Active/inactive visual cues
- **Quick Actions**: Copy, edit, delete functionality
- **Code Preview**: Expandable code preview
- **Schema Display**: Input schema visualization

### Code Editor Features

- **Syntax Highlighting**: Python syntax highlighting
- **Auto-completion**: Code completion suggestions
- **Error Detection**: Real-time syntax error detection
- **Code Formatting**: Automatic code formatting
- **Template Insertion**: Quick template insertion

## Performance Optimization

### Efficient State Management

- **Memoization**: Prevent unnecessary re-renders
- **Lazy Loading**: Load tools on demand
- **Debounced Updates**: Reduce API calls during editing
- **Optimistic Updates**: Immediate UI feedback

### Code Execution

- **Cold Start Optimization**: Minimize Lambda cold starts
- **Memory Management**: Efficient memory usage in tools
- **Timeout Handling**: Proper timeout management
- **Concurrent Execution**: Support for parallel tool execution

### Network Optimization

- **Code Compression**: Compress large tool code
- **Caching**: Cache frequently used tools
- **Batch Operations**: Group related API calls
- **Error Recovery**: Graceful handling of network issues

## Security Features

### Code Validation

- **Syntax Checking**: Validate Python syntax
- **Security Scanning**: Check for security vulnerabilities
- **Import Restrictions**: Limit dangerous imports
- **Execution Sandboxing**: Secure execution environment

### Access Control

- **User Authentication**: Secure tool access
- **Permission Management**: Control tool modification rights
- **Audit Logging**: Track all tool operations
- **Code Encryption**: Secure storage of tool code

### Runtime Security

- **Input Sanitization**: Clean tool inputs
- **Output Validation**: Validate tool outputs
- **Resource Limits**: Prevent resource abuse
- **Error Sanitization**: Prevent information leakage

## Error Handling

### Common Error Scenarios

```typescript
// Code validation errors
const handleCodeError = (error: SyntaxError) => {
  console.error("Python syntax error:", error);
  // Highlight problematic code
  // Show specific error message
};

// Schema validation errors
const handleSchemaError = (error: Error) => {
  console.error("Schema validation error:", error);
  // Highlight invalid schema properties
  // Show validation error details
};

// Tool execution errors
const handleExecutionError = (error: Error) => {
  console.error("Tool execution error:", error);
  // Show execution failure message
  // Provide debugging suggestions
};
```

### Error Recovery

- **Automatic Retry**: Retry failed operations with backoff
- **Graceful Degradation**: Maintain core functionality during errors
- **User Notification**: Clear error messages with suggested actions
- **Debug Information**: Detailed logging for troubleshooting

## Testing

### Unit Tests

```typescript
describe("ToolsPage", () => {
  test("should create new tool", async () => {
    // Test tool creation functionality
  });

  test("should validate Python code", async () => {
    // Test code validation
  });

  test("should build input schema", async () => {
    // Test schema building functionality
  });

  test("should handle AI assistant responses", async () => {
    // Test AI integration
  });
});
```

### Integration Tests

- **Full Workflow**: Test complete tool lifecycle
- **Lambda Integration**: Test tool execution in Lambda
- **AI Integration**: Test assistant functionality
- **Cross-component**: Test integration with chat system

### E2E Tests

- **User Journeys**: Test complete user workflows
- **Performance**: Test with complex tools and large schemas
- **Error Scenarios**: Test error handling and recovery
- **Security**: Test security features and restrictions

## Configuration

### Environment Variables

```bash
# Lambda Configuration
LAMBDA_RUNTIME=python3.11
LAMBDA_TIMEOUT=300
LAMBDA_MEMORY=512

# Tool Configuration
MAX_TOOL_SIZE=10MB
MAX_REQUIREMENTS_SIZE=1MB
CODE_EXECUTION_TIMEOUT=30

# AI Assistant Configuration
ENABLE_CODE_GENERATION=true
ENABLE_SCHEMA_SUGGESTIONS=true
MAX_CODE_LENGTH=50000

# Security Configuration
ALLOWED_IMPORTS=json,requests,datetime,os,re
RESTRICTED_FUNCTIONS=eval,exec,open,__import__
```

### Amplify Configuration

```typescript
// amplify/data/resource.ts
export const schema = a.schema({
  toolSpecs: a
    .model({
      name: a.string().required(),
      description: a.string().required(),
      inputSchema: a.json().required(),
      executionCode: a.string(),
      requirements: a.string(),
      isActive: a.boolean().default(true),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [allow.authenticated()]),
});
```

## Monitoring and Analytics

### Usage Tracking

- **Tool Creation**: Track new tool creation rates
- **Code Generation**: Monitor AI code generation usage
- **Tool Execution**: Track tool usage in chat sessions
- **Error Rates**: Monitor tool execution success/failure rates

### Performance Metrics

- **Response Times**: Monitor tool execution times
- **Memory Usage**: Track Lambda memory consumption
- **Cold Starts**: Monitor Lambda cold start frequency
- **User Engagement**: Track time spent on tool development

### Debug Information

```typescript
// Debug logging for development
const DEBUG_MODE = process.env.NODE_ENV === "development";

const debugLog = (operation: string, data: any) => {
  if (DEBUG_MODE) {
    console.log(`[ToolsPage] ${operation}:`, data);
  }
};

// Usage
debugLog("Tool Created", {
  name: tool.name,
  codeLength: tool.executionCode?.length,
});
debugLog("Schema Built", { properties: Object.keys(schema.properties).length });
```

## Future Enhancements

### Planned Features

- **Tool Templates**: Pre-built tool library for common tasks
- **Collaboration Tools**: Multi-user tool development
- **Version Control**: Track tool changes and maintain history
- **Testing Framework**: Built-in tool testing capabilities
- **Performance Monitoring**: Detailed execution analytics
- **Tool Marketplace**: Share and discover community tools

### Technical Improvements

- **Code Intelligence**: Advanced code completion and suggestions
- **Visual Schema Builder**: Drag-and-drop schema construction
- **Debugging Tools**: Interactive debugging and testing
- **Performance Optimization**: Automatic code optimization
- **Security Enhancements**: Advanced security scanning

### AI Enhancements

- **Multi-language Support**: Support for additional programming languages
- **Advanced Code Generation**: More sophisticated code generation
- **Auto-testing**: Automatic test generation for tools
- **Performance Prediction**: Predict tool execution performance
- **Smart Debugging**: AI-powered debugging assistance

## Dependencies

### Core Dependencies

- **Next.js**: React framework for the frontend
- **AWS Amplify**: Backend services and Lambda integration
- **React**: UI library with hooks for state management
- **TypeScript**: Type safety and development experience

### UI Dependencies

- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for visual elements
- **Monaco Editor**: Advanced code editor (if implemented)

### Utility Dependencies

- **JSON Schema**: Schema validation and generation
- **Python AST**: Python code parsing and validation
- **Lodash**: Utility functions for data manipulation

## Related Files

### Backend Configuration

- `amplify/data/resource.ts`: Database schema for tool specifications
- `amplify/functions/chat-bedrock-tools/`: Tool execution functions

### Frontend Components

- `src/components/ui/`: Reusable UI components
- `src/lib/types.ts`: TypeScript type definitions
- `src/hooks/`: Custom React hooks for tool management

### Configuration Files

- `amplify/backend.ts`: Main Amplify configuration
- `next.config.ts`: Next.js configuration
- `tailwind.config.ts`: Tailwind CSS configuration

## Troubleshooting

### Common Issues

#### Tool Creation Fails

- Verify all required fields are filled
- Check Python code syntax
- Validate JSON schema format
- Review browser console for errors

#### AI Assistant Not Responding

```bash
# Check AI service availability
aws bedrock get-model --model-id apac.anthropic.claude-sonnet-4-20250514-v1:0

# Verify authentication
aws sts get-caller-identity

# Check function logs
amplify function logs chat-bedrock-tools
```

#### Tool Execution Issues

- Verify tool is marked as active
- Check Lambda function deployment
- Review CloudWatch logs for errors
- Validate tool input parameters

#### Schema Validation Errors

- Check property names are valid
- Ensure required fields are specified
- Verify data types are correct
- Review schema structure

### Debug Mode

```typescript
// Enable comprehensive debugging
localStorage.setItem("debug", "tools:*");

// Monitor specific operations
localStorage.setItem("debug", "tools:create,tools:execute");

// View debug output in console
console.log("[ToolsPage] Debug information available");
```

## Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure AWS Amplify: `amplify configure`
4. Deploy backend: `amplify push`
5. Start development server: `npm run dev`
6. Access tools page at `http://localhost:3000/tools`

### Adding New Features

1. Update type definitions in `src/lib/types.ts`
2. Implement UI components in the tools page
3. Add backend logic in Amplify functions
4. Update this README with new features
5. Add comprehensive tests

### Code Style Guidelines

- Follow TypeScript best practices
- Use descriptive variable and function names
- Add JSDoc comments for complex functions
- Implement proper error handling
- Write unit tests for new functionality
- Follow React hooks best practices
- Validate Python code syntax
- Use proper JSON schema format

## License

This component is part of the AINP (AI-Native Platform) application. See the main project LICENSE file for details.
