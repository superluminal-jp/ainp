import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { chatBedrockFunction } from "./functions/chat-bedrock/resource";
import { embedFilesFunction } from "./functions/embed-files/resource";
import { executeToolFunction } from "./functions/execute-tool/resource";

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  chatBedrockFunction,
  embedFilesFunction,
  executeToolFunction,
});

// Grant the embed-files function access to the storage bucket
backend.storage.resources.bucket.grantReadWrite(
  backend.embedFilesFunction.resources.lambda
);

// Grant the chat-bedrock function access to the storage bucket (read-only for FAISS indexes)
backend.storage.resources.bucket.grantRead(
  backend.chatBedrockFunction.resources.lambda
);

// Grant the execute-tool function access to the storage bucket (read-only for tool code)
backend.storage.resources.bucket.grantRead(
  backend.executeToolFunction.resources.lambda
);

// Add bucket name to embed-files function environment
backend.embedFilesFunction.addEnvironment(
  "STORAGE_BUCKET_NAME",
  backend.storage.resources.bucket.bucketName
);

// Add bucket name to chat-bedrock function environment
backend.chatBedrockFunction.addEnvironment(
  "STORAGE_BUCKET_NAME",
  backend.storage.resources.bucket.bucketName
);

// Add execute-tool function name to chat-bedrock function environment
backend.chatBedrockFunction.addEnvironment(
  "EXECUTE_TOOL_FUNCTION_NAME",
  backend.executeToolFunction.resources.lambda.functionName
);

// Add bucket name to execute-tool function environment
backend.executeToolFunction.addEnvironment(
  "STORAGE_BUCKET_NAME",
  backend.storage.resources.bucket.bucketName
);

// Grant chat-bedrock function permission to invoke execute-tool function
backend.executeToolFunction.resources.lambda.grantInvoke(
  backend.chatBedrockFunction.resources.lambda
);
