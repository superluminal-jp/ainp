import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { chatBedrockFunction } from "../functions/chat-bedrock/resource";
import { chatBedrockToolsFunction } from "../functions/chat-bedrock-tools/resource";
import { embedFilesFunction } from "../functions/embed-files/resource";
import { testToolFunction } from "../functions/test-tool/resource";

const schema = a.schema({
  // Message structure for chat
  ChatMessage: a.customType({
    role: a.string().required(), // "user" | "assistant"
    text: a.string().required(),
    timestamp: a.string().required(), // ISO datetime string
  }),

  // Response structure for chat
  ChatResponse: a.customType({
    response: a.string().required(),
    modelId: a.string(),
    usage: a.json(), // Usage statistics from the model
    usageLimitExceeded: a.boolean(), // Whether user has exceeded usage limits
    usageInfo: a.json(), // Current usage information and limits
  }),

  // Response structure for chat with tools
  ChatToolsResponse: a.customType({
    response: a.string().required(),
    modelId: a.string(),
    usage: a.json(), // Usage statistics from the model
    toolsUsed: a.integer(), // Number of tools used in the response
    structuredOutput: a.boolean(), // Whether structured output was used
    usageLimitExceeded: a.boolean(), // Whether user has exceeded usage limits
    usageInfo: a.json(), // Current usage information and limits
  }),

  // Response structure for embedding files
  EmbedResponse: a.customType({
    success: a.boolean().required(),
    message: a.string().required(),
    chunksProcessed: a.integer().required(),
    totalChunks: a.integer(),
    fileKey: a.string(),
    databaseId: a.string(),
    databaseFileId: a.string(),
  }),

  // Response structure for tool testing
  TestToolResponse: a.customType({
    success: a.boolean().required(),
    error: a.string(),
    error_type: a.string(),
    data: a.json(),
    tool_name: a.string(),
    tool_id: a.string(),
    execution_time_ms: a.integer(),
    request_id: a.string(),
    input_used: a.json(),
    timestamp: a.string(),
    validation_errors: a.json(),
    line_number: a.integer(),
  }),

  // Response structure for usage update
  UsageUpdateResponse: a.customType({
    success: a.boolean().required(),
    message: a.string().required(),
    currentTokens: a.integer(),
    currentRequests: a.integer(),
    limitExceeded: a.boolean(),
  }),

  systemPrompts: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      content: a.string().required(),
      isActive: a.boolean().default(true),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      owner: a.string(),
    })
    .authorization((allow) => [
      allow.owner().to(["read", "create", "update", "delete"]),
    ]),

  databases: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      description: a.string().required(),
      isActive: a.boolean().default(true),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      owner: a.string(),
    })
    .authorization((allow) => [
      allow.owner().to(["read", "create", "update", "delete"]),
    ]),

  databaseFiles: a
    .model({
      id: a.id().required(),
      databaseId: a.id().required(),
      fileName: a.string().required(),
      fileKey: a.string().required(),
      fileSize: a.integer().required(),
      fileType: a.string().required(),
      isActive: a.boolean().default(true),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      owner: a.string(),
    })
    .authorization((allow) => [
      allow.owner().to(["read", "create", "update", "delete"]),
    ]),

  templates: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      description: a.string().required(),
      systemPromptId: a.id().required(),
      databaseIds: a.json().required(),
      toolIds: a.json(), // Add tool IDs for templates
      isActive: a.boolean().default(true),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      owner: a.string(),
    })
    .authorization((allow) => [
      allow.owner().to(["read", "create", "update", "delete"]),
    ]),

  toolSpecs: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      description: a.string().required(),
      inputSchema: a.json().required(), // JSON schema for tool inputs
      executionCode: a.string(), // Python code for tool execution
      requirements: a.string(), // Pip requirements for tool execution
      isActive: a.boolean().default(true),
      category: a.string(), // Optional category for organizing tools
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      owner: a.string(),
    })
    .authorization((allow) => [
      allow.owner().to(["read", "create", "update", "delete"]),
    ]),

  // User token usage tracking table - stores daily usage statistics
  userUsage: a
    .model({
      id: a.id().required(),
      userId: a.string().required(),
      period: a.string().required(), // Format: YYYY-MM-DD
      totalTokens: a.integer().default(0),
      totalRequests: a.integer().default(0),
      inputTokens: a.integer().default(0),
      outputTokens: a.integer().default(0),
      tokenLimit: a.integer().default(50000),
      requestLimit: a.integer().default(100),
      lastUpdated: a.datetime(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner().to(["read", "create", "update", "delete"]),
    ]),

  // User token usage tracking - stored in DynamoDB with daily limits

  // Chat query using Bedrock function
  chatWithBedrock: a
    .query()
    .arguments({
      messages: a.ref("ChatMessage").array().required(),
      systemPrompt: a.string(),
      modelId: a.string(),
      databaseIds: a.string().array(), // Add database IDs for RAG
    })
    .returns(a.ref("ChatResponse"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(chatBedrockFunction)),

  // Chat query using Bedrock function with Tools support
  chatWithBedrockTools: a
    .query()
    .arguments({
      messages: a.ref("ChatMessage").array().required(),
      systemPrompt: a.string(),
      modelId: a.string(),
      databaseIds: a.string().array(), // Add database IDs for RAG
      useTools: a.boolean(), // Enable/disable tool functionality
      selectedToolIds: a.string().array(), // Add selected custom tool IDs
      responseFormat: a.json(), // Add structured output format
    })
    .returns(a.ref("ChatToolsResponse"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(chatBedrockToolsFunction)),

  // Test tool query
  testTool: a
    .query()
    .arguments({
      toolId: a.string().required(),
      toolInput: a.json(), // Input parameters for the tool (optional)
    })
    .returns(a.ref("TestToolResponse"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(testToolFunction)),

  // Embed files mutation
  embedFiles: a
    .mutation()
    .arguments({
      fileKey: a.string().required(),
      fileName: a.string().required(),
      databaseId: a.string().required(),
      databaseFileId: a.string().required(),
    })
    .returns(a.ref("EmbedResponse"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(embedFilesFunction)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    apiKeyAuthorizationMode: { expiresInDays: 30 },
  },
});
