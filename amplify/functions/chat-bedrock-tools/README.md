# Chat Bedrock Tools Function

This AWS Lambda function extends the existing chat functionality with **Bedrock Converse API ToolUse** capabilities, allowing the AI to call external tools when needed.

## Features

### Base Functionality

- **Chat with Bedrock**: Uses Amazon Bedrock Converse API for LLM interactions
- **RAG Support**: Retrieval-Augmented Generation using FAISS vector search
- **Multi-database Search**: Can search across multiple vector databases
- **Multi-turn Conversations**: Maintains conversation context

### Tool Use Capabilities

The AI can automatically decide when to use tools and call them as needed:

1. **Web Search** (`web_search`)

   - Search the web for current information
   - Currently returns placeholder responses (for demo)
   - Can be extended with real search APIs

2. **Calculator** (`calculator`)

   - Perform mathematical calculations safely
   - Supports basic math operations and functions
   - Example: `2 + 3 * 4`, `sqrt(16)`, `sin(pi/2)`

3. **Current Time** (`get_current_time`)

   - Get current date and time
   - Supports timezone specification
   - Returns formatted timestamps

4. **Document Search** (`search_documents`)
   - Search through uploaded documents in vector databases
   - Uses the same RAG functionality as the base chat
   - Returns relevant document chunks with metadata

## Usage

### Event Structure

```json
{
  "arguments": {
    "messages": [{ "role": "user", "text": "What's 15 * 23 + sqrt(144)?" }],
    "systemPrompt": "You are a helpful AI assistant with access to various tools.",
    "modelId": "apac.anthropic.claude-sonnet-4-20250514-v1:0",
    "databaseIds": ["database-1", "database-2"],
    "useTools": true
  }
}
```

### Response Structure

```json
{
  "response": "I'll calculate that for you. 15 * 23 + sqrt(144) = 357 + 12 = 369",
  "modelId": "apac.anthropic.claude-sonnet-4-20250514-v1:0",
  "usage": {
    "inputTokens": 150,
    "outputTokens": 75,
    "totalTokens": 225
  },
  "toolsUsed": 1
}
```

## Configuration

### Environment Variables

- `STORAGE_BUCKET_NAME`: S3 bucket for FAISS indexes
- `FAISS_INDEX_PREFIX`: Prefix for FAISS index storage (default: "faiss-indexes")

### IAM Permissions

- Bedrock: `InvokeModel`, `Converse`, `ConverseStream`
- S3: `GetObject`, `ListBucket` (for FAISS indexes)

## Tool Workflow

1. **Initial Request**: User sends a message
2. **Tool Decision**: Model decides if tools are needed
3. **Tool Execution**: Lambda executes requested tools
4. **Tool Results**: Results are returned to the model
5. **Final Response**: Model generates final response with tool results

## Extending Tools

To add new tools:

1. Add tool definition in `define_tools()`
2. Implement execution function `execute_your_tool()`
3. Add tool name mapping in `execute_tool()`

Example tool definition:

```python
{
    "toolSpec": {
        "name": "your_tool",
        "description": "Description of what your tool does",
        "inputSchema": {
            "json": {
                "type": "object",
                "properties": {
                    "param": {
                        "type": "string",
                        "description": "Parameter description"
                    }
                },
                "required": ["param"]
            }
        }
    }
}
```

## Differences from Base Chat Function

- **Enhanced System Prompt**: Mentions tool availability
- **Tool Configuration**: Adds `toolConfig` to Converse API calls
- **Multi-step Conversation**: Handles tool use → tool results → final response
- **Extended Response**: Includes `toolsUsed` count
- **Increased Resources**: Higher memory (1024MB) and timeout (60s)

## Security Considerations

- Calculator uses safe `eval()` with restricted builtins
- Web search is currently mocked for security
- Tool execution is logged for monitoring
- Input validation on all tool parameters
