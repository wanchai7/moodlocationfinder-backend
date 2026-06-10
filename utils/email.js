const sendVerificationEmail = async (email, token) => {
    try {
        if (!process.env.BREVO_API_KEY) {
            console.error('BREVO_API_KEY is not defined in .env');
            return false;
        }

        let frontendUrl = process.env.FRONTEND_URL || (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',')[0].trim() : 'http://localhost:5173');
        if (frontendUrl.includes(',')) {
            frontendUrl = frontendUrl.split(',')[0].trim();
        }
        const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@moodlocationfinder.com";

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: "Mood Location Finder", email: senderEmail },
                to: [{ email: email }],
                subject: "ยืนยันการสมัครสมาชิก Mood Location Finder",
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f9f9f9;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <h2 style="color: #333;">ยินดีต้อนรับสู่ Mood Location Finder!</h2>
                            <p style="color: #555; font-size: 16px;">เราดีใจที่คุณร่วมเป็นส่วนหนึ่งกับเรา กรุณาคลิกที่ปุ่มด้านล่างเพื่อยืนยันที่อยู่อีเมลของคุณ:</p>
                            <div style="margin: 30px 0;">
                                <a href="${frontendUrl}/verify-email?token=${token}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">ยืนยันอีเมลของคุณ</a>
                            </div>
                            <p style="color: #888; font-size: 12px;">หากปุ่มด้านบนไม่ทำงาน คุณสามารถคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์ของคุณได้:</p>
                            <p style="color: #888; font-size: 12px; word-break: break-all;"><a href="${frontendUrl}/verify-email?token=${token}">${frontendUrl}/verify-email?token=${token}</a></p>
                            <p style="margin-top: 40px; font-size: 14px; color: #999;">หากคุณไม่ได้ทำการสมัครสมาชิก กรุณาละเว้นอีเมลฉบับนี้</p>
                        </div>
                    </div>
                `
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error from Brevo API:', errorData);
            return false;
        }

        const data = await response.json();
        console.log('Verification email sent successfully:', data.messageId);
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return false;
    }
};

const sendPasswordResetEmail = async (email, token) => {
    try {
        if (!process.env.BREVO_API_KEY) {
            console.error('BREVO_API_KEY is not defined in .env');
            return false;
        }

        let frontendUrl = process.env.FRONTEND_URL || (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',')[0].trim() : 'http://localhost:5173');
        if (frontendUrl.includes(',')) {
            frontendUrl = frontendUrl.split(',')[0].trim();
        }
        const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@moodlocationfinder.com";

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: "Mood Location Finder", email: senderEmail },
                to: [{ email: email }],
                subject: "รีเซ็ตรหัสผ่าน Mood Location Finder",
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f9f9f9;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <h2 style="color: #333;">รีเซ็ตรหัสผ่านของคุณ</h2>
                            <p style="color: #555; font-size: 16px;">คลิกที่ปุ่มด้านล่างเพื่อเข้าสู่หน้าตั้งรหัสผ่านใหม่</p>
                            <div style="margin: 30px 0;">
                                <a href="${frontendUrl}/reset-password?token=${token}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">ตั้งรหัสผ่านใหม่</a>
                            </div>
                            <p style="color: #888; font-size: 12px;">หากปุ่มด้านบนไม่ทำงาน ให้คัดลอกลิงก์นี้ไปวางในเบราว์เซอร์ของคุณ:</p>
                            <p style="color: #888; font-size: 12px; word-break: break-all;"><a href="${frontendUrl}/reset-password?token=${token}">${frontendUrl}/reset-password?token=${token}</a></p>
                            <p style="margin-top: 40px; font-size: 14px; color: #999;">ถ้าไม่ได้ร้องขอการรีเซ็ตรหัสผ่าน โปรดไม่ต้องดำเนินการใด ๆ</p>
                        </div>
                    </div>
                `
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error from Brevo API:', errorData);
            return false;
        }

        const data = await response.json();
        console.log('Password reset email sent successfully:', data.messageId);
        return true;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return false;
    }
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail
};
