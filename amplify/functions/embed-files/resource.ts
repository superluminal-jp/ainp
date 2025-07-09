import { execSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineFunction } from "@aws-amplify/backend";
import { DockerImage, Duration } from "aws-cdk-lib";
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
      code: Code.fromAsset(functionDir, {
        bundling: {
          image: DockerImage.fromRegistry("public.ecr.aws/lambda/python:3.12"),
          local: {
            tryBundle(outputDir: string) {
              try {
                // Install dependencies with proper platform targeting
                console.log("Installing Python dependencies...");
                execSync(
                  `python3 -m pip install -r ${path.join(functionDir, "requirements.txt")} ` +
                    `-t ${outputDir} ` +
                    `--platform manylinux2014_x86_64 ` +
                    `--implementation cp ` +
                    `--python-version 3.12 ` +
                    `--only-binary=:all: ` +
                    `--upgrade ` +
                    `--no-deps`,
                  { stdio: "inherit" }
                );

                // Re-install with dependencies to ensure everything is compatible
                console.log("Re-installing with dependencies...");
                execSync(
                  `python3 -m pip install -r ${path.join(functionDir, "requirements.txt")} ` +
                    `-t ${outputDir} ` +
                    `--platform manylinux2014_x86_64 ` +
                    `--implementation cp ` +
                    `--python-version 3.12 ` +
                    `--only-binary=:all: ` +
                    `--upgrade`,
                  { stdio: "inherit" }
                );

                // Copy only the necessary Python files (not the entire directory)
                console.log("Copying function files...");
                execSync(
                  `cp ${path.join(functionDir, "index.py")} ${outputDir}/`
                );

                // Clean up any potential conflicts
                console.log("Cleaning up potential conflicts...");
                try {
                  execSync(`find ${outputDir} -name "*.pyc" -delete`, {
                    stdio: "ignore",
                  });
                  execSync(
                    `find ${outputDir} -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true`,
                    { stdio: "ignore" }
                  );
                } catch (e) {
                  // Ignore cleanup errors
                }

                return true;
              } catch (error) {
                console.error("Local bundling failed:", error);
                return false;
              }
            },
          },
          command: [
            "bash",
            "-c",
            [
              "pip install -r requirements.txt -t /asset-output --platform manylinux2014_x86_64 --implementation cp --python-version 3.12 --only-binary=:all: --upgrade",
              "cp index.py /asset-output/",
              "find /asset-output -name '*.pyc' -delete",
              "find /asset-output -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true",
            ].join(" && "),
          ],
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
