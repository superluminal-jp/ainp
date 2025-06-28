import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
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
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    apiKeyAuthorizationMode: { expiresInDays: 30 },
  },
});
