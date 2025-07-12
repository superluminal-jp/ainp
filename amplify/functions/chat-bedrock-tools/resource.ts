import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineFunction } from "@aws-amplify/backend";
import { execSync } from "node:child_process";
import { Duration, DockerImage } from "aws-cdk-lib";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";

const functionDir = path.dirname(fileURLToPath(import.meta.url));

export const chatBedrockToolsFunction = defineFunction(
  (scope) => {
    const fn = new Function(scope, "chat-bedrock-tools", {
      handler: "index.handler",
      runtime: Runtime.PYTHON_3_12,
      timeout: Duration.seconds(60), // Increased timeout for tool execution
      memorySize: 1024, // Increased memory for tool processing
      environment: {
        FAISS_INDEX_PREFIX: "faiss-indexes",
      },
      code: Code.fromAsset(functionDir, {
        bundling: {
          image: DockerImage.fromRegistry("dummy"), // fallback
          local: {
            tryBundle(outputDir: string) {
              execSync(
                `python3 -m pip install -r ${path.join(functionDir, "requirements.txt")} -t ${outputDir} --platform manylinux2014_x86_64 --only-binary=:all:`
              );
              execSync(`cp -r ${functionDir}/* ${outputDir}`);
              return true;
            },
          },
        },
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

    // S3 and DynamoDB permissions will be handled by backend.ts

    return fn;
  },
  {
    resourceGroupName: "data",
  }
);
