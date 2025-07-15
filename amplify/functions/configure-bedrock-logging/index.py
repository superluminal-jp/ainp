import boto3
import json
import logging
import os
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize AWS clients
bedrock_client = boto3.client(
    "bedrock", region_name=os.environ.get("AWS_REGION", "us-east-1")
)


def handler(event, context) -> Dict[str, Any]:
    """
    Configure Bedrock model invocation logging to S3 and CloudWatch.
    This function sets up logging configuration for Bedrock models.
    """
    try:
        # Get environment variables
        bucket_name = os.environ.get("BEDROCK_LOGGING_BUCKET")
        log_group_name = os.environ.get("BEDROCK_LOG_GROUP_NAME")
        cloudwatch_role_arn = os.environ.get("BEDROCK_CLOUDWATCH_ROLE_ARN")

        if not bucket_name or not log_group_name or not cloudwatch_role_arn:
            raise ValueError("Missing required environment variables")

        # Configure Bedrock logging
        logging_config = {
            "textDataDeliveryEnabled": True,
            "imageDataDeliveryEnabled": True,
            "embeddingDataDeliveryEnabled": True,
            "s3Config": {
                "bucketName": bucket_name,
                "keyPrefix": "bedrock-logs/",
            },
            "cloudWatchConfig": {
                "logGroupName": log_group_name,
                "roleArn": cloudwatch_role_arn,
            },
        }

        # Enable model invocation logging
        response = bedrock_client.put_model_invocation_logging_configuration(
            loggingConfig=logging_config
        )

        logger.info(f"Successfully configured Bedrock logging: {response}")

        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "message": "Bedrock logging configured successfully",
                    "configuration": logging_config,
                }
            ),
        }

    except Exception as e:
        logger.error(f"Error configuring Bedrock logging: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps(
                {
                    "error": str(e),
                    "message": "Failed to configure Bedrock logging",
                }
            ),
        }


def get_logging_configuration() -> Dict[str, Any]:
    """
    Get the current Bedrock logging configuration.
    """
    try:
        response = bedrock_client.get_model_invocation_logging_configuration()
        return response.get("loggingConfig", {})
    except Exception as e:
        logger.error(f"Error getting logging configuration: {str(e)}")
        return {}


def delete_logging_configuration() -> Dict[str, Any]:
    """
    Delete the current Bedrock logging configuration.
    """
    try:
        bedrock_client.delete_model_invocation_logging_configuration()
        logger.info("Successfully deleted Bedrock logging configuration")
        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "message": "Bedrock logging configuration deleted successfully",
                }
            ),
        }
    except Exception as e:
        logger.error(f"Error deleting logging configuration: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps(
                {
                    "error": str(e),
                    "message": "Failed to delete Bedrock logging configuration",
                }
            ),
        }
