import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { chatBedrockFunction } from "../functions/chat-bedrock/resource";
import { embedFilesFunction } from "../functions/embed-files/resource";

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

  systemPrompts: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      content: a.string().required(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [
      allow.authenticated().to(["read", "create", "update", "delete"]),
      allow.guest().to(["read"]),
    ]),

  databases: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      description: a.string().required(),
      isActive: a.boolean().default(true),
      owner: a.string(),
    })
    .authorization((allow) => [
      allow.owner().to(["read", "create", "update", "delete"]),
      allow.authenticated().to(["read"]),
    ]),

  databaseFiles: a
    .model({
      id: a.id().required(),
      databaseId: a.id().required(),
      fileName: a.string().required(),
      fileKey: a.string().required(),
      fileSize: a.integer().required(),
      fileType: a.string().required(),
      uploadDate: a.datetime().required(),
      owner: a.string(),
    })
    .authorization((allow) => [
      allow.owner().to(["read", "create", "update", "delete"]),
      allow.authenticated().to(["read"]),
    ]),

  tools: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      description: a.string().required(),
      parameters: a.json(),
      pythonCodeKey: a.string().required(),
      isActive: a.boolean().default(true),
      createdAt: a.datetime().required(),
      owner: a.string(),
    })
    .authorization((allow) => [
      allow.owner().to(["read", "create", "update", "delete"]),
      allow.authenticated().to(["read"]),
    ]),

  templates: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      description: a.string().required(),
      systemPromptId: a.id().required(),
      databaseIds: a.json().required(),
      toolIds: a.json().required(),
      isActive: a.boolean().default(true),
      createdAt: a.datetime().required(),
      owner: a.string(),
    })
    .authorization((allow) => [
      allow.owner().to(["read", "create", "update", "delete"]),
      allow.authenticated().to(["read"]),
    ]),

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
