import { Injectable } from '@nestjs/common';
import { TransactionalEmailsApi, SendSmtpEmail} from '@getbrevo/brevo';
import { ENV } from 'src/utils/config/env.config';

@Injectable()
export class MailerService {
  private readonly apiInstance: TransactionalEmailsApi;

  constructor() {
    // Initialize the API instance
    this.apiInstance = new TransactionalEmailsApi();
    
    // Set the API key using DefaultApiKeyAuth
    (this.apiInstance as any).defaultHeaders['api-key'] = ENV.BREVO_API_KEY;
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<void> {
    const sendSmtpEmail = new SendSmtpEmail();
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
