#!/usr/bin/env python3
"""
Deployment script to configure Bedrock logging after Amplify deployment.
This script should be run after the initial deployment to enable logging.
"""

import json
import logging
import sys
from index import handler

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def deploy_bedrock_logging():
    """
    Deploy Bedrock logging configuration.
    This function simulates a Lambda event to configure the logging.
    """
    try:
        # Create a mock event for the handler
        event = {"requestContext": {"requestId": "deployment-script"}, "arguments": {}}

        # Mock context
        class MockContext:
            def __init__(self):
                self.function_name = "configure-bedrock-logging"
                self.function_version = "1"
                self.aws_request_id = "deployment-script"

        context = MockContext()

        # Call the handler
        result = handler(event, context)

        if result.get("statusCode") == 200:
            logger.info("✅ Bedrock logging configured successfully!")
            response_body = json.loads(result.get("body", "{}"))
            logger.info(f"Configuration: {response_body.get('configuration', {})}")
            return True
        else:
            logger.error(f"❌ Failed to configure Bedrock logging: {result}")
            return False

    except Exception as e:
        logger.error(f"❌ Error during deployment: {str(e)}")
        return False


if __name__ == "__main__":
    logger.info("🚀 Starting Bedrock logging configuration deployment...")

    success = deploy_bedrock_logging()

    if success:
        logger.info("🎉 Deployment completed successfully!")
        sys.exit(0)
    else:
        logger.error("💥 Deployment failed!")
        sys.exit(1)
