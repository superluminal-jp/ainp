import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineFunction } from "@aws-amplify/backend";
import { execSync } from "node:child_process";
import { Duration, DockerImage } from "aws-cdk-lib";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";

const functionDir = path.dirname(fileURLToPath(import.meta.url));

export const testToolFunction = defineFunction(
  (scope) => {
    const fn = new Function(scope, "test-tool", {
      handler: "index.handler",
      runtime: Runtime.PYTHON_3_12,
      timeout: Duration.minutes(2), // Shorter timeout for testing
      memorySize: 512,
      environment: {
        // Environment variables will be set in backend.ts
      },
      code: Code.fromAsset(functionDir, {
        bundling: {
          image: DockerImage.fromRegistry("dummy"), // fallback
          local: {
            tryBundle(outputDir: string) {
              execSync(
                `pip3 install -r ${path.join(functionDir, "requirements.txt")} -t ${outputDir} --platform manylinux2014_x86_64 --only-binary=:all:`
              );
              execSync(`cp -r ${functionDir}/* ${outputDir}`);
              return true;
            },
          },
        },
      }),
    });

    // Add IAM permissions for DynamoDB access
    fn.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
        ],
        resources: ["arn:aws:dynamodb:*:*:table/*"], // Access to all DynamoDB tables
      })
    );

    return fn;
  },
  {
    resourceGroupName: "data",
  }
);
