const brevo = require('@getbrevo/brevo');

const sendVerificationEmail = async (email, token) => {
    try {
        const defaultClient = brevo.ApiClient.instance;
        const apiKey = defaultClient.authentications['api-key'];
        
        // Check if API key exists
        if (!process.env.BREVO_API_KEY) {
            console.error('BREVO_API_KEY is not defined in .env');
            return false;
        }
        
        apiKey.apiKey = process.env.BREVO_API_KEY;
        const apiInstance = new brevo.TransactionalEmailsApi();
        
        const sendSmtpEmail = new brevo.SendSmtpEmail();
        
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        
        sendSmtpEmail.subject = "ยืนยันการสมัครสมาชิก Mood Location Finder";
        sendSmtpEmail.htmlContent = `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                <h2>ยินดีต้อนรับสู่ Mood Location Finder!</h2>
                <p>เราดีใจที่คุณร่วมเป็นส่วนหนึ่งกับเรา กรุณาคลิกที่ปุ่มด้านล่างเพื่อยืนยันที่อยู่อีเมลของคุณ:</p>
                <div style="margin: 30px 0;">
                    <a href="${frontendUrl}/verify-email?token=${token}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">ยืนยันอีเมลของคุณ</a>
                </div>
                <p style="color: #888; font-size: 12px;">หากปุ่มด้านบนไม่ทำงาน คุณสามารถคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์ของคุณได้:</p>
                <p style="color: #888; font-size: 12px; word-break: break-all;">${frontendUrl}/verify-email?token=${token}</p>
                <p style="margin-top: 40px; font-size: 14px;">หากคุณไม่ได้ทำการสมัครสมาชิก กรุณาละเว้นอีเมลฉบับนี้</p>
            </div>
        `;
        
        // Using a default sender email, you may want to configure this in .env
        const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@moodlocationfinder.com";
        sendSmtpEmail.sender = { "name": "Mood Location Finder", "email": senderEmail }; 
        sendSmtpEmail.to = [{ "email": email }];

        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Verification email sent successfully:', data.messageId);
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return false;
    }
};

module.exports = {
    sendVerificationEmail
};
