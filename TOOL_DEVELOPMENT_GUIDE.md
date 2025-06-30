# Custom Tool Development Guide

This guide explains how to create custom tools that work with the AI application's tool execution system.

## Tool Execution Patterns

The execute-tool Lambda function supports multiple execution patterns. Your tool code should implement one of these patterns:

### 1. Lambda Handler Pattern (Recommended)

```python
def handler(event, context):
    """
    Standard AWS Lambda handler pattern - most robust option.

    Args:
        event: Contains {"parameters": {...}, "tool_execution": True}
        context: Mock Lambda context

    Returns:
        Dict: Result in Lambda response format
    """
    parameters = event.get("parameters", {})

    # Your tool logic here
    result = process_data(parameters)

    return {
        "statusCode": 200,
        "body": result
    }
```

### 2. Main Function with Kwargs

```python
def main(**kwargs):
    """
    Main function that accepts parameters as keyword arguments.

    Args:
        **kwargs: Tool parameters as keyword arguments

    Returns:
        Any: Your result data
    """
    # Access parameters directly
    name = kwargs.get("name", "")
    value = kwargs.get("value", 0)

    # Your tool logic here
    return {"result": f"Processed {name} with value {value}"}
```

### 3. Main Function with Parameters Dict

```python
def main(params):
    """
    Main function that accepts parameters as a dictionary.

    Args:
        params (dict): Dictionary containing all parameters

    Returns:
        Any: Your result data
    """
    name = params.get("name", "")
    value = params.get("value", 0)

    # Your tool logic here
    return {"result": f"Processed {name} with value {value}"}
```

### 4. Execute Function Patterns

```python
# Option A: With kwargs
def execute(**kwargs):
    # Same as main() with kwargs
    pass

# Option B: With params dict
def execute(params):
    # Same as main() with params dict
    pass
```

### 5. Direct Execution with Global Result

```python
# Your tool code here - can access parameters as global variables
# The system will inject parameters into the global namespace

# Calculate something
result = parameter1 + parameter2

# The system looks for a global 'result' variable
```

## Tool Parameters

When defining your tool in the UI, specify parameters that match your function signature:

```json
[
  {
    "name": "input_text",
    "type": "string",
    "description": "Text to process",
    "required": true
  },
  {
    "name": "max_length",
    "type": "number",
    "description": "Maximum output length",
    "required": false
  }
]
```

## Requirements.txt Support

If your tool needs additional Python packages, create a requirements.txt file:

```txt
requests==2.31.0
pandas==2.1.0
numpy==1.24.0
beautifulsoup4==4.12.0
```

The system will attempt to install these packages at runtime using pip.

## Error Handling

Your tool should handle errors gracefully:

```python
def handler(event, context):
    try:
        parameters = event.get("parameters", {})

        # Validate required parameters
        if "required_param" not in parameters:
            return {
                "statusCode": 400,
                "body": {"error": "required_param is missing"}
            }

        # Your tool logic
        result = process_data(parameters)

        return {
            "statusCode": 200,
            "body": {"result": result}
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": {"error": str(e)}
        }
```

## Best Practices

1. **Use the Lambda handler pattern** for maximum compatibility
2. **Validate input parameters** before processing
3. **Handle errors gracefully** with meaningful error messages
4. **Keep tools focused** - each tool should do one thing well
5. **Document your parameters** clearly in the tool description
6. **Test locally** before uploading to the system
7. **Use timeouts** for long-running operations
8. **Return structured data** (dictionaries/JSON) when possible

## Example: Text Processing Tool

```python
def handler(event, context):
    """
    Example tool that processes text in various ways.
    """
    try:
        parameters = event.get("parameters", {})

        # Get parameters with defaults
        text = parameters.get("text", "")
        operation = parameters.get("operation", "uppercase")

        if not text:
            return {
                "statusCode": 400,
                "body": {"error": "Text parameter is required"}
            }

        # Process based on operation
        if operation == "uppercase":
            result = text.upper()
        elif operation == "lowercase":
            result = text.lower()
        elif operation == "word_count":
            result = len(text.split())
        elif operation == "reverse":
            result = text[::-1]
        else:
            return {
                "statusCode": 400,
                "body": {"error": f"Unknown operation: {operation}"}
            }

        return {
            "statusCode": 200,
            "body": {
                "result": result,
                "original_text": text,
                "operation": operation
            }
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": {"error": f"Processing failed: {str(e)}"}
        }
```

## Tool Parameters for the Example:

```json
[
  {
    "name": "text",
    "type": "string",
    "description": "Text to process",
    "required": true
  },
  {
    "name": "operation",
    "type": "string",
    "description": "Operation to perform: uppercase, lowercase, word_count, reverse",
    "required": false
  }
]
```

## Testing Your Tools

Before uploading, test your tools locally:

```python
# Test your tool function directly
if __name__ == "__main__":
    # Mock event and context
    test_event = {
        "parameters": {
            "text": "Hello World",
            "operation": "uppercase"
        },
        "tool_execution": True
    }

    class MockContext:
        aws_request_id = "test-123"
        function_name = "test-tool"

    result = handler(test_event, MockContext())
    print(result)
```

This will help ensure your tool works before deploying it to the system.
