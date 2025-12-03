import nodemailer, { Transporter } from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.example.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@example.com';
const APP_NAME = process.env.APP_NAME || 'Document Management System';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transport = getTransporter();

    await transport.sendMail({
      from: `"${APP_NAME}" <${SMTP_FROM}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Email Templates
export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Welcome to ${APP_NAME}</h1>
      <p>Hello ${name || 'there'},</p>
      <p>Your account has been created successfully. You can now start using the Document Management System.</p>
      <p>
        <a href="${APP_URL}/login"
           style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
          Login to your account
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        If you didn't create this account, please ignore this email.
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Welcome to ${APP_NAME}`,
    html,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<boolean> {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Password Reset Request</h1>
      <p>You requested a password reset. Click the button below to reset your password:</p>
      <p>
        <a href="${resetUrl}"
           style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
          Reset Password
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        This link will expire in 1 hour. If you didn't request this reset, please ignore this email.
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Password Reset - ${APP_NAME}`,
    html,
  });
}

export async function sendDocumentSharedEmail(
  email: string,
  documentTitle: string,
  sharedBy: string,
  shareUrl: string,
  expiresAt?: Date
): Promise<boolean> {
  const expiryText = expiresAt
    ? `This link will expire on ${expiresAt.toLocaleDateString()}.`
    : 'This link does not expire.';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Document Shared With You</h1>
      <p>${sharedBy} has shared a document with you:</p>
      <p style="font-size: 18px; font-weight: bold; color: #4F46E5;">${documentTitle}</p>
      <p>
        <a href="${shareUrl}"
           style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
          View Document
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        ${expiryText}
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Document Shared: ${documentTitle} - ${APP_NAME}`,
    html,
  });
}

export async function sendWorkflowAssignmentEmail(
  email: string,
  recipientName: string,
  workflowName: string,
  documentTitle: string,
  assignedBy: string,
  dueDate?: Date
): Promise<boolean> {
  const dueDateText = dueDate
    ? `<p><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>`
    : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">New Workflow Assignment</h1>
      <p>Hello ${recipientName},</p>
      <p>You have been assigned a new workflow task by ${assignedBy}:</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Workflow:</strong> ${workflowName}</p>
        <p><strong>Document:</strong> ${documentTitle}</p>
        ${dueDateText}
      </div>
      <p>
        <a href="${APP_URL}/workflows"
           style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
          View Workflow
        </a>
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Workflow Assignment: ${workflowName} - ${APP_NAME}`,
    html,
  });
}

export async function sendWorkflowCompletedEmail(
  email: string,
  workflowName: string,
  documentTitle: string
): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Workflow Completed</h1>
      <p>The following workflow has been completed:</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Workflow:</strong> ${workflowName}</p>
        <p><strong>Document:</strong> ${documentTitle}</p>
        <p><strong>Status:</strong> <span style="color: #22c55e;">Completed</span></p>
      </div>
      <p>
        <a href="${APP_URL}/documents"
           style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
          View Document
        </a>
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Workflow Completed: ${workflowName} - ${APP_NAME}`,
    html,
  });
}

export async function sendNotificationEmail(
  email: string,
  title: string,
  message: string,
  link?: string
): Promise<boolean> {
  const buttonHtml = link
    ? `<p>
        <a href="${link}"
           style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
          View Details
        </a>
       </p>`
    : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">${title}</h1>
      <p>${message}</p>
      ${buttonHtml}
      <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #666; font-size: 12px;">
        This notification was sent from ${APP_NAME}.
        <a href="${APP_URL}/settings">Manage notification settings</a>
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `${title} - ${APP_NAME}`,
    html,
  });
}

export async function verifyEmailConfig(): Promise<boolean> {
  try {
    const transport = getTransporter();
    await transport.verify();
    return true;
  } catch (error) {
    console.error('Email configuration verification failed:', error);
    return false;
  }
}
