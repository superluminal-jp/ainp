import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { chatBedrockFunction } from "./functions/chat-bedrock/resource";
import { embedFilesFunction } from "./functions/embed-files/resource";
import { chatBedrockToolsFunction } from "./functions/chat-bedrock-tools/resource";
import { testToolFunction } from "./functions/test-tool/resource";

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  chatBedrockFunction,
  embedFilesFunction,
  chatBedrockToolsFunction,
  testToolFunction,
});

// Grant the embed-files function access to the storage bucket
backend.storage.resources.bucket.grantReadWrite(
  backend.embedFilesFunction.resources.lambda
);

// Grant the chat-bedrock function access to the storage bucket (read-only for FAISS indexes)
backend.storage.resources.bucket.grantRead(
  backend.chatBedrockFunction.resources.lambda
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

// Add userUsage table name to chat-bedrock function environment
backend.chatBedrockFunction.addEnvironment(
  "USER_USAGE_TABLE_NAME",
  backend.data.resources.tables.userUsage.tableName
);

// Grant the chat-bedrock-tools function access to the storage bucket (read-only for FAISS indexes)
backend.storage.resources.bucket.grantRead(
  backend.chatBedrockToolsFunction.resources.lambda
);

// Add bucket name to chat-bedrock-tools function environment
backend.chatBedrockToolsFunction.addEnvironment(
  "STORAGE_BUCKET_NAME",
  backend.storage.resources.bucket.bucketName
);

// Add userUsage table name to chat-bedrock-tools function environment
backend.chatBedrockToolsFunction.addEnvironment(
  "USER_USAGE_TABLE_NAME",
  backend.data.resources.tables.userUsage.tableName
);

// Add userUsage table name to test-tool function environment
backend.testToolFunction.addEnvironment(
  "USER_USAGE_TABLE_NAME",
  backend.data.resources.tables.userUsage.tableName
);
