import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage, bedrockLoggingStorage } from "./storage/resource";
import { createBedrockLoggingResources } from "./storage/bedrock-logging-resource";
import { chatBedrockFunction } from "./functions/chat-bedrock/resource";
import { embedFilesFunction } from "./functions/embed-files/resource";
import { chatBedrockToolsFunction } from "./functions/chat-bedrock-tools/resource";
import { testToolFunction } from "./functions/test-tool/resource";
import { configureBedrockLoggingFunction } from "./functions/configure-bedrock-logging/resource";
import { Effect, PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  bedrockLoggingStorage,
  chatBedrockFunction,
  embedFilesFunction,
  chatBedrockToolsFunction,
  testToolFunction,
  configureBedrockLoggingFunction,
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

// Grant the chat-bedrock-tools function access to the storage bucket (read-only for FAISS indexes)
backend.storage.resources.bucket.grantRead(
  backend.chatBedrockToolsFunction.resources.lambda
);

// Add bucket name to chat-bedrock-tools function environment
backend.chatBedrockToolsFunction.addEnvironment(
  "STORAGE_BUCKET_NAME",
  backend.storage.resources.bucket.bucketName
);

// Add toolSpecs table name to chat-bedrock-tools function environment
backend.chatBedrockToolsFunction.addEnvironment(
  "TOOLSPECS_TABLE_NAME",
  backend.data.resources.tables.toolSpecs.tableName
);

// Add userUsage table name to chat-bedrock-tools function environment
backend.chatBedrockToolsFunction.addEnvironment(
  "USER_USAGE_TABLE_NAME",
  backend.data.resources.tables.userUsage.tableName
);

// Add userUsage table name to chat-bedrock function environment
backend.chatBedrockFunction.addEnvironment(
  "USER_USAGE_TABLE_NAME",
  backend.data.resources.tables.userUsage.tableName
);

// Add toolSpecs table name to test-tool function environment
backend.testToolFunction.addEnvironment(
  "TOOLSPECS_TABLE_NAME",
  backend.data.resources.tables.toolSpecs.tableName
);

// Create Bedrock logging resources (CloudWatch and IAM)
const bedrockLoggingResources = createBedrockLoggingResources(backend.stack);

// Grant Bedrock access to the logging storage bucket
backend.bedrockLoggingStorage.resources.bucket.addToResourcePolicy(
  new PolicyStatement({
    sid: "AmazonBedrockLogsWrite",
    effect: Effect.ALLOW,
    principals: [new ServicePrincipal("bedrock.amazonaws.com")],
    actions: ["s3:PutObject"],
    resources: [
      `${backend.bedrockLoggingStorage.resources.bucket.bucketArn}/bedrock-logs/AWSLogs/${backend.stack.account}/BedrockModelInvocationLogs/*`,
    ],
    conditions: {
      StringEquals: {
        "aws:SourceAccount": backend.stack.account,
      },
      ArnLike: {
        "aws:SourceArn": `arn:aws:bedrock:${backend.stack.region}:${backend.stack.account}:*`,
      },
    },
  })
);

// Configure Bedrock logging function environment variables
backend.configureBedrockLoggingFunction.addEnvironment(
  "BEDROCK_LOGGING_BUCKET",
  backend.bedrockLoggingStorage.resources.bucket.bucketName
);
backend.configureBedrockLoggingFunction.addEnvironment(
  "BEDROCK_LOG_GROUP_NAME",
  bedrockLoggingResources.bedrockLogGroup.logGroupName
);
backend.configureBedrockLoggingFunction.addEnvironment(
  "BEDROCK_CLOUDWATCH_ROLE_ARN",
  bedrockLoggingResources.bedrockCloudWatchRole.roleArn
);

// Grant permissions for Bedrock logging configuration
backend.configureBedrockLoggingFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      "bedrock:PutModelInvocationLoggingConfiguration",
      "bedrock:GetModelInvocationLoggingConfiguration",
      "bedrock:DeleteModelInvocationLoggingConfiguration",
    ],
    resources: ["*"],
  })
);
