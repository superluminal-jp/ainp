import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineFunction } from "@aws-amplify/backend";
import { Duration } from "aws-cdk-lib";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";

const functionDir = path.dirname(fileURLToPath(import.meta.url));

export const embedFilesFunction = defineFunction(
  (scope) => {
    const fn = new Function(scope, "embed-files", {
      handler: "index.handler",
      runtime: Runtime.PYTHON_3_12,
      timeout: Duration.minutes(5),
      memorySize: 1024,
      environment: {
        FAISS_INDEX_PREFIX: "faiss-indexes",
      },
      code: Code.fromDockerBuild(functionDir),
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
