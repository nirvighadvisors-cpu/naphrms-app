import { Resend } from 'resend';
import { config } from '../config/env';

let resendClient: Resend | null = null;

if (config.resendApiKey) {
  resendClient = new Resend(config.resendApiKey);
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export const sendEmail = async (options: SendEmailOptions): Promise<boolean> => {
  if (!resendClient) {
    console.warn('[Email] Skipped: RESEND_API_KEY is not configured', options.to);
    return false;
  }

  try {
    const { data, error } = await resendClient.emails.send({
      from: config.emailFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error('[Email] Resend API Error', { error, to: options.to });
      return false;
    }

    console.log(`[Email] Sent successfully to ${options.to}`, { id: data?.id });
    return true;
  } catch (err: any) {
    console.error('[Email] Failed to send', { error: err.message, to: options.to });
    return false;
  }
};
