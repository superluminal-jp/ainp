# Chat Page Component

A comprehensive AI-powered chat interface built with Next.js and AWS Amplify, featuring advanced conversation capabilities with multiple AI models, RAG (Retrieval-Augmented Generation), custom tools, and structured output support.

## Overview

The Chat Page (`/chat`) is the core conversational interface of the application, providing users with a powerful AI assistant that can:

- Engage in natural conversations using multiple AI models
- Access and query custom databases for context-aware responses
- Execute custom tools during conversations
- Generate structured outputs using JSON schemas
- Handle file attachments and multimodal inputs
- Maintain conversation history
- Support voice interaction (planned)

## Features

### 🤖 AI Models

- **Claude 4 Sonnet**: Advanced reasoning and analysis capabilities
- **Amazon Nova Pro**: High-performance multimodal AI model
- Easy model switching during conversations

### 📝 System Prompts

- **Default Assistant**: General-purpose conversational AI
- **Custom Prompts**: User-defined system prompts for specialized behaviors
- **Template Integration**: Automatic prompt selection via templates

### 🗄️ Database Integration (RAG)

- **Multi-Database Support**: Connect to multiple custom databases simultaneously
- **Context-Aware Responses**: AI can query and reference database content
- **Real-time Database Selection**: Change databases mid-conversation
- **Semantic Search**: Advanced retrieval capabilities

### 🛠️ Custom Tools

- **Tool Execution**: AI can execute custom Python functions during conversations
- **Dynamic Tool Selection**: Choose which tools are available per conversation
- **Real-time Tool Management**: Enable/disable tools on the fly
- **Tool Feedback**: Visual indicators when tools are used

### 📋 Templates

- **Pre-configured Settings**: Save and reuse common configurations
- **Automatic Application**: One-click setup for specific use cases
- **Template Management**: Create, edit, and share templates
- **Configuration Bundling**: Combines prompts, databases, and tools

### 🔧 Structured Output

- **JSON Schema Support**: Define response formats using JSON schemas
- **Consistent Formatting**: Ensure AI responses follow specific structures
- **Dynamic Schema Editing**: Modify schemas during conversations
- **Validation**: Built-in schema validation

### 📎 File Management

- **File Attachments**: Attach files to messages for AI analysis
- **Multi-format Support**: Handle various file types
- **Visual Feedback**: Clear attachment indicators
- **Easy Removal**: Quick file detachment

### 💬 Conversation Management

- **Message History**: Persistent conversation tracking
- **Message Actions**: Copy, regenerate, like/dislike messages
- **Clear Conversations**: Fresh start capability
- **Auto-scroll**: Automatic scrolling to latest messages

### 🎙️ Input Modes

- **Text Mode**: Traditional text input with keyboard shortcuts
- **Voice Mode**: Speech-to-text input (placeholder for future implementation)
- **Multimodal**: Combine text and file inputs

## Architecture

### State Management

```typescript
// Core conversation state
const [messages, setMessages] = useState<Message[]>([]);
const [isTyping, setIsTyping] = useState(false);

// Configuration state
const [systemPrompt, setSystemPrompt] = useState<string>("default");
const [selectedDatabases, setSelectedDatabases] = useState<string[]>([]);
const [selectedTools, setSelectedTools] = useState<string[]>([]);
const [selectedModelId, setSelectedModelId] = useState<string>();

// Template and structured output
const [selectedTemplate, setSelectedTemplate] = useState<string>("none");
const [useStructuredOutput, setUseStructuredOutput] = useState(false);
```

### Data Flow

1. **User Input** → Message composition with optional file attachments
2. **Configuration** → System prompt, databases, tools, and model selection
3. **API Call** → `client.queries.chatWithBedrockTools()` with full context
4. **AI Processing** → Bedrock processes with RAG and tool execution
5. **Response** → Structured response with usage statistics
6. **UI Update** → Message display with interaction options

### Real-time Updates

- **AWS Amplify Subscriptions**: Live updates for system prompts, databases, tools, and templates
- **Reactive UI**: Automatic re-rendering when configuration changes
- **Optimistic Updates**: Immediate UI feedback for user actions

## Usage

### Basic Chat

1. Navigate to `/chat`
2. Type your message in the input field
3. Press Enter or click Send
4. AI responds using the default model and settings

### Advanced Configuration

1. **Show Configuration**: Click "Show Configuration" to access settings
2. **Select Model**: Choose between Claude 4 Sonnet and Amazon Nova Pro
3. **Apply Template**: Select a pre-configured template for specific use cases
4. **Choose System Prompt**: Select a custom system prompt for specialized behavior
5. **Connect Databases**: Enable RAG by selecting relevant databases
6. **Enable Tools**: Choose custom tools for AI execution
7. **Structured Output**: Enable JSON schema responses if needed

### Using Templates

```typescript
// Templates automatically configure multiple settings
const template = {
  name: "Research Assistant",
  systemPrompt: "research_prompt_id",
  databases: ["scientific_papers", "reference_docs"],
  tools: ["web_search", "citation_formatter"],
};
```

### File Attachments

1. Click the paperclip icon
2. Select a file from your device
3. File appears in the input area
4. Send message with file context

### Structured Output

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
    },
    "sources": {
      "type": "array",
      "items": { "type": "string" },
      "description": "List of sources used for the response"
    }
  },
  "required": ["answer"]
}
```

## Configuration Options

### System Prompts

- **Default**: General conversational assistant
- **Custom**: User-defined prompts for specific roles or behaviors
- **Template-based**: Automatically selected via templates

### Database Integration

- **Multiple Selection**: Connect to multiple databases simultaneously
- **Real-time Switching**: Change databases during conversation
- **Context Awareness**: AI considers database content in responses

### Tool Selection

- **Active Tools Only**: Only enabled tools are available
- **Multi-tool Support**: Use multiple tools in a single conversation
- **Dynamic Enabling**: Enable/disable tools without restarting conversation

### Model Options

- **Claude 4 Sonnet**: Best for complex reasoning and analysis
- **Amazon Nova Pro**: Optimized for performance and multimodal inputs

## API Integration

### Bedrock Query

```typescript
const response = await client.queries.chatWithBedrockTools({
  messages: conversationHistory,
  systemPrompt: selectedSystemPrompt,
  modelId: selectedModel,
  databaseIds: selectedDatabases,
  useTools: toolsEnabled,
  selectedToolIds: selectedTools,
  responseFormat: structuredOutputSchema,
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

## Component Structure

### Main Layout

```
├── AppHeader (Global navigation)
├── Chat Content Area
│   ├── Message List (ScrollArea)
│   │   ├── User Messages
│   │   ├── AI Messages
│   │   └── Typing Indicator
│   └── Message Actions (Copy, Like, Regenerate)
└── Input Area
    ├── Configuration Panel (Collapsible)
    ├── File Attachment Display
    └── Message Input with Send Button
```

### Key Components

- **Message Rendering**: Supports text, files, and structured content
- **Configuration Panel**: Collapsible settings interface
- **Template Selector**: Quick configuration switching
- **Tool Integration**: Visual feedback for tool usage
- **File Management**: Attachment handling and display

## Keyboard Shortcuts

- **Enter**: Send message
- **Shift + Enter**: New line in message
- **Escape**: Close configuration panel
- **Ctrl/Cmd + K**: Focus message input

## Error Handling

### API Errors

- **Network Issues**: Automatic retry with user notification
- **Invalid Responses**: Fallback error messages
- **Tool Execution Errors**: Graceful degradation

### Validation

- **Schema Validation**: JSON schema format checking
- **Input Validation**: Message content and file type validation
- **Configuration Validation**: Ensure valid selections

## Performance Considerations

### Optimization

- **Memoized Components**: Prevent unnecessary re-renders
- **Lazy Loading**: Load templates and tools on demand
- **Debounced Updates**: Reduce API calls during configuration changes

### Memory Management

- **Message Limit**: Automatic cleanup of old messages
- **File Cleanup**: Temporary file removal after upload
- **State Optimization**: Efficient state updates

## Future Enhancements

### Planned Features

- **Voice Input**: Speech-to-text integration
- **Message Threading**: Branched conversations
- **Export Options**: Save conversations in various formats
- **Advanced Search**: Search within conversation history
- **Collaboration**: Share conversations with team members

### Technical Improvements

- **Streaming Responses**: Real-time response generation
- **Offline Support**: Basic functionality without internet
- **Mobile Optimization**: Touch-friendly interface
- **Accessibility**: Enhanced screen reader support

## Dependencies

### Core Dependencies

- **Next.js**: React framework
- **AWS Amplify**: Backend integration
- **Radix UI**: Component library
- **Tailwind CSS**: Styling framework

### Chat-Specific Dependencies

- **@aws-sdk/client-bedrock**: AI model integration
- **lucide-react**: Icons
- **sonner**: Toast notifications

## Configuration Files

### Related Files

- `amplify/data/resource.ts`: Database schema definitions
- `amplify/functions/chat-bedrock-tools/`: AI processing function
- `src/lib/types.ts`: TypeScript type definitions
- `src/components/ui/`: Reusable UI components

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

### Testing

- **Unit Tests**: Test individual components
- **Integration Tests**: Test full conversation flows
- **E2E Tests**: Test complete user journeys

## Troubleshooting

### Common Issues

#### No AI Response

- Check internet connection
- Verify AWS Amplify configuration
- Ensure valid system prompt selection

#### Database Connection Issues

- Verify database IDs are correct
- Check database activation status
- Confirm proper permissions

#### Tool Execution Errors

- Verify tool is active and properly configured
- Check tool requirements are met
- Review tool execution logs

### Debug Mode

Enable debug logging by setting `DEBUG=true` in your environment to see detailed console output for troubleshooting.

## License

This component is part of the AINP (AI-Native Platform) application. See the main project LICENSE file for details.
