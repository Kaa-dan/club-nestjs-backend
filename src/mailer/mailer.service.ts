// src/brevo/brevo.service.ts

import { Injectable } from '@nestjs/common';
import * as SibApiV3Sdk from 'sib-api-v3-sdk';
import { ENV } from 'src/utils/config/env.config';

@Injectable()
export class MailerService {
  private readonly apiInstance: SibApiV3Sdk.TransactionalEmailsApi;

  constructor() {
    // Configure the API with your API key
    const apiKey = SibApiV3Sdk.ApiClient.instance.authentications['api-key'];
    apiKey.apiKey = ENV.BREVO_API_KEY;

    this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<void> {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.sender = {
      name: ENV.DEFAULT_FROM_NAME,
      email: ENV.DEFAULT_FROM_EMAIL,
    };
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;

    try {
      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`Email sent to ${to}`);
    } catch (error) {
      console.error(`Error sending email: ${error.message}`);
    }
  }
}
