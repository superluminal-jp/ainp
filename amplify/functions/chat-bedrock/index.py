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

# Environment variables
STORAGE_BUCKET_NAME = os.environ.get("STORAGE_BUCKET_NAME")
FAISS_INDEX_PREFIX = os.environ.get("FAISS_INDEX_PREFIX", "faiss-indexes")
EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v1"
EMBEDDING_DIMENSION = 1536


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


def handler(event, context):
    """
    AWS Lambda handler for chat with Bedrock Converse API and RAG support.

    This function provides a comprehensive chat interface that combines:
    - Large Language Model conversation via Amazon Bedrock
    - Retrieval-Augmented Generation (RAG) using FAISS vector search
    - Multi-turn conversation support

    Args:
        event (Dict): Lambda event containing:
            - arguments.messages (List[Dict]): Conversation messages with role and text
            - arguments.systemPrompt (str, optional): System prompt for the AI
            - arguments.modelId (str, optional): Bedrock model identifier
            - arguments.databaseIds (List[str], optional): Vector databases for RAG

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

        logger.info(
            f"Request configuration - Model: {model_id}, Databases: {len(database_ids)}"
        )

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

        # Extract response text from Converse API
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
