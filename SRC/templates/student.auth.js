import { mailTransport } from './mailTransport.js';
import EmailTemplates from './emailTemplates.js';

export class EmailService {
  
  // Send welcome email after successful signup
  static async sendWelcomeEmail(tutorData) {
    try {
      const htmlContent = EmailTemplates.generateWelcomeEmail(tutorData);
      
      await mailTransport(
        tutorData.email,
        'Welcome to TUTOR - Account Created Successfully! 🎉',
        htmlContent
      );
      
      console.log(`Welcome email sent successfully to ${tutorData.email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send login notification email
  static async sendLoginNotification(tutorData) {
    try {
      const htmlContent = EmailTemplates.generateLoginEmail(tutorData);
      
      await mailTransport(
        tutorData.email,
        'TUTOR - Login Notification 🔐',
        htmlContent
      );
      
      console.log(`Login notification sent successfully to ${tutorData.email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send login notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send account verification success email
  static async sendVerificationSuccessEmail(tutorData) {
    try {
      const htmlContent = EmailTemplates.generateVerificationSuccessEmail(tutorData);
      
      await mailTransport(
        tutorData.email,
        'Account Verified - Welcome to TUTOR! ✅',
        htmlContent
      );
      
      console.log(`Verification success email sent to ${tutorData.email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send verification success email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send password reset email
  static async sendPasswordResetEmail(tutorData, resetToken) {
    try {
      const htmlContent = EmailTemplates.generatePasswordResetEmail(tutorData, resetToken);
      
      await mailTransport(
        tutorData.email,
        'Password Reset Request - TUTOR 🔑',
        htmlContent
      );
      
      console.log(`Password reset email sent to ${tutorData.email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send booking confirmation email
  static async sendBookingNotification(tutorData, bookingData) {
    try {
      const htmlContent = EmailTemplates.generateBookingConfirmationEmail(tutorData, bookingData);
      
      await mailTransport(
        tutorData.email,
        'New Booking Request - TUTOR 📚',
        htmlContent
      );
      
      console.log(`Booking notification sent to ${tutorData.email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send booking notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Generic email sender for custom content
  static async sendCustomEmail(to, subject, htmlContent, attachments = null) {
    try {
      await mailTransport(to, subject, htmlContent, attachments);
      console.log(`Custom email sent successfully to ${to}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to send custom email to ${to}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Send bulk emails (with rate limiting consideration)
  static async sendBulkEmails(emailList, subject, htmlContent) {
    const results = [];
    const delay = 1000; // 1 second delay between emails to avoid rate limiting
    
    for (const email of emailList) {
      try {
        await mailTransport(email.to, subject, htmlContent);
        results.push({ email: email.to, success: true });
        console.log(`Bulk email sent to ${email.to}`);
        
        // Add delay between emails
        if (emailList.indexOf(email) < emailList.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        results.push({ email: email.to, success: false, error: error.message });
        console.error(`Failed to send bulk email to ${email.to}:`, error);
      }
    }
    
    return results;
  }
}

export default EmailService;