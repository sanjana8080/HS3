import nodemailer from 'nodemailer';
import { prisma } from './prisma';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendOTPEmail(to: string, otp: string): Promise<boolean> {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.warn('⚠️ SMTP credentials missing. Code:', otp);
    return false;
  }

  const mailOptions = {
    from: `"HS³ Mess Portal" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: 'Your HS³ Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 30px; border-radius: 12px; max-width: 480px; margin: auto;">
        <h2 style="color: #38bdf8; text-align: center; margin-bottom: 8px;">HS³ Mess Management</h2>
        <p style="text-align: center; color: #94a3b8; font-size: 14px;">Smart Mess Verification</p>
        <hr style="border: none; border-top: 1px solid #334155; margin: 20px 0;" />
        <p style="font-size: 15px;">Your verification code is:</p>
        <div style="background-color: #1e293b; padding: 18px; border-radius: 8px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #38bdf8; margin: 24px 0;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #64748b; text-align: center;">Valid for 5 minutes.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('❌ Failed to send SMTP email:', error);
    throw error;
  }
}

export async function verifyOtpCode(email: string, code: string): Promise<boolean> {
  const cleanEmail = email.toLowerCase().trim();
  const otpModel = (prisma as any).otp || (prisma as any).oTP;

  if (!otpModel) return false;

  const record = await otpModel.findFirst({
    where: {
      email: cleanEmail,
      code: code.trim(),
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) return false;

  // Clear OTP after successful validation
  await otpModel.deleteMany({
    where: { email: cleanEmail },
  });

  return true;
}