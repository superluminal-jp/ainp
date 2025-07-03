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
    // Create a Lambda layer for Python dependencies
    const dependenciesLayer = new LayerVersion(
      scope,
      "chat-bedrock-dependencies",
      {
        code: Code.fromAsset(functionDir, {
          bundling: {
            image: DockerImage.fromRegistry(
              "public.ecr.aws/lambda/python:3.12"
            ),
            command: [
              "bash",
              "-c",
              [
                "pip install -r /asset-input/requirements.txt -t /asset-output/python/",
                "find /asset-output -name '*.pyc' -delete",
                "find /asset-output -name '__pycache__' -type d -exec rm -rf {} +",
              ].join(" && "),
            ],
          },
        }),
        compatibleRuntimes: [Runtime.PYTHON_3_12],
        description: "Python dependencies for chat-bedrock function",
      }
    );

    // Create the Lambda function
    const fn = new Function(scope, "chat-bedrock", {
      handler: "index.handler",
      runtime: Runtime.PYTHON_3_12,
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: {
        FAISS_INDEX_PREFIX: "faiss-indexes",
      },
      code: Code.fromAsset(functionDir, {
        bundling: {
          image: DockerImage.fromRegistry("dummy"),
          local: {
            tryBundle(outputDir: string) {
              // Only copy function code, not dependencies
              execSync(`cp ${functionDir}/*.py ${path.join(outputDir)}`);
              return true;
            },
          },
        },
      }),
      layers: [dependenciesLayer],
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
