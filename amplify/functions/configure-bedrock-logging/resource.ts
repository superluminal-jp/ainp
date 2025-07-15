import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineFunction } from "@aws-amplify/backend";
import { execSync } from "node:child_process";
import { Duration, DockerImage } from "aws-cdk-lib";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";

const functionDir = path.dirname(fileURLToPath(import.meta.url));

export const configureBedrockLoggingFunction = defineFunction(
  (scope) => {
    const fn = new Function(scope, "configure-bedrock-logging", {
      handler: "index.handler",
      runtime: Runtime.PYTHON_3_12,
      timeout: Duration.minutes(1),
      environment: {
        // These will be set by the backend configuration
        BEDROCK_LOGGING_BUCKET: "",
        BEDROCK_LOG_GROUP_NAME: "",
        BEDROCK_CLOUDWATCH_ROLE_ARN: "",
      },
      code: Code.fromAsset(functionDir, {
        bundling: {
          image: DockerImage.fromRegistry("dummy"),
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

    // Add IAM permissions for Bedrock logging configuration
    fn.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "bedrock:PutModelInvocationLoggingConfiguration",
          "bedrock:GetModelInvocationLoggingConfiguration",
          "bedrock:DeleteModelInvocationLoggingConfiguration",
        ],
        resources: ["*"],
      })
    );

    return fn;
  },
  {
    resourceGroupName: "data",
  }
);
