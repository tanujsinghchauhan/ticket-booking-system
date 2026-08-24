import nodemailer from 'nodemailer';
import { env } from './env.js';

let transporter: nodemailer.Transporter;

export async function initMailer() {
  if (env.SMTP_USER && env.SMTP_PASS && env.SMTP_HOST) {
    console.log('Using configured SMTP settings for mailing.');
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  } else {
    console.log('No SMTP configuration found. Creating an Ethereal SMTP test account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      console.log(`Ethereal SMTP Account Created!`);
      console.log(`User: ${testAccount.user}`);
      console.log(`Pass: ${testAccount.pass}`);
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (err) {
      console.error('Failed to create Ethereal SMTP account:', err);
    }
  }
}

export function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    throw new Error('Mailer transporter has not been initialized yet. Call initMailer() first.');
  }
  return transporter;
}

export async function sendMail(options: nodemailer.SendMailOptions) {
  const mailTransporter = getTransporter();
  const info = await mailTransporter.sendMail({
    from: env.EMAIL_FROM,
    ...options,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[Email Sent] Preview URL: ${previewUrl}`);
  }
  return info;
}
