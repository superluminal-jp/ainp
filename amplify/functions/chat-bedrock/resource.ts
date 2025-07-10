import { execSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineFunction } from "@aws-amplify/backend";
import { DockerImage, Duration } from "aws-cdk-lib";
import { Code, Function, Runtime, LayerVersion } from "aws-cdk-lib/aws-lambda";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";

const functionDir = path.dirname(fileURLToPath(import.meta.url));

export const chatBedrockFunction = defineFunction(
  (scope) => {
    const fn = new Function(scope, "chat-bedrock", {
      code: Code.fromDockerBuild(functionDir, {
        file: "Dockerfile",
      }),
      runtime: Runtime.FROM_IMAGE,
      handler: "index.handler",
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: {
        FAISS_INDEX_PREFIX: "faiss-indexes",
      },
    });

    // Add IAM permissions for Bedrock
    fn.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:ListFoundationModels",
          "bedrock:GetFoundationModel",
        ],
        resources: ["*"],
      })
    );

    // S3 permissions for FAISS indexes will be handled by backend.ts

    return fn;
  },
  {
    resourceGroupName: "chat",
  }
);
