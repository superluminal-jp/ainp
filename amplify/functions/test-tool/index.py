import json
import logging
import boto3
import os
import tempfile
from typing import Dict, Any
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")

# Try to get table names from Amplify's automatic environment variables
TOOLSPECS_TABLE_NAME = (
    os.environ.get("TOOLSPECS_TABLE_NAME")
    or os.environ.get("AMPLIFY_TOOLSPECS_NAME")
    or os.environ.get("AMPLIFY_TOOLSPECS_TABLE_NAME")
)
toolspecs_table = dynamodb.Table(TOOLSPECS_TABLE_NAME) if TOOLSPECS_TABLE_NAME else None  # type: ignore


def install_tool_requirements(tool_name: str, requirements: str) -> bool:
    """Install required packages for a tool at runtime."""
    try:
        if not requirements or not requirements.strip():
            return True

        import subprocess
        import sys

        packages = [req.strip() for req in requirements.split("\n") if req.strip()]
        for package in packages:
            try:
                result = subprocess.run(
                    [
                        sys.executable,
                        "-m",
                        "pip",
                        "install",
                        package,
                        "--target",
                        "/tmp/packages",
                    ],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                if result.returncode != 0:
                    logger.error(
                        f"Failed to install package {package}: {result.stderr}"
                    )
                    return False
            except (subprocess.TimeoutExpired, Exception) as e:
                logger.error(f"Error installing package {package}: {str(e)}")
                return False

        import sys

        if "/tmp/packages" not in sys.path:
            sys.path.insert(0, "/tmp/packages")

        return True

    except Exception as e:
        logger.error(f"Error in install_tool_requirements: {str(e)}")
        return False


def execute_custom_tool(
    tool_name: str, execution_code: str, tool_input: Dict[str, Any]
) -> Dict[str, Any]:
    """Execute custom tool code safely."""
    try:
        # Prepare execution environment
        execution_globals = {
            "json": json,
            "datetime": datetime,
            "logger": logger,
            "os": os,
            "tempfile": tempfile,
            "__builtins__": __builtins__,
        }

        local_vars = {}

        # Execute the tool code
        exec(execution_code, execution_globals, local_vars)

        if "handler" not in local_vars:
            return {
                "error": "Custom tool must define a 'handler' function",
                "success": False,
            }

        # Create mock context for Lambda handler
        class MockContext:
            def __init__(self):
                self.aws_request_id = (
                    f"test-{tool_name}-{int(datetime.now().timestamp())}"
                )
                self.function_name = f"test-tool-{tool_name}"
                self.function_version = "1"
                self.memory_limit_in_mb = 256
                self.remaining_time_in_millis = 60000

        # Prepare event for the handler
        event = {
            "tool_input": tool_input,
            "tool_name": tool_name,
            "source": "test-tool",
        }

        handler = local_vars["handler"]
        if not callable(handler):
            return {
                "error": "Handler must be a callable function",
                "success": False,
            }

        # Update handler globals with execution environment and local variables
        handler.__globals__.update(execution_globals)
        handler.__globals__.update(local_vars)

        # Execute the handler
        handler_result = handler(event, MockContext())

        # Process the result
        if isinstance(handler_result, dict):
            # Handle Lambda response format
            if "statusCode" in handler_result and "body" in handler_result:
                if handler_result["statusCode"] == 200:
                    body = handler_result["body"]
                    if isinstance(body, str):
                        try:
                            parsed_body = json.loads(body)
                            return {
                                "success": True,
                                "data": (
                                    parsed_body
                                    if isinstance(parsed_body, dict)
                                    else {"result": parsed_body}
                                ),
                            }
                        except json.JSONDecodeError:
                            return {"success": True, "data": {"result": body}}
                    return {
                        "success": True,
                        "data": body if isinstance(body, dict) else {"result": body},
                    }
                else:
                    # Error response
                    error_body = handler_result.get("body", "Unknown error")
                    if isinstance(error_body, str):
                        try:
                            parsed_error = json.loads(error_body)
                            return {
                                "success": False,
                                "error": parsed_error.get("message", str(parsed_error)),
                            }
                        except json.JSONDecodeError:
                            return {"success": False, "error": error_body}
                    return {"success": False, "error": str(error_body)}
            # Direct result
            return {
                "success": handler_result.get("success", True),
                "data": handler_result,
                "error": (
                    handler_result.get("error")
                    if not handler_result.get("success", True)
                    else None
                ),
            }

        return {"success": False, "error": "Handler function must return a dictionary"}

    except Exception as e:
        logger.error(f"Error executing custom tool {tool_name}: {str(e)}")
        return {"success": False, "error": f"Tool execution failed: {str(e)}"}


def validate_tool_input(
    tool_input: Dict[str, Any], input_schema: Dict[str, Any]
) -> Dict[str, Any]:
    """Validate tool input against schema."""
    validation_errors = {}

    try:
        # Check required fields
        required_fields = input_schema.get("required", [])
        for field in required_fields:
            if (
                field not in tool_input
                or tool_input[field] is None
                or tool_input[field] == ""
            ):
                validation_errors[field] = "This field is required"

        # Basic type validation
        properties = input_schema.get("properties", {})
        for field, value in tool_input.items():
            if field in properties:
                expected_type = properties[field].get("type")
                if expected_type == "number" and not isinstance(value, (int, float)):
                    try:
                        float(value)
                    except (ValueError, TypeError):
                        validation_errors[field] = "Must be a number"
                elif expected_type == "boolean" and not isinstance(value, bool):
                    if str(value).lower() not in ["true", "false"]:
                        validation_errors[field] = "Must be a boolean"
                elif expected_type == "array" and not isinstance(value, list):
                    if isinstance(value, str):
                        try:
                            json.loads(value)
                        except json.JSONDecodeError:
                            validation_errors[field] = "Must be a valid JSON array"
                elif expected_type == "object" and not isinstance(value, dict):
                    if isinstance(value, str):
                        try:
                            json.loads(value)
                        except json.JSONDecodeError:
                            validation_errors[field] = "Must be a valid JSON object"

        return validation_errors

    except Exception as e:
        logger.error(f"Error validating tool input: {str(e)}")
        return {"validation": f"Input validation error: {str(e)}"}


def handler(event, context):
    """AWS Lambda handler for testing custom tools."""
    try:
        arguments = event.get("arguments", {})
        tool_id = arguments.get("toolId")
        tool_input = arguments.get("toolInput")

        # Handle different toolInput formats
        if tool_input is None:
            tool_input = {}
        elif isinstance(tool_input, str):
            try:
                tool_input = json.loads(tool_input)
            except json.JSONDecodeError:
                tool_input = {}
        elif not isinstance(tool_input, dict):
            tool_input = {}

        if not tool_id:
            return {
                "success": False,
                "error": "Tool ID is required",
                "error_type": "validation_error",
                "tool_id": tool_id,
                "timestamp": datetime.now().isoformat(),
                "validation_errors": {"toolId": "This field is required"},
            }

        # Get tool details from DynamoDB
        if not toolspecs_table:
            return {
                "success": False,
                "error": "Tool specifications table not configured",
                "error_type": "configuration_error",
                "tool_id": tool_id,
                "timestamp": datetime.now().isoformat(),
            }

        try:
            response = toolspecs_table.get_item(Key={"id": tool_id})
            tool_item = response.get("Item")

            if not tool_item:
                return {
                    "success": False,
                    "error": f"Tool with ID '{tool_id}' not found",
                    "error_type": "not_found",
                    "tool_id": tool_id,
                    "timestamp": datetime.now().isoformat(),
                }

            if not tool_item.get("isActive", True):
                return {
                    "success": False,
                    "error": f"Tool '{tool_item.get('name', 'Unknown')}' is not active",
                    "error_type": "inactive_tool",
                    "tool_id": tool_id,
                    "tool_name": tool_item.get("name"),
                    "timestamp": datetime.now().isoformat(),
                }

        except Exception as e:
            logger.error(f"Error fetching tool from DynamoDB: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to fetch tool details: {str(e)}",
                "error_type": "database_error",
                "tool_id": tool_id,
                "timestamp": datetime.now().isoformat(),
            }

        # Validate input against tool schema
        try:
            input_schema = tool_item.get("inputSchema")
            if isinstance(input_schema, str):
                input_schema = json.loads(input_schema)

            validation_errors = validate_tool_input(tool_input, input_schema)

            if validation_errors:
                return {
                    "success": False,
                    "error": "Input validation failed",
                    "error_type": "validation_error",
                    "tool_id": tool_id,
                    "tool_name": tool_item.get("name"),
                    "timestamp": datetime.now().isoformat(),
                    "validation_errors": validation_errors,
                }

        except Exception as e:
            logger.error(f"Error validating tool input: {str(e)}")
            return {
                "success": False,
                "error": f"Input validation error: {str(e)}",
                "error_type": "validation_error",
                "tool_id": tool_id,
                "tool_name": tool_item.get("name"),
                "timestamp": datetime.now().isoformat(),
            }

        # Install requirements if needed
        requirements = tool_item.get("requirements", "")
        if requirements and not install_tool_requirements(
            tool_item["name"], requirements
        ):
            return {
                "success": False,
                "error": f"Failed to install requirements for tool: {tool_item['name']}",
                "error_type": "requirements_error",
                "tool_id": tool_id,
                "tool_name": tool_item["name"],
                "timestamp": datetime.now().isoformat(),
            }

        # Execute the tool
        start_time = datetime.now()
        execution_code = tool_item.get("executionCode")

        if not execution_code:
            return {
                "success": False,
                "error": f"No execution code found for tool: {tool_item['name']}",
                "error_type": "missing_code",
                "tool_id": tool_id,
                "tool_name": tool_item["name"],
                "timestamp": datetime.now().isoformat(),
            }

        try:
            result = execute_custom_tool(tool_item["name"], execution_code, tool_input)
            end_time = datetime.now()
            execution_time_ms = int((end_time - start_time).total_seconds() * 1000)

            return {
                "success": result.get("success", True),
                "error": (
                    result.get("error") if not result.get("success", True) else None
                ),
                "error_type": (
                    "execution_error" if not result.get("success", True) else None
                ),
                "data": result,
                "tool_name": tool_item["name"],
                "tool_id": tool_id,
                "execution_time_ms": execution_time_ms,
                "request_id": (
                    context.aws_request_id
                    if hasattr(context, "aws_request_id")
                    else None
                ),
                "input_used": tool_input,
                "timestamp": datetime.now().isoformat(),
            }

        except Exception as e:
            end_time = datetime.now()
            execution_time_ms = int((end_time - start_time).total_seconds() * 1000)
            logger.error(f"Error executing tool {tool_item['name']}: {str(e)}")

            return {
                "success": False,
                "error": f"Tool execution failed: {str(e)}",
                "error_type": "execution_error",
                "tool_name": tool_item["name"],
                "tool_id": tool_id,
                "execution_time_ms": execution_time_ms,
                "request_id": (
                    context.aws_request_id
                    if hasattr(context, "aws_request_id")
                    else None
                ),
                "input_used": tool_input,
                "timestamp": datetime.now().isoformat(),
            }

    except Exception as e:
        logger.error(f"Test tool handler error: {str(e)}")
        return {
            "success": False,
            "error": f"Handler error: {str(e)}",
            "error_type": "handler_error",
            "tool_id": arguments.get("toolId") if "arguments" in locals() else None,
            "timestamp": datetime.now().isoformat(),
        }
