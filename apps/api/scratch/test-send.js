const nodemailer = require('nodemailer');

async function testSend() {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'mydeveloper444@gmail.com',
      pass: 'butvaazyizzyvaxx',
    },
  });

  try {
    console.log('Sending test email via Gmail SMTP...');
    const info = await transporter.sendMail({
      from: '"NATI LOTTO Official" <mydeveloper444@gmail.com>',
      to: 'bekeledagim59@gmail.com',
      subject: '656615 is your NATI LOTTO verification code',
      text: 'Your NATI LOTTO verification code is 656615. Valid for 10 minutes.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #6C5DD3;">NATI LOTTO Email Verification</h2>
          <p>Your 6-digit verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #10B981; margin: 16px 0;">
            656615
          </div>
          <p style="color: #666; font-size: 13px;">Enter this code on the website to activate your account. Valid for 10 minutes.</p>
        </div>
      `
    });

    console.log('SEND SUCCESS!');
    console.log('Message ID:', info.messageId);
    console.log('Envelope:', info.envelope);
    console.log('Accepted:', info.accepted);
    console.log('Rejected:', info.rejected);
    console.log('Response:', info.response);
  } catch (err) {
    console.error('SEND FAILED:', err);
  }
}

testSend();
