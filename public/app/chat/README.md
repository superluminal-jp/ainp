# Chat Page Component

A comprehensive AI-powered chat interface built with Next.js and AWS Amplify, featuring advanced conversation capabilities with multiple AI models, RAG (Retrieval-Augmented Generation), custom tools, structured output with visual schema builder, and template management.

## Overview

The Chat Page (`/chat`) is the core conversational interface of the application, providing users with a powerful AI assistant that can:

- Engage in natural conversations using multiple AI models
- Access and query custom databases for context-aware responses
- Execute custom tools during conversations
- Generate structured outputs using JSON schemas with visual builder
- Handle file attachments and multimodal inputs
- Maintain conversation history with tabbed interface
- Create and manage reusable templates
- Support voice interaction modes (planned)

## Features

### 🤖 AI Models

- **Claude 4 Sonnet**: Advanced reasoning and analysis capabilities
- **Amazon Nova Pro**: High-performance multimodal AI model
- **Dynamic Model Selection**: Easy model switching with detailed descriptions
- **Model-specific Optimization**: Tailored configurations for each model

### 📝 System Prompts

- **Default Assistant**: General-purpose conversational AI
- **Custom Prompts**: User-defined system prompts for specialized behaviors
- **Template Integration**: Automatic prompt selection via templates
- **Real-time Prompt Switching**: Change prompts during conversations

### 🗄️ Database Integration (RAG)

- **Multi-Database Support**: Connect to multiple custom databases simultaneously
- **Context-Aware Responses**: AI can query and reference database content
- **Real-time Database Selection**: Change databases mid-conversation with checkbox interface
- **Semantic Search**: Advanced retrieval capabilities
- **Visual Database Management**: Popover interface for database selection

### 🛠️ Custom Tools

- **Tool Execution**: AI can execute custom Python functions during conversations
- **Dynamic Tool Selection**: Choose which tools are available per conversation
- **Real-time Tool Management**: Enable/disable tools with popover interface
- **Tool Feedback**: Visual indicators and success messages when tools are used
- **Active Tool Filtering**: Only active tools are available for selection

### 📋 Templates

- **Template Creation**: Save current configurations as reusable templates
- **Template Application**: One-click setup for specific use cases
- **Template Management**: Create, edit, and share templates
- **Configuration Bundling**: Combines prompts, databases, tools, and model settings
- **Advanced Template Creator**: Dialog-based template creation with basic and advanced settings

### 🔧 Structured Output

- **JSON Schema Support**: Define response formats using JSON schemas
- **Visual Schema Builder**: Interactive property editor with drag-and-drop interface
- **Property Management**: Add, edit, and remove schema properties visually
- **Type Selection**: Support for string, number, boolean, array, and object types
- **Array Item Types**: Specify item types for array properties
- **Required Field Management**: Visual checkbox interface for required fields
- **Real-time Schema Generation**: Automatic JSON schema generation from visual builder
- **Schema Validation**: Built-in schema validation and error handling

### 📎 File Management

- **File Attachments**: Attach files to messages for AI analysis
- **Multi-format Support**: Handle various file types
- **Visual Feedback**: Clear attachment indicators in chat input
- **Easy Removal**: Quick file detachment capabilities

### 💬 Conversation Management

- **Tabbed Interface**: Separate chat and history views
- **Message History**: Persistent conversation tracking with dedicated history tab
- **Message Actions**: Copy, regenerate, like/dislike messages
- **Clear Conversations**: Fresh start capability with confirmation
- **Auto-scroll**: Automatic scrolling to latest messages

### 🎙️ Input Modes

- **Text Mode**: Traditional text input with keyboard shortcuts
- **Voice Mode**: Speech-to-text input toggle (placeholder for future implementation)
- **Mode Switching**: Toggle between text and voice input modes
- **Contextual Placeholders**: Different placeholders for different modes

## Architecture

### State Management

```typescript
// Core conversation state
const [messages, setMessages] = useState<Message[]>([]);
const [isTyping, setIsTyping] = useState(false);
const [activeTab, setActiveTab] = useState<"chat" | "history">("chat");
const [messageMode, setMessageMode] = useState<"text" | "voice">("text");

// Configuration state
const [systemPrompt, setSystemPrompt] = useState<string>("default");
const [selectedDatabases, setSelectedDatabases] = useState<string[]>([]);
const [selectedTools, setSelectedTools] = useState<string[]>([]);
const [selectedModelId, setSelectedModelId] = useState<string>(
  "apac.anthropic.claude-sonnet-4-20250514-v1:0"
);

// Template and structured output
const [selectedTemplate, setSelectedTemplate] = useState<string>("none");
const [useStructuredOutput, setUseStructuredOutput] = useState(false);
const [structuredOutputSchema, setStructuredOutputSchema] =
  useState<string>("");

// Visual Schema Builder
const [schemaProperties, setSchemaProperties] = useState<SchemaProperty[]>([]);
const [showSchemaBuilder, setShowSchemaBuilder] = useState(false);

// UI state
const [showConfiguration, setShowConfiguration] = useState(true);
const [showReadme, setShowReadme] = useState(false);
const [showTemplateCreator, setShowTemplateCreator] = useState(false);
```

### Data Flow

1. **User Input** → Message composition with optional file attachments
2. **Configuration** → System prompt, databases, tools, and model selection
3. **Schema Generation** → Visual builder generates JSON schema automatically
4. **API Call** → `client.queries.chatWithBedrockTools()` with full context
5. **AI Processing** → Bedrock processes with RAG and tool execution
6. **Response** → Structured response with usage statistics and tool feedback
7. **UI Update** → Message display with interaction options

### Component Structure

```
ChatPage
├── AppHeader (Global navigation)
├── README Display (Collapsible documentation)
├── Main Content Area
│   ├── Chat Display (Active conversation)
│   ├── History Display (Previous conversations)
│   └── Tabbed Interface
└── Bottom Configuration Bar
    ├── Configuration Toggle
    ├── Model Selection
    ├── Template Management
    ├── System Prompt Selection
    ├── Database Selection (Popover)
    ├── Tool Selection (Popover)
    ├── Structured Output Controls
    │   ├── Enable/Disable Toggle
    │   ├── Visual Schema Builder
    │   └── JSON Schema Editor
    ├── Chat/History Toggle
    ├── Voice/Text Mode Toggle
    └── Message Input
```

## Usage

### Basic Chat

1. Navigate to `/chat`
2. Type your message in the input field
3. Press Enter or click Send
4. AI responds using the selected model and configuration

### Advanced Configuration

1. **Show Configuration**: Configuration panel is visible by default
2. **Select Model**: Choose between Claude 4 Sonnet and Amazon Nova Pro
3. **Apply Template**: Select a pre-configured template for specific use cases
4. **Choose System Prompt**: Select a custom system prompt for specialized behavior
5. **Connect Databases**: Enable RAG by selecting relevant databases via popover
6. **Enable Tools**: Choose custom tools via popover interface
7. **Structured Output**: Enable JSON schema responses with visual builder

### Visual Schema Builder

The visual schema builder provides an intuitive interface for creating JSON schemas:

1. **Enable Structured Output**: Toggle the structured output switch
2. **Show Builder**: Click "Show Builder" to open the visual interface
3. **Add Properties**: Click "Add Property" to create new schema fields
4. **Configure Properties**:
   - Set property name and description
   - Choose type (string, number, boolean, array, object)
   - For arrays, specify item type
   - Mark as required using checkbox
5. **Remove Properties**: Use trash icon to delete unwanted properties
6. **Auto-Generation**: Schema JSON is automatically generated from visual builder

```typescript
// Example schema property configuration
const schemaProperty: SchemaProperty = {
  id: "unique-id",
  name: "confidence",
  type: "number",
  description: "Confidence level from 0 to 1",
  required: false,
  arrayItemType: "string", // Used when type is "array"
};
```

### Template Management

#### Creating Templates

1. **Configure Settings**: Set up your desired configuration (prompt, databases, tools, model)
2. **Open Template Creator**: Click template creation button
3. **Basic Information**:
   - Enter template name
   - Add description
4. **Advanced Settings**: Review selected databases and tools
5. **Save Template**: Click "Save Template" to create reusable configuration

#### Applying Templates

1. **Select Template**: Choose from the template dropdown
2. **Automatic Application**: Template automatically applies all settings:
   - System prompt
   - Selected databases
   - Selected tools
   - Model preferences
3. **Template Feedback**: Success toast confirms template application

### Database Selection

The popover interface provides intuitive database management:

```typescript
// Database selection handling
const handleDatabaseSelection = (databaseId: string, checked: boolean) => {
  if (checked) {
    setSelectedDatabases((prev) => [...prev, databaseId]);
  } else {
    setSelectedDatabases((prev) => prev.filter((id) => id !== databaseId));
  }
};
```

### Tool Selection

Similar to databases, tools are selected via popover:

```typescript
// Tool selection with active filtering
const availableTools = customTools.filter((tool) => tool.isActive);

// Tool selection handling
const handleToolSelection = (toolId: string, checked: boolean) => {
  if (checked) {
    setSelectedTools((prev) => [...prev, toolId]);
  } else {
    setSelectedTools((prev) => prev.filter((id) => id !== toolId));
  }
};
```

### Structured Output Examples

#### Simple Schema

```json
{
  "type": "object",
  "properties": {
    "answer": {
      "type": "string",
      "description": "The main response to the user's question"
    },
    "confidence": {
      "type": "number",
      "description": "Confidence level from 0 to 1"
    }
  },
  "required": ["answer"]
}
```

#### Complex Schema with Arrays

```json
{
  "type": "object",
  "properties": {
    "summary": {
      "type": "string",
      "description": "Brief summary of the analysis"
    },
    "findings": {
      "type": "array",
      "description": "List of key findings",
      "items": {
        "type": "string"
      }
    },
    "recommendations": {
      "type": "array",
      "description": "Actionable recommendations",
      "items": {
        "type": "object"
      }
    }
  },
  "required": ["summary", "findings"]
}
```

## API Integration

### Enhanced Bedrock Query

```typescript
const response = await client.queries.chatWithBedrockTools({
  messages: conversationHistory,
  systemPrompt: selectedSystemPrompt,
  modelId: selectedModel,
  databaseIds: selectedDatabases,
  useTools: selectedTools.length > 0,
  selectedToolIds: selectedTools,
  responseFormat: structuredOutputSchema
    ? {
        json: JSON.parse(structuredOutputSchema),
      }
    : undefined,
});
```

### Response Structure

```typescript
interface ChatResponse {
  response: string;
  modelId: string;
  usage?: TokenUsage;
  toolsUsed?: number;
  structuredOutput?: boolean;
}
```

### Error Handling

```typescript
// Comprehensive error handling
try {
  const result = await client.queries.chatWithBedrockTools(requestPayload);

  if (result.errors && result.errors.length > 0) {
    throw new Error(
      `GraphQL errors: ${result.errors.map((e) => e.message).join(", ")}`
    );
  }

  if (result.data) {
    // Process successful response
    const aiResponse = createAIMessage(result.data);
    setMessages((prev) => [...prev, aiResponse]);
  }
} catch (error) {
  // Handle errors with user-friendly messages
  const errorResponse = createErrorMessage(error);
  setMessages((prev) => [...prev, errorResponse]);
  toast.error("Failed to generate response");
}
```

## User Interface Features

### Configuration Panel

- **Collapsible Design**: Show/hide configuration to maximize chat space
- **Model Selection**: Dropdown with detailed model descriptions
- **Template Management**: Dropdown with template application
- **System Prompt Selection**: Dropdown with custom prompts
- **Database Selection**: Popover with checkbox interface
- **Tool Selection**: Popover with active tool filtering
- **Structured Output**: Toggle with visual schema builder

### Visual Schema Builder

- **Property Management**: Add, edit, remove properties visually
- **Type Selection**: Dropdown for property types
- **Array Configuration**: Specify item types for arrays
- **Required Field Management**: Checkbox interface
- **Description Fields**: Context-aware descriptions
- **Real-time Updates**: Schema updates automatically
- **Validation**: Built-in schema validation

### Chat Interface

- **Tabbed Design**: Separate chat and history views
- **Message Actions**: Copy, regenerate responses
- **File Attachments**: Visual attachment indicators
- **Typing Indicators**: Real-time typing feedback
- **Auto-scroll**: Automatic message scrolling

### Template Creator

- **Modal Interface**: Full-screen template creation
- **Tabbed Design**: Basic and advanced configuration
- **Current Configuration**: Auto-populate from current settings
- **Validation**: Required field validation
- **Success Feedback**: Toast notifications

## Performance Optimization

### Efficient State Management

- **Memoized Components**: Prevent unnecessary re-renders
- **Callback Memoization**: Optimized event handlers
- **Lazy Loading**: Load templates and tools on demand
- **Debounced Updates**: Reduce API calls during configuration changes

### Real-time Updates

- **Optimistic Updates**: Immediate UI feedback
- **Auto-generation**: Real-time schema generation
- **Template Application**: Instant configuration updates
- **Visual Feedback**: Immediate response to user actions

## Error Handling

### Schema Validation

```typescript
// JSON schema validation
const validateSchema = (schema: string) => {
  try {
    const parsed = JSON.parse(schema);
    if (!parsed.type || !parsed.properties) {
      throw new Error("Invalid schema structure");
    }
    return true;
  } catch (error) {
    toast.error("Invalid JSON schema format");
    return false;
  }
};
```

### Configuration Validation

- **Required Fields**: Validate template creation
- **Database Connectivity**: Verify database availability
- **Tool Availability**: Check tool activation status
- **Model Compatibility**: Ensure model selection is valid

## Testing

### Component Testing

```typescript
describe("ChatPage", () => {
  test("should render chat interface", () => {
    render(<ChatPage />);
    expect(screen.getByPlaceholderText(/Type your message/)).toBeInTheDocument();
  });

  test("should handle template application", async () => {
    const { user } = renderWithProviders(<ChatPage />);
    // Test template selection and application
  });

  test("should validate schema builder", async () => {
    const { user } = renderWithProviders(<ChatPage />);
    // Test visual schema builder functionality
  });
});
```

### Integration Testing

- **Full Workflow**: Test complete conversation flow
- **Template Management**: Test template creation and application
- **Schema Generation**: Test visual builder to JSON conversion
- **Configuration Persistence**: Test settings persistence

## Keyboard Shortcuts

- **Enter**: Send message
- **Shift + Enter**: New line in message
- **Escape**: Close configuration panel
- **Ctrl/Cmd + K**: Focus message input
- **Ctrl/Cmd + /**: Toggle configuration panel

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Proper ARIA labels
- **Color Contrast**: WCAG compliant colors
- **Focus Management**: Proper focus handling

## Future Enhancements

### Planned Features

- **Voice Input**: Speech-to-text integration
- **Message Threading**: Branched conversations
- **Export Options**: Save conversations in various formats
- **Advanced Search**: Search within conversation history
- **Collaboration**: Share conversations with team members
- **Template Sharing**: Export/import templates

### Technical Improvements

- **Streaming Responses**: Real-time response generation
- **Offline Support**: Basic functionality without internet
- **Mobile Optimization**: Touch-friendly interface
- **Performance Monitoring**: Response time tracking

## Dependencies

### Core Dependencies

- **Next.js**: React framework
- **AWS Amplify**: Backend integration
- **Radix UI**: Component library
- **Tailwind CSS**: Styling framework

### Chat-Specific Dependencies

- **Lucide React**: Icons
- **Sonner**: Toast notifications
- **Class Variance Authority**: Component styling
- **React Hook Form**: Form management (if used)

## Troubleshooting

### Common Issues

#### Schema Builder Not Working

- **Check JSON Syntax**: Ensure valid JSON format
- **Verify Property Names**: Property names must be valid
- **Required Fields**: At least one property must be defined

#### Template Application Fails

- **Check Template Data**: Verify template has valid configuration
- **Database Availability**: Ensure selected databases exist
- **Tool Activation**: Verify tools are active

#### Configuration Not Saving

- **Check Permissions**: Verify user has proper permissions
- **Validate Input**: Ensure all required fields are filled
- **Network Issues**: Check internet connectivity

### Debug Mode

```typescript
// Enable debug logging
const DEBUG_MODE = process.env.NODE_ENV === "development";

if (DEBUG_MODE) {
  console.log("[ChatPage] Configuration:", {
    systemPrompt,
    selectedDatabases,
    selectedTools,
    useStructuredOutput,
    schemaProperties,
  });
}
```

## Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure AWS Amplify: `amplify configure`
4. Start development server: `npm run dev`

### Adding New Features

1. Update type definitions in `src/lib/types.ts`
2. Implement UI components in the chat page
3. Add backend logic in Amplify functions
4. Update this README with new features

### Code Style

- Follow React and TypeScript best practices
- Use meaningful variable and function names
- Implement proper error handling
- Add comprehensive logging
- Write unit tests for new functionality

## License

This component is part of the AINP (AI-Native Platform) application. See the main project LICENSE file for details.
