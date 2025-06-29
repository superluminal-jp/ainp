import json
import logging
import boto3
import os
import pickle
import tempfile
import numpy as np
import faiss
from typing import List, Dict, Optional

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
    """
    Generate embeddings for a list of texts using Amazon Bedrock Titan model.

    Args:
        texts (List[str]): List of text strings to embed. Each text should be
                          non-empty and within Titan's input limits.

    Returns:
        List[List[float]]: List of embedding vectors, one per input text.
                          Each embedding is a 1536-dimensional vector.
                          Returns zero vectors for failed embeddings.

    Raises:
        ValueError: If texts list is empty or contains invalid items.

    Note:
        This function is fault-tolerant and will return zero vectors for
        texts that fail to embed, allowing the process to continue.
    """
    if not texts:
        logger.warning("[get_embeddings] Empty texts list provided")
        raise ValueError("Texts list cannot be empty")

    logger.info(f"[get_embeddings] Processing {len(texts)} texts for embedding")
    embeddings = []
    successful_embeddings = 0
    failed_embeddings = 0

    for i, text in enumerate(texts):
        if not isinstance(text, str) or not text.strip():
            logger.warning(f"[get_embeddings] Skipping invalid text at index {i}")
            embeddings.append([0.0] * EMBEDDING_DIMENSION)
            failed_embeddings += 1
            continue

        try:
            logger.debug(
                f"[get_embeddings] Processing text {i+1}/{len(texts)} (length: {len(text)})"
            )

            # Prepare the request body for Titan embedding model
            body = json.dumps({"inputText": text[:8000]})  # Limit text length for Titan

            # Invoke the model
            response = bedrock_client.invoke_model(
                modelId=EMBEDDING_MODEL_ID,
                body=body,
                contentType="application/json",
                accept="application/json",
            )

            # Parse the response
            response_body = json.loads(response["body"].read())
            embedding = response_body.get("embedding", [])

            if not embedding or len(embedding) != EMBEDDING_DIMENSION:
                logger.error(
                    f"[get_embeddings] Invalid embedding received for text {i+1}"
                )
                embeddings.append([0.0] * EMBEDDING_DIMENSION)
                failed_embeddings += 1
            else:
                embeddings.append(embedding)
                successful_embeddings += 1

        except json.JSONDecodeError as e:
            logger.error(f"[get_embeddings] JSON decode error for text {i+1}: {str(e)}")
            embeddings.append([0.0] * EMBEDDING_DIMENSION)
            failed_embeddings += 1
        except Exception as e:
            logger.error(f"[get_embeddings] Unexpected error for text {i+1}: {str(e)}")
            embeddings.append([0.0] * EMBEDDING_DIMENSION)
            failed_embeddings += 1

    logger.info(
        f"[get_embeddings] Completed: {successful_embeddings} successful, {failed_embeddings} failed"
    )
    return embeddings


def load_faiss_index(database_id: str) -> Optional[tuple]:
    """
    Load FAISS index and associated metadata from S3 storage.

    Args:
        database_id (str): Unique identifier for the database. Must be non-empty.

    Returns:
        Optional[tuple]: Tuple of (faiss.Index, List[Dict]) if successful,
                        None if loading fails. The tuple contains:
                        - faiss.Index: The loaded FAISS index
                        - List[Dict]: Associated metadata for each vector

    Raises:
        ValueError: If database_id is empty or invalid.

    Note:
        This function handles various failure modes gracefully and returns None
        rather than raising exceptions, allowing the calling code to continue
        without RAG functionality.
    """
    if not database_id or not isinstance(database_id, str) or not database_id.strip():
        logger.error("[load_faiss_index] Invalid database_id provided")
        raise ValueError("database_id must be a non-empty string")

    database_id = database_id.strip()
    index_key = f"{FAISS_INDEX_PREFIX}/{database_id}/index.faiss"
    metadata_key = f"{FAISS_INDEX_PREFIX}/{database_id}/metadata.pkl"

    logger.info(f"[load_faiss_index] Loading FAISS index for database: {database_id}")
    logger.debug(f"[load_faiss_index] Index key: {index_key}")
    logger.debug(f"[load_faiss_index] Metadata key: {metadata_key}")

    if not STORAGE_BUCKET_NAME:
        logger.error("[load_faiss_index] STORAGE_BUCKET_NAME not configured")
        return None

    try:
        # Check if both files exist before attempting download
        logger.debug(
            f"[load_faiss_index] Checking if files exist in bucket: {STORAGE_BUCKET_NAME}"
        )

        # Download FAISS index file
        with tempfile.NamedTemporaryFile(suffix=".faiss", delete=False) as index_file:
            logger.debug(
                f"[load_faiss_index] Downloading index file to: {index_file.name}"
            )
            s3_client.download_file(STORAGE_BUCKET_NAME, index_key, index_file.name)

            # Load FAISS index
            logger.debug("[load_faiss_index] Reading FAISS index from file")
            index = faiss.read_index(index_file.name)

            if not index:
                logger.error("[load_faiss_index] Failed to read FAISS index")
                return None

            # Download metadata
            with tempfile.NamedTemporaryFile(
                suffix=".pkl", delete=False
            ) as metadata_file:
                logger.debug(
                    f"[load_faiss_index] Downloading metadata file to: {metadata_file.name}"
                )
                s3_client.download_file(
                    STORAGE_BUCKET_NAME, metadata_key, metadata_file.name
                )

                logger.debug("[load_faiss_index] Loading metadata from pickle file")
                with open(metadata_file.name, "rb") as f:
                    metadata = pickle.load(f)

                if not isinstance(metadata, list):
                    logger.error(
                        f"[load_faiss_index] Invalid metadata type: {type(metadata)}"
                    )
                    return None

                vector_count = index.ntotal
                metadata_count = len(metadata)

                if vector_count != metadata_count:
                    logger.warning(
                        f"[load_faiss_index] Vector count ({vector_count}) != metadata count ({metadata_count})"
                    )

                logger.info(
                    f"[load_faiss_index] Successfully loaded FAISS index: "
                    f"{vector_count} vectors, {metadata_count} metadata entries"
                )
                return index, metadata

    except s3_client.exceptions.NoSuchKey as e:
        logger.warning(
            f"[load_faiss_index] FAISS files not found for database {database_id}: {str(e)}"
        )
        return None
    except s3_client.exceptions.NoSuchBucket as e:
        logger.error(f"[load_faiss_index] FAISS bucket not found: {str(e)}")
        return None
    except pickle.PickleError as e:
        logger.error(f"[load_faiss_index] Error loading metadata pickle: {str(e)}")
        return None
    except Exception as e:
        logger.error(
            f"[load_faiss_index] Unexpected error for database {database_id}: {str(e)}"
        )
        return None


def search_relevant_documents(
    query_text: str, database_ids: List[str], top_k: int = 5
) -> List[Dict]:
    """
    Search for relevant document chunks across multiple vector databases using semantic similarity.

    Args:
        query_text (str): The search query text. Must be non-empty.
        database_ids (List[str]): List of database IDs to search across.
                                 Each ID must correspond to an existing FAISS index.
        top_k (int, optional): Maximum number of results to return. Defaults to 5.
                              Must be positive.

    Returns:
        List[Dict]: List of relevant document chunks, sorted by similarity score.
                   Each dict contains:
                   - database_id (str): Source database identifier
                   - distance (float): Similarity distance (lower = more similar)
                   - metadata (Dict): Full metadata for the chunk
                   - chunk_text (str): The actual text content
                   - file_name (str): Source file name

    Note:
        This function is fault-tolerant and will continue searching other databases
        even if some fail. Returns empty list if no relevant documents are found
        or if critical errors occur.
    """
    # Input validation
    if not query_text or not isinstance(query_text, str) or not query_text.strip():
        logger.warning(
            "[search_relevant_documents] Empty or invalid query text provided"
        )
        return []

    if not database_ids or not isinstance(database_ids, list):
        logger.warning("[search_relevant_documents] No database IDs provided")
        return []

    if top_k <= 0:
        logger.warning(f"[search_relevant_documents] Invalid top_k value: {top_k}")
        top_k = 5

    if not STORAGE_BUCKET_NAME:
        logger.error("[search_relevant_documents] STORAGE bucket not configured")
        return []

    query_text = query_text.strip()
    valid_database_ids = [
        db_id for db_id in database_ids if db_id and isinstance(db_id, str)
    ]

    logger.info(
        f"[search_relevant_documents] Searching {len(valid_database_ids)} databases "
        f"for query (length: {len(query_text)}, top_k: {top_k})"
    )
    logger.debug(f"[search_relevant_documents] Query preview: {query_text[:100]}...")

    try:
        # Get query embedding
        logger.debug("[search_relevant_documents] Generating query embedding")
        query_embeddings = get_embeddings([query_text])

        if not query_embeddings or not query_embeddings[0]:
            logger.error("[search_relevant_documents] Failed to get query embedding")
            return []

        # Validate embedding
        embedding = query_embeddings[0]
        if len(embedding) != EMBEDDING_DIMENSION:
            logger.error(
                f"[search_relevant_documents] Invalid embedding dimension: "
                f"{len(embedding)} != {EMBEDDING_DIMENSION}"
            )
            return []

        query_vector = np.array([embedding], dtype=np.float32)
        all_results = []
        successful_searches = 0
        failed_searches = 0

        # Search across all selected databases
        for database_id in valid_database_ids:
            logger.debug(
                f"[search_relevant_documents] Searching database: {database_id}"
            )

            try:
                index_data = load_faiss_index(database_id)
                if not index_data:
                    logger.warning(
                        f"[search_relevant_documents] Could not load index for: {database_id}"
                    )
                    failed_searches += 1
                    continue

                index, metadata = index_data

                if index.ntotal == 0:
                    logger.warning(
                        f"[search_relevant_documents] Empty index for database: {database_id}"
                    )
                    failed_searches += 1
                    continue

                # Perform similarity search
                logger.debug(
                    f"[search_relevant_documents] Performing similarity search in {database_id}"
                )
                search_k = min(
                    top_k, index.ntotal
                )  # Don't search for more than available
                distances, indices = index.search(query_vector, search_k)

                # Collect results with metadata
                database_results = 0
                for i, (distance, idx) in enumerate(zip(distances[0], indices[0])):
                    if idx >= 0 and idx < len(metadata):  # Valid index
                        result = {
                            "database_id": database_id,
                            "distance": float(distance),
                            "metadata": metadata[idx],
                            "chunk_text": metadata[idx].get("chunk_text", ""),
                            "file_name": metadata[idx].get("file_name", "Unknown"),
                        }
                        all_results.append(result)
                        database_results += 1
                    else:
                        logger.warning(
                            f"[search_relevant_documents] Invalid index {idx} for database {database_id}"
                        )

                logger.debug(
                    f"[search_relevant_documents] Found {database_results} results in {database_id}"
                )
                successful_searches += 1

            except np.linalg.LinAlgError as e:
                logger.error(
                    f"[search_relevant_documents] Linear algebra error in {database_id}: {str(e)}"
                )
                failed_searches += 1
                continue
            except Exception as e:
                logger.error(
                    f"[search_relevant_documents] Error searching database {database_id}: {str(e)}"
                )
                failed_searches += 1
                continue

        # Sort by distance (similarity) and return top results
        if all_results:
            all_results.sort(key=lambda x: x["distance"])
            final_results = all_results[:top_k]

            logger.info(
                f"[search_relevant_documents] Search completed: {len(final_results)} results "
                f"from {successful_searches} databases ({failed_searches} failed)"
            )

            # Log top results for debugging
            for i, result in enumerate(final_results[:3]):  # Log top 3
                logger.debug(
                    f"[search_relevant_documents] Result {i+1}: {result['file_name']} "
                    f"(distance: {result['distance']:.4f})"
                )

            return final_results
        else:
            logger.info(
                f"[search_relevant_documents] No results found across {len(valid_database_ids)} databases"
            )
            return []

    except Exception as e:
        logger.error(
            f"[search_relevant_documents] Unexpected error in document search: {str(e)}"
        )
        return []


def build_rag_context(relevant_docs: List[Dict]) -> str:
    """
    Build a formatted context string from relevant document chunks for RAG.

    Args:
        relevant_docs (List[Dict]): List of relevant document chunks from similarity search.
                                   Each dict should contain 'file_name' and 'chunk_text' keys.

    Returns:
        str: Formatted context string ready for inclusion in system prompt.
             Returns empty string if no documents provided or all documents are invalid.

    Note:
        Content is truncated to prevent token limits from being exceeded.
        Invalid documents are logged but don't stop processing of valid ones.
    """
    if not relevant_docs or not isinstance(relevant_docs, list):
        logger.debug("[build_rag_context] No relevant documents provided")
        return ""

    logger.info(
        f"[build_rag_context] Building context from {len(relevant_docs)} documents"
    )

    context_parts = ["The following information is from related documents:\n"]
    valid_docs = 0
    total_content_length = 0

    for i, doc in enumerate(relevant_docs, 1):
        if not isinstance(doc, dict):
            logger.warning(
                f"[build_rag_context] Invalid document type at index {i-1}: {type(doc)}"
            )
            continue

        file_name = doc.get("file_name", "Unknown")
        chunk_text = doc.get("chunk_text", "")

        if not chunk_text or not isinstance(chunk_text, str):
            logger.warning(
                f"[build_rag_context] Empty or invalid chunk_text in document {i}"
            )
            continue

        # Limit chunk size to prevent token overflow
        max_chunk_length = 500
        truncated_content = chunk_text[:max_chunk_length]
        if len(chunk_text) > max_chunk_length:
            truncated_content += "..."

        context_parts.append(f"Document {valid_docs + 1}:")
        context_parts.append(f"File name: {file_name}")
        context_parts.append(f"Content: {truncated_content}")
        context_parts.append("")  # Empty line for separation

        valid_docs += 1
        total_content_length += len(truncated_content)

        # Safety limit to prevent excessive context length
        if total_content_length > 4000:  # Conservative limit
            logger.info(
                f"[build_rag_context] Context length limit reached, stopping at {valid_docs} documents"
            )
            break

    if valid_docs == 0:
        logger.warning("[build_rag_context] No valid documents found")
        return ""

    final_context = "\n".join(context_parts)
    logger.info(
        f"[build_rag_context] Built context: {valid_docs} documents, {len(final_context)} characters"
    )

    return final_context


def handler(event, context):
    """
    Lambda handler for chat with Bedrock via boto3 with RAG support

    Expected event structure:
    {
        "arguments": {
            "messages": [{"role": "user|assistant", "text": "message", "timestamp": "..."}],
            "systemPrompt": "Optional system prompt",
            "modelId": "apac.anthropic.claude-sonnet-4-20250514-v1:0",
            "databaseIds": ["db1", "db2"] // Optional database IDs for RAG
        }
    }
    """

    try:
        logger.info(f"[ChatBedrock] Received event: {json.dumps(event, default=str)}")

        # Extract arguments from the event
        arguments = event.get("arguments", {})
        logger.info(f"[ChatBedrock] Arguments: {json.dumps(arguments, default=str)}")

        messages_data = arguments.get("messages", [])
        system_prompt = arguments.get("systemPrompt", "You are a helpful AI assistant.")
        model_id = arguments.get(
            "modelId", "apac.anthropic.claude-sonnet-4-20250514-v1:0"
        )
        database_ids = arguments.get("databaseIds", [])

        logger.info(
            f"[ChatBedrock] Parsed arguments - Messages count: "
            f"{len(messages_data) if isinstance(messages_data, list) else 'Not a list'}, "
            f"System prompt length: {len(system_prompt)}, Model ID: {model_id}, "
            f"Database IDs: {database_ids}"
        )

        # Log system prompt content for debugging (first 200 chars)
        logger.info(
            f"[ChatBedrock] System prompt content: "
            f"{system_prompt[:200]}{'...' if len(system_prompt) > 200 else ''}"
        )

        # Perform RAG search if databases are selected
        rag_context = ""
        logger.info(f"[ChatBedrock] RAG Debug - database_ids received: {database_ids}")
        logger.info(
            f"[ChatBedrock] RAG Debug - database_ids type: {type(database_ids)}"
        )
        logger.info(
            f"[ChatBedrock] RAG Debug - STORAGE_BUCKET_NAME: {STORAGE_BUCKET_NAME}"
        )

        if database_ids and len(database_ids) > 0:
            logger.info(
                f"[ChatBedrock] ✅ RAG ENABLED - Performing search across {len(database_ids)} databases: {database_ids}"
            )

            # Get the last user message for RAG search
            last_user_message = None
            for msg in reversed(messages_data):
                if msg and isinstance(msg, dict) and msg.get("role") == "user":
                    last_user_message = msg.get("text", "")
                    break

            if last_user_message:
                logger.info(
                    f"[ChatBedrock] 🔍 RAG query text: '{last_user_message[:200]}{'...' if len(last_user_message) > 200 else ''}'"
                )
                logger.info(
                    f"[ChatBedrock] 🔍 Starting document search in databases: {database_ids}"
                )

                try:
                    relevant_docs = search_relevant_documents(
                        last_user_message, database_ids, top_k=3
                    )
                    logger.info(
                        f"[ChatBedrock] 📄 Document search completed, found {len(relevant_docs)} documents"
                    )

                    if relevant_docs:
                        logger.info(
                            f"[ChatBedrock] 📋 Building RAG context from {len(relevant_docs)} documents..."
                        )
                        rag_context = build_rag_context(relevant_docs)
                        logger.info(
                            f"[ChatBedrock] ✅ RAG context built successfully ({len(rag_context)} characters)"
                        )
                        logger.info(
                            f"[ChatBedrock] 📋 RAG context preview: {rag_context[:300]}{'...' if len(rag_context) > 300 else ''}"
                        )
                    else:
                        logger.warning(
                            "[ChatBedrock] ⚠️ No relevant documents found in search"
                        )
                except Exception as e:
                    logger.error(
                        f"[ChatBedrock] ❌ Error during RAG document search: {str(e)}"
                    )
                    logger.error(
                        f"[ChatBedrock] ❌ RAG search failed, continuing without context"
                    )
            else:
                logger.warning("[ChatBedrock] ⚠️ No user message found for RAG search")
        else:
            logger.info("[ChatBedrock] ℹ️ No databases selected, skipping RAG search")
            if not database_ids:
                logger.info("[ChatBedrock] ℹ️ database_ids is None or empty")
            elif len(database_ids) == 0:
                logger.info("[ChatBedrock] ℹ️ database_ids is empty list")

        if (
            not messages_data
            or not isinstance(messages_data, list)
            or len(messages_data) == 0
        ):
            raise ValueError(
                "Messages array is required and must contain at least one message"
            )

        # Combine system prompt with RAG context
        enhanced_system_prompt = system_prompt
        logger.info(
            f"[ChatBedrock] 📝 Original system prompt length: {len(system_prompt)}"
        )
        logger.info(f"[ChatBedrock] 📋 RAG context length: {len(rag_context)}")

        if rag_context:
            enhanced_system_prompt = f"{system_prompt}\n\n{rag_context}"
            logger.info(
                f"[ChatBedrock] ✅ Enhanced system prompt with RAG context (total: {len(enhanced_system_prompt)} characters)"
            )
            logger.info(
                f"[ChatBedrock] 📋 Enhanced prompt preview: {enhanced_system_prompt[:500]}{'...' if len(enhanced_system_prompt) > 500 else ''}"
            )
        else:
            logger.info(
                "[ChatBedrock] ℹ️ No RAG context available, using original system prompt only"
            )

        # Build conversation messages for Bedrock API
        # Keep last 10 messages for context to avoid token limits
        recent_messages = (
            messages_data[-10:] if len(messages_data) > 10 else messages_data
        )
        logger.info(f"[ChatBedrock] Processing {len(recent_messages)} recent messages")

        # Convert messages to Bedrock format
        bedrock_messages = []
        processed_messages = 0

        for i, msg in enumerate(recent_messages):
            logger.info(
                f"[ChatBedrock] Processing message {i + 1}: {json.dumps(msg, default=str)}"
            )
            if msg and isinstance(msg, dict):
                role = msg.get("role")
                content = msg.get("text", "")
                logger.info(
                    f"[ChatBedrock] Message {i + 1} - Role: {role}, Content length: {len(content) if content else 0}"
                )

                if role == "user" and content:
                    bedrock_messages.append(
                        {"role": "user", "content": [{"type": "text", "text": content}]}
                    )
                    processed_messages += 1
                    logger.info(f"[ChatBedrock] Added user message {i + 1}")
                elif role == "assistant" and content:
                    bedrock_messages.append(
                        {
                            "role": "assistant",
                            "content": [{"type": "text", "text": content}],
                        }
                    )
                    processed_messages += 1
                    logger.info(f"[ChatBedrock] Added assistant message {i + 1}")
                else:
                    logger.warning(
                        f"[ChatBedrock] Skipped message {i + 1} - invalid role '{role}' or empty content"
                    )
            else:
                logger.warning(
                    f"[ChatBedrock] Skipped message {i + 1} - not a valid dict: {type(msg)}"
                )

        logger.info(
            f"[ChatBedrock] Successfully processed {processed_messages} messages out of {len(recent_messages)}"
        )

        # Ensure we have at least one message to process
        if len(bedrock_messages) == 0:
            raise ValueError("No valid messages found to process after filtering")

        logger.info(
            f"[ChatBedrock] Total messages for Bedrock: {len(bedrock_messages)}"
        )

        # Prepare the request body for Bedrock
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4096,
            "temperature": 0.7,
            "top_p": 0.9,
            "messages": bedrock_messages,
        }

        # Add system prompt if provided
        if enhanced_system_prompt and enhanced_system_prompt.strip():
            request_body["system"] = enhanced_system_prompt
            logger.info(
                f"[ChatBedrock] Added system prompt with {len(enhanced_system_prompt)} characters"
            )

        # Generate response using Bedrock
        logger.info("Invoking Bedrock model...")
        try:
            response = bedrock_client.invoke_model(
                modelId=model_id,
                body=json.dumps(request_body),
                contentType="application/json",
                accept="application/json",
            )

            # Parse the response
            response_body = json.loads(response["body"].read())

            # Extract the generated text
            if "content" in response_body and len(response_body["content"]) > 0:
                generated_text = response_body["content"][0]["text"]
            else:
                raise ValueError("No content found in Bedrock response")

            logger.info("Successfully generated response")

        except Exception as e:
            logger.error(f"Error invoking Bedrock model: {str(e)}")
            raise

        # For Amplify GraphQL, return the data directly (not HTTP response format)
        return {
            "response": generated_text,
            "modelId": model_id,
            "usage": {"model": model_id, "timestamp": context.aws_request_id},
        }

    except Exception as e:
        logger.error(f"Error in chat function: {str(e)}")
        # For GraphQL, raise the exception so it can be handled properly
        raise Exception(f"Chat function error: {str(e)}")
