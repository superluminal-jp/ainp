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

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize clients
bedrock_client = boto3.client("bedrock-runtime")
s3_client = boto3.client("s3")
lambda_client = boto3.client("lambda")

# Environment variables
STORAGE_BUCKET_NAME = os.environ.get("STORAGE_BUCKET_NAME")
FAISS_INDEX_PREFIX = os.environ.get("FAISS_INDEX_PREFIX", "faiss-indexes")
EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v1"
EMBEDDING_DIMENSION = 1536
EXECUTE_TOOL_FUNCTION_NAME = os.environ.get(
    "EXECUTE_TOOL_FUNCTION_NAME", "amplify-ainp-executeToolFunction-*"
)


def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate embeddings using Amazon Bedrock Titan model.

    This function takes a list of text strings and generates vector embeddings
    using Amazon Titan embedding model. Each text is processed individually
    and truncated to 8000 characters if necessary.

    Args:
        texts (List[str]): List of text strings to generate embeddings for.
                          Empty or None strings will result in zero vectors.

    Returns:
        List[List[float]]: List of embedding vectors, each with EMBEDDING_DIMENSION
                          dimensions. Returns zero vectors for invalid inputs.

    Raises:
        ValueError: If texts list is empty or None.
        Exception: For any AWS Bedrock API errors or other processing issues.

    Example:
        >>> embeddings = get_embeddings(["Hello world", "How are you?"])
        >>> len(embeddings)
        2
        >>> len(embeddings[0])
        1536
    """
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
            # Truncate text to avoid API limits
            truncated_text = text[:8000]
            if len(text) > 8000:
                logger.debug(
                    f"Text {i+1} truncated from {len(text)} to 8000 characters"
                )

            body = json.dumps({"inputText": truncated_text})

            logger.debug(f"Invoking Bedrock embedding model for text {i+1}")
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
                logger.warning(
                    f"Invalid embedding dimension for text {i+1}: expected {EMBEDDING_DIMENSION}, got {len(embedding)}"
                )
                embeddings.append([0.0] * EMBEDDING_DIMENSION)

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error for text {i+1}: {str(e)}")
            embeddings.append([0.0] * EMBEDDING_DIMENSION)
        except Exception as e:
            logger.error(f"Embedding generation error for text {i+1}: {str(e)}")
            logger.debug(f"Text {i+1} content preview: {text[:100]}...")
            embeddings.append([0.0] * EMBEDDING_DIMENSION)

    logger.info(f"Completed embedding generation: {len(embeddings)} embeddings created")
    return embeddings


def load_faiss_index(database_id: str) -> Optional[Tuple[Any, List[Dict]]]:
    """Load FAISS index and metadata from S3 storage.

    Downloads the FAISS index file and associated metadata from S3, then loads
    them into memory for similarity search operations.

    Args:
        database_id (str): Unique identifier for the database. Must be non-empty string.

    Returns:
        Optional[Tuple[Any, List[Dict]]]: Tuple of (faiss_index, metadata_list) if successful,
                                         None if loading fails or files don't exist.

    Raises:
        ValueError: If database_id is empty, None, or not a string.

    Example:
        >>> index, metadata = load_faiss_index("my_database")
        >>> if index:
        ...     print(f"Loaded index with {index.ntotal} vectors")
    """
    if not database_id or not isinstance(database_id, str):
        logger.error(f"Invalid database_id provided: {database_id}")
        raise ValueError("database_id must be a non-empty string")

    database_id = database_id.strip()
    logger.info(f"Loading FAISS index for database: {database_id}")

    index_key = f"{FAISS_INDEX_PREFIX}/{database_id}/index.faiss"
    metadata_key = f"{FAISS_INDEX_PREFIX}/{database_id}/metadata.pkl"

    logger.debug(f"Index S3 key: {index_key}")
    logger.debug(f"Metadata S3 key: {metadata_key}")

    if not STORAGE_BUCKET_NAME:
        logger.error("STORAGE_BUCKET_NAME environment variable not configured")
        return None

    index_file_path = None
    meta_file_path = None

    try:
        # Download index file
        logger.debug(f"Downloading FAISS index from S3 bucket: {STORAGE_BUCKET_NAME}")
        with tempfile.NamedTemporaryFile(suffix=".faiss", delete=False) as index_file:
            index_file_path = index_file.name
            s3_client.download_file(STORAGE_BUCKET_NAME, index_key, index_file_path)
            logger.debug(f"Index file downloaded to: {index_file_path}")

        # Load FAISS index
        logger.debug("Loading FAISS index from file")
        index = faiss.read_index(index_file_path)

        # Download metadata file
        logger.debug("Downloading metadata from S3")
        with tempfile.NamedTemporaryFile(suffix=".pkl", delete=False) as meta_file:
            meta_file_path = meta_file.name
            s3_client.download_file(STORAGE_BUCKET_NAME, metadata_key, meta_file_path)
            logger.debug(f"Metadata file downloaded to: {meta_file_path}")

        # Load metadata
        logger.debug("Loading metadata from pickle file")
        with open(meta_file_path, "rb") as f:
            metadata = pickle.load(f)

        # Validate loaded data
        if isinstance(metadata, list) and index:
            logger.info(
                f"Successfully loaded FAISS index for {database_id}: "
                f"{index.ntotal} vectors, {len(metadata)} metadata entries"
            )
            return index, metadata
        else:
            logger.error(
                f"Invalid data loaded for {database_id}: metadata type={type(metadata)}, index valid={bool(index)}"
            )
            return None

    except s3_client.exceptions.NoSuchKey as e:
        logger.warning(f"FAISS index or metadata not found for {database_id}: {str(e)}")
        return None
    except s3_client.exceptions.NoSuchBucket as e:
        logger.error(f"S3 bucket {STORAGE_BUCKET_NAME} not found: {str(e)}")
        return None
    except pickle.PickleError as e:
        logger.error(f"Failed to unpickle metadata for {database_id}: {str(e)}")
        return None
    except Exception as e:
        logger.error(
            f"Unexpected error loading FAISS index for {database_id}: {str(e)}"
        )
        logger.debug(f"Traceback: {traceback.format_exc()}")
        return None
    finally:
        # Clean up temporary files
        for temp_path in [index_file_path, meta_file_path]:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                    logger.debug(f"Cleaned up temporary file: {temp_path}")
                except OSError as e:
                    logger.warning(
                        f"Failed to clean up temporary file {temp_path}: {str(e)}"
                    )


def search_relevant_documents(
    query_text: str, database_ids: List[str], top_k: int = 5
) -> List[Dict]:
    """Search for relevant documents across multiple vector databases using semantic similarity.

    Performs vector similarity search across multiple FAISS indexes to find the most
    relevant document chunks for a given query. Results are ranked by similarity score.

    Args:
        query_text (str): The search query text to find similar documents for.
        database_ids (List[str]): List of database identifiers to search across.
        top_k (int, optional): Maximum number of results to return. Defaults to 5.

    Returns:
        List[Dict]: List of relevant documents sorted by similarity score (ascending distance).
                   Each dict contains: database_id, distance, metadata, chunk_text, file_name.

    Example:
        >>> results = search_relevant_documents("machine learning", ["db1", "db2"], top_k=3)
        >>> for result in results:
        ...     print(f"File: {result['file_name']}, Score: {result['distance']}")
    """
    logger.info(f"Starting document search for query: '{query_text[:100]}...'")
    logger.info(f"Searching across {len(database_ids)} databases with top_k={top_k}")

    # Input validation
    if not query_text or not isinstance(query_text, str):
        logger.warning("Empty or invalid query_text provided")
        return []

    if not database_ids or not isinstance(database_ids, list):
        logger.warning("Empty or invalid database_ids provided")
        return []

    if top_k <= 0:
        logger.warning(f"Invalid top_k value: {top_k}")
        return []

    if not STORAGE_BUCKET_NAME:
        logger.error("STORAGE_BUCKET_NAME not configured, cannot perform search")
        return []

    try:
        # Generate query embedding
        logger.debug("Generating embedding for search query")
        query_embeddings = get_embeddings([query_text.strip()])

        if not query_embeddings or not query_embeddings[0]:
            logger.error("Failed to generate query embedding")
            return []

        embedding = query_embeddings[0]
        if len(embedding) != EMBEDDING_DIMENSION:
            logger.error(
                f"Query embedding dimension mismatch: expected {EMBEDDING_DIMENSION}, got {len(embedding)}"
            )
            return []

        query_vector = np.array([embedding], dtype=np.float32)
        all_results = []
        successful_searches = 0

        # Search each database
        for db_idx, database_id in enumerate(database_ids):
            logger.debug(
                f"Searching database {db_idx+1}/{len(database_ids)}: {database_id}"
            )

            if not database_id or not isinstance(database_id, str):
                logger.warning(
                    f"Skipping invalid database_id at index {db_idx}: {database_id}"
                )
                continue

            try:
                index_data = load_faiss_index(database_id)
                if not index_data:
                    logger.warning(f"Could not load index for database: {database_id}")
                    continue

                index, metadata = index_data
                if index.ntotal == 0:
                    logger.info(f"Database {database_id} is empty, skipping")
                    continue

                # Perform similarity search
                search_k = min(top_k, index.ntotal)
                logger.debug(f"Searching {search_k} nearest neighbors in {database_id}")

                distances, indices = index.search(query_vector, search_k)

                # Process results
                db_results = 0
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
                        db_results += 1
                    else:
                        logger.warning(
                            f"Invalid index {idx} for database {database_id} (metadata length: {len(metadata)})"
                        )

                logger.debug(f"Found {db_results} results from database {database_id}")
                successful_searches += 1

            except Exception as e:
                logger.error(f"Error searching database {database_id}: {str(e)}")
                logger.debug(f"Database search traceback: {traceback.format_exc()}")
                continue

        # Sort and limit results
        if all_results:
            all_results.sort(key=lambda x: x["distance"])
            final_results = all_results[:top_k]
            logger.info(
                f"Search completed: {len(final_results)} results from "
                f"{successful_searches}/{len(database_ids)} databases"
            )

            # Log top results for debugging
            for i, result in enumerate(final_results[:3]):
                logger.debug(
                    f"Top result {i+1}: {result['file_name']} (distance: {result['distance']:.4f})"
                )

            return final_results
        else:
            logger.info("No relevant documents found across all databases")
            return []

    except Exception as e:
        logger.error(f"Unexpected error in document search: {str(e)}")
        logger.debug(f"Search traceback: {traceback.format_exc()}")
        return []


def build_rag_context(relevant_docs: List[Dict]) -> str:
    """Build formatted context string from relevant documents for RAG.

    Combines multiple document chunks into a single formatted context string
    that can be included in the system prompt for retrieval-augmented generation.

    Args:
        relevant_docs (List[Dict]): List of relevant document dictionaries from search results.
                                   Each should contain: chunk_text, file_name, and other metadata.

    Returns:
        str: Formatted context string ready for inclusion in prompts.
             Returns empty string if no valid documents provided.

    Example:
        >>> docs = [{"chunk_text": "AI is...", "file_name": "ai_intro.txt"}]
        >>> context = build_rag_context(docs)
        >>> print(context)
        The following information is from related documents:

        Document 1:
        File name: ai_intro.txt
        Content: AI is...
    """
    logger.debug(f"Building RAG context from {len(relevant_docs)} documents")

    if not relevant_docs or not isinstance(relevant_docs, list):
        logger.warning("No relevant documents provided for RAG context")
        return ""

    context_parts = ["The following information is from related documents:\n"]
    total_length = 0
    processed_docs = 0
    max_total_length = 4000
    max_chunk_length = 500

    for i, doc in enumerate(relevant_docs, 1):
        if not isinstance(doc, dict):
            logger.warning(f"Document {i} is not a dictionary, skipping")
            continue

        chunk_text = doc.get("chunk_text", "")
        if not chunk_text or not isinstance(chunk_text, str):
            logger.warning(f"Document {i} has no valid chunk_text, skipping")
            continue

        # Truncate chunk if too long
        truncated_content = chunk_text[:max_chunk_length]
        if len(chunk_text) > max_chunk_length:
            truncated_content += "..."
            logger.debug(
                f"Document {i} truncated from {len(chunk_text)} to {len(truncated_content)} characters"
            )

        # Check if adding this document would exceed total length limit
        doc_text_length = len(truncated_content)
        if total_length + doc_text_length > max_total_length:
            logger.info(
                f"Stopping at document {i} to avoid exceeding context length limit"
            )
            break

        # Add document to context
        file_name = doc.get("file_name", "Unknown")
        distance = doc.get("distance", "N/A")

        context_parts.extend(
            [
                f"Document {processed_docs + 1}:",
                f"File name: {file_name}",
                (
                    f"Relevance score: {distance:.4f}"
                    if isinstance(distance, (int, float))
                    else ""
                ),
                f"Content: {truncated_content}",
                "",
            ]
        )

        total_length += doc_text_length
        processed_docs += 1
        logger.debug(
            f"Added document {i} to context (file: {file_name}, length: {doc_text_length})"
        )

    if processed_docs == 0:
        logger.warning("No valid documents could be processed for RAG context")
        return ""

    final_context = "\n".join(filter(None, context_parts))
    logger.info(
        f"RAG context built: {processed_docs} documents, {len(final_context)} total characters"
    )

    return final_context


def convert_tools_to_bedrock_format(tools: List[Dict]) -> List[Dict]:
    """Convert tool definitions to Amazon Bedrock Converse API format.

    This function creates valid tool specifications that are compatible with
    Bedrock's Converse API requirements. It handles parameter validation,
    type mapping, and schema generation.
    """
    logger.info(f"🔧 Converting {len(tools)} tools to Bedrock format")

    if not tools or not isinstance(tools, list):
        logger.warning("⚠️ No tools provided or invalid tools format")
        return []

    bedrock_tools = []

    for tool_idx, tool in enumerate(tools):
        try:
            logger.debug(f"🔧 Processing tool {tool_idx + 1}/{len(tools)}")
            logger.debug(f"🔧 Raw tool data: {json.dumps(tool, default=str)}")

            if not isinstance(tool, dict):
                logger.warning(f"⚠️ Tool {tool_idx + 1} is not a dictionary, skipping")
                continue

            # Extract and validate required fields
            tool_id = tool.get("id", "")
            tool_name = tool.get("name", "")
            tool_description = tool.get("description", "")
            tool_parameters = tool.get("parameters", [])

            if not tool_id or not tool_name or not tool_description:
                logger.warning(
                    f"⚠️ Tool {tool_idx + 1} missing required fields: "
                    f"id={bool(tool_id)}, name={bool(tool_name)}, description={bool(tool_description)}"
                )
                continue

            # Create Bedrock-compatible tool name
            bedrock_tool_name = f"custom_tool_{tool_id}"

            logger.info(f"✅ Converting tool: {tool_name} -> {bedrock_tool_name}")

            # Start with basic tool specification
            bedrock_tool = {
                "toolSpec": {
                    "name": bedrock_tool_name,
                    "description": tool_description.strip(),
                }
            }

            # Process parameters if they exist
            if (
                tool_parameters
                and isinstance(tool_parameters, list)
                and len(tool_parameters) > 0
            ):
                logger.debug(f"🔧 Processing {len(tool_parameters)} parameters")

                # Validate and process each parameter
                valid_properties = {}
                required_params = []

                for param_idx, param in enumerate(tool_parameters):
                    if not isinstance(param, dict):
                        logger.warning(
                            f"⚠️ Parameter {param_idx + 1} is not a dict, skipping"
                        )
                        continue

                    param_name = param.get("name", "").strip()
                    param_type = param.get("type", "string").lower()
                    param_description = param.get("description", "").strip()
                    param_required = bool(param.get("required", False))

                    if not param_name:
                        logger.warning(
                            f"⚠️ Parameter {param_idx + 1} has no name, skipping"
                        )
                        continue

                    # Map to JSON Schema types
                    json_type_mapping = {
                        "string": "string",
                        "number": "number",
                        "integer": "number",
                        "boolean": "boolean",
                        "array": "array",
                        "object": "object",
                    }

                    json_type = json_type_mapping.get(param_type, "string")

                    valid_properties[param_name] = {
                        "type": json_type,
                        "description": param_description or f"Parameter: {param_name}",
                    }

                    if param_required:
                        required_params.append(param_name)

                    logger.debug(
                        f"✅ Added parameter: {param_name} (type: {json_type}, required: {param_required})"
                    )

                # Only add inputSchema if we have valid properties
                if valid_properties:
                    json_schema = {
                        "type": "object",
                        "properties": valid_properties,
                        "additionalProperties": False,
                    }

                    # Only add required array if there are required parameters
                    if required_params:
                        json_schema = {**json_schema, "required": required_params}

                    bedrock_tool["toolSpec"]["inputSchema"] = {"json": json_schema}

                    logger.info(
                        f"✅ Tool {tool_name}: Added input schema with {len(valid_properties)} properties"
                    )
                    logger.debug(
                        f"🔧 Input schema: {json.dumps(json_schema, indent=2)}"
                    )
                else:
                    logger.info(
                        f"ℹ️ Tool {tool_name}: No valid parameters found, tool will have no input schema"
                    )
            else:
                logger.info(
                    f"ℹ️ Tool {tool_name}: No parameters provided, tool will have no input schema"
                )

            # Add the completed tool to the list
            bedrock_tools.append(bedrock_tool)

            logger.info(f"🎉 Successfully converted tool: {tool_name}")
            logger.debug(
                f"🔧 Final tool spec: {json.dumps(bedrock_tool, indent=2, default=str)}"
            )

        except Exception as e:
            logger.error(f"❌ Error processing tool {tool_idx + 1}: {str(e)}")
            logger.debug(f"❌ Tool processing traceback: {traceback.format_exc()}")
            continue

    logger.info(
        f"🎉 Successfully converted {len(bedrock_tools)}/{len(tools)} tools to Bedrock format"
    )

    # Log final result for debugging
    if bedrock_tools:
        logger.debug("🔧 All converted Bedrock tools:")
        for idx, tool in enumerate(bedrock_tools):
            logger.debug(f"  Tool {idx + 1}: {json.dumps(tool, indent=4, default=str)}")

    return bedrock_tools


def execute_custom_tool(
    tool_name: str,
    tool_code_key: str,
    parameters: Dict,
    requirements_key: Optional[str] = None,
) -> Dict:
    """Execute a custom tool by invoking the execute-tool Lambda function.

    Calls the execute-tool Lambda function with the specified tool code and parameters.
    Handles the response and provides standardized success/error reporting.

    Args:
        tool_name (str): Name of the tool being executed (for logging/identification).
        tool_code_key (str): S3 key or identifier for the tool's Python code.
        parameters (Dict): Dictionary of parameters to pass to the tool.
        requirements_key (Optional[str]): S3 key for requirements.txt file (optional).

    Returns:
        Dict: Execution result with keys:
              - success (bool): Whether execution succeeded
              - result (Dict): Tool output if successful
              - error (str): Error message if failed
              - tool_name (str): Name of the executed tool

    Example:
        >>> result = execute_custom_tool("calculator", "tools/calc.py", {"expr": "2+2"})
        >>> if result["success"]:
        ...     print(f"Result: {result['result']}")
    """
    logger.info(f"Executing custom tool: {tool_name}")
    logger.debug(f"Tool code key: {tool_code_key}")
    logger.debug(f"Parameters: {json.dumps(parameters, default=str)}")

    # Input validation
    if not tool_name or not isinstance(tool_name, str):
        error_msg = "Tool name must be a non-empty string"
        logger.error(error_msg)
        return {"success": False, "error": error_msg, "tool_name": tool_name}

    if not tool_code_key or not isinstance(tool_code_key, str):
        error_msg = "Tool code key must be a non-empty string"
        logger.error(error_msg)
        return {"success": False, "error": error_msg, "tool_name": tool_name}

    # Validate and normalize parameters
    if parameters is None:
        logger.info(f"Parameters is None for tool {tool_name}, using empty dict")
        parameters = {}
    elif not isinstance(parameters, dict):
        logger.error(
            f"Parameters is not a dict for tool {tool_name}: type={type(parameters)}, value={parameters}"
        )
        error_msg = f"Parameters must be a dictionary, got {type(parameters).__name__}"
        return {"success": False, "error": error_msg, "tool_name": tool_name}

    # Ensure parameters can be JSON serialized
    try:
        json.dumps(parameters, default=str)
    except (TypeError, ValueError) as e:
        logger.error(
            f"Parameters cannot be JSON serialized for tool {tool_name}: {str(e)}"
        )
        error_msg = f"Parameters must be JSON serializable: {str(e)}"
        return {"success": False, "error": error_msg, "tool_name": tool_name}

    try:
        # Prepare Lambda payload
        payload = {
            "tool_name": tool_name,
            "tool_code_key": tool_code_key,
            "parameters": parameters,
        }

        # Add requirements_key if provided
        if requirements_key:
            payload["requirements_key"] = requirements_key

        logger.debug(f"Invoking Lambda function: {EXECUTE_TOOL_FUNCTION_NAME}")

        # Invoke execute-tool Lambda function
        response = lambda_client.invoke(
            FunctionName=EXECUTE_TOOL_FUNCTION_NAME,
            InvocationType="RequestResponse",
            Payload=json.dumps(payload),
        )

        # Parse response
        response_payload = json.loads(response["Payload"].read())
        logger.debug(f"Lambda response status: {response.get('StatusCode')}")

        # Check for Lambda-level errors
        if response.get("StatusCode") != 200:
            error_msg = (
                f"Lambda invocation failed with status {response.get('StatusCode')}"
            )
            logger.error(error_msg)
            return {"success": False, "error": error_msg, "tool_name": tool_name}

        # Check for function-level errors in the response
        if "errorMessage" in response_payload:
            error_msg = response_payload.get("errorMessage", "Unknown Lambda error")
            logger.error(f"Tool execution failed: {error_msg}")
            return {"success": False, "error": error_msg, "tool_name": tool_name}

        # Process successful execution
        if response_payload.get("success", False):
            result = response_payload.get("result", {})
            logger.info(f"Tool {tool_name} executed successfully")
            logger.debug(f"Tool result: {json.dumps(result, default=str)[:200]}...")

            return {
                "success": True,
                "result": result,
                "tool_name": tool_name,
            }
        else:
            error_msg = response_payload.get(
                "error", "Tool execution failed with unknown error"
            )
            logger.error(f"Tool {tool_name} execution failed: {error_msg}")
            return {"success": False, "error": error_msg, "tool_name": tool_name}

    except json.JSONDecodeError as e:
        error_msg = f"Failed to parse Lambda response: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg, "tool_name": tool_name}

    except lambda_client.exceptions.ResourceNotFoundException as e:
        error_msg = f"Execute-tool Lambda function not found: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg, "tool_name": tool_name}

    except lambda_client.exceptions.InvalidParameterValueException as e:
        error_msg = f"Invalid parameters for Lambda invocation: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg, "tool_name": tool_name}

    except Exception as e:
        error_msg = f"Unexpected error invoking tool {tool_name}: {str(e)}"
        logger.error(error_msg)
        logger.debug(f"Tool execution traceback: {traceback.format_exc()}")
        return {"success": False, "error": error_msg, "tool_name": tool_name}


def handler(event, context):
    """
    AWS Lambda handler for chat with Bedrock Converse API, RAG, and tool use support.

    This function provides a comprehensive chat interface that combines:
    - Large Language Model conversation via Amazon Bedrock
    - Retrieval-Augmented Generation (RAG) using FAISS vector search
    - Custom tool execution capabilities
    - Multi-turn conversation support

    The handler follows AWS official patterns from:
    https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use-examples.html

    Args:
        event (Dict): Lambda event containing:
            - arguments.messages (List[Dict]): Conversation messages with role and text
            - arguments.systemPrompt (str, optional): System prompt for the AI
            - arguments.modelId (str, optional): Bedrock model identifier
            - arguments.databaseIds (List[str], optional): Vector databases for RAG
            - arguments.toolIds (List[str], optional): Available tool identifiers
            - arguments.toolsData (List[Dict], optional): Full tool definitions

        context: Lambda context object (standard AWS Lambda context)

    Returns:
        Dict: Response containing:
            - response (str): AI-generated response text
            - modelId (str): Model used for generation
            - usage (Dict): Token usage statistics from Bedrock

    Example:
        >>> event = {
        ...     "arguments": {
        ...         "messages": [{"role": "user", "text": "Hello!"}],
        ...         "systemPrompt": "You are a helpful assistant",
        ...         "modelId": "anthropic.claude-3-sonnet-20240229-v1:0"
        ...     }
        ... }
        >>> result = handler(event, {})
        >>> print(result["response"])
    """
    request_id = context.aws_request_id if context else "unknown"
    logger.info(f"Handler started - Request ID: {request_id}")

    try:
        logger.debug(f"Received event: {json.dumps(event, default=str)}")

        # Extract and validate arguments
        arguments = event.get("arguments", {})
        if not isinstance(arguments, dict):
            raise ValueError("Event must contain 'arguments' dictionary")

        messages_data = arguments.get("messages", [])
        system_prompt = arguments.get("systemPrompt", "You are a helpful AI assistant.")
        model_id = arguments.get(
            "modelId", "apac.anthropic.claude-sonnet-4-20250514-v1:0"
        )
        database_ids = arguments.get("databaseIds", [])
        tool_ids = arguments.get("toolIds", [])
        tools_data = arguments.get("toolsData", [])
        force_tool_use = arguments.get("forceToolUse", False)

        logger.info(
            f"Request configuration - Model: {model_id}, Databases: {len(database_ids)}, "
            f"Tools: {len(tools_data)}, Force Tool Use: {force_tool_use}"
        )

        # Validate and normalize inputs
        if not isinstance(tool_ids, list):
            logger.warning("toolIds is not a list, converting to empty list")
            tool_ids = []

        if not isinstance(messages_data, list) or not messages_data:
            raise ValueError("Messages array is required and must be non-empty")

        # Perform RAG search if databases are selected
        rag_context = ""
        if database_ids and isinstance(database_ids, list):
            logger.info(f"RAG enabled for {len(database_ids)} databases")

            # Get last user message for search
            last_user_message = None
            for msg in reversed(messages_data):
                if msg and isinstance(msg, dict) and msg.get("role") == "user":
                    last_user_message = msg.get("text", "")
                    break

            if last_user_message:
                logger.debug(
                    f"Using last user message for RAG search: '{last_user_message[:100]}...'"
                )
                try:
                    relevant_docs = search_relevant_documents(
                        last_user_message, database_ids, top_k=3
                    )
                    if relevant_docs:
                        rag_context = build_rag_context(relevant_docs)
                        logger.info(
                            f"RAG context built: {len(rag_context)} characters from {len(relevant_docs)} documents"
                        )
                    else:
                        logger.info("No relevant documents found for RAG")
                except Exception as e:
                    logger.error(f"RAG search failed: {str(e)}")
                    logger.debug(f"RAG error traceback: {traceback.format_exc()}")
            else:
                logger.warning("No user message found for RAG search")

        # Process tools using passed tool data
        bedrock_tools = []
        if tools_data and isinstance(tools_data, list):
            logger.info(f"Processing {len(tools_data)} tools for Converse API")
            logger.info(
                f"Raw tools data received: {json.dumps(tools_data, default=str, indent=2)}"
            )

            # Detailed validation of each tool
            for tool_idx, tool in enumerate(tools_data):
                logger.debug(
                    f"Tool {tool_idx + 1} structure: {json.dumps(tool, default=str, indent=2)}"
                )
                logger.debug(
                    f"Tool {tool_idx + 1} parameters type: {type(tool.get('parameters', []))}"
                )
                logger.debug(
                    f"Tool {tool_idx + 1} parameters content: {tool.get('parameters', [])}"
                )

            try:
                bedrock_tools = convert_tools_to_bedrock_format(tools_data)
                logger.info(f"Successfully converted {len(bedrock_tools)} tools")
                logger.info(
                    f"Converted bedrock tools: {json.dumps(bedrock_tools, default=str, indent=2)}"
                )
            except Exception as e:
                logger.error(f"Tool conversion failed: {str(e)}")
                logger.debug(f"Tool conversion traceback: {traceback.format_exc()}")
        else:
            logger.warning(
                f"No tools data provided or invalid format. tools_data: {tools_data}, type: {type(tools_data)}"
            )

        # Combine system prompt with RAG context
        enhanced_system_prompt = system_prompt
        if rag_context:
            enhanced_system_prompt = f"{system_prompt}\n\n{rag_context}"
            logger.info("Enhanced system prompt with RAG context")

        # Convert messages to Bedrock format
        max_messages = 10
        recent_messages = (
            messages_data[-max_messages:]
            if len(messages_data) > max_messages
            else messages_data
        )
        logger.debug(
            f"Processing {len(recent_messages)} recent messages (from {len(messages_data)} total)"
        )

        bedrock_messages = []
        for msg_idx, msg in enumerate(recent_messages):
            if not msg or not isinstance(msg, dict):
                logger.warning(f"Message {msg_idx + 1} is invalid, skipping")
                continue

            role = msg.get("role")
            content = msg.get("text", "")

            if role in ["user", "assistant"] and content:
                bedrock_messages.append({"role": role, "content": [{"text": content}]})
                logger.debug(f"Added {role} message: {content[:50]}...")
            else:
                logger.warning(
                    f"Message {msg_idx + 1} has invalid role '{role}' or empty content"
                )

        if not bedrock_messages:
            raise ValueError("No valid messages found after filtering")

        logger.info(f"Prepared {len(bedrock_messages)} messages for Bedrock API")

        # Prepare Converse API parameters
        converse_params: Dict[str, Any] = {
            "modelId": model_id,
            "messages": bedrock_messages,
            "inferenceConfig": {
                "maxTokens": 4096,
                "temperature": 0.7,
                "topP": 0.9,
            },
        }

        # Add system prompt if provided
        if enhanced_system_prompt.strip():
            converse_params["system"] = [{"text": enhanced_system_prompt}]
            logger.debug("Added system prompt to Converse API parameters")

            # Add tools if available
        if bedrock_tools:
            tool_config: Dict[str, Any] = {"tools": bedrock_tools}

            # Force tool use if requested
            if force_tool_use:
                tool_config["toolChoice"] = {"any": {}}
                logger.info(
                    f"Added {len(bedrock_tools)} tools to Converse API with forced tool use"
                )
                logger.info(
                    f"Tool choice configuration: {json.dumps(tool_config['toolChoice'], default=str)}"
                )
            else:
                logger.info(f"Added {len(bedrock_tools)} tools to Converse API")

            logger.info(f"Final tool config: {json.dumps(tool_config, default=str)}")

            converse_params["toolConfig"] = tool_config

        # Generate response using Converse API
        logger.info("Invoking Bedrock Converse API...")
        logger.info(
            f"Converse API parameters: {json.dumps(converse_params, default=str)}"
        )
        try:
            response = bedrock_client.converse(**converse_params)
            logger.info("Bedrock API call successful")
            logger.info(f"Bedrock response: {json.dumps(response, default=str)}")
        except Exception as e:
            logger.error(f"Bedrock API call failed: {str(e)}")
            raise

        stop_reason = response.get("stopReason", "")
        logger.info(f"Bedrock response stop reason: {stop_reason}")

        # Handle tool use following AWS documentation pattern
        if stop_reason == "tool_use":
            logger.info("Model requested tool use")

            # Get the output message from the model (following AWS pattern)
            output_message = response["output"]["message"]
            bedrock_messages.append(output_message)
            logger.debug("Added model's tool use message to conversation")

            # Process tool use requests
            tool_requests = response["output"]["message"]["content"]
            logger.info(f"Processing {len(tool_requests)} tool requests")

            for req_idx, tool_request in enumerate(tool_requests):
                if "toolUse" not in tool_request:
                    logger.debug(
                        f"Tool request {req_idx + 1} is not a tool use, skipping"
                    )
                    continue

                tool = tool_request["toolUse"]
                tool_name = tool.get("name", "")
                tool_input = tool.get("input", {})
                tool_use_id = tool.get("toolUseId", "")

                logger.info(
                    f"Executing tool {req_idx + 1}: {tool_name} (ID: {tool_use_id})"
                )
                logger.debug(f"Tool input: {json.dumps(tool_input, default=str)}")

                # Execute the tool
                tool_result = {}
                try:
                    # Extract tool ID from tool name for execution
                    if tool_name.startswith("custom_tool_"):
                        tool_id = tool_name.replace("custom_tool_", "")

                        # Find the tool info to get the correct pythonCodeKey and requirementsKey
                        tool_code_key = (
                            f"tools/lambda/shared/lambda_{tool_id}.py"  # fallback
                        )
                        requirements_key = None
                        for tool_info in tools_data:
                            if tool_info.get("id") == tool_id:
                                tool_code_key = tool_info.get(
                                    "pythonCodeKey", tool_code_key
                                )
                                requirements_key = tool_info.get("requirementsKey")
                                break

                        logger.debug(f"Using tool code key: {tool_code_key}")
                        if requirements_key:
                            logger.debug(f"Using requirements key: {requirements_key}")

                        # Validate tool_input before passing to execute_custom_tool
                        if not isinstance(tool_input, dict):
                            logger.warning(
                                f"Tool input is not a dict for {tool_name}: type={type(tool_input)}, value={tool_input}"
                            )
                            tool_input = (
                                {} if tool_input is None else {"input": tool_input}
                            )

                        execution_result = execute_custom_tool(
                            tool_name,
                            tool_code_key,
                            tool_input,
                            requirements_key,
                        )

                        if execution_result.get("success", False):
                            tool_result = {
                                "toolUseId": tool_use_id,
                                "content": [
                                    {"json": execution_result.get("result", {})}
                                ],
                            }
                            logger.info(f"Tool {tool_name} executed successfully")
                        else:
                            error_msg = execution_result.get(
                                "error", "Tool execution failed"
                            )
                            tool_result = {
                                "toolUseId": tool_use_id,
                                "content": [{"text": error_msg}],
                                "status": "error",
                            }
                            logger.error(
                                f"Tool {tool_name} execution failed: {error_msg}"
                            )
                    else:
                        # Fallback for unknown tools
                        error_msg = f"Unknown tool: {tool_name}"
                        tool_result = {
                            "toolUseId": tool_use_id,
                            "content": [{"text": error_msg}],
                            "status": "error",
                        }
                        logger.error(error_msg)

                except Exception as e:
                    error_msg = f"Tool execution error: {str(e)}"
                    logger.error(error_msg)
                    logger.debug(f"Tool execution traceback: {traceback.format_exc()}")
                    tool_result = {
                        "toolUseId": tool_use_id,
                        "content": [{"text": error_msg}],
                        "status": "error",
                    }

                # Add tool result message following AWS pattern
                tool_result_message = {
                    "role": "user",
                    "content": [{"toolResult": tool_result}],
                }
                bedrock_messages.append(tool_result_message)
                logger.debug(f"Added tool result for {tool_name} to conversation")

            # Send the tool results back to the model
            logger.info("Sending tool results back to model for final response")
            final_converse_params = converse_params.copy()
            final_converse_params["messages"] = bedrock_messages

            try:
                response = bedrock_client.converse(**final_converse_params)
                logger.info("Final Bedrock API call successful")
            except Exception as e:
                logger.error(f"Final Bedrock API call failed: {str(e)}")
                raise

        # Extract response text from Converse API (final response after tool use or direct response)
        response_text = ""
        output_message = response.get("output", {}).get("message", {})
        content = output_message.get("content", [])

        for content_block in content:
            if "text" in content_block:
                response_text += content_block["text"]

        if not response_text:
            logger.warning("No response text generated, using fallback message")
            response_text = "I apologize, but I couldn't generate a response."

        # Extract usage statistics
        usage = response.get("usage", {})
        logger.info(
            f"Response generated successfully. Length: {len(response_text)} characters"
        )
        logger.debug(f"Token usage: {json.dumps(usage, default=str)}")

        return {
            "response": response_text,
            "modelId": model_id,
            "usage": usage,
        }

    except ValueError as e:
        logger.error(f"Validation error in handler: {str(e)}")
        fallback_model_id = "apac.anthropic.claude-sonnet-4-20250514-v1:0"
        response_model_id = locals().get("model_id", fallback_model_id)

        return {
            "response": f"I apologize, but there was a validation error: {str(e)}",
            "modelId": response_model_id,
            "usage": {},
        }

    except Exception as e:
        logger.error(f"Unexpected handler error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")

        fallback_model_id = "apac.anthropic.claude-sonnet-4-20250514-v1:0"
        response_model_id = locals().get("model_id", fallback_model_id)

        return {
            "response": "I apologize, but I encountered an error while processing your request.",
            "modelId": response_model_id,
            "usage": {},
        }
