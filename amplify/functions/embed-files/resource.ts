import { execSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineFunction } from "@aws-amplify/backend";
import { DockerImage, Duration, Stack } from "aws-cdk-lib";
import { Code, Function, Runtime, LayerVersion } from "aws-cdk-lib/aws-lambda";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";

const functionDir = path.dirname(fileURLToPath(import.meta.url));

export const embedFilesFunction = defineFunction(
  (scope) => {
    // Create a Lambda layer for Python dependencies
    const dependenciesLayer = new LayerVersion(
      scope,
      "embed-files-dependencies",
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
        description: "Python dependencies for embed-files function",
      }
    );

    // Create the Lambda function
    const fn = new Function(scope, "embed-files", {
      handler: "index.handler",
      runtime: Runtime.PYTHON_3_12,
      timeout: Duration.minutes(5),
      memorySize: 1024,
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

    // Add IAM permissions for S3 (to read uploaded files and manage FAISS indexes)
    fn.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:PutObject",
          "s3:DeleteObject",
        ],
        resources: ["*"], // You might want to restrict this to specific buckets
      })
    );

    return fn;
  },
  {
    resourceGroupName: "embeddings",
  }
);
