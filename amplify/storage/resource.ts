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

    // Public databases - everyone can read, authenticated can write
    "databases/public/*": [
      allow.authenticated.to(["read", "write", "delete"]),
      allow.guest.to(["read"]),
    ],

    // Temporary uploads - for processing before moving to final location
    "databases/temp/{entity_id}/*": [
      allow.entity("identity").to(["read", "write", "delete"]),
    ],

    // System-managed files (read-only for users)
    "databases/system/*": [
      allow.authenticated.to(["read"]),
      allow.guest.to(["read"]),
    ],

    // Tool lambda functions - only the owner can manage their files
    "tools/lambda/{entity_id}/*": [
      allow.entity("identity").to(["read", "write", "delete"]),
    ],

    // Shared tool lambda functions - authenticated users can read
    "tools/lambda/shared/*": [
      allow.authenticated.to(["read", "write", "delete"]),
      allow.guest.to(["read"]),
    ],
  }),
});
