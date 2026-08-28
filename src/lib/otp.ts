import nodemailer from 'nodemailer';

// Configure the Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendOTPEmail(to: string, otp: string): Promise<boolean> {
  // If credentials are missing, log to console as fallback
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.warn('⚠️ SMTP credentials not found in .env. Falling back to console log.');
    console.log(`[HS³ AUTH CODE]: >>> ${otp} <<<`);
    return false;
  }

  const mailOptions = {
    from: `"HS³ Mess Portal" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: 'Your HS³ Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 30px; border-radius: 12px; max-width: 480px; margin: auto;">
        <h2 style="color: #38bdf8; text-align: center; margin-bottom: 8px;">HS³ Mess Management</h2>
        <p style="text-align: center; color: #94a3b8; font-size: 14px;">Hostel Mess Portal Verification</p>
        <hr style="border: none; border-top: 1px solid #334155; margin: 20px 0;" />
        <p style="font-size: 15px;">Your one-time authentication code is:</p>
        <div style="background-color: #1e293b; padding: 18px; border-radius: 8px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #38bdf8; margin: 24px 0;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #64748b; text-align: center;">Valid for 5 minutes. Do not share this code with anyone.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 [SUCCESS] OTP email delivered to ${to} from ${process.env.SMTP_EMAIL}`);
    return true;
  } catch (error) {
    console.error('❌ [ERROR] Failed to send email via SMTP:', error);
    throw error;
  }
}