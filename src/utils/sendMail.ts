import { SESClient, SendEmailCommand, SendEmailRequest, SendEmailResponse } from "@aws-sdk/client-ses";
import config from "../config";

import validators from "../validators/common";
import logger from "./logger";

interface MailObject {
  to: string;
  subject: string;
  body: string;
  requestId: string | undefined;
}

const sendMail = async ({ to, subject, body, requestId }: MailObject) => {
  try {
    if (!config.SEND_EMAIL) return false;
    const emailValidator = validators.email.required().validate(to);
    if (emailValidator.error?.message) {
      throw new Error("Invalid Email ID. Cannot Send OTP");
    }
    const client = new SESClient({});
    const params: SendEmailRequest = {
      Source: config.SES_FROM_EMAIL,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: body,
          },
        },
      },
    };

    const command = new SendEmailCommand(params);
    const response: SendEmailResponse = await client.send(command);
    return response;
  } catch (err) {
    logger.warn(`Error while sending email`, { params: { to, subject }, err, requestId });
    throw err;
  }
};

export default sendMail;
