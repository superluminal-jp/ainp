# Prompts Page Component

A sophisticated system prompt management interface built with Next.js and AWS Amplify, featuring AI-powered prompt assistance, real-time collaboration, and comprehensive prompt engineering tools with a three-panel layout design.

## Overview

The Prompts Page (`/prompts`) is the central hub for managing system prompts in the application, providing users with:

- **System Prompt Management**: Create, edit, and delete custom system prompts
- **AI-Powered Assistant**: Built-in AI helper for prompt creation and optimization with structured output
- **Real-time Synchronization**: Live updates across all connected sessions via AWS Amplify subscriptions
- **Three-Panel Layout**: Form, AI assistant, and prompts list in dedicated panels
- **Prompt Engineering Tools**: Best practices and optimization suggestions
- **Template Library**: Pre-built prompts for common use cases
- **Integration Ready**: Seamless integration with chat and other components
- **Copy & Share**: Easy prompt sharing and clipboard operations
- **Active Status Management**: Enable/disable prompts for different contexts

## Features

### 📝 System Prompt Management

- **Create Prompts**: Add new system prompts with descriptive names and content
- **Edit Prompts**: Modify existing prompt content and metadata with dedicated edit mode
- **Delete Prompts**: Remove prompts with one-click deletion
- **Toggle Status**: Enable/disable prompts for use in chat sessions with visual switches
- **Copy Content**: One-click copying of prompt content to clipboard with visual feedback
- **Real-time Updates**: Live synchronization across browser sessions via AWS Amplify subscriptions

### 🤖 AI-Powered Prompt Assistant

- **Intelligent Suggestions**: AI-generated prompt names and content using structured output
- **Optimization Advice**: Recommendations for improving existing prompts
- **Best Practices**: Guidance on prompt engineering techniques and methodologies
- **Auto-Application**: Automatic application of AI suggestions to forms
- **Structured Responses**: JSON-formatted AI responses with actionable suggestions
- **Interactive Chat**: Conversational interface for prompt development with specialized system prompt

### 🎛️ User Interface

- **Three-Panel Layout**: Form (1/4), AI assistant (1/3), and prompt list (remaining) panels
- **Responsive Design**: Optimized layout with proper spacing and scrolling
- **Real-time Feedback**: Visual indicators for all operations with toast notifications
- **Documentation Toggle**: Built-in README display for contextual help
- **Loading States**: Visual feedback during operations with disabled controls
- **Error Handling**: Comprehensive error management with user feedback

### 🔧 Advanced Features

- **Prompt Engineering Assistant**: Specialized AI assistant for prompt creation and optimization
- **Version Control**: Track changes and maintain prompt history
- **Collaboration**: Multi-user prompt editing and sharing capabilities
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
const [showReadme, setShowReadme] = useState(false);
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
├── README Display (Collapsible documentation)
└── Three-Panel Layout
    ├── Form Panel (Left 1/4)
    │   ├── Create/Edit Form
    │   ├── Name Input
    │   ├── Content Textarea
    │   └── Action Buttons
    ├── AI Assistant Panel (Center 1/3)
    │   ├── ChatAssistant Component
    │   ├── Specialized System Prompt
    │   ├── Structured Output Handling
    │   └── Suggestion Application
    └── Prompts List (Right Panel)
        ├── Prompt Cards
        ├── Status Toggles
        ├── Action Buttons
        └── Copy Functions
```

## Usage

### Creating a New System Prompt

1. Navigate to `/prompts`
2. Fill in the prompt name (e.g., "Research Assistant")
3. Enter the prompt content with clear instructions
4. Click "Create" to save the prompt
5. Prompt becomes available for use in chat sessions

### Using the AI Assistant

1. Type your request in the AI assistant panel
2. Ask for help with prompt creation, optimization, or best practices
3. Review AI suggestions in the structured response
4. Suggestions are automatically applied to the form fields
5. Modify as needed and save the prompt

### Managing Existing Prompts

1. View all prompts in the right panel with scroll area
2. Toggle active/inactive status with the switch control
3. Click edit button to modify prompt content (enters edit mode)
4. Use copy button to copy prompt content (shows check icon temporarily)
5. Delete prompts with the trash button (immediate deletion)

### Example Prompt Creation Workflow

```typescript
// AI Assistant interaction with structured output
const userQuery = "Create a prompt for a coding assistant that helps with Python";

// AI Response (structured JSON)
{
  "name": "Python Coding Assistant",
  "content": "You are an expert Python developer assistant. Your role is to:\n\n**Primary Functions:**\n- Help users write clean, efficient Python code\n- Debug and troubleshoot Python applications\n- Provide best practices and conventions\n- Suggest library recommendations\n\n**Guidelines:**\n- Use clear, practical examples\n- Explain complex concepts step by step\n- Focus on readability and maintainability\n- Include error handling when appropriate\n\n**Response Format:**\n- Provide working code examples\n- Explain the reasoning behind solutions\n- Offer alternatives when relevant\n- Include comments for clarity"
}
```

## API Integration

### Real-time Subscriptions

```typescript
// Subscribe to prompt updates
useEffect(() => {
  const sub = client.models.systemPrompts.observeQuery().subscribe({
    next: ({ items }) => {
      setSystemPrompts([...items]);
    },
    error: (error) => {
      console.error("Error in real-time subscription:", error);
    },
  });

  return () => sub.unsubscribe();
}, []);
```

### Prompt Operations

```typescript
// Create System Prompt
const handleAddPrompt = async () => {
  if (!formData.name.trim() || !formData.content.trim()) return;

  setLoading(true);
  try {
    await client.models.systemPrompts.create({
      name: formData.name.trim(),
      content: formData.content.trim(),
      isActive: true,
    });

    setFormData({ name: "", content: "" });
    setIsEditing(false);
  } catch (error) {
    console.error("Error creating prompt:", error);
  } finally {
    setLoading(false);
  }
};

// Update System Prompt
const handleUpdatePrompt = async () => {
  if (!editingPrompt || !formData.name.trim() || !formData.content.trim())
    return;

  setLoading(true);
  try {
    await client.models.systemPrompts.update({
      id: editingPrompt.id,
      name: formData.name.trim(),
      content: formData.content.trim(),
      isActive: true,
    });

    setFormData({ name: "", content: "" });
    setEditingPrompt(null);
    setIsEditing(false);
  } catch (error) {
    console.error("Error updating prompt:", error);
  } finally {
    setLoading(false);
  }
};

// Delete System Prompt
const handleDeletePrompt = async (id: string) => {
  setLoading(true);
  try {
    await client.models.systemPrompts.delete({ id });
  } catch (error) {
    console.error("Error deleting prompt:", error);
  } finally {
    setLoading(false);
  }
};

// Toggle Active Status
const togglePromptActive = async (id: string) => {
  const prompt = systemPrompts.find((p) => p.id === id);
  if (!prompt) return;

  setLoading(true);
  try {
    await client.models.systemPrompts.update({
      id,
      isActive: !prompt.isActive,
    });
  } catch (error) {
    console.error("Error updating prompt:", error);
  } finally {
    setLoading(false);
  }
};
```

### AI Assistant Integration

```typescript
// AI-powered prompt assistance with structured output
const PROMPTS_ASSISTANT_PROMPT = `You are an expert AI assistant specialized in helping users create effective system prompts. Your role is to:

**Primary Functions:**
- Generate comprehensive system prompts for various AI assistant roles
- Optimize existing prompts for clarity and effectiveness
- Provide best practices for prompt engineering
- Help users understand prompt structure and components
- Suggest improvements for prompt performance

**Response Format:**
You will use structured output to return a JSON object with the prompt specification. The response will be automatically formatted as JSON with the following fields:

- **name**: Prompt name (string)
- **content**: Complete system prompt content (string)

**Prompt Engineering Guidelines:**
- Create clear, specific instructions for AI behavior
- Include role definition, task description, and output format
- Use structured format with headers and bullet points
- Provide examples and context when helpful
- Consider constraints and ethical guidelines

**Best Practices:**
- Start with role definition (e.g., "You are a...")
- Include specific instructions and guidelines
- Define expected output format and style
- Add constraints and limitations
- Use clear, concise language
- Structure content with proper formatting`;

// Handle AI suggestions
const handleSuggestionReceived = (suggestions: any) => {
  console.log("🔍 AI suggestions received:", suggestions);

  // Apply suggestions to form data
  setFormData((prev) => {
    const updated = { ...prev };

    if (suggestions.name) {
      updated.name = suggestions.name;
    }

    if (suggestions.content) {
      updated.content = suggestions.content;
    }

    return updated;
  });

  // Show success message
  const appliedFields = [];
  if (suggestions.name) appliedFields.push("name");
  if (suggestions.content) appliedFields.push("content");

  if (appliedFields.length > 0) {
    toast.success(`Applied AI suggestions to: ${appliedFields.join(", ")}`);
  }
};
```

## User Interface Features

### Form Panel

- **Name Input**: Descriptive prompt identification with placeholder text
- **Content Textarea**: Full prompt content with auto-resize functionality
- **Action Buttons**: Create/Update/Cancel/Clear with loading states
- **Edit Mode**: Dedicated edit mode with different button states
- **Validation**: Real-time form validation and error display

### AI Assistant Panel

- **ChatAssistant Component**: Specialized chat interface for prompt assistance
- **Contextual Placeholder**: Helpful placeholder text for user guidance
- **Structured Output**: JSON-formatted responses with auto-application
- **Suggestion Application**: Automatic form population from AI suggestions
- **Toast Notifications**: Success feedback when suggestions are applied

### Prompts List

- **Card Layout**: Visual prompt organization with proper spacing
- **Status Indicators**: Active/inactive visual switches with labels
- **Quick Actions**: Copy, edit, delete functionality with icon buttons
- **Copy Feedback**: Temporary check icon when content is copied
- **Scroll Area**: Proper scrolling for large prompt lists
- **Empty State**: Helpful message when no prompts exist

### Copy Functionality

```typescript
// Copy prompt content with visual feedback
const copyPromptContent = async (content: string, id: string) => {
  await navigator.clipboard.writeText(content);
  setCopiedId(id);
  setTimeout(() => setCopiedId(null), 2000);
};
```

## AI Assistant Capabilities

### Prompt Generation

- **Template Selection**: Choose appropriate prompt templates for different use cases
- **Role Definition**: Generate clear role definitions for AI assistants
- **Instruction Formatting**: Structure prompts with proper headers and bullet points
- **Response Formatting**: Define expected output formats and styles
- **Documentation**: Add proper explanations and examples
- **Best Practices**: Follow prompt engineering conventions

### Structured Output Format

```typescript
// AI Assistant Response Structure
interface PromptSuggestion {
  name: string;        // Suggested prompt name
  content: string;     // Complete prompt content
}

// Example structured response
{
  "name": "Technical Documentation Assistant",
  "content": "You are a technical documentation specialist. Your role is to:\n\n**Primary Functions:**\n- Create clear, comprehensive technical documentation\n- Explain complex concepts in accessible language\n- Structure information logically and coherently\n\n**Guidelines:**\n- Use active voice and concise sentences\n- Include practical examples and code snippets\n- Organize content with proper headings and sections\n- Ensure accuracy and up-to-date information\n\n**Response Format:**\n- Start with a brief overview\n- Provide detailed explanations with examples\n- End with actionable next steps or resources"
}
```

### Optimization Advice

- **Clarity Enhancement**: Make instructions more precise and actionable
- **Completeness Check**: Identify missing elements in prompts
- **Consistency Review**: Ensure coherent style throughout prompts
- **Performance Optimization**: Improve AI response quality and relevance
- **Structure Improvement**: Better organization and formatting

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

- **Prompt Storage**: Secure storage in AWS Amplify with real-time sync
- **Version History**: Track prompt changes over time
- **Usage Analytics**: Monitor prompt performance and usage
- **Backup & Recovery**: Automatic prompt backup and restoration

## Performance Optimization

### Efficient State Management

- **Memoization**: Prevent unnecessary re-renders with proper state management
- **Real-time Updates**: Efficient AWS Amplify subscriptions
- **Optimistic Updates**: Immediate UI feedback for user actions
- **Loading States**: Proper loading indicators during operations

### Memory Management

- **Subscription Cleanup**: Proper cleanup of AWS Amplify subscriptions
- **Timeout Management**: Automatic cleanup of temporary UI states
- **State Minimization**: Store only necessary data in component state
- **Component Optimization**: Efficient component lifecycle management

## Error Handling

### Common Error Scenarios

```typescript
// Form validation
const validateForm = () => {
  if (!formData.name.trim()) {
    toast.error("Prompt name is required");
    return false;
  }

  if (!formData.content.trim()) {
    toast.error("Prompt content is required");
    return false;
  }

  return true;
};

// API error handling
const handleApiError = (error: Error, operation: string) => {
  console.error(`Error ${operation}:`, error);
  toast.error(`Failed to ${operation}. Please try again.`);
};
```

### Error Recovery

- **Automatic Retry**: Retry failed operations with exponential backoff
- **Graceful Degradation**: Maintain core functionality during errors
- **User Notification**: Clear error messages with suggested actions
- **Debug Information**: Detailed logging for troubleshooting

## Testing

### Component Testing

```typescript
describe("PromptsPage", () => {
  test("should create new prompt", async () => {
    render(<PromptsPage />);

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/e.g., Research Assistant/), {
      target: { value: "Test Prompt" }
    });

    fireEvent.change(screen.getByPlaceholderText(/Enter the system prompt content/), {
      target: { value: "Test content" }
    });

    // Submit form
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(screen.getByText("Test Prompt")).toBeInTheDocument();
    });
  });

  test("should handle AI assistant responses", async () => {
    render(<PromptsPage />);

    // Test AI assistant integration
    // ... test implementation
  });

  test("should toggle prompt active status", async () => {
    render(<PromptsPage />);

    // Test status toggle functionality
    // ... test implementation
  });
});
```

### Integration Tests

- **Full Workflow**: Test complete prompt lifecycle
- **AI Integration**: Test assistant functionality and suggestion application
- **Real-time Updates**: Test subscription mechanisms
- **Cross-component**: Test integration with chat system

## Accessibility

### Keyboard Navigation

- **Tab Order**: Proper tab navigation through form fields and buttons
- **Enter Key**: Submit forms and activate buttons
- **Escape Key**: Cancel edit mode and close dialogs
- **Arrow Keys**: Navigate through prompt list items

### Screen Reader Support

- **ARIA Labels**: Proper labeling for all interactive elements
- **Role Attributes**: Semantic HTML with appropriate roles
- **Live Regions**: Announce dynamic content changes
- **Focus Management**: Proper focus handling during operations

## Future Enhancements

### Planned Features

- **Prompt Templates**: Pre-built prompt library for common use cases
- **Collaboration Tools**: Multi-user prompt editing and sharing
- **Version Control**: Track prompt changes and maintain history
- **A/B Testing**: Compare prompt effectiveness
- **Advanced Analytics**: Detailed usage and performance insights
- **Import/Export**: Backup and share prompt collections

### Technical Improvements

- **Offline Support**: Local storage for offline prompt editing
- **Advanced Search**: Full-text search across prompt content
- **Categorization**: Organize prompts by tags and categories
- **Performance Optimization**: Enhanced caching and lazy loading
- **Mobile Optimization**: Touch-friendly interface for mobile devices

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
- **Sonner**: Toast notifications for user feedback

### Custom Components

- **ChatAssistant**: AI assistant component for prompt help
- **ReadmeDisplay**: Documentation display component
- **UseSimpleHeader**: Header management hook

## Troubleshooting

### Common Issues

#### AI Assistant Not Responding

- **Check Model Availability**: Verify AI model is accessible
- **Validate Input**: Ensure input meets requirements
- **Check Network**: Verify internet connectivity
- **Review Logs**: Check console for error messages

#### Prompts Not Saving

- **Verify Form Data**: Check that name and content are filled
- **Check Permissions**: Ensure user has proper permissions
- **Network Issues**: Verify AWS Amplify connectivity
- **Validate Input**: Ensure content meets requirements

#### Real-time Updates Not Working

- **Check Subscription**: Verify AWS Amplify subscription is active
- **WebSocket Connection**: Ensure WebSocket connectivity
- **Authentication**: Verify user authentication status
- **Network Connectivity**: Check internet connection

### Debug Mode

```typescript
// Enable comprehensive debugging
const DEBUG_MODE = process.env.NODE_ENV === "development";

if (DEBUG_MODE) {
  console.log("[PromptsPage] State:", {
    promptsCount: systemPrompts.length,
    isEditing,
    formData,
    loading,
  });
}
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

- Follow React and TypeScript best practices
- Use meaningful variable and function names
- Add comprehensive error handling
- Include detailed logging for debugging
- Write unit tests for new functionality
- Follow AWS Amplify patterns for data operations

## License

This component is part of the AINP (AI-Native Platform) application. See the main project LICENSE file for details.
