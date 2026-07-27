import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export async function sendResetOtpEmail(to: string, fullName: string, otp: string) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #050505;
            color: #E4E4E7;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 500px;
            margin: 40px auto;
            padding: 32px;
            background: #0A0A0B;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
            text-align: center;
          }
          .logo {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: rgba(0, 212, 255, 0.1);
            border: 1px solid rgba(0, 212, 255, 0.2);
            color: #00D4FF;
            font-size: 24px;
            font-weight: bold;
            line-height: 48px;
            margin: 0 auto 24px;
          }
          .title {
            font-size: 22px;
            font-weight: 600;
            letter-spacing: -0.02em;
            color: #FFFFFF;
            margin-bottom: 8px;
          }
          .subtitle {
            font-size: 14px;
            color: #A1A1AA;
            margin-bottom: 32px;
          }
          .otp-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 32px;
          }
          .otp-code {
            font-family: 'JetBrains Mono', monospace;
            font-size: 38px;
            font-weight: 700;
            letter-spacing: 0.25em;
            color: #00FF94;
            margin: 0;
            padding-left: 0.25em; /* offset letter-spacing on right */
          }
          .footer-text {
            font-size: 12px;
            color: #71717A;
            line-height: 1.6;
            margin-top: 32px;
          }
          .footer-link {
            color: #00D4FF;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">K</div>
          <div class="title">Reset Your Password</div>
          <div class="subtitle">Use the verification code below to reset your Kairo credentials.</div>
          
          <div class="otp-card">
            <div class="otp-code">${otp}</div>
          </div>
          
          <p style="font-size: 14px; color: #A1A1AA; line-height: 1.5; margin: 0 0 24px;">
            Hi ${fullName},<br>
            We received a request to reset your password. This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.
          </p>
          
          <div style="height: 1px; background: rgba(255, 255, 255, 0.08); margin: 32px 0 24px;"></div>
          
          <p class="footer-text">
            Invisible Intelligence for your browser.<br>
            <a href="https://aikairo.vercel.app" class="footer-link">Kairo App</a>
          </p>
        </div>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"KAIRO" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Kairo Password Recovery Code",
    html: htmlContent,
  });
}
