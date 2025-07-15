import json
import logging
import boto3
import os
import pickle
import tempfile
import numpy as np
import faiss
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger()
logger.setLevel(logging.INFO)

bedrock_client = boto3.client("bedrock-runtime")
s3_client = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

STORAGE_BUCKET_NAME = os.environ.get("STORAGE_BUCKET_NAME")

FAISS_INDEX_PREFIX = os.environ.get("FAISS_INDEX_PREFIX", "faiss-indexes")
EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v1"
EMBEDDING_DIMENSION = 1536
FALLBACK_MODEL_ID = "apac.anthropic.claude-sonnet-4-20250514-v1:0"

# Default usage limits (can be made configurable)
DEFAULT_DAILY_TOKEN_LIMIT = int(os.environ.get("DAILY_TOKEN_LIMIT", "50000"))
DEFAULT_DAILY_REQUEST_LIMIT = int(os.environ.get("DAILY_REQUEST_LIMIT", "100"))

# Global variables for table names and instances
USER_USAGE_TABLE_NAME = os.environ.get("USER_USAGE_TABLE_NAME")
TOOLSPECS_TABLE_NAME = os.environ.get("TOOLSPECS_TABLE_NAME")
user_usage_table = None
toolspecs_table = None

# Initialize tables on module load
if USER_USAGE_TABLE_NAME:
    try:
        user_usage_table = dynamodb.Table(USER_USAGE_TABLE_NAME)  # type: ignore
        logger.info(f"Initialized user_usage_table: {USER_USAGE_TABLE_NAME}")
    except Exception as e:
        logger.error(f"Failed to initialize user_usage_table: {str(e)}")
else:
    logger.warning("USER_USAGE_TABLE_NAME environment variable not set")

if TOOLSPECS_TABLE_NAME:
    try:
        toolspecs_table = dynamodb.Table(TOOLSPECS_TABLE_NAME)  # type: ignore
        logger.info(f"Initialized toolspecs_table: {TOOLSPECS_TABLE_NAME}")
    except Exception as e:
        logger.error(f"Failed to initialize toolspecs_table: {str(e)}")
else:
    logger.warning("TOOLSPECS_TABLE_NAME environment variable not set")


def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate embeddings using Amazon Bedrock Titan model."""
    if not texts:
        raise ValueError("Texts list cannot be empty")

    embeddings = []
    for text in texts:
        if not isinstance(text, str) or not text.strip():
            embeddings.append([0.0] * EMBEDDING_DIMENSION)
            continue

        try:
            body = json.dumps({"inputText": text[:8000]})
            response = bedrock_client.invoke_model(
                modelId=EMBEDDING_MODEL_ID,
                body=body,
                contentType="application/json",
                accept="application/json",
            )
            response_body = json.loads(response["body"].read())
            embedding = response_body.get("embedding", [])

            if embedding and len(embedding) == EMBEDDING_DIMENSION:
                embeddings.append(embedding)
            else:
                embeddings.append([0.0] * EMBEDDING_DIMENSION)
        except Exception:
            embeddings.append([0.0] * EMBEDDING_DIMENSION)

    return embeddings


def load_faiss_index(database_id: str) -> Optional[Tuple[Any, List[Dict]]]:
    """Load FAISS index and metadata from S3."""
    if not database_id or not isinstance(database_id, str):
        raise ValueError("database_id must be a non-empty string")

    if not STORAGE_BUCKET_NAME:
        return None

    database_id = database_id.strip()
    index_key = f"{FAISS_INDEX_PREFIX}/{database_id}/index.faiss"
    metadata_key = f"{FAISS_INDEX_PREFIX}/{database_id}/metadata.pkl"

    index_file_path = meta_file_path = None

    try:
        with tempfile.NamedTemporaryFile(suffix=".faiss", delete=False) as f:
            index_file_path = f.name
            s3_client.download_file(STORAGE_BUCKET_NAME, index_key, index_file_path)

        index = faiss.read_index(index_file_path)

        with tempfile.NamedTemporaryFile(suffix=".pkl", delete=False) as f:
            meta_file_path = f.name
            s3_client.download_file(STORAGE_BUCKET_NAME, metadata_key, meta_file_path)

        with open(meta_file_path, "rb") as f:
            metadata = pickle.load(f)

        if isinstance(metadata, list) and index:
            return index, metadata
        return None

    except Exception:
        return None
    finally:
        for path in [index_file_path, meta_file_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except OSError:
                    pass


def search_relevant_documents(
    query_text: str, database_ids: List[str], top_k: int = 5
) -> List[Dict]:
    """Search for relevant documents using semantic similarity."""
    if not query_text or not database_ids or top_k <= 0:
        return []

    try:
        query_embeddings = get_embeddings([query_text.strip()])
        if not query_embeddings or not query_embeddings[0]:
            return []

        query_vector = np.array([query_embeddings[0]], dtype=np.float32)
        all_results = []

        for database_id in database_ids:
            try:
                index_data = load_faiss_index(database_id)
                if not index_data:
                    continue

                index, metadata = index_data
                if index.ntotal == 0:
                    continue

                search_k = min(top_k, index.ntotal)
                distances, indices = index.search(query_vector, search_k)

                for distance, idx in zip(distances[0], indices[0]):
                    if 0 <= idx < len(metadata):
                        all_results.append(
                            {
                                "database_id": database_id,
                                "distance": float(distance),
                                "metadata": metadata[idx],
                                "chunk_text": metadata[idx].get("chunk_text", ""),
                                "file_name": metadata[idx].get("file_name", "Unknown"),
                            }
                        )
            except Exception:
                continue

        all_results.sort(key=lambda x: x["distance"])
        return all_results[:top_k]

    except Exception:
        return []


def build_rag_context(relevant_docs: List[Dict]) -> str:
    """Build formatted context string from relevant documents."""
    if not relevant_docs:
        return ""

    context_parts = ["The following information is from related documents:\n"]
    processed_docs = 0
    max_total_length = 4000

    for i, doc in enumerate(relevant_docs, 1):
        if not isinstance(doc, dict):
            continue

        chunk_text = doc.get("chunk_text", "")
        if not chunk_text:
            continue

        if len("\n".join(context_parts)) + len(chunk_text) > max_total_length:
            break

        file_name = doc.get("file_name", "Unknown")
        context_parts.extend(
            [
                f"Document {processed_docs + 1}:",
                f"File name: {file_name}",
                f"Content: {chunk_text[:500]}",
                "",
            ]
        )
        processed_docs += 1

    return "\n".join(context_parts) if processed_docs > 0 else ""


def load_tools_from_dynamodb(selected_tool_ids=None):
    """Load active tools from DynamoDB."""
    if not toolspecs_table:
        logger.warning("toolspecs table not available - using fallback tools")
        return get_fallback_tools()

    try:
        response = toolspecs_table.scan(FilterExpression=Attr("isActive").eq(True))

        tools = []
        for item in response.get("Items", []):
            if selected_tool_ids and item["id"] not in selected_tool_ids:
                continue

            try:
                input_schema = (
                    json.loads(item["inputSchema"])
                    if isinstance(item["inputSchema"], str)
                    else item["inputSchema"]
                )

                tools.append(
                    {
                        "toolSpec": {
                            "name": item["name"],
                            "description": item["description"],
                            "inputSchema": {"json": input_schema},
                        }
                    }
                )
            except Exception:
                continue

        return tools if tools else get_fallback_tools()

    except Exception:
        return get_fallback_tools()


def get_tool_execution_code(tool_name: str) -> Optional[str]:
    """Get execution code for a tool from DynamoDB."""
    if not toolspecs_table:
        return None

    try:
        response = toolspecs_table.scan(
            FilterExpression=Attr("name").eq(tool_name) & Attr("isActive").eq(True)
        )
        items = response.get("Items", [])
        return items[0].get("executionCode") if items else None
    except Exception:
        return None


def install_tool_requirements(tool_name: str) -> bool:
    """Install required packages for a tool at runtime."""
    if not toolspecs_table:
        return True

    try:
        response = toolspecs_table.scan(
            FilterExpression=Attr("name").eq(tool_name) & Attr("isActive").eq(True)
        )

        items = response.get("Items", [])
        if not items:
            return True

        requirements = items[0].get("requirements", "")
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
                    return False
            except (subprocess.TimeoutExpired, Exception):
                return False

        if "/tmp/packages" not in sys.path:
            sys.path.insert(0, "/tmp/packages")

        return True

    except Exception:
        return False


def execute_custom_tool(tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
    """Execute custom tool code from DynamoDB."""
    try:
        execution_code = get_tool_execution_code(tool_name)
        if not execution_code:
            return {
                "error": f"No execution code found for tool: {tool_name}",
                "success": False,
            }

        if not install_tool_requirements(tool_name):
            return {
                "error": f"Failed to install requirements for tool: {tool_name}",
                "success": False,
            }

        execution_globals = globals().copy()
        execution_globals.update(
            {
                "json": json,
                "datetime": datetime,
                "logger": logger,
                "os": os,
                "tempfile": tempfile,
            }
        )

        local_vars = {}
        exec(execution_code, execution_globals, local_vars)

        if "handler" not in local_vars:
            return {
                "error": "Custom tool must define a 'handler' function",
                "success": False,
            }

        execution_globals.update(local_vars)

        class MockContext:
            def __init__(self):
                self.aws_request_id = (
                    f"tool-{tool_name}-{int(datetime.now().timestamp())}"
                )
                self.function_name = f"custom-tool-{tool_name}"
                self.function_version = "1"
                self.memory_limit_in_mb = 256
                self.remaining_time_in_millis = 60000

        event = {
            "tool_input": tool_input,
            "tool_name": tool_name,
            "source": "bedrock-tools",
        }

        handler = local_vars["handler"]
        if not callable(handler):
            return {"error": "Handler must be a callable function", "success": False}

        handler.__globals__.update(execution_globals)
        handler_result = handler(event, MockContext())

        if isinstance(handler_result, dict):
            if "statusCode" in handler_result and "body" in handler_result:
                if handler_result["statusCode"] == 200:
                    body = handler_result["body"]
                    if isinstance(body, str):
                        try:
                            parsed_body = json.loads(body)
                            return (
                                parsed_body
                                if isinstance(parsed_body, dict)
                                else {"result": parsed_body, "success": True}
                            )
                        except json.JSONDecodeError:
                            return {"result": body, "success": True}
                    return (
                        body
                        if isinstance(body, dict)
                        else {"result": body, "success": True}
                    )
                else:
                    error_body = handler_result.get("body", "Unknown error")
                    if isinstance(error_body, str):
                        try:
                            parsed_error = json.loads(error_body)
                            return (
                                {"error": parsed_error, "success": False}
                                if isinstance(parsed_error, dict)
                                else {"error": str(parsed_error), "success": False}
                            )
                        except json.JSONDecodeError:
                            return {"error": error_body, "success": False}
                    return {"error": str(error_body), "success": False}
            return handler_result
        return {"error": "Handler function must return a dictionary", "success": False}

    except Exception as e:
        logger.error(f"Error executing custom tool {tool_name}: {str(e)}")
        return {"error": f"Custom tool execution failed: {str(e)}", "success": False}


def get_fallback_tools():
    """Get fallback tools when DynamoDB is not available."""
    return []


def get_user_id_from_event(event) -> Optional[str]:
    """Extract user ID from the Lambda event context."""
    try:
        # Try multiple locations where user ID might be stored
        identity = event.get("identity")
        if identity:
            # Check for Cognito identity ID
            if isinstance(identity, dict):
                user_id = (
                    identity.get("sub")
                    or identity.get("cognitoIdentityId")
                    or identity.get("userId")
                )
                if user_id:
                    return str(user_id)

        # Check request context for user identity
        request_context = event.get("requestContext", {})
        if isinstance(request_context, dict):
            identity_ctx = request_context.get("identity", {})
            if isinstance(identity_ctx, dict):
                user_id = (
                    identity_ctx.get("sub")
                    or identity_ctx.get("cognitoIdentityId")
                    or identity_ctx.get("userId")
                )
                if user_id:
                    return str(user_id)

        # Check arguments for user context (if passed explicitly)
        arguments = event.get("arguments", {})
        if isinstance(arguments, dict):
            user_id = arguments.get("userId")
            if user_id:
                return str(user_id)

        # Fallback: use a hash of the event for anonymous users (not recommended for production)
        logger.warning("Could not extract user ID from event, using fallback")
        return "anonymous"

    except Exception as e:
        logger.error(f"Error extracting user ID: {str(e)}")
        return "anonymous"


def get_current_period() -> str:
    """Get current period string for daily limits (YYYY-MM-DD format)."""
    return datetime.now().strftime("%Y-%m-%d")


def get_user_usage(user_id: str) -> Dict[str, Any]:
    """Get current user usage from DynamoDB."""
    if not user_usage_table:
        return {
            "totalTokens": 0,
            "totalRequests": 0,
            "inputTokens": 0,
            "outputTokens": 0,
            "tokenLimit": DEFAULT_DAILY_TOKEN_LIMIT,
            "requestLimit": DEFAULT_DAILY_REQUEST_LIMIT,
            "period": get_current_period(),
        }

    try:
        period = get_current_period()
        logger.info(f"Getting user usage for {user_id} in period {period}")

        # Scan for records with the userId and period pattern
        # Since we don't know the exact unix timestamp, we need to scan for today's records
        response = user_usage_table.scan(
            FilterExpression=Attr("id").begins_with(f"{user_id}#{period}#")
        )
        logger.info(f"user_usage_table.scan response: {response}")

        items = response.get("Items", [])
        if items:
            # If multiple records exist for the same day, aggregate them
            total_tokens = sum(item.get("totalTokens", 0) for item in items)
            total_requests = sum(item.get("totalRequests", 0) for item in items)
            input_tokens = sum(item.get("inputTokens", 0) for item in items)
            output_tokens = sum(item.get("outputTokens", 0) for item in items)

            # Use values from the most recent record for limits
            latest_item = max(
                items,
                key=lambda x: (
                    x.get("id", "").split("#")[-1]
                    if len(x.get("id", "").split("#")) >= 3
                    else "0"
                ),
            )

            return {
                "totalTokens": total_tokens,
                "totalRequests": total_requests,
                "inputTokens": input_tokens,
                "outputTokens": output_tokens,
                "tokenLimit": latest_item.get("tokenLimit", DEFAULT_DAILY_TOKEN_LIMIT),
                "requestLimit": latest_item.get(
                    "requestLimit", DEFAULT_DAILY_REQUEST_LIMIT
                ),
                "period": period,
            }
        else:
            # Return default values if no record exists
            return {
                "totalTokens": 0,
                "totalRequests": 0,
                "inputTokens": 0,
                "outputTokens": 0,
                "tokenLimit": DEFAULT_DAILY_TOKEN_LIMIT,
                "requestLimit": DEFAULT_DAILY_REQUEST_LIMIT,
                "period": period,
            }
    except Exception as e:
        logger.error(f"Error getting user usage for {user_id}: {str(e)}")
        return {
            "totalTokens": 0,
            "totalRequests": 0,
            "inputTokens": 0,
            "outputTokens": 0,
            "tokenLimit": DEFAULT_DAILY_TOKEN_LIMIT,
            "requestLimit": DEFAULT_DAILY_REQUEST_LIMIT,
            "period": get_current_period(),
        }


def check_user_usage_limits(user_id: str) -> Tuple[bool, Dict[str, Any]]:
    """Check if user has exceeded usage limits."""
    usage_info = get_user_usage(user_id)
    logger.info(f"Usage info: {usage_info}")

    token_limit_exceeded = usage_info["totalTokens"] >= usage_info["tokenLimit"]
    request_limit_exceeded = usage_info["totalRequests"] >= usage_info["requestLimit"]

    if token_limit_exceeded or request_limit_exceeded:
        return False, {
            **usage_info,
            "limitExceeded": True,
            "tokenLimitExceeded": token_limit_exceeded,
            "requestLimitExceeded": request_limit_exceeded,
            "reason": f"Usage limits exceeded for period {usage_info['period']}",
        }

    return True, usage_info


def update_user_usage(user_id: str, usage_data: Dict[str, Any]) -> bool:
    """Update user usage in DynamoDB."""
    if not user_usage_table:
        logger.warning("user_usage_table not available")
        return False

    try:
        period = get_current_period()
        current_time = datetime.now().isoformat()
        unix_timestamp = int(datetime.now().timestamp())

        # Create the composite id in the format: userId#date#unix_timestamp
        record_id = f"{user_id}#{period}#{unix_timestamp}"

        # Extract usage data
        input_tokens = usage_data.get("inputTokens", 0)
        output_tokens = usage_data.get("outputTokens", 0)
        total_tokens = usage_data.get("totalTokens", input_tokens + output_tokens)

        # Create a new usage record with the composite id
        user_usage_table.put_item(
            Item={
                "id": record_id,
                "userId": user_id,
                "period": period,
                "totalTokens": total_tokens,
                "totalRequests": 1,
                "inputTokens": input_tokens,
                "outputTokens": output_tokens,
                "tokenLimit": DEFAULT_DAILY_TOKEN_LIMIT,
                "requestLimit": DEFAULT_DAILY_REQUEST_LIMIT,
                "lastUpdated": current_time,
                "updatedAt": current_time,
                "createdAt": current_time,
            }
        )

        logger.info(f"Created usage record for user {user_id} with id: {record_id}")
        return True

    except Exception as e:
        logger.error(f"Error updating user usage for {user_id}: {str(e)}")
        return False


def build_converse_params(
    model_id: str,
    messages: List[Dict],
    system_prompt: str = "",
    tools: Optional[List[Dict]] = None,
    response_format: Optional[Dict] = None,
) -> Dict[str, Any]:
    """Build converse API parameters."""
    params = {
        "modelId": model_id,
        "messages": messages,
        "inferenceConfig": {
            "maxTokens": 4096,
            "temperature": 0.7,
            "topP": 0.9,
        },
    }

    if response_format:
        inference_config = params["inferenceConfig"]
        if isinstance(inference_config, dict):
            inference_config["responseFormat"] = response_format  # type: ignore

    if system_prompt.strip():
        params["system"] = [{"text": system_prompt}]

    if tools:
        params["toolConfig"] = {"tools": tools}  # type: ignore

    return params


def handler(event, context):
    """AWS Lambda handler for chat with Bedrock Converse API and ToolUse support."""
    try:
        # Extract user ID for usage tracking
        user_id = get_user_id_from_event(event)
        if not user_id:
            user_id = "anonymous"
        logger.info(f"User ID: {user_id}")

        # Check user usage limits before processing
        within_limits, usage_info = check_user_usage_limits(user_id)
        if not within_limits:
            return {
                "response": f"I apologize, but you have exceeded your usage limits. {usage_info.get('reason', '')}",
                "modelId": FALLBACK_MODEL_ID,
                "usage": {},
                "toolsUsed": 0,
                "structuredOutput": False,
                "usageLimitExceeded": True,
                "usageInfo": usage_info,
            }
        logger.info(f"Usage info: {usage_info}")

        arguments = event.get("arguments", {})
        if not isinstance(arguments, dict):
            raise ValueError("Event must contain 'arguments' dictionary")

        messages_data = arguments.get("messages", [])
        system_prompt = arguments.get(
            "systemPrompt",
            "You are a helpful AI assistant with access to various custom tools. "
            "Always use the appropriate tools when they can help answer the user's question. "
            "Use the available tools to provide accurate and helpful responses.",
        )
        model_id = arguments.get("modelId", FALLBACK_MODEL_ID)
        database_ids = arguments.get("databaseIds", [])
        use_tools = arguments.get("useTools", True)
        selected_tool_ids = arguments.get("selectedToolIds", [])
        response_format = arguments.get("responseFormat", None)
        force_structured_output = arguments.get("forceStructuredOutput", False)

        if not isinstance(messages_data, list) or not messages_data:
            raise ValueError("Messages array is required and must be non-empty")

        # RAG search if databases provided
        rag_context = ""
        if database_ids and isinstance(database_ids, list):
            last_user_message = None
            for msg in reversed(messages_data):
                if msg and isinstance(msg, dict) and msg.get("role") == "user":
                    last_user_message = msg.get("text", "")
                    break

            if last_user_message:
                try:
                    relevant_docs = search_relevant_documents(
                        last_user_message, database_ids, top_k=3
                    )
                    if relevant_docs:
                        rag_context = build_rag_context(relevant_docs)
                except Exception:
                    pass

        # Enhance system prompt with RAG context
        enhanced_system_prompt = (
            f"{system_prompt}\n\n{rag_context}" if rag_context else system_prompt
        )

        # Convert messages to Bedrock format
        bedrock_messages = []
        for msg in messages_data[-10:]:
            if not msg or not isinstance(msg, dict):
                continue

            role = msg.get("role")
            content = msg.get("text", "")

            if role in ["user", "assistant"] and content:
                bedrock_messages.append({"role": role, "content": [{"text": content}]})

        if not bedrock_messages:
            raise ValueError("No valid messages found after filtering")

        # Load tools if enabled
        tools = load_tools_from_dynamodb(selected_tool_ids) if use_tools else []

        # Generate response
        converse_params = build_converse_params(
            model_id, bedrock_messages, enhanced_system_prompt, tools, response_format
        )
        response = bedrock_client.converse(**converse_params)

        # Handle tool use if present
        final_response_text = ""
        usage = response.get("usage", {})

        output_message = response.get("output", {}).get("message", {})
        content = output_message.get("content", [])

        tool_use_blocks = []
        text_blocks = []

        for content_block in content:
            if "text" in content_block:
                text_blocks.append(content_block["text"])
            elif "toolUse" in content_block:
                tool_use_blocks.append(content_block["toolUse"])

        # Execute tools if requested
        if tool_use_blocks and use_tools:
            tool_results = []
            for tool_use in tool_use_blocks:
                tool_name = tool_use.get("name")
                tool_input = tool_use.get("input", {})
                tool_use_id = tool_use.get("toolUseId")

                try:
                    result = execute_custom_tool(tool_name, tool_input)
                except Exception as e:
                    result = {
                        "error": f"Tool execution failed: {str(e)}",
                        "success": False,
                    }

                tool_results.append(
                    {
                        "toolResult": {
                            "toolUseId": tool_use_id,
                            "content": [{"text": json.dumps(result, indent=2)}],
                        }
                    }
                )

            # Get final response after tool execution
            tool_message = {"role": "user", "content": tool_results}
            bedrock_messages.append({"role": "assistant", "content": content})
            bedrock_messages.append(tool_message)

            final_converse_params = build_converse_params(
                model_id,
                bedrock_messages,
                enhanced_system_prompt,
                tools,
                response_format,
            )
            final_response = bedrock_client.converse(**final_converse_params)

            final_output = final_response.get("output", {}).get("message", {})
            final_content = final_output.get("content", [])

            for content_block in final_content:
                if "text" in content_block:
                    final_response_text += content_block["text"]

            # Merge usage statistics
            final_usage = final_response.get("usage", {})
            for key in ["inputTokens", "outputTokens", "totalTokens"]:
                if key in final_usage:
                    usage[key] = usage.get(key, 0) + final_usage.get(key, 0)
        else:
            final_response_text = "".join(text_blocks)

        if not final_response_text:
            final_response_text = "I apologize, but I couldn't generate a response."

        # Check if structured output was requested and response is valid JSON
        is_structured_output = False
        if force_structured_output:
            try:
                # Try to parse the response as JSON to validate it's structured
                json.loads(final_response_text)
                is_structured_output = True
            except json.JSONDecodeError:
                # Response is not valid JSON, treat as regular text
                is_structured_output = False

        # Update user usage tracking after successful response
        if user_id and usage:
            logger.info(f"Updating usage for user {user_id} with data: {usage}")
            update_success = update_user_usage(user_id, usage)
            if not update_success:
                logger.warning(f"Failed to update usage for user {user_id}")
            else:
                logger.info(f"Successfully updated usage for user {user_id}")

        # Get updated usage info after tracking
        updated_usage_info = get_user_usage(user_id)
        logger.info(f"Updated usage info: {updated_usage_info}")

        # Include usage information in response
        response_data = {
            "response": final_response_text,
            "modelId": model_id,
            "usage": usage,
            "toolsUsed": len(tool_use_blocks) if tool_use_blocks else 0,
            "structuredOutput": is_structured_output,
            "usageLimitExceeded": False,
            "usageInfo": updated_usage_info,
        }

        return response_data

    except ValueError as e:
        return {
            "response": f"I apologize, but there was a validation error: {str(e)}",
            "modelId": locals().get("model_id", FALLBACK_MODEL_ID),
            "usage": {},
        }

    except Exception as e:
        logger.error(f"Handler error: {str(e)}")
        return {
            "response": f"I apologize, but I encountered an error while processing your request: {str(e)}",
            "modelId": locals().get("model_id", FALLBACK_MODEL_ID),
            "usage": {},
        }
