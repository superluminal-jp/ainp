import { execSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineFunction } from "@aws-amplify/backend";
import { DockerImage, Duration } from "aws-cdk-lib";
import { Code, Function, Runtime, LayerVersion } from "aws-cdk-lib/aws-lambda";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";

const functionDir = path.dirname(fileURLToPath(import.meta.url));

export const chatBedrockToolsFunction = defineFunction(
  (scope) => {
    const fn = new Function(scope, "chat-bedrock-tools", {
      code: Code.fromDockerBuild(functionDir, {
        file: "Dockerfile",
      }),
      runtime: Runtime.FROM_IMAGE,
      handler: "index.handler",
      timeout: Duration.seconds(60), // Increased timeout for tool execution
      memorySize: 1024, // Increased memory for tool processing
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
          "bedrock:Converse",
          "bedrock:ConverseStream",
        ],
        resources: ["*"],
      })
    );

    // S3 and DynamoDB permissions will be handled by backend.ts

    return fn;
  },
  {
    resourceGroupName: "data",
  }
);
