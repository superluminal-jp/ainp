# DynamoDB-Based Tool System

This implementation stores tool specifications in DynamoDB, making the tool system dynamic and manageable.

## Overview

The Lambda function now loads tool specifications from the `toolSpecs` DynamoDB table instead of hardcoding them. This allows for:

- Dynamic tool management without code changes
- User-specific tools (using authorization)
- Easy addition/removal of tools
- Tool versioning and categories

## DynamoDB Schema

### toolSpecs Table

| Field         | Type                 | Description                        |
| ------------- | -------------------- | ---------------------------------- |
| `id`          | String (Primary Key) | Unique tool identifier             |
| `name`        | String               | Tool name (used in Bedrock API)    |
| `description` | String               | Tool description for AI            |
| `inputSchema` | JSON                 | JSON schema for tool inputs        |
| `isActive`    | Boolean              | Whether tool is active             |
| `category`    | String               | Optional category for organization |
| `createdAt`   | DateTime             | Creation timestamp                 |
| `updatedAt`   | DateTime             | Last update timestamp              |
| `owner`       | String               | Tool owner (for authorization)     |

## Setup Instructions

### 1. Deploy the Backend

Deploy your Amplify backend with the updated configuration:

```bash
npx ampx sandbox
```

### 2. Seed Default Tools

After deployment, seed the table with default tools:

```bash
cd amplify/functions/chat-bedrock-tools
python3 seed_tools.py <TABLE_NAME>
```

To find your table name, check the AWS Console or use:

```bash
aws dynamodb list-tables --query "TableNames[?contains(@, 'toolSpecs')]"
```

### 3. Verify Tools

Check that tools were created successfully:

```bash
aws dynamodb scan --table-name <TABLE_NAME> --query "Items[].{name:name.S,active:isActive.BOOL}"
```

## Default Tools

The system includes these default tools:

1. **web_search** - Search the web for information
2. **calculator** - Perform mathematical calculations
3. **get_current_time** - Get current date/time
4. **search_documents** - Search vector databases

## Managing Tools

### Adding a New Tool

To add a new tool, insert an item into the DynamoDB table:

```python
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('YOUR_TABLE_NAME')

tool_item = {
    'name': 'weather_forecast',
    'description': 'Get weather forecast for a location',
    'inputSchema': {
        'type': 'object',
        'properties': {
            'location': {
                'type': 'string',
                'description': 'City or location name'
            }
        },
        'required': ['location']
    },
    'category': 'utility',
    'isActive': True,
    'createdAt': datetime.utcnow().isoformat(),
    'updatedAt': datetime.utcnow().isoformat()
}

table.put_item(Item=tool_item)
```

### Updating Tool Execution

When adding new tools, update the `execute_tool()` function in `index.py`:

```python
def execute_tool(tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a tool based on the tool name and input."""
    try:
        if tool_name == "web_search":
            return execute_web_search(tool_input)
        elif tool_name == "calculator":
            return execute_calculator(tool_input)
        elif tool_name == "get_current_time":
            return execute_get_current_time(tool_input)
        elif tool_name == "search_documents":
            return execute_search_documents(tool_input)
        elif tool_name == "weather_forecast":  # New tool
            return execute_weather_forecast(tool_input)
        else:
            return {"error": f"Unknown tool: {tool_name}", "success": False}
    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {str(e)}")
        return {"error": f"Tool execution failed: {str(e)}", "success": False}
```

### Disabling Tools

To temporarily disable a tool without deleting it:

```python
table.update_item(
    Key={'id': 'tool_id'},
    UpdateExpression='SET isActive = :val, updatedAt = :time',
    ExpressionAttributeValues={
        ':val': False,
        ':time': datetime.utcnow().isoformat()
    }
)
```

## Error Handling

The system includes fallback mechanisms:

1. If DynamoDB is unavailable, falls back to hardcoded tools
2. If tool parsing fails, skips problematic tools
3. Logs all errors for debugging

## Environment Variables

The Lambda function uses these environment variables:

- `TOOLSPECS_TABLE_NAME` - DynamoDB table name (set automatically by Amplify)
- `STORAGE_BUCKET_NAME` - S3 bucket for FAISS indexes
- `FAISS_INDEX_PREFIX` - Prefix for FAISS index files

## Performance Considerations

- Tools are loaded once per Lambda cold start
- DynamoDB scan operations are used (consider GSI for large datasets)
- Consider caching tools in memory for high-volume usage

## Security

- Tools inherit the user's authorization context
- Owner-based access control for tool management
- Input validation should be implemented in tool execution functions
