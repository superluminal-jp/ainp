import type { PreSignUpTriggerHandler } from "aws-lambda";

export const handler: PreSignUpTriggerHandler = async (event) => {
  const email = event.request.userAttributes["email"];

  if (!email.endsWith(process.env.ALLOW_DOMAINS!)) {
    throw new Error("Invalid email domain");
  }

  return event;
};
