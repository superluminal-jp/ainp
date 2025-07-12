import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineFunction } from "@aws-amplify/backend";
import { Duration } from "aws-cdk-lib";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";

const functionDir = path.dirname(fileURLToPath(import.meta.url));

export const chatBedrockFunction = defineFunction(
  (scope) => {
    const fn = new Function(scope, "chat-bedrock", {
      handler: "index.handler",
      runtime: Runtime.PYTHON_3_12,
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: {
        FAISS_INDEX_PREFIX: "faiss-indexes",
      },
      code: Code.fromDockerBuild(functionDir, {
        file: "Dockerfile",
        platform: "linux/amd64",
      }),
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
          "bedrock:Converse",
          "bedrock:ConverseStream",
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
