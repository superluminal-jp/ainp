import boto3
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, Any
import gzip

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize AWS clients
s3_client = boto3.client("s3")
cloudwatch_logs_client = boto3.client("logs")

# Default usage limits
DEFAULT_DAILY_TOKEN_LIMIT = 50000
DEFAULT_DAILY_REQUEST_LIMIT = 100


def get_current_period() -> str:
    """Get current period string for daily limits (YYYY-MM-DD format)."""
    return datetime.now().strftime("%Y-%m-%d")


def get_user_id_from_event(event: Dict[str, Any]) -> str:
    """Extract user ID from the event."""
    try:
        # Try to get user ID from identity context
        request_context = event.get("requestContext", {})
        identity = request_context.get("identity", {})
        user_id = identity.get("cognitoIdentityId") or identity.get("sub")

        if not user_id:
            # Try to get from arguments
            arguments = event.get("arguments", {})
            user_id = arguments.get("userId")

        return user_id or "anonymous"
    except Exception as e:
        logger.error(f"Error extracting user ID: {str(e)}")
        return "anonymous"


def query_cloudwatch_logs(
    user_id: str, start_time: datetime, end_time: datetime
) -> Dict[str, Any]:
    """
    Query CloudWatch logs for user usage data.
    """
    try:
        log_group_name = os.environ.get("BEDROCK_LOG_GROUP_NAME")
        if not log_group_name:
            raise ValueError("BEDROCK_LOG_GROUP_NAME environment variable not set")

        # CloudWatch Logs Insights query to get usage for specific user
        query = f"""
        fields @timestamp, @message
        | filter @message like /{user_id}/
        | stats count() as requestCount, sum(usage.totalTokens) as totalTokens, 
                sum(usage.inputTokens) as inputTokens, sum(usage.outputTokens) as outputTokens
        | limit 1000
        """

        response = cloudwatch_logs_client.start_query(
            logGroupName=log_group_name,
            startTime=int(start_time.timestamp()),
            endTime=int(end_time.timestamp()),
            queryString=query,
        )

        query_id = response["queryId"]

        # Wait for query to complete
        import time

        max_attempts = 10
        attempts = 0

        while attempts < max_attempts:
            query_result = cloudwatch_logs_client.get_query_results(queryId=query_id)
            status = query_result["status"]

            if status == "Complete":
                results = query_result.get("results", [])
                if results:
                    result = results[0]
                    usage_data = {}
                    for field in result:
                        field_name = field["field"]
                        field_value = field["value"]
                        if field_name in [
                            "requestCount",
                            "totalTokens",
                            "inputTokens",
                            "outputTokens",
                        ]:
                            usage_data[field_name] = (
                                int(float(field_value)) if field_value != "null" else 0
                            )
                    return usage_data
                break
            elif status == "Failed":
                logger.error(f"CloudWatch query failed: {query_result}")
                break

            time.sleep(1)
            attempts += 1

        return {
            "requestCount": 0,
            "totalTokens": 0,
            "inputTokens": 0,
            "outputTokens": 0,
        }

    except Exception as e:
        logger.error(f"Error querying CloudWatch logs: {str(e)}")
        return {
            "requestCount": 0,
            "totalTokens": 0,
            "inputTokens": 0,
            "outputTokens": 0,
        }


def query_s3_logs(
    user_id: str, start_time: datetime, end_time: datetime
) -> Dict[str, Any]:
    """
    Query S3 logs for user usage data.
    """
    try:
        bucket_name = os.environ.get("BEDROCK_LOGGING_BUCKET")
        if not bucket_name:
            raise ValueError("BEDROCK_LOGGING_BUCKET environment variable not set")

        # List objects in the bucket for the current date
        current_date = get_current_period()
        prefix = f"bedrock-logs/AWSLogs/{os.environ.get('AWS_ACCOUNT_ID', '')}/BedrockModelInvocationLogs/"

        response = s3_client.list_objects_v2(
            Bucket=bucket_name,
            Prefix=prefix,
            StartAfter=f"{prefix}{current_date}",
            EndBefore=f"{prefix}{current_date}Z",
        )

        usage_data = {
            "requestCount": 0,
            "totalTokens": 0,
            "inputTokens": 0,
            "outputTokens": 0,
        }

        for obj in response.get("Contents", []):
            try:
                # Get object from S3
                obj_response = s3_client.get_object(Bucket=bucket_name, Key=obj["Key"])

                # Handle gzipped files
                if obj["Key"].endswith(".gz"):
                    content = gzip.decompress(obj_response["Body"].read()).decode(
                        "utf-8"
                    )
                else:
                    content = obj_response["Body"].read().decode("utf-8")

                # Parse JSON lines
                for line in content.strip().split("\n"):
                    if line.strip():
                        try:
                            log_entry = json.loads(line)

                            # Check if this log entry is for the specified user
                            if user_id in str(log_entry):
                                usage = log_entry.get("usage", {})
                                usage_data["requestCount"] += 1
                                usage_data["totalTokens"] += usage.get("totalTokens", 0)
                                usage_data["inputTokens"] += usage.get("inputTokens", 0)
                                usage_data["outputTokens"] += usage.get(
                                    "outputTokens", 0
                                )
                        except json.JSONDecodeError:
                            continue
            except Exception as e:
                logger.error(f"Error processing S3 object {obj['Key']}: {str(e)}")
                continue

        return usage_data

    except Exception as e:
        logger.error(f"Error querying S3 logs: {str(e)}")
        return {
            "requestCount": 0,
            "totalTokens": 0,
            "inputTokens": 0,
            "outputTokens": 0,
        }


def handler(event, context) -> Dict[str, Any]:
    """
    AWS Lambda handler for querying Bedrock usage from S3 and CloudWatch logs.
    """
    try:
        # Extract user ID from event
        user_id = get_user_id_from_event(event)

        arguments = event.get("arguments", {})
        period = arguments.get("period", get_current_period())

        # Set up time range for the period
        start_time = datetime.strptime(period, "%Y-%m-%d")
        end_time = start_time + timedelta(days=1)

        # Query both CloudWatch and S3 logs
        cloudwatch_usage = query_cloudwatch_logs(user_id, start_time, end_time)
        s3_usage = query_s3_logs(user_id, start_time, end_time)

        # Combine results (prefer CloudWatch for real-time data, S3 for accuracy)
        combined_usage = {
            "requestCount": max(
                cloudwatch_usage.get("requestCount", 0), s3_usage.get("requestCount", 0)
            ),
            "totalTokens": max(
                cloudwatch_usage.get("totalTokens", 0), s3_usage.get("totalTokens", 0)
            ),
            "inputTokens": max(
                cloudwatch_usage.get("inputTokens", 0), s3_usage.get("inputTokens", 0)
            ),
            "outputTokens": max(
                cloudwatch_usage.get("outputTokens", 0), s3_usage.get("outputTokens", 0)
            ),
        }

        # Check if limits are exceeded
        token_limit_exceeded = (
            combined_usage["totalTokens"] >= DEFAULT_DAILY_TOKEN_LIMIT
        )
        request_limit_exceeded = (
            combined_usage["requestCount"] >= DEFAULT_DAILY_REQUEST_LIMIT
        )

        return {
            "currentTokens": combined_usage["totalTokens"],
            "currentRequests": combined_usage["requestCount"],
            "inputTokens": combined_usage["inputTokens"],
            "outputTokens": combined_usage["outputTokens"],
            "tokenLimit": DEFAULT_DAILY_TOKEN_LIMIT,
            "requestLimit": DEFAULT_DAILY_REQUEST_LIMIT,
            "period": period,
            "limitExceeded": token_limit_exceeded or request_limit_exceeded,
            "tokenLimitExceeded": token_limit_exceeded,
            "requestLimitExceeded": request_limit_exceeded,
        }

    except Exception as e:
        logger.error(f"Error in handler: {str(e)}")
        return {
            "currentTokens": 0,
            "currentRequests": 0,
            "inputTokens": 0,
            "outputTokens": 0,
            "tokenLimit": DEFAULT_DAILY_TOKEN_LIMIT,
            "requestLimit": DEFAULT_DAILY_REQUEST_LIMIT,
            "period": get_current_period(),
            "limitExceeded": False,
            "tokenLimitExceeded": False,
            "requestLimitExceeded": False,
            "error": str(e),
        }
