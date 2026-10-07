import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const user = process.env.SMTP_USER || 'mydeveloper444@gmail.com';
    const pass = process.env.SMTP_PASS || 'butvaazyizzyvaxx';

    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
      });
      this.logger.log(`[EMAIL] SMTP Transporter configured for Gmail (${user})`);
    } catch (err: any) {
      this.logger.error(`[EMAIL] Failed to initialize SMTP transporter: ${err.message}`);
    }
  }

  async sendVerificationCode(to: string, code: string, firstName?: string): Promise<boolean> {
    const userGreeting = firstName ? `Hello ${firstName},` : 'Hello,';
    const smtpUser = process.env.SMTP_USER || 'mydeveloper444@gmail.com';
    const fromAddress = {
      name: 'NATI LOTTO Official',
      address: smtpUser,
    };

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="background: #0B0F19; padding: 28px 24px; text-align: center; border-bottom: 2px solid #FFC107;">
          <h1 style="color: #FFC107; font-size: 26px; font-weight: 900; margin: 0; letter-spacing: -0.5px;">
            NATI LOTTO
          </h1>
          <p style="color: #94A3B8; font-size: 13px; margin: 6px 0 0; text-transform: uppercase; letter-spacing: 1px;">
            Your Chance. Your Moment.
          </p>
        </div>

        <!-- Body -->
        <div style="padding: 36px 28px; text-align: center;">
          <h2 style="color: #0F172A; font-size: 20px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
            Verify Your Email Address
          </h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            ${userGreeting} welcome to Nati Lotto! Use the 6-digit verification code below to verify your email and activate your account:
          </p>

          <!-- OTP Code Box -->
          <div style="background: #F8FAFC; border: 2px dashed #6C5DD3; border-radius: 12px; padding: 20px; margin: 24px 0; display: inline-block;">
            <span style="font-size: 34px; font-weight: 900; letter-spacing: 10px; color: #6C5DD3; font-family: monospace;">
              ${code}
            </span>
          </div>

          <p style="color: #64748B; font-size: 13px; margin-top: 16px; margin-bottom: 8px;">
            ⏱ This code is valid for <strong>10 minutes</strong>.
          </p>
          <p style="color: #94A3B8; font-size: 12px; margin-top: 0;">
            If you did not request this verification code, please ignore this email.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #F1F5F9; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 11px; color: #64748B;">
          <p style="margin: 0 0 6px;">
            Federal Democratic Republic of Ethiopia • National Lottery Administration Licensed
          </p>
          <p style="margin: 0; color: #94A3B8;">
            Permit #NL-ET-2026-0892 | 18+ Responsible Gaming Only
          </p>
        </div>
      </div>
    `;

    try {
      if (!this.transporter) {
        this.initTransporter();
      }

      if (this.transporter) {
        const info = await this.transporter.sendMail({
          from: fromAddress,
          to,
          replyTo: smtpUser,
          subject: `NATI LOTTO Email Verification Code: ${code}`,
          text: `Your NATI LOTTO verification code is ${code}. Valid for 10 minutes. If you did not request this, please disregard.`,
          html: htmlContent,
          headers: {
            'X-Priority': '1',
            'Importance': 'high',
          },
        });
        this.logger.log(`[EMAIL_SENT] Verification code sent to ${to}. MessageId: ${info.messageId}`);
        return true;
      } else {
        this.logger.warn(`[EMAIL_FALLBACK] Transporter unavailable. Code for ${to}: ${code}`);
        return true;
      }
    } catch (err: any) {
      this.logger.error(`[EMAIL_ERROR] Failed to send email to ${to}: ${err.message}`);
      // Still log code in dev console so registration flow can continue smoothly
      this.logger.log(`[DEV_OTP_RECOVERY] OTP for ${to}: ${code}`);
      return false;
    }
  }

  async sendPasswordResetCode(to: string, code: string, firstName?: string): Promise<boolean> {
    const userGreeting = firstName ? `Hello ${firstName},` : 'Hello,';
    const smtpUser = process.env.SMTP_USER || 'mydeveloper444@gmail.com';
    const fromAddress = {
      name: 'NATI LOTTO Security',
      address: smtpUser,
    };

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="background: #0B0F19; padding: 28px 24px; text-align: center; border-bottom: 2px solid #FFC107;">
          <h1 style="color: #FFC107; font-size: 26px; font-weight: 900; margin: 0; letter-spacing: -0.5px;">
            NATI LOTTO
          </h1>
          <p style="color: #94A3B8; font-size: 13px; margin: 6px 0 0; text-transform: uppercase; letter-spacing: 1px;">
            Security & Account Access
          </p>
        </div>

        <!-- Body -->
        <div style="padding: 36px 28px; text-align: center;">
          <h2 style="color: #0F172A; font-size: 20px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
            Reset Your Password
          </h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            ${userGreeting} we received a request to reset your Nati Lotto account password. Use the 6-digit code below to set a new password:
          </p>

          <!-- OTP Code Box -->
          <div style="background: #F8FAFC; border: 2px dashed #EF4444; border-radius: 12px; padding: 20px; margin: 24px 0; display: inline-block;">
            <span style="font-size: 34px; font-weight: 900; letter-spacing: 10px; color: #DC2626; font-family: monospace;">
              ${code}
            </span>
          </div>

          <p style="color: #64748B; font-size: 13px; margin-top: 16px; margin-bottom: 8px;">
            ⏱ This code is valid for <strong>10 minutes</strong>.
          </p>
          <p style="color: #94A3B8; font-size: 12px; margin-top: 0; line-height: 1.5;">
            If you did not request a password reset, please ignore this email. Your account credentials remain safe and secure.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #F1F5F9; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 11px; color: #64748B;">
          <p style="margin: 0 0 6px;">
            Federal Democratic Republic of Ethiopia • National Lottery Administration Licensed
          </p>
          <p style="margin: 0; color: #94A3B8;">
            Permit #NL-ET-2026-0892 | 18+ Responsible Gaming Only
          </p>
        </div>
      </div>
    `;

    try {
      if (!this.transporter) {
        this.initTransporter();
      }

      if (this.transporter) {
        const info = await this.transporter.sendMail({
          from: fromAddress,
          to,
          replyTo: smtpUser,
          subject: `NATI LOTTO Password Reset Code: ${code}`,
          text: `Your NATI LOTTO password reset code is ${code}. Valid for 10 minutes. If you did not request this, please disregard.`,
          html: htmlContent,
          headers: {
            'X-Priority': '1',
            'Importance': 'high',
          },
        });
        this.logger.log(`[PASSWORD_RESET_EMAIL_SENT] Password reset code sent to ${to}. MessageId: ${info.messageId}`);
        return true;
      } else {
        this.logger.warn(`[EMAIL_FALLBACK] Transporter unavailable. Reset code for ${to}: ${code}`);
        return true;
      }
    } catch (err: any) {
      this.logger.error(`[EMAIL_ERROR] Failed to send password reset email to ${to}: ${err.message}`);
      this.logger.log(`[DEV_PASSWORD_RESET_OTP] Reset code for ${to}: ${code}`);
      return false;
    }
  }
}
