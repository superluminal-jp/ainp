import json
import logging
import boto3
import os
import tempfile
import importlib.util
from typing import Dict, Any, Optional

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize clients
s3_client = boto3.client("s3")

# Environment variables
STORAGE_BUCKET_NAME = os.environ.get("STORAGE_BUCKET_NAME")


class MockContext:
    """Mock Lambda context for tool execution"""

    def __init__(self):
        self.aws_request_id = "tool-execution"
        self.function_name = "execute-tool"


def install_requirements(requirements_key: str) -> bool:
    """
    Install Python requirements from S3 requirements.txt file.

    Args:
        requirements_key (str): S3 key for the requirements.txt file

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        import subprocess
        import sys

        # Download requirements.txt
        with tempfile.NamedTemporaryFile(
            mode="w+", suffix=".txt", delete=False
        ) as req_file:
            s3_client.download_file(
                STORAGE_BUCKET_NAME, requirements_key, req_file.name
            )

            # Read requirements
            with open(req_file.name, "r") as f:
                requirements = f.read().strip()

            if not requirements:
                logger.info(
                    "[execute_tool] Requirements.txt is empty, skipping installation"
                )
                return True

            logger.info(
                f"[execute_tool] Installing requirements: {requirements[:100]}..."
            )

            # Install packages using pip
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install", "--user"]
                + requirements.split("\n"),
                capture_output=True,
                text=True,
                timeout=60,
            )

            if result.returncode == 0:
                logger.info("[execute_tool] Requirements installed successfully")
                return True
            else:
                logger.error(
                    f"[execute_tool] Failed to install requirements: {result.stderr}"
                )
                return False

    except Exception as e:
        logger.error(f"[execute_tool] Error installing requirements: {str(e)}")
        return False


def download_and_execute_tool(
    tool_code_key: str,
    parameters: Dict[str, Any],
    requirements_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Download Python code from S3 and execute it with given parameters.

    Args:
        tool_code_key (str): S3 key for the Python code
        parameters (Dict[str, Any]): Parameters to pass to the tool
        requirements_key (str, optional): S3 key for requirements.txt file

    Returns:
        Dict[str, Any]: Execution result with consistent format

    Expected Tool Code Formats:
        1. Lambda handler: def handler(event, context)
        2. Main function: def main(**kwargs) or def main(params_dict)
        3. Execute function: def execute(**kwargs) or def execute(params_dict)
        4. Direct execution with global 'result' variable
    """
    if not STORAGE_BUCKET_NAME:
        raise ValueError("STORAGE_BUCKET_NAME not configured")

    logger.info(f"[execute_tool] Downloading tool code from: {tool_code_key}")

    # Install requirements if provided
    if requirements_key:
        logger.info(f"[execute_tool] Installing requirements from: {requirements_key}")
        if not install_requirements(requirements_key):
            logger.warning(
                "[execute_tool] Failed to install requirements, continuing anyway"
            )

    try:
        # Download Python code from S3
        with tempfile.NamedTemporaryFile(
            mode="w+", suffix=".py", delete=False
        ) as temp_file:
            s3_client.download_file(STORAGE_BUCKET_NAME, tool_code_key, temp_file.name)

            # Read the downloaded code
            with open(temp_file.name, "r") as f:
                code_content = f.read()

            logger.info(f"[execute_tool] Downloaded code (length: {len(code_content)})")

            # Create a module from the code
            spec = importlib.util.spec_from_file_location("custom_tool", temp_file.name)
            if spec is None or spec.loader is None:
                raise ValueError("Failed to create module spec from Python code")

            module = importlib.util.module_from_spec(spec)

            # Execute the module
            spec.loader.exec_module(module)

            # Try different execution patterns in order of preference
            result = None
            execution_method = None

            # 1. Try Lambda handler pattern (most robust)
            if hasattr(module, "handler"):
                event = {"parameters": parameters, "tool_execution": True}
                context = MockContext()
                result = module.handler(event, context)
                execution_method = "handler"

            # 2. Try main function with kwargs
            elif hasattr(module, "main"):
                try:
                    result = module.main(**parameters)
                    execution_method = "main(**kwargs)"
                except TypeError as e:
                    if "unexpected keyword argument" in str(e) or "takes" in str(e):
                        # Try with parameters dict
                        result = module.main(parameters)
                        execution_method = "main(params_dict)"
                    else:
                        raise

            # 3. Try execute function with kwargs
            elif hasattr(module, "execute"):
                try:
                    result = module.execute(**parameters)
                    execution_method = "execute(**kwargs)"
                except TypeError as e:
                    if "unexpected keyword argument" in str(e) or "takes" in str(e):
                        # Try with parameters dict
                        result = module.execute(parameters)
                        execution_method = "execute(params_dict)"
                    else:
                        raise

            # 4. Try direct execution with namespace
            else:
                namespace = {"__name__": "__main__"}
                namespace.update(parameters)
                exec(code_content, namespace)

                if "result" in namespace:
                    result = namespace["result"]
                    execution_method = "exec(result_variable)"
                else:
                    result = "Tool executed successfully"
                    execution_method = "exec(no_result)"

            logger.info(
                f"[execute_tool] Tool executed successfully via {execution_method}"
            )

            # Normalize result format
            if isinstance(result, dict):
                if "statusCode" in result and "body" in result:
                    # Already in Lambda response format
                    return result
                else:
                    # Wrap dict result
                    return {"statusCode": 200, "body": result}
            else:
                # Wrap non-dict result
                return {"statusCode": 200, "body": result}

    except Exception as e:
        logger.error(f"[execute_tool] Error executing tool: {str(e)}")
        raise


def handler(event, context):
    """
    Lambda handler for executing custom tools.

    Expected event structure:
    {
        "tool_name": "string",
        "tool_code_key": "s3_key_to_python_code",
        "parameters": {"param1": "value1", "param2": "value2"},
        "requirements_key": "s3_key_to_requirements_txt" (optional)
    }
    """
    try:
        logger.info(f"[ExecuteTool] Received event: {json.dumps(event, default=str)}")

        tool_name = event.get("tool_name")
        tool_code_key = event.get("tool_code_key")
        parameters = event.get("parameters", {})
        requirements_key = event.get("requirements_key")

        if not tool_name or not tool_code_key:
            raise ValueError("tool_name and tool_code_key are required")

        logger.info(f"[ExecuteTool] Executing tool: {tool_name}")
        logger.info(f"[ExecuteTool] Parameters: {parameters}")
        if requirements_key:
            logger.info(f"[ExecuteTool] Requirements key: {requirements_key}")

        # Execute the tool
        result = download_and_execute_tool(tool_code_key, parameters, requirements_key)

        logger.info("[ExecuteTool] Tool execution completed successfully")

        return {
            "statusCode": 200,
            "tool_name": tool_name,
            "result": result,
            "success": True,
        }

    except Exception as e:
        logger.error(f"[ExecuteTool] Error in tool execution: {str(e)}")
        return {"statusCode": 500, "error": str(e), "success": False}
