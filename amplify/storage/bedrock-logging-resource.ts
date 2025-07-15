import { PolicyStatement, Effect, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Role, PolicyDocument } from "aws-cdk-lib/aws-iam";
import { Stack } from "aws-cdk-lib";

export function createBedrockLoggingResources(stack: Stack) {
  // Create CloudWatch log group for Bedrock logging with unique name
  const bedrockLogGroup = new LogGroup(stack, "BedrockLoggingLogGroup", {
    logGroupName: `/aws/bedrock/modelinvocations-${stack.stackId.split("/").pop()}`,
    retention: RetentionDays.ONE_MONTH,
    removalPolicy: undefined, // Will use default removal policy
  });

  // Create IAM role for Bedrock CloudWatch logging
  const bedrockCloudWatchRole = new Role(stack, "BedrockCloudWatchRole", {
    assumedBy: new ServicePrincipal("bedrock.amazonaws.com"),
    inlinePolicies: {
      CloudWatchLogsPolicy: new PolicyDocument({
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["logs:CreateLogStream", "logs:PutLogEvents"],
            resources: [
              `${bedrockLogGroup.logGroupArn}:log-stream:aws/bedrock/modelinvocations`,
            ],
          }),
        ],
      }),
    },
    description: "IAM role for Bedrock to write to CloudWatch Logs",
  });

  // Add conditions to the trust policy
  bedrockCloudWatchRole.assumeRolePolicy?.addStatements(
    new PolicyStatement({
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal("bedrock.amazonaws.com")],
      actions: ["sts:AssumeRole"],
      conditions: {
        StringEquals: {
          "aws:SourceAccount": stack.account,
        },
        ArnLike: {
          "aws:SourceArn": `arn:aws:bedrock:${stack.region}:${stack.account}:*`,
        },
      },
    })
  );

  return {
    bedrockLogGroup,
    bedrockCloudWatchRole,
  };
}
