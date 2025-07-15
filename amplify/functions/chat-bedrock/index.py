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


logger = logging.getLogger()
logger.setLevel(logging.INFO)

bedrock_client = boto3.client("bedrock-runtime")
s3_client = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

STORAGE_BUCKET_NAME = os.environ.get("STORAGE_BUCKET_NAME")

FAISS_INDEX_PREFIX = os.environ.get("FAISS_INDEX_PREFIX", "faiss-indexes")
EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v1"
EMBEDDING_DIMENSION = 1536

# Default usage limits (can be made configurable)
DEFAULT_DAILY_TOKEN_LIMIT = int(os.environ.get("DAILY_TOKEN_LIMIT", "50000"))
DEFAULT_DAILY_REQUEST_LIMIT = int(os.environ.get("DAILY_REQUEST_LIMIT", "100"))

# Global variables for table names and instances
USER_USAGE_TABLE_NAME = os.environ.get("USER_USAGE_TABLE_NAME")
user_usage_table = None

# Initialize table on module load
if USER_USAGE_TABLE_NAME:
    try:
        user_usage_table = dynamodb.Table(USER_USAGE_TABLE_NAME)  # type: ignore
        logger.info(f"Initialized user_usage_table: {USER_USAGE_TABLE_NAME}")
    except Exception as e:
        logger.error(f"Failed to initialize user_usage_table: {str(e)}")
else:
    logger.warning("USER_USAGE_TABLE_NAME environment variable not set")


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

    index_file_path = metadata_file_path = None

    try:
        with tempfile.NamedTemporaryFile(suffix=".faiss", delete=False) as f:
            index_file_path = f.name
            s3_client.download_file(STORAGE_BUCKET_NAME, index_key, index_file_path)

        index = faiss.read_index(index_file_path)

        with tempfile.NamedTemporaryFile(suffix=".pkl", delete=False) as f:
            metadata_file_path = f.name
            s3_client.download_file(
                STORAGE_BUCKET_NAME, metadata_key, metadata_file_path
            )

        with open(metadata_file_path, "rb") as f:
            metadata = pickle.load(f)

        if isinstance(metadata, list) and index:
            return index, metadata
        return None

    except Exception:
        return None
    finally:
        for path in [index_file_path, metadata_file_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except OSError:
                    pass


def search_relevant_documents(
    query_text: str, database_ids: List[str], top_k: int = 5
) -> List[Dict]:
    """Search for relevant documents using semantic similarity."""
    if not query_text or not database_ids or top_k <= 0 or not STORAGE_BUCKET_NAME:
        return []

    try:
        query_embeddings = get_embeddings([query_text.strip()])
        if not query_embeddings or len(query_embeddings[0]) != EMBEDDING_DIMENSION:
            return []

        query_vector = np.array([query_embeddings[0]], dtype=np.float32)
        all_results = []

        for database_id in database_ids:
            if not database_id or not isinstance(database_id, str):
                continue

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
    total_length = processed_docs = 0
    max_total_length = 4000
    max_chunk_length = 500

    for i, doc in enumerate(relevant_docs, 1):
        if not isinstance(doc, dict):
            continue

        chunk_text = doc.get("chunk_text", "")
        if not chunk_text or not isinstance(chunk_text, str):
            continue

        truncated_content = chunk_text[:max_chunk_length]
        if len(chunk_text) > max_chunk_length:
            truncated_content += "..."

        if total_length + len(truncated_content) > max_total_length:
            break

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

        total_length += len(truncated_content)
        processed_docs += 1

    return "\n".join(filter(None, context_parts)) if processed_docs > 0 else ""


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
        # Create composite ID from userId and period
        composite_id = f"{user_id}#{period}"

        response = user_usage_table.get_item(Key={"id": composite_id})

        if "Item" in response:
            item = response["Item"]
            return {
                "totalTokens": item.get("totalTokens", 0),
                "totalRequests": item.get("totalRequests", 0),
                "inputTokens": item.get("inputTokens", 0),
                "outputTokens": item.get("outputTokens", 0),
                "tokenLimit": item.get("tokenLimit", DEFAULT_DAILY_TOKEN_LIMIT),
                "requestLimit": item.get("requestLimit", DEFAULT_DAILY_REQUEST_LIMIT),
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

        # Create composite ID from userId and period
        composite_id = f"{user_id}#{period}"

        # Extract usage data
        input_tokens = usage_data.get("inputTokens", 0)
        output_tokens = usage_data.get("outputTokens", 0)
        total_tokens = usage_data.get("totalTokens", input_tokens + output_tokens)

        # Update or create usage record
        response = user_usage_table.update_item(
            Key={"id": composite_id},
            UpdateExpression="""
                ADD totalTokens :total_tokens,
                    totalRequests :one,
                    inputTokens :input_tokens,
                    outputTokens :output_tokens
                SET userId = :user_id,
                    period = :period,
                    lastUpdated = :last_updated,
                    updatedAt = :updated_at
            """,
            ExpressionAttributeValues={
                ":total_tokens": total_tokens,
                ":one": 1,
                ":input_tokens": input_tokens,
                ":output_tokens": output_tokens,
                ":user_id": user_id,
                ":period": period,
                ":last_updated": current_time,
                ":updated_at": current_time,
            },
            ReturnValues="ALL_NEW",
        )

        logger.info(f"Updated usage for user {user_id}: {response['Attributes']}")
        return True

    except Exception as e:
        logger.error(f"Error updating user usage for {user_id}: {str(e)}")
        return False


def handler(event, context):
    """AWS Lambda handler for chat with Bedrock Converse API and RAG support."""
    try:
        # Extract user ID for usage tracking
        user_id = get_user_id_from_event(event)
        if not user_id:
            user_id = "anonymous"

        # Check user usage limits before processing
        within_limits, usage_info = check_user_usage_limits(user_id)
        if not within_limits:
            return {
                "response": f"I apologize, but you have exceeded your usage limits. {usage_info.get('reason', '')}",
                "modelId": "apac.anthropic.claude-sonnet-4-20250514-v1:0",
                "usage": {},
                "usageLimitExceeded": True,
                "usageInfo": usage_info,
            }

        arguments = event.get("arguments", {})
        if not isinstance(arguments, dict):
            raise ValueError("Event must contain 'arguments' dictionary")

        messages_data = arguments.get("messages", [])
        system_prompt = arguments.get("systemPrompt", "You are a helpful AI assistant.")
        model_id = arguments.get(
            "modelId", "apac.anthropic.claude-sonnet-4-20250514-v1:0"
        )
        database_ids = arguments.get("databaseIds", [])

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
        max_messages = 10
        recent_messages = (
            messages_data[-max_messages:]
            if len(messages_data) > max_messages
            else messages_data
        )

        bedrock_messages = []
        for msg in recent_messages:
            if not msg or not isinstance(msg, dict):
                continue

            role = msg.get("role")
            content = msg.get("text", "")

            if role in ["user", "assistant"] and content:
                bedrock_messages.append({"role": role, "content": [{"text": content}]})

        if not bedrock_messages:
            raise ValueError("No valid messages found after filtering")

        # Prepare Converse API parameters
        converse_params = {
            "modelId": model_id,
            "messages": bedrock_messages,
            "inferenceConfig": {
                "maxTokens": 4096,
                "temperature": 0.7,
                "topP": 0.9,
            },
        }

        if enhanced_system_prompt.strip():
            converse_params["system"] = [{"text": enhanced_system_prompt}]

        # Generate response
        response = bedrock_client.converse(**converse_params)

        # Extract response text
        response_text = ""
        output_message = response.get("output", {}).get("message", {})
        content = output_message.get("content", [])

        for content_block in content:
            if "text" in content_block:
                response_text += content_block["text"]

        if not response_text:
            response_text = "I apologize, but I couldn't generate a response."

        # Get usage data from response
        usage = response.get("usage", {})

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

        # Include usage information in response
        response_data = {
            "response": response_text,
            "modelId": model_id,
            "usage": usage,
            "usageLimitExceeded": False,
            "usageInfo": updated_usage_info,
        }

        return response_data

    except ValueError as e:
        return {
            "response": f"I apologize, but there was a validation error: {str(e)}",
            "modelId": locals().get(
                "model_id", "apac.anthropic.claude-sonnet-4-20250514-v1:0"
            ),
            "usage": {},
        }

    except Exception as e:
        logger.error(f"Handler error: {str(e)}")
        return {
            "response": "I apologize, but I encountered an error while processing your request.",
            "modelId": locals().get(
                "model_id", "apac.anthropic.claude-sonnet-4-20250514-v1:0"
            ),
            "usage": {},
        }
