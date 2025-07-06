import json
import logging
import boto3
import os
import pickle
import tempfile
import numpy as np
import faiss
from typing import List, Dict, Optional, Any, Tuple
import traceback

# import requests  # Currently unused, but available for future web search implementation
from datetime import datetime

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize clients
bedrock_client = boto3.client("bedrock-runtime")
s3_client = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

# Environment variables
STORAGE_BUCKET_NAME = os.environ.get("STORAGE_BUCKET_NAME")
TOOLSPECS_TABLE_NAME = os.environ.get("TOOLSPECS_TABLE_NAME")
FAISS_INDEX_PREFIX = os.environ.get("FAISS_INDEX_PREFIX", "faiss-indexes")
EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v1"
EMBEDDING_DIMENSION = 1536
FALLBACK_MODEL_ID = "apac.anthropic.claude-sonnet-4-20250514-v1:0"

# DynamoDB table
toolspecs_table = dynamodb.Table(TOOLSPECS_TABLE_NAME) if TOOLSPECS_TABLE_NAME else None


def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate embeddings using Amazon Bedrock Titan model."""
    if not texts:
        logger.error("get_embeddings called with empty or None texts list")
        raise ValueError("Texts list cannot be empty")

    logger.info(f"Starting embedding generation for {len(texts)} texts")
    embeddings = []

    for i, text in enumerate(texts):
        logger.debug(f"Processing text {i+1}/{len(texts)}")

        if not isinstance(text, str) or not text.strip():
            logger.warning(f"Text {i+1} is empty or invalid, using zero vector")
            embeddings.append([0.0] * EMBEDDING_DIMENSION)
            continue

        try:
            truncated_text = text[:8000]
            if len(text) > 8000:
                logger.debug(
                    f"Text {i+1} truncated from {len(text)} to 8000 characters"
                )

            body = json.dumps({"inputText": truncated_text})

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
                logger.debug(f"Successfully generated embedding for text {i+1}")
            else:
                logger.warning(f"Invalid embedding dimension for text {i+1}")
                embeddings.append([0.0] * EMBEDDING_DIMENSION)

        except Exception as e:
            logger.error(f"Embedding generation error for text {i+1}: {str(e)}")
            embeddings.append([0.0] * EMBEDDING_DIMENSION)

    logger.info(f"Completed embedding generation: {len(embeddings)} embeddings created")
    return embeddings


def load_faiss_index(database_id: str) -> Optional[Tuple[Any, List[Dict]]]:
    """Load FAISS index and metadata from S3 storage."""
    if not database_id or not isinstance(database_id, str):
        logger.error(f"Invalid database_id provided: {database_id}")
        raise ValueError("database_id must be a non-empty string")

    database_id = database_id.strip()
    logger.info(f"Loading FAISS index for database: {database_id}")

    index_key = f"{FAISS_INDEX_PREFIX}/{database_id}/index.faiss"
    metadata_key = f"{FAISS_INDEX_PREFIX}/{database_id}/metadata.pkl"

    if not STORAGE_BUCKET_NAME:
        logger.error("STORAGE_BUCKET_NAME environment variable not configured")
        return None

    index_file_path = None
    meta_file_path = None

    try:
        with tempfile.NamedTemporaryFile(suffix=".faiss", delete=False) as index_file:
            index_file_path = index_file.name
            s3_client.download_file(STORAGE_BUCKET_NAME, index_key, index_file_path)

        index = faiss.read_index(index_file_path)

        with tempfile.NamedTemporaryFile(suffix=".pkl", delete=False) as meta_file:
            meta_file_path = meta_file.name
            s3_client.download_file(STORAGE_BUCKET_NAME, metadata_key, meta_file_path)

        with open(meta_file_path, "rb") as f:
            metadata = pickle.load(f)

        if isinstance(metadata, list) and index:
            logger.info(
                f"Successfully loaded FAISS index for {database_id}: {index.ntotal} vectors"
            )
            return index, metadata
        else:
            logger.error(f"Invalid data loaded for {database_id}")
            return None

    except Exception as e:
        logger.error(f"Error loading FAISS index for {database_id}: {str(e)}")
        return None
    finally:
        for temp_path in [index_file_path, meta_file_path]:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except OSError:
                    pass


def search_relevant_documents(
    query_text: str, database_ids: List[str], top_k: int = 5
) -> List[Dict]:
    """Search for relevant documents across multiple vector databases."""
    logger.info(f"Starting document search for query: '{query_text[:100]}...'")

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
                        result = {
                            "database_id": database_id,
                            "distance": float(distance),
                            "metadata": metadata[idx],
                            "chunk_text": metadata[idx].get("chunk_text", ""),
                            "file_name": metadata[idx].get("file_name", "Unknown"),
                        }
                        all_results.append(result)

            except Exception as e:
                logger.error(f"Error searching database {database_id}: {str(e)}")
                continue

        all_results.sort(key=lambda x: x["distance"])
        return all_results[:top_k]

    except Exception as e:
        logger.error(f"Error in document search: {str(e)}")
        return []


def build_rag_context(relevant_docs: List[Dict]) -> str:
    """Build formatted context string from relevant documents for RAG."""
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
    """Load active tools from DynamoDB, optionally filtered by selected tool IDs."""
    if not toolspecs_table:
        logger.warning("ToolSpecs table not configured, using fallback tools")
        return get_fallback_tools()

    try:
        logger.info(f"Loading tools from DynamoDB, selected IDs: {selected_tool_ids}")
        response = toolspecs_table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr("isActive").eq(True)
        )

        tools = []
        for item in response.get("Items", []):
            try:
                # If specific tools are selected, only include those
                if selected_tool_ids and item["id"] not in selected_tool_ids:
                    logger.debug(
                        f"Skipping tool {item['name']} - not in selected tools"
                    )
                    continue

                # Parse the input schema from JSON string
                try:
                    input_schema = (
                        json.loads(item["inputSchema"])
                        if isinstance(item["inputSchema"], str)
                        else item["inputSchema"]
                    )
                except (json.JSONDecodeError, TypeError):
                    logger.error(f"Invalid input schema for tool {item['name']}")
                    continue

                tool_spec = {
                    "toolSpec": {
                        "name": item["name"],
                        "description": item["description"],
                        "inputSchema": {"json": input_schema},
                    }
                }
                tools.append(tool_spec)
                logger.info(f"Loaded tool: {item['name']}")
            except Exception as e:
                logger.error(
                    f"Error parsing tool {item.get('name', 'unknown')}: {str(e)}"
                )
                continue

        logger.info(f"Successfully loaded {len(tools)} tools from DynamoDB")
        return tools if tools else get_fallback_tools()

    except Exception as e:
        logger.error(f"Error loading tools from DynamoDB: {str(e)}")
        return get_fallback_tools()


def get_tool_execution_code(tool_name: str) -> Optional[str]:
    """Get execution code for a specific tool from DynamoDB."""
    if not toolspecs_table:
        return None

    try:
        response = toolspecs_table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr("name").eq(tool_name)
            & boto3.dynamodb.conditions.Attr("isActive").eq(True)
        )

        items = response.get("Items", [])
        if items:
            return items[0].get("executionCode")

        return None
    except Exception as e:
        logger.error(f"Error getting execution code for tool {tool_name}: {str(e)}")
        return None


def install_tool_requirements(tool_name: str) -> bool:
    """Install required packages for a tool at runtime."""
    try:
        # Get tool requirements from DynamoDB
        if not toolspecs_table:
            return True

        response = toolspecs_table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr("name").eq(tool_name)
            & boto3.dynamodb.conditions.Attr("isActive").eq(True)
        )

        items = response.get("Items", [])
        if not items:
            return True

        requirements = items[0].get("requirements", "")
        if not requirements or not requirements.strip():
            return True

        # Install packages using pip
        import subprocess
        import sys

        packages = [req.strip() for req in requirements.split("\n") if req.strip()]
        for package in packages:
            try:
                logger.info(f"Installing package: {package}")
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
                    logger.error(f"Failed to install {package}: {result.stderr}")
                    return False
                else:
                    logger.info(f"Successfully installed {package}")
            except subprocess.TimeoutExpired:
                logger.error(f"Timeout installing {package}")
                return False
            except Exception as e:
                logger.error(f"Error installing {package}: {str(e)}")
                return False

        # Add installed packages to Python path
        import sys

        if "/tmp/packages" not in sys.path:
            sys.path.insert(0, "/tmp/packages")

        return True

    except Exception as e:
        logger.error(f"Error installing requirements for {tool_name}: {str(e)}")
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

        # Install tool requirements at runtime
        if not install_tool_requirements(tool_name):
            return {
                "error": f"Failed to install requirements for tool: {tool_name}",
                "success": False,
            }

        # Create execution environment with all necessary globals
        execution_globals = globals().copy()
        execution_globals.update(
            {
                "json": json,
                "datetime": datetime,
                "logger": logger,
                "os": os,
                "tempfile": tempfile,
                "traceback": traceback,
            }
        )

        # Execute the custom code to define the handler function
        local_vars = {}
        exec(execution_code, execution_globals, local_vars)

        # Check if handler function exists
        if "handler" not in local_vars:
            return {
                "error": "Custom tool must define a 'handler' function",
                "success": False,
            }

        # Update the execution globals with all defined functions/variables
        execution_globals.update(local_vars)

        # Create mock context object for Lambda handler
        class MockContext:
            def __init__(self):
                self.aws_request_id = (
                    f"tool-{tool_name}-{int(datetime.now().timestamp())}"
                )
                self.function_name = f"custom-tool-{tool_name}"
                self.function_version = "1"
                self.memory_limit_in_mb = 256
                self.remaining_time_in_millis = 60000

        mock_context = MockContext()

        # Create event object with tool_input
        event = {
            "tool_input": tool_input,
            "tool_name": tool_name,
            "source": "bedrock-tools",
        }

        # Call the handler function with the updated globals
        handler = local_vars["handler"]
        if not callable(handler):
            return {
                "error": "Handler must be a callable function",
                "success": False,
            }

        # Set the function's globals to include all defined functions
        handler.__globals__.update(execution_globals)
        handler_result = handler(event, mock_context)

        # Parse the Lambda response format
        if isinstance(handler_result, dict):
            if "statusCode" in handler_result and "body" in handler_result:
                # Lambda response format
                if handler_result["statusCode"] == 200:
                    # Parse body if it's a JSON string
                    body = handler_result["body"]
                    if isinstance(body, str):
                        try:
                            parsed_body = json.loads(body)
                            if isinstance(parsed_body, dict):
                                return parsed_body
                            else:
                                return {"result": parsed_body, "success": True}
                        except json.JSONDecodeError:
                            # If body is not JSON, return as structured result
                            return {"result": body, "success": True}
                    elif isinstance(body, dict):
                        return body
                    else:
                        return {"result": body, "success": True}
                else:
                    # Error response
                    error_body = handler_result.get("body", "Unknown error")
                    if isinstance(error_body, str):
                        try:
                            parsed_error = json.loads(error_body)
                            if isinstance(parsed_error, dict):
                                return {"error": parsed_error, "success": False}
                            else:
                                return {"error": str(parsed_error), "success": False}
                        except json.JSONDecodeError:
                            return {"error": error_body, "success": False}
                    else:
                        return {"error": str(error_body), "success": False}
            else:
                # Direct return format
                return handler_result
        else:
            return {
                "error": "Handler function must return a dictionary",
                "success": False,
            }

    except Exception as e:
        logger.error(f"Error executing custom tool {tool_name}: {str(e)}")
        return {"error": f"Custom tool execution failed: {str(e)}", "success": False}


def get_fallback_tools():
    """Get fallback tools when DynamoDB is not available."""
    logger.info("Using fallback tools - no built-in tools available")
    return []


def build_converse_params(
    model_id: str,
    messages: List[Dict],
    system_prompt: str = "",
    tools: Optional[List[Dict]] = None,
    response_format: Optional[Dict] = None,
) -> Dict[str, Any]:
    """Build converse API parameters to avoid duplication."""
    params: Dict[str, Any] = {
        "modelId": model_id,
        "messages": messages,
        "inferenceConfig": {
            "maxTokens": 4096,
            "temperature": 0.7,
            "topP": 0.9,
        },
    }

    # Add structured output support
    if response_format:
        params["inferenceConfig"]["responseFormat"] = response_format

    if system_prompt.strip():
        params["system"] = [{"text": system_prompt}]

    if tools:
        params["toolConfig"] = {"tools": tools}

    return params


def handler(event, context):
    """AWS Lambda handler for chat with Bedrock Converse API and ToolUse support."""
    request_id = context.aws_request_id if context else "unknown"
    logger.info(f"Handler started - Request ID: {request_id}")

    try:
        logger.debug(f"Received event: {json.dumps(event, default=str)}")

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

        logger.info(
            f"Request configuration - Model: {model_id}, Tools: {use_tools}, "
            f"Selected tools: {len(selected_tool_ids)}, Structured output: {response_format is not None}"
        )
        if selected_tool_ids:
            logger.info(f"Selected tool IDs: {selected_tool_ids}")
        if response_format:
            logger.info(f"Using structured output format: {response_format}")

        if not isinstance(messages_data, list) or not messages_data:
            raise ValueError("Messages array is required and must be non-empty")

        # Perform RAG search if databases are selected
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
                        logger.info(f"RAG context built: {len(rag_context)} characters")
                except Exception as e:
                    logger.error(f"RAG search failed: {str(e)}")

        # Combine system prompt with RAG context
        enhanced_system_prompt = system_prompt
        if rag_context:
            enhanced_system_prompt = f"{system_prompt}\n\n{rag_context}"

        # Convert messages to Bedrock format
        bedrock_messages = []
        for msg in messages_data[-10:]:  # Keep last 10 messages
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
        logger.info(f"Tools: {tools}")

        # Generate response using Converse API
        logger.info("Invoking Bedrock Converse API...")
        converse_params = build_converse_params(
            model_id, bedrock_messages, enhanced_system_prompt, tools, response_format
        )
        logger.info(f"Converse params: {converse_params}")
        response = bedrock_client.converse(**converse_params)
        logger.info("Bedrock API call successful")
        logger.info(f"Response: {response}")

        # Handle tool use if present
        final_response_text = ""
        usage = response.get("usage", {})

        # Check if the model wants to use tools
        output_message = response.get("output", {}).get("message", {})
        content = output_message.get("content", [])

        tool_use_blocks = []
        text_blocks = []

        for content_block in content:
            if "text" in content_block:
                text_blocks.append(content_block["text"])
            elif "toolUse" in content_block:
                tool_use_blocks.append(content_block["toolUse"])

        # If there are tool use requests, execute them
        if tool_use_blocks and use_tools:
            logger.info(f"Model requested {len(tool_use_blocks)} tool calls")

            # Execute tools
            tool_results = []
            for tool_use in tool_use_blocks:
                tool_name = tool_use.get("name")
                tool_input = tool_use.get("input", {})
                tool_use_id = tool_use.get("toolUseId")

                logger.info(f"Executing tool: {tool_name}")
                try:
                    result = execute_custom_tool(tool_name, tool_input)
                    logger.info(f"Tool result: {result}")
                except Exception as e:
                    logger.error(f"Error executing tool {tool_name}: {str(e)}")
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
                logger.info(f"Tool results: {tool_results}")

            # Add tool results as a user message and get final response
            tool_message = {"role": "user", "content": tool_results}
            logger.info(f"Tool message: {tool_message}")

            bedrock_messages.append({"role": "assistant", "content": content})
            bedrock_messages.append(tool_message)

            # Get final response after tool execution
            logger.info("Getting final response after tool execution...")
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
            # No tools used, just return the text response
            final_response_text = "".join(text_blocks)

        if not final_response_text:
            final_response_text = "I apologize, but I couldn't generate a response."

        logger.info(
            f"Response generated successfully. Length: {len(final_response_text)} characters"
        )

        return {
            "response": final_response_text,
            "modelId": model_id,
            "usage": usage,
            "toolsUsed": len(tool_use_blocks) if tool_use_blocks else 0,
            "structuredOutput": response_format is not None,
        }

    except ValueError as e:
        logger.error(f"Validation error in handler: {str(e)}")
        response_model_id = locals().get("model_id", FALLBACK_MODEL_ID)
        return {
            "response": f"I apologize, but there was a validation error: {str(e)}",
            "modelId": response_model_id,
            "usage": {},
        }

    except Exception as e:
        logger.error(f"Unexpected handler error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        response_model_id = locals().get("model_id", FALLBACK_MODEL_ID)
        return {
            "response": f"I apologize, but I encountered an error while processing your request: {str(e)}",
            "modelId": response_model_id,
            "usage": {},
        }
