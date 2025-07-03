# New Chat Bedrock Tools Function - Summary

## What Was Created

I've successfully created a new AWS Lambda function called **`chat-bedrock-tools`** that extends the existing chat functionality with Bedrock Converse API's ToolUse capabilities.

## Files Created

### 1. `amplify/functions/chat-bedrock-tools/index.py` (629 lines)

The main Lambda function with:

- **Base functionality** from the original chat function (RAG, FAISS search)
- **Tool definitions** for 4 different tools
- **Tool execution logic** with proper error handling
- **ToolUse workflow** implementation with Bedrock Converse API

### 2. `amplify/functions/chat-bedrock-tools/requirements.txt`

Dependencies:

```
faiss-cpu
requests
```

### 3. `amplify/functions/chat-bedrock-tools/resource.ts`

AWS CDK configuration with:

- Python 3.12 runtime
- 1024MB memory (increased for tool processing)
- 60 seconds timeout (increased for tool execution)
- Bedrock permissions including `Converse` and `ConverseStream`
- S3 permissions for FAISS indexes

### 4. `amplify/functions/chat-bedrock-tools/README.md`

Comprehensive documentation explaining usage, configuration, and extension

### 5. Updated `amplify/backend.ts`

Added the new function to the backend configuration with proper S3 permissions and environment variables.

## Available Tools

The AI can automatically decide when to use these tools:

### 1. **Calculator** (`calculator`)

- Safely evaluates mathematical expressions
- Supports basic math and functions like `sqrt()`, `sin()`, etc.
- Example: "What's 15 \* 23 + sqrt(144)?" → Uses calculator tool

### 2. **Current Time** (`get_current_time`)

- Gets current date and time in UTC
- Supports timezone specification
- Returns formatted timestamps

### 3. **Document Search** (`search_documents`)

- Searches through uploaded documents in vector databases
- Uses the existing FAISS/RAG functionality
- Returns relevant document chunks with metadata

### 4. **Web Search** (`web_search`)

- Currently returns placeholder responses (demo mode)
- Can be extended with real search APIs like Google Search API
- Framework is in place for real implementation

## Key Features

### ToolUse Workflow

1. User sends a message
2. Model decides if tools are needed based on the request
3. Lambda executes the requested tools
4. Tool results are sent back to the model
5. Model generates final response incorporating tool results

### Enhanced Capabilities

- **Automatic tool selection**: AI decides when tools are needed
- **Multi-tool support**: Can use multiple tools in one request
- **Tool result integration**: Results are naturally incorporated into responses
- **RAG integration**: Still supports document search from vector databases
- **Error handling**: Robust error handling for tool failures

### Configuration Options

- `useTools`: Enable/disable tool functionality
- `databaseIds`: Vector databases for RAG search
- `systemPrompt`: Custom system prompt
- `modelId`: Bedrock model to use

## Usage Example

### Input:

```json
{
  "arguments": {
    "messages": [
      {
        "role": "user",
        "text": "What's the square root of 256 plus the current time?"
      }
    ],
    "useTools": true,
    "systemPrompt": "You are a helpful assistant with access to tools."
  }
}
```

### What Happens:

1. Model recognizes it needs calculator and time tools
2. Executes `calculator` with "sqrt(256)" → Returns 16
3. Executes `get_current_time` → Returns current timestamp
4. Returns final response: "The square root of 256 is 16, and the current time is 2024-01-15 14:30:25 UTC."

### Output:

```json
{
  "response": "The square root of 256 is 16, and the current time is 2024-01-15 14:30:25 UTC.",
  "modelId": "apac.anthropic.claude-sonnet-4-20250514-v1:0",
  "usage": {
    "inputTokens": 180,
    "outputTokens": 95,
    "totalTokens": 275
  },
  "toolsUsed": 2
}
```

## Benefits Over Original Function

1. **Enhanced Problem Solving**: Can handle mathematical calculations, time queries, and more
2. **Real-time Information**: Framework for web search and current data
3. **Extensible**: Easy to add new tools as needed
4. **Backward Compatible**: Still supports all original functionality (RAG, chat)
5. **Intelligent Tool Use**: Model automatically decides when tools are helpful

## Security & Best Practices

- Calculator uses safe evaluation with restricted built-ins
- All tool inputs are validated
- Tool execution is logged for monitoring
- Web search is currently mocked for security
- Error boundaries prevent tool failures from breaking the chat

## Next Steps

1. **Deploy the function** using AWS Amplify
2. **Test the tool functionality** with various queries
3. **Extend tools** as needed (real web search, file operations, etc.)
4. **Monitor usage** and performance in CloudWatch

The function is ready to deploy and provides a significant enhancement to the AI's capabilities while maintaining all existing functionality.
