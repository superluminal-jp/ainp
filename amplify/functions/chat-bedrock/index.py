import json
import logging
import boto3
from langchain_aws import ChatBedrock
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize Bedrock client
bedrock_client = boto3.client("bedrock-runtime")


def handler(event, context):
    """
    Lambda handler for chat with Bedrock via LangChain

    Expected event structure:
    {
        "arguments": {
            "messages": [{"role": "user|assistant", "text": "message", "timestamp": "..."}],
            "systemPrompt": "Optional system prompt",
            "modelId": "anthropic.claude-3-haiku-20240307-v1:0"
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
        model_id = arguments.get("modelId", "anthropic.claude-3-haiku-20240307-v1:0")

        logger.info(
            f"[ChatBedrock] Parsed arguments - Messages count: "
            f"{len(messages_data) if isinstance(messages_data, list) else 'Not a list'}, "
            f"System prompt length: {len(system_prompt)}, Model ID: {model_id}"
        )

        # Log system prompt content for debugging (first 200 chars)
        logger.info(
            f"[ChatBedrock] System prompt content: "
            f"{system_prompt[:200]}{'...' if len(system_prompt) > 200 else ''}"
        )

        if (
            not messages_data
            or not isinstance(messages_data, list)
            or len(messages_data) == 0
        ):
            raise ValueError(
                "Messages array is required and must contain at least one message"
            )

        # Initialize ChatBedrock with the specified model
        chat_model = ChatBedrock(
            client=bedrock_client,
            model_id=model_id,
            model_kwargs={
                "max_tokens": 4096,
                "temperature": 0.7,
                "top_p": 0.9,
            },
        )

        # Build conversation messages
        messages = []

        # Add system message if provided
        if system_prompt and system_prompt.strip():
            messages.append(SystemMessage(content=system_prompt))
            logger.info(
                f"[ChatBedrock] Added system message with {len(system_prompt)} characters"
            )
        else:
            logger.warning("[ChatBedrock] No system prompt provided or empty")

        # Process messages array with error handling
        # Keep last 10 messages for context to avoid token limits
        recent_messages = (
            messages_data[-10:] if len(messages_data) > 10 else messages_data
        )
        logger.info(f"[ChatBedrock] Processing {len(recent_messages)} recent messages")

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
                    messages.append(HumanMessage(content=content))
                    processed_messages += 1
                    logger.info(f"[ChatBedrock] Added user message {i + 1}")
                elif role == "assistant" and content:
                    messages.append(AIMessage(content=content))
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
        if len(messages) == 0:
            raise ValueError("No valid messages found to process after filtering")

        logger.info(f"[ChatBedrock] Total messages for LangChain: {len(messages)}")

        # Create prompt template
        prompt = ChatPromptTemplate.from_messages(messages)

        # Create chain with output parser
        chain = prompt | chat_model | StrOutputParser()

        # Generate response
        logger.info("Invoking Bedrock model...")
        response = chain.invoke({})

        logger.info("Successfully generated response")

        # For Amplify GraphQL, return the data directly (not HTTP response format)
        return {
            "response": response,
            "modelId": model_id,
            "usage": {"model": model_id, "timestamp": context.aws_request_id},
        }

    except Exception as e:
        logger.error(f"Error in chat function: {str(e)}")
        # For GraphQL, raise the exception so it can be handled properly
        raise Exception(f"Chat function error: {str(e)}")
