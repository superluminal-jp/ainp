import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { chatBedrockFunction } from "./functions/chat-bedrock/resource";
import { embedFilesFunction } from "./functions/embed-files/resource";

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  chatBedrockFunction,
  embedFilesFunction,
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
