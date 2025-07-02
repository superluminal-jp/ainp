import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "ainpStorage",
  access: (allow) => ({
    // Private user databases - only the owner can manage their files
    "databases/private/{entity_id}/*": [
      allow.entity("identity").to(["read", "write", "delete"]),
    ],

    // Shared databases - authenticated users can read and write
    "databases/shared/*": [
      allow.authenticated.to(["read", "write", "delete"]),
      allow.guest.to(["read"]),
    ],

    // FAISS vector indexes - system managed for embeddings
    "faiss-indexes/*": [
      allow.authenticated.to(["read", "write", "delete"]),
      allow.guest.to(["read"]),
    ],

  }),
});
