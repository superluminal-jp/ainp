# Prompts Page Component

A sophisticated system prompt management interface built with Next.js and AWS Amplify, featuring AI-powered prompt assistance, real-time collaboration, and comprehensive prompt engineering tools.

## Overview

The Prompts Page (`/prompts`) is the central hub for managing system prompts in the application, providing users with:

- **System Prompt Management**: Create, edit, and delete custom system prompts
- **AI-Powered Assistant**: Built-in AI helper for prompt creation and optimization
- **Real-time Synchronization**: Live updates across all connected sessions
- **Prompt Engineering Tools**: Best practices and optimization suggestions
- **Template Library**: Pre-built prompts for common use cases
- **Integration Ready**: Seamless integration with chat and other components
- **Copy & Share**: Easy prompt sharing and clipboard operations
- **Active Status Management**: Enable/disable prompts for different contexts

## Features

### 📝 System Prompt Management

- **Create Prompts**: Add new system prompts with descriptive names
- **Edit Prompts**: Modify existing prompt content and metadata
- **Delete Prompts**: Remove prompts with confirmation dialogs
- **Toggle Status**: Enable/disable prompts for use in chat sessions
- **Copy Content**: One-click copying of prompt content to clipboard
- **Real-time Updates**: Live synchronization across browser sessions

### 🤖 AI-Powered Prompt Assistant

- **Intelligent Suggestions**: AI-generated prompt names and content
- **Optimization Advice**: Recommendations for improving existing prompts
- **Best Practices**: Guidance on prompt engineering techniques
- **Auto-Application**: Automatic application of AI suggestions to forms
- **Structured Responses**: JSON-formatted AI responses with actionable suggestions
- **Interactive Chat**: Conversational interface for prompt development

### 🎛️ User Interface

- **Three-Panel Layout**: Form, assistant, and prompt list panels
- **Responsive Design**: Optimized for various screen sizes
- **Real-time Feedback**: Visual indicators for all operations
- **Keyboard Shortcuts**: Efficient navigation and input handling
- **Error Handling**: Comprehensive error management with user feedback
- **Loading States**: Visual feedback during operations

### 🔧 Advanced Features

- **Prompt Templates**: Pre-built prompts for common scenarios
- **Version Control**: Track changes and maintain prompt history
- **Collaboration**: Multi-user prompt editing and sharing
- **Integration Points**: Connect with chat, databases, and tools
- **Export/Import**: Backup and share prompt collections
- **Analytics**: Usage tracking and optimization metrics

## Architecture

### State Management

```typescript
// Core prompt state
const [systemPrompts, setSystemPrompts] = useState<
  Schema["systemPrompts"]["type"][]
>([]);
const [isEditing, setIsEditing] = useState(false);
const [editingPrompt, setEditingPrompt] = useState<
  Schema["systemPrompts"]["type"] | null
>(null);

// Form state
const [formData, setFormData] = useState({
  name: "",
  content: "",
});

// UI state
const [copiedId, setCopiedId] = useState<string | null>(null);
const [loading, setLoading] = useState(false);

// Chat assistant state
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [inputMessage, setInputMessage] = useState("");
const [isLoading, setIsLoading] = useState(false);
```

### Data Flow

1. **Prompt Creation** → Form submission → AWS Amplify API → Database storage → Real-time updates
2. **AI Assistant** → User input → Bedrock processing → Structured response → Auto-application
3. **Prompt Management** → CRUD operations → Database synchronization → UI updates
4. **Real-time Sync** → AWS subscriptions → State updates → UI refresh
5. **Integration** → Prompt selection → Chat system → AI model configuration

### Component Structure

```
PromptsPage
├── AppHeader (Global navigation)
├── Main Layout (Three-panel design)
│   ├── Form Panel (Left 1/4)
│   │   ├── Prompt Form
│   │   ├── Name Input
│   │   ├── Content Textarea
│   │   └── Action Buttons
│   ├── Assistant Panel (Center 1/3)
│   │   ├── Chat Interface
│   │   ├── Message History
│   │   ├── AI Responses
│   │   └── Input Controls
│   └── Prompts List (Right)
│       ├── Prompt Cards
│       ├── Status Toggles
│       ├── Action Buttons
│       └── Copy Functions
```

## Usage

### Creating a New System Prompt

1. Navigate to `/prompts`
2. Fill in the prompt name (e.g., "Research Assistant")
3. Enter the prompt content with clear instructions
4. Click "Create" to save the prompt
5. Prompt becomes available for use in chat sessions

### Using the AI Assistant

1. Type your request in the assistant chat panel
2. Ask for help with prompt creation, optimization, or best practices
3. Review AI suggestions in the response
4. Suggestions are automatically applied to the form
5. Modify as needed and save the prompt

### Managing Existing Prompts

1. View all prompts in the right panel
2. Toggle active/inactive status with the switch
3. Click edit button to modify prompt content
4. Use copy button to copy prompt content
5. Delete prompts with the trash button (confirmation required)

### Example Prompt Creation Workflow

```typescript
// AI Assistant interaction
const userQuery = "Create a prompt for a coding assistant that helps with Python";

// AI Response (structured)
{
  "message": "I'll help you create a Python coding assistant prompt...",
  "suggestions": {
    "name": "Python Coding Assistant",
    "content": "You are an expert Python developer assistant. Help users with:\n- Writing clean, efficient Python code\n- Debugging and troubleshooting\n- Best practices and conventions\n- Library recommendations..."
  },
  "tips": [
    "Be specific about the programming domains",
    "Include error handling guidelines",
    "Mention code review practices"
  ]
}
```

## API Integration

### Prompt Operations

```typescript
// Create System Prompt
const createPrompt = async () => {
  await client.models.systemPrompts.create({
    name: formData.name.trim(),
    content: formData.content.trim(),
    isActive: true,
  });
};

// Update System Prompt
const updatePrompt = async () => {
  await client.models.systemPrompts.update({
    id: editingPrompt.id,
    name: formData.name.trim(),
    content: formData.content.trim(),
    isActive: true,
  });
};

// Delete System Prompt
const deletePrompt = async (id: string) => {
  await client.models.systemPrompts.delete({ id });
};

// Toggle Active Status
const toggleActive = async (id: string) => {
  await client.models.systemPrompts.update({
    id,
    isActive: !prompt.isActive,
  });
};
```

### Real-time Subscriptions

```typescript
// Subscribe to prompt updates
useEffect(() => {
  const subscription = client.models.systemPrompts.observeQuery().subscribe({
    next: ({ items }) => {
      setSystemPrompts([...items]);
    },
    error: (error) => {
      console.error("Subscription error:", error);
    },
  });

  return () => subscription.unsubscribe();
}, []);
```

### AI Assistant Integration

```typescript
// AI-powered prompt assistance
const getPromptHelp = async (userMessage: string) => {
  const response = await client.queries.chatWithBedrockTools({
    messages: conversationHistory,
    systemPrompt: promptEngineeringSystemPrompt,
    modelId: "apac.anthropic.claude-sonnet-4-20250514-v1:0",
    responseFormat: {
      json: {
        type: "object",
        properties: {
          message: { type: "string" },
          suggestions: {
            type: "object",
            properties: {
              name: { type: "string" },
              content: { type: "string" },
            },
          },
          tips: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  });
};
```

## Prompt Engineering Best Practices

### Effective Prompt Structure

```typescript
// Well-structured system prompt example
const examplePrompt = {
  name: "Technical Documentation Assistant",
  content: `You are a technical documentation specialist. Your role is to:

**Primary Functions:**
- Create clear, comprehensive technical documentation
- Explain complex concepts in accessible language
- Structure information logically and coherently

**Guidelines:**
- Use active voice and concise sentences
- Include practical examples and code snippets
- Organize content with proper headings and sections
- Ensure accuracy and up-to-date information

**Response Format:**
- Start with a brief overview
- Provide detailed explanations with examples
- End with actionable next steps or resources

**Constraints:**
- Keep explanations focused and relevant
- Avoid unnecessary jargon or overly complex language
- Maintain consistency in style and tone throughout`,
};
```

### Prompt Categories

1. **Role-Based Prompts**: Define specific AI personas (e.g., teacher, analyst, developer)
2. **Task-Specific Prompts**: Focus on particular functions (e.g., writing, coding, research)
3. **Domain Expert Prompts**: Specialized knowledge areas (e.g., medical, legal, technical)
4. **Interaction Style Prompts**: Define communication preferences (e.g., formal, casual, educational)

### Optimization Techniques

- **Clarity**: Use clear, unambiguous instructions
- **Specificity**: Define exact requirements and constraints
- **Examples**: Include sample inputs and outputs
- **Context**: Provide relevant background information
- **Formatting**: Structure prompts with headers and bullet points
- **Testing**: Validate prompts with various inputs

## AI Assistant Capabilities

### Prompt Generation

- **Name Suggestions**: Creative, descriptive names based on prompt purpose
- **Content Creation**: Complete prompt content with best practices
- **Structure Optimization**: Proper formatting and organization
- **Tone Adjustment**: Modify prompts for different interaction styles

### Prompt Improvement

- **Clarity Enhancement**: Make instructions more precise
- **Completeness Check**: Identify missing elements
- **Consistency Review**: Ensure coherent style throughout
- **Performance Optimization**: Improve AI response quality

### Best Practice Guidance

- **Prompt Engineering Tips**: Industry-standard techniques
- **Common Pitfalls**: Avoid typical mistakes
- **Testing Strategies**: Validate prompt effectiveness
- **Performance Metrics**: Measure prompt success

### Structured Response Format

```json
{
  "message": "Detailed explanation and guidance",
  "suggestions": {
    "name": "Suggested prompt name",
    "content": "Complete prompt content with best practices"
  },
  "tips": [
    "Practical tip for prompt engineering",
    "Best practice recommendation",
    "Optimization technique"
  ]
}
```

## Integration Points

### Chat System Integration

```typescript
// Prompts are automatically available in chat
const availablePrompts = systemPrompts.filter((prompt) => prompt.isActive);

// Selected prompt configures chat behavior
const chatConfiguration = {
  systemPrompt: selectedPrompt.content,
  modelId: "apac.anthropic.claude-sonnet-4-20250514-v1:0",
  // ... other configurations
};
```

### Template System

- **Template Creation**: Convert prompts to reusable templates
- **Template Application**: Apply prompt configurations automatically
- **Template Sharing**: Export and import prompt templates
- **Template Library**: Curated collection of proven prompts

### Database Integration

- **Prompt Storage**: Secure storage in AWS Amplify
- **Version History**: Track prompt changes over time
- **Usage Analytics**: Monitor prompt performance and usage
- **Backup & Recovery**: Automatic prompt backup and restoration

## User Interface Features

### Form Panel

- **Name Input**: Descriptive prompt identification
- **Content Textarea**: Full prompt content with syntax highlighting
- **Auto-resize**: Dynamic textarea sizing based on content
- **Character Count**: Monitor prompt length for optimization
- **Validation**: Real-time form validation and error display

### Assistant Panel

- **Chat Interface**: Conversational AI assistance
- **Message History**: Persistent conversation tracking
- **Auto-scroll**: Automatic scrolling to latest messages
- **Typing Indicators**: Visual feedback during AI processing
- **Response Formatting**: Proper display of structured responses

### Prompts List

- **Card Layout**: Visual prompt organization
- **Status Indicators**: Active/inactive visual cues
- **Quick Actions**: Copy, edit, delete functionality
- **Search & Filter**: Find specific prompts quickly
- **Sorting Options**: Organize by name, date, or usage

### Keyboard Shortcuts

- **Enter**: Send message in assistant chat
- **Shift+Enter**: New line in textarea
- **Ctrl/Cmd+S**: Save current prompt
- **Escape**: Cancel editing mode
- **Ctrl/Cmd+C**: Copy selected prompt content

## Performance Optimization

### Efficient State Management

- **Memoization**: Prevent unnecessary re-renders
- **Lazy Loading**: Load prompts on demand
- **Debounced Updates**: Reduce API calls during typing
- **Optimistic Updates**: Immediate UI feedback

### Memory Management

- **Cleanup**: Automatic cleanup of subscriptions and timeouts
- **Garbage Collection**: Efficient memory usage patterns
- **State Minimization**: Store only necessary data in state
- **Component Optimization**: Efficient component lifecycle management

### Network Optimization

- **Batched Operations**: Group related API calls
- **Caching**: Cache frequently accessed prompts
- **Compression**: Optimize data transfer
- **Error Recovery**: Graceful handling of network issues

## Security Features

### Input Validation

- **Sanitization**: Clean user input before storage
- **Length Limits**: Enforce reasonable prompt sizes
- **Content Filtering**: Prevent malicious content injection
- **XSS Prevention**: Protect against cross-site scripting

### Access Control

- **User Authentication**: Secure prompt access
- **Permission Management**: Control prompt modification rights
- **Audit Logging**: Track all prompt operations
- **Data Encryption**: Secure storage and transmission

## Error Handling

### Common Error Scenarios

```typescript
// Network errors
const handleNetworkError = (error: Error) => {
  console.error("Network error:", error);
  // Show user-friendly error message
  // Attempt retry with exponential backoff
};

// Validation errors
const handleValidationError = (field: string, message: string) => {
  // Highlight problematic field
  // Display specific error message
  // Prevent form submission
};

// AI processing errors
const handleAIError = (error: Error) => {
  // Fallback to basic functionality
  // Log error for debugging
  // Notify user of degraded service
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
describe("PromptsPage", () => {
  test("should create new prompt", async () => {
    // Test prompt creation functionality
  });

  test("should edit existing prompt", async () => {
    // Test prompt editing workflow
  });

  test("should handle AI assistant responses", async () => {
    // Test AI integration and response handling
  });

  test("should toggle prompt active status", async () => {
    // Test status management
  });
});
```

### Integration Tests

- **Full Workflow**: Test complete prompt lifecycle
- **AI Integration**: Test assistant functionality
- **Real-time Updates**: Test subscription mechanisms
- **Cross-component**: Test integration with chat system

### E2E Tests

- **User Journeys**: Test complete user workflows
- **Performance**: Test with large numbers of prompts
- **Error Scenarios**: Test error handling and recovery
- **Accessibility**: Test keyboard navigation and screen readers

## Configuration

### Environment Variables

```bash
# AI Model Configuration
DEFAULT_MODEL_ID=apac.anthropic.claude-sonnet-4-20250514-v1:0
MAX_PROMPT_LENGTH=4000
AUTO_SAVE_INTERVAL=30000

# Feature Flags
ENABLE_AI_ASSISTANT=true
ENABLE_REAL_TIME_SYNC=true
ENABLE_PROMPT_TEMPLATES=true

# Performance Settings
MAX_CHAT_HISTORY=50
DEBOUNCE_DELAY=300
RETRY_ATTEMPTS=3
```

### Amplify Configuration

```typescript
// amplify/data/resource.ts
export const schema = a.schema({
  systemPrompts: a
    .model({
      name: a.string().required(),
      content: a.string().required(),
      isActive: a.boolean().default(true),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [allow.authenticated()]),
});
```

## Monitoring and Analytics

### Usage Tracking

- **Prompt Creation**: Track new prompt creation rates
- **AI Assistant Usage**: Monitor assistant interaction patterns
- **Popular Prompts**: Identify most-used prompts
- **Error Rates**: Track and analyze error patterns

### Performance Metrics

- **Response Times**: Monitor API and AI response speeds
- **User Engagement**: Track time spent on prompt creation
- **Success Rates**: Measure prompt creation completion rates
- **User Satisfaction**: Collect feedback on AI assistance quality

### Debug Information

```typescript
// Debug logging for development
const DEBUG_MODE = process.env.NODE_ENV === "development";

const debugLog = (operation: string, data: any) => {
  if (DEBUG_MODE) {
    console.log(`[PromptsPage] ${operation}:`, data);
  }
};

// Usage
debugLog("Prompt Created", {
  name: prompt.name,
  length: prompt.content.length,
});
debugLog("AI Response", {
  responseTime: duration,
  suggestions: response.suggestions,
});
```

## Future Enhancements

### Planned Features

- **Prompt Templates**: Pre-built prompt library
- **Collaboration Tools**: Multi-user prompt editing
- **Version Control**: Track prompt changes and history
- **A/B Testing**: Compare prompt effectiveness
- **Advanced Analytics**: Detailed usage and performance insights
- **Import/Export**: Backup and share prompt collections

### Technical Improvements

- **Offline Support**: Local storage for offline prompt editing
- **Advanced Search**: Full-text search across prompt content
- **Categorization**: Organize prompts by tags and categories
- **Performance Optimization**: Enhanced caching and lazy loading
- **Mobile App**: Native mobile application for prompt management

### AI Enhancements

- **Multi-model Support**: Support for different AI models
- **Prompt Validation**: Automated prompt quality assessment
- **Performance Prediction**: Predict prompt effectiveness
- **Auto-optimization**: Automatic prompt improvement suggestions
- **Context Awareness**: Smart suggestions based on usage patterns

## Dependencies

### Core Dependencies

- **Next.js**: React framework for the frontend
- **AWS Amplify**: Backend services and real-time subscriptions
- **React**: UI library with hooks for state management
- **TypeScript**: Type safety and development experience

### UI Dependencies

- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for visual elements
- **React Hook Form**: Form state management and validation

### Utility Dependencies

- **Date-fns**: Date manipulation and formatting
- **Lodash**: Utility functions for data manipulation
- **Uuid**: Unique identifier generation

## Related Files

### Backend Configuration

- `amplify/data/resource.ts`: Database schema for system prompts
- `amplify/functions/chat-bedrock-tools/`: AI processing functions

### Frontend Components

- `src/components/ui/`: Reusable UI components
- `src/lib/types.ts`: TypeScript type definitions
- `src/hooks/`: Custom React hooks for prompt management

### Configuration Files

- `amplify/backend.ts`: Main Amplify configuration
- `next.config.ts`: Next.js configuration
- `tailwind.config.ts`: Tailwind CSS configuration

## Troubleshooting

### Common Issues

#### AI Assistant Not Responding

```bash
# Check AI service availability
curl -X POST https://api.bedrock.aws.com/health

# Verify authentication
aws sts get-caller-identity

# Check Amplify function logs
amplify function logs chat-bedrock-tools
```

#### Prompts Not Saving

- Verify form validation (name and content required)
- Check network connectivity
- Confirm AWS Amplify configuration
- Review browser console for errors

#### Real-time Updates Not Working

- Verify WebSocket connection
- Check subscription status in browser DevTools
- Confirm Amplify real-time configuration
- Test with multiple browser tabs

#### Performance Issues

- Monitor memory usage in browser DevTools
- Check for memory leaks in subscriptions
- Verify cleanup in useEffect hooks
- Consider reducing chat history size

### Debug Mode

```typescript
// Enable comprehensive debugging
localStorage.setItem("debug", "prompts:*");

// Monitor specific operations
localStorage.setItem("debug", "prompts:create,prompts:ai");

// View debug output in console
console.log("[PromptsPage] Debug information available");
```

## Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure AWS Amplify: `amplify configure`
4. Start development server: `npm run dev`
5. Access prompts page at `http://localhost:3000/prompts`

### Adding New Features

1. Update type definitions in `src/lib/types.ts`
2. Implement UI components in the prompts page
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

## License

This component is part of the AINP (AI-Native Platform) application. See the main project LICENSE file for details.
