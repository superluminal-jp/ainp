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

# Default usage limits (can be made configurable)
DEFAULT_DAILY_TOKEN_LIMIT = int(os.environ.get("DAILY_TOKEN_LIMIT", "50000"))
DEFAULT_DAILY_REQUEST_LIMIT = int(os.environ.get("DAILY_REQUEST_LIMIT", "100"))

# Global variables for table names and instances
USER_USAGE_TABLE_NAME = None
user_usage_table = None


def get_table_names():
    """Discover DynamoDB table names using multiple strategies."""
    global USER_USAGE_TABLE_NAME, user_usage_table

    logger.info("Starting table name discovery...")
    logger.info(f"Current value: USER_USAGE_TABLE_NAME={USER_USAGE_TABLE_NAME}")

    # Log all environment variables related to Amplify for debugging
    logger.info("Available environment variables:")
    for key, value in sorted(os.environ.items()):
        if any(
            pattern in key.lower()
            for pattern in ["amplify", "table", "user", "tool", "dynamo"]
        ):
            logger.info(f"  {key} = {value}")

    if USER_USAGE_TABLE_NAME:
        logger.info("Table name already discovered, skipping discovery")
        return  # Already discovered

    # Strategy 1: Try common environment variable patterns
    env_patterns = [
        "USER_USAGE_TABLE_NAME",
        "AMPLIFY_USERUSAGE_NAME",
        "AMPLIFY_USERUSAGE_TABLE_NAME",
        "AMPLIFY_USERUSAGE_TABLENAME",
    ]

    logger.info("Strategy 1: Trying common environment variable patterns...")
    for pattern in env_patterns:
        usage_name = os.environ.get(pattern)
        if usage_name and not USER_USAGE_TABLE_NAME:
            USER_USAGE_TABLE_NAME = usage_name
            logger.info(
                f"Found USER_USAGE_TABLE_NAME: {USER_USAGE_TABLE_NAME} from {pattern}"
            )
            break

    # Strategy 2: Search all environment variables for table-like names
    if not USER_USAGE_TABLE_NAME:
        logger.info(
            "Strategy 2: Searching all environment variables for table names..."
        )
        for key, value in os.environ.items():
            if any(pattern in key.lower() for pattern in ["userusage", "user_usage"]):
                USER_USAGE_TABLE_NAME = value
                logger.info(
                    f"Found USER_USAGE_TABLE_NAME: {USER_USAGE_TABLE_NAME} from {key}"
                )
                break

    # Strategy 3: Use DynamoDB client to list tables and find matches
    if not USER_USAGE_TABLE_NAME:
        try:
            logger.info(
                "Strategy 3: Attempting to discover table names by listing DynamoDB tables..."
            )
            dynamodb_client = boto3.client("dynamodb")
            response = dynamodb_client.list_tables()
            table_names = response.get("TableNames", [])
            logger.info(f"Found {len(table_names)} DynamoDB tables")

            for table_name in table_names:
                if any(
                    pattern in table_name.lower()
                    for pattern in ["userusage", "user_usage"]
                ):
                    USER_USAGE_TABLE_NAME = table_name
                    logger.info(
                        f"Discovered USER_USAGE_TABLE_NAME: {USER_USAGE_TABLE_NAME}"
                    )
                    break

        except Exception as e:
            logger.warning(
                f"Failed to discover table names via DynamoDB client: {str(e)}"
            )

    # Initialize table instance
    logger.info("Initializing table instance...")
    try:
        if USER_USAGE_TABLE_NAME:
            user_usage_table = dynamodb.Table(USER_USAGE_TABLE_NAME)  # type: ignore
            logger.info(f"Initialized user_usage_table with {USER_USAGE_TABLE_NAME}")
        else:
            logger.error("Could not find USER_USAGE_TABLE_NAME")

    except Exception as e:
        logger.error(f"Failed to initialize DynamoDB table: {str(e)}")
        import traceback

        logger.error(f"Traceback: {traceback.format_exc()}")

    # Log final status
    logger.info(
        f"Table discovery complete: USER_USAGE_TABLE_NAME={USER_USAGE_TABLE_NAME}"
    )


# Initialize table names on module load
get_table_names()


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


def check_user_usage_limits(user_id: str) -> Tuple[bool, Dict[str, Any]]:
    """Check if user has exceeded their usage limits."""
    global user_usage_table, USER_USAGE_TABLE_NAME

    logger.info(f"Checking usage limits for user_id: {user_id}")
    logger.info(f"Current USER_USAGE_TABLE_NAME: {USER_USAGE_TABLE_NAME}")

    # Try to discover table names if not already done
    if not USER_USAGE_TABLE_NAME or not user_usage_table:
        logger.info("Re-attempting table discovery for usage limits check...")
        get_table_names()

    if not USER_USAGE_TABLE_NAME:
        logger.warning("Usage tracking not configured - allowing request")
        return True, {"reason": "Usage tracking not configured"}

    if not user_id:
        logger.warning("No user_id provided - allowing request")
        return True, {"reason": "No user_id provided"}

    if not user_usage_table:
        logger.warning("Could not initialize user usage table - allowing request")
        return True, {"reason": "Usage tracking table not available"}

    try:
        current_period = get_current_period()
        logger.info(f"Checking usage for period: {current_period}")

        # Query for user's usage in current period
        response = user_usage_table.scan(
            FilterExpression=Attr("userId").eq(user_id)
            & Attr("period").eq(current_period)
        )

        usage_items = response.get("Items", [])
        logger.info(
            f"Found {len(usage_items)} usage records for user {user_id} in period {current_period}"
        )

        if not usage_items:
            # No usage record exists yet, user is within limits
            logger.info("No existing usage records found - user is within limits")
            return True, {"newUser": True}

        # Calculate total usage across all records for this user/period
        total_tokens = sum(item.get("totalTokens", 0) for item in usage_items)
        total_requests = sum(item.get("requestCount", 0) for item in usage_items)

        logger.info(f"Current usage: tokens={total_tokens}, requests={total_requests}")

        usage_info = {
            "totalTokens": total_tokens,
            "totalRequests": total_requests,
            "tokenLimit": DEFAULT_DAILY_TOKEN_LIMIT,
            "requestLimit": DEFAULT_DAILY_REQUEST_LIMIT,
            "period": current_period,
        }

        # Check token limit
        if total_tokens >= DEFAULT_DAILY_TOKEN_LIMIT:
            logger.warning(
                f"Token limit exceeded: {total_tokens}/{DEFAULT_DAILY_TOKEN_LIMIT}"
            )
            return False, {
                **usage_info,
                "reason": f"Daily token limit exceeded ({total_tokens}/{DEFAULT_DAILY_TOKEN_LIMIT})",
            }

        # Check request limit
        if total_requests >= DEFAULT_DAILY_REQUEST_LIMIT:
            logger.warning(
                f"Request limit exceeded: {total_requests}/{DEFAULT_DAILY_REQUEST_LIMIT}"
            )
            return False, {
                **usage_info,
                "reason": f"Daily request limit exceeded ({total_requests}/{DEFAULT_DAILY_REQUEST_LIMIT})",
            }

        logger.info("User is within usage limits")
        return True, usage_info

    except Exception as e:
        logger.error(f"Error checking user usage limits: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback

        logger.error(f"Traceback: {traceback.format_exc()}")
        # If there's an error checking limits, allow the request to proceed
        return True, {"reason": f"Error checking limits: {str(e)}"}


def update_user_usage(user_id: str, usage_data: Dict[str, int]) -> bool:
    """Update user's token usage in DynamoDB."""
    global user_usage_table, USER_USAGE_TABLE_NAME

    logger.info(f"Starting update_user_usage for user_id: {user_id}")
    logger.info(f"Usage data: {usage_data}")
    logger.info(f"Current USER_USAGE_TABLE_NAME: {USER_USAGE_TABLE_NAME}")

    # Try to discover table names if not already done
    if not USER_USAGE_TABLE_NAME or not user_usage_table:
        logger.info("Re-attempting table discovery for usage update...")
        get_table_names()

    if not USER_USAGE_TABLE_NAME:
        logger.error("USER_USAGE_TABLE_NAME is not set - usage tracking disabled")
        return False

    if not user_id:
        logger.error("user_id is empty - cannot update usage")
        return False

    if not user_usage_table:
        logger.error("Could not initialize user usage table - cannot update usage")
        return False

    try:
        current_period = get_current_period()
        current_time = datetime.now()

        # Create a unique ID for this usage record
        usage_id = f"{user_id}#{current_period}#{int(current_time.timestamp())}"

        # Extract usage data
        input_tokens = usage_data.get("inputTokens", 0)
        output_tokens = usage_data.get("outputTokens", 0)
        total_tokens = usage_data.get("totalTokens", input_tokens + output_tokens)

        logger.info(
            f"Attempting to save usage: period={current_period}, totalTokens={total_tokens}"
        )

        # Try to find existing record for this user/period
        logger.info(
            f"Scanning for existing records for user {user_id} in period {current_period}"
        )
        response = user_usage_table.scan(
            FilterExpression=Attr("userId").eq(user_id)
            & Attr("period").eq(current_period)
        )

        existing_items = response.get("Items", [])
        logger.info(
            f"Found {len(existing_items)} existing usage records for user {user_id} in period {current_period}"
        )

        if existing_items:
            # Update the most recent existing record
            latest_item = max(existing_items, key=lambda x: x.get("updatedAt", ""))
            item_id = latest_item["id"]

            logger.info(f"Updating existing record with id: {item_id}")

            # Update existing record
            update_expression = (
                "ADD totalTokens :total, inputTokens :input, outputTokens :output, requestCount :req "
                "SET lastRequestAt = :last, updatedAt = :updated"
            )

            update_result = user_usage_table.update_item(
                Key={"id": item_id},
                UpdateExpression=update_expression,
                ExpressionAttributeValues={
                    ":total": total_tokens,
                    ":input": input_tokens,
                    ":output": output_tokens,
                    ":req": 1,
                    ":last": current_time,
                    ":updated": current_time,
                },
                ReturnValues="ALL_NEW",
            )

            logger.info(
                f"Successfully updated existing record: {update_result.get('Attributes', {})}"
            )
        else:
            # Create new record
            logger.info(f"Creating new usage record with id: {usage_id}")

            new_item = {
                "id": usage_id,
                "userId": user_id,
                "period": current_period,
                "totalTokens": total_tokens,
                "inputTokens": input_tokens,
                "outputTokens": output_tokens,
                "requestCount": 1,
                "lastRequestAt": current_time,
                "createdAt": current_time,
                "updatedAt": current_time,
                "owner": user_id,  # Set owner for Amplify authorization
            }

            logger.info(f"Putting new item: {new_item}")

            put_result = user_usage_table.put_item(Item=new_item)

            logger.info(f"Successfully created new record: {put_result}")

        logger.info("Usage update completed successfully")
        return True

    except Exception as e:
        logger.error(f"Error updating user usage: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback

        logger.error(f"Traceback: {traceback.format_exc()}")
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

        # Include usage information in response
        response_data = {
            "response": response_text,
            "modelId": model_id,
            "usage": usage,
            "usageLimitExceeded": False,
        }

        # Add current usage info if available
        if usage_info and not usage_info.get("reason"):
            response_data["usageInfo"] = {
                "currentTokens": usage_info.get("totalTokens", 0)
                + usage.get("totalTokens", 0),
                "currentRequests": usage_info.get("totalRequests", 0) + 1,
                "tokenLimit": usage_info.get("tokenLimit", DEFAULT_DAILY_TOKEN_LIMIT),
                "requestLimit": usage_info.get(
                    "requestLimit", DEFAULT_DAILY_REQUEST_LIMIT
                ),
                "period": usage_info.get("period", get_current_period()),
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
