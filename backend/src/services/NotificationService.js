import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { publishMessage } from '../config/redis.js';
import WebSocketService from './WebSocketService.js';
import UserService from './UserService.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.twilioClient = null;
    this.notificationQueue = [];
    this.processingInterval = null;

    this.initialize();
  }

  initialize() {
    try {
      // Initialize email transporter
      if (process.env.SMTP_HOST) {
        this.emailTransporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        logger.info("Email transporter initialized");
      }

      // Initialize Twilio client
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        this.twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );

        logger.info("Twilio client initialized");
      }

      // Start notification processing
      this.startNotificationProcessing();
    } catch (error) {
      logger.error("Notification service initialization failed:", error);
    }
  }

  async sendNotification(notification) {
    try {
      const notificationId = uuidv4();
      const enrichedNotification = {
        id: notificationId,
        ...notification,
        createdAt: new Date().toISOString(),
        status: "pending",
      };

      // Add to queue
      this.notificationQueue.push(enrichedNotification);

      logger.info("Notification queued:", {
        id: notificationId,
        type: notification.type,
        userId: notification.userId,
        channels: notification.channels,
      });

      return {
        success: true,
        notificationId,
        message: "Notification queued for delivery",
      };
    } catch (error) {
      logger.error("Notification queueing failed:", error);
      throw error;
    }
  }

  async processNotification(notification) {
    try {
      logger.debug("Processing notification:", notification.id);

      const user = await UserService.getUserById(notification.userId);
      if (!user) {
        throw new Error("User not found");
      }

      const userPreferences = await UserService.getUserPreferences(
        notification.userId
      );
      const results = [];

      // Process each requested channel
      for (const channel of notification.channels) {
        try {
          let result;

          switch (channel) {
            case "websocket":
              result = await this.sendWebSocketNotification(user, notification);
              break;
            case "email":
              if (userPreferences.preferences.notifications?.email !== false) {
                result = await this.sendEmailNotification(user, notification);
              } else {
                result = {
                  success: false,
                  reason: "Email notifications disabled",
                };
              }
              break;
            case "sms":
              if (userPreferences.preferences.notifications?.sms === true) {
                result = await this.sendSMSNotification(user, notification);
              } else {
                result = {
                  success: false,
                  reason: "SMS notifications disabled",
                };
              }
              break;
            case "push":
              if (userPreferences.preferences.notifications?.push !== false) {
                result = await this.sendPushNotification(user, notification);
              } else {
                result = {
                  success: false,
                  reason: "Push notifications disabled",
                };
              }
              break;
            default:
              result = {
                success: false,
                reason: `Unknown channel: ${channel}`,
              };
          }

          results.push({ channel, ...result });
        } catch (error) {
          logger.error(`Notification channel ${channel} failed:`, error);
          results.push({
            channel,
            success: false,
            error: error.message,
          });
        }
      }

      // Update notification status
      notification.status = results.some((r) => r.success)
        ? "delivered"
        : "failed";
      notification.deliveryResults = results;
      notification.processedAt = new Date().toISOString();

      return {
        success: notification.status === "delivered",
        results,
        notification,
      };
    } catch (error) {
      logger.error("Notification processing failed:", error);
      notification.status = "failed";
      notification.error = error.message;
      notification.processedAt = new Date().toISOString();
      throw error;
    }
  }

  async sendWebSocketNotification(user, notification) {
    try {
      const message = {
        type: "notification",
        id: notification.id,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        priority: notification.priority || "normal",
        timestamp: new Date().toISOString(),
        category: notification.category || "general",
      };

      const sent = WebSocketService.sendToUser(user.id, message);

      return {
        success: sent,
        deliveredAt: sent ? new Date().toISOString() : null,
        reason: sent ? "Delivered via WebSocket" : "User not connected",
      };
    } catch (error) {
      logger.error("WebSocket notification failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendEmailNotification(user, notification) {
    try {
      if (!this.emailTransporter) {
        throw new Error("Email transporter not configured");
      }

      if (!user.email) {
        throw new Error("User email not available");
      }

      const emailTemplate = this.generateEmailTemplate(notification, user);

      const mailOptions = {
        from: process.env.FROM_EMAIL || "noreply@omnidimension.com",
        to: user.email,
        subject: notification.title,
        html: emailTemplate.html,
        text: emailTemplate.text,
      };

      const result = await this.emailTransporter.sendMail(mailOptions);

      logger.info("Email notification sent:", {
        userId: user.id,
        email: user.email,
        messageId: result.messageId,
        notificationId: notification.id,
      });

      return {
        success: true,
        deliveredAt: new Date().toISOString(),
        messageId: result.messageId,
        reason: "Email sent successfully",
      };
    } catch (error) {
      logger.error("Email notification failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendSMSNotification(user, notification) {
    try {
      if (!this.twilioClient) {
        throw new Error("Twilio client not configured");
      }

      if (!user.profile?.phone) {
        throw new Error("User phone number not available");
      }

      const smsBody = this.generateSMSText(notification, user);

      const message = await this.twilioClient.messages.create({
        body: smsBody,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: user.profile.phone,
      });

      logger.info("SMS notification sent:", {
        userId: user.id,
        phone: user.profile.phone,
        messageSid: message.sid,
        notificationId: notification.id,
      });

      return {
        success: true,
        deliveredAt: new Date().toISOString(),
        messageSid: message.sid,
        reason: "SMS sent successfully",
      };
    } catch (error) {
      logger.error("SMS notification failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendPushNotification(user, notification) {
    try {
      // For now, simulate push notification via WebSocket
      // In production, you'd integrate with FCM, APNs, etc.

      const pushMessage = {
        type: "push_notification",
        id: notification.id,
        title: notification.title,
        body: notification.message,
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        data: notification.data || {},
        timestamp: new Date().toISOString(),
      };

      const sent = WebSocketService.sendToUser(user.id, pushMessage);

      return {
        success: sent,
        deliveredAt: sent ? new Date().toISOString() : null,
        reason: sent
          ? "Push notification delivered"
          : "User not connected for push",
      };
    } catch (error) {
      logger.error("Push notification failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  generateEmailTemplate(notification, user) {
    const { title, message, data = {} } = notification;
    const userName = user.profile?.firstName || user.username;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>OmniDimension</h1>
        </div>
        <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>${message}</p>
            ${
              data.actionUrl
                ? `<p><a href="${data.actionUrl}" class="button">${
                    data.actionText || "View Details"
                  }</a></p>`
                : ""
            }
            ${
              data.details
                ? `<div style="margin-top: 20px; padding: 15px; background: white; border-radius: 5px;"><pre style="white-space: pre-wrap;">${JSON.stringify(
                    data.details,
                    null,
                    2
                  )}</pre></div>`
                : ""
            }
        </div>
        <div class="footer">
            <p>This message was sent from OmniDimension Multi-Agent System</p>
            <p>Time: 2025-06-19 18:39:41 UTC</p>
            <p>If you have questions, please contact support.</p>
        </div>
    </div>
</body>
</html>
    `;

    const text = `
Hello ${userName}!

${title}

${message}

${data.actionUrl ? `View details: ${data.actionUrl}` : ""}
${data.details ? `\nDetails:\n${JSON.stringify(data.details, null, 2)}` : ""}

---
OmniDimension Multi-Agent System
Time: 2025-06-19 18:39:41 UTC
    `;

    return { html, text };
  }

  generateSMSText(notification, user) {
    const userName = user.profile?.firstName || user.username;
    let smsText = `Hello ${userName}! ${notification.title}: ${notification.message}`;

    if (notification.data?.actionUrl) {
      smsText += ` ${notification.data.actionUrl}`;
    }

    // SMS limit is 160 characters for basic SMS
    if (smsText.length > 160) {
      smsText = smsText.substring(0, 157) + "...";
    }

    return smsText;
  }

  startNotificationProcessing() {
    this.processingInterval = setInterval(async () => {
      if (this.notificationQueue.length === 0) return;

      const notification = this.notificationQueue.shift();

      try {
        await this.processNotification(notification);
      } catch (error) {
        logger.error("Notification processing error:", error);
      }
    }, 1000); // Process every second

    logger.info("Notification processing started");
  }

  // Convenience methods for different notification types
  async notifyWorkflowCompleted(userId, workflowResult) {
    // 1. Send notification (unchanged)
    const notificationResult = await this.sendNotification({
      userId,
      type: "workflow_completed",
      title: "Workflow Completed Successfully",
      message: `Your ${workflowResult.type} workflow has been completed.`,
      channels: ["websocket", "email"],
      priority: "normal",
      category: "workflow",
      data: {
        workflowId: workflowResult.workflowId,
        workflowType: workflowResult.type,
        result: workflowResult.result,
        actionUrl: `${process.env.FRONTEND_URL}/workflows/${workflowResult.workflowId}`,
        actionText: "View Details",
      },
    });

    // 2. Add a real chat message to the conversation
    if (workflowResult.conversationId) {
      // Import Conversation model if not already imported
      const Conversation = require("../models/Conversation"); // or import at top

      // Find the conversation document
      const conversation = await Conversation.findOne({
        _id: workflowResult.conversationId,
        isActive: true,
      });
      if (conversation) {
        await conversation.addMessage({
          id: uuidv4(),
          role: "agent",
          content:
            workflowResult.result?.content ||
            workflowResult.result ||
            `✅ Workflow completed: Your ${workflowResult.type} has finished successfully.`,
          metadata: {
            notificationType: "workflow_completed",
            workflowId: workflowResult.workflowId,
            result: workflowResult.result,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    return notificationResult;
  }

  async notifyWorkflowFailed(userId, workflowResult) {
    return await this.sendNotification({
      userId,
      type: "workflow_failed",
      title: "Workflow Failed",
      message: `Your ${workflowResult.type} workflow encountered an issue: ${workflowResult.error}`,
      channels: ["websocket", "email"],
      priority: "high",
      category: "workflow",
      data: {
        workflowId: workflowResult.workflowId,
        workflowType: workflowResult.type,
        error: workflowResult.error,
        actionUrl: `${process.env.FRONTEND_URL}/workflows/${workflowResult.workflowId}`,
        actionText: "View Details",
      },
    });
  }

  async notifyAppointmentBooked(userId, appointmentDetails) {
    return await this.sendNotification({
      userId,
      type: "appointment_booked",
      title: "Appointment Confirmed",
      message: `Your appointment at ${appointmentDetails.provider.name} has been confirmed for ${appointmentDetails.appointmentTime}.`,
      channels: ["websocket", "email", "sms"],
      priority: "high",
      category: "appointment",
      data: {
        provider: appointmentDetails.provider,
        appointmentTime: appointmentDetails.appointmentTime,
        confirmationCode: appointmentDetails.confirmationCode,
        details: appointmentDetails,
      },
    });
  }

  async notifyReservationMade(userId, reservationDetails) {
    return await this.sendNotification({
      userId,
      type: "reservation_made",
      title: "Restaurant Reservation Confirmed",
      message: `Your table at ${reservationDetails.restaurant.name} is confirmed for ${reservationDetails.reservationTime}.`,
      channels: ["websocket", "email", "sms"],
      priority: "high",
      category: "reservation",
      data: {
        restaurant: reservationDetails.restaurant,
        reservationTime: reservationDetails.reservationTime,
        partySize: reservationDetails.partySize,
        confirmationCode: reservationDetails.confirmationCode,
        details: reservationDetails,
      },
    });
  }

  async notifySystemAlert(userId, alertDetails) {
    return await this.sendNotification({
      userId,
      type: "system_alert",
      title: alertDetails.title,
      message: alertDetails.message,
      channels: ["websocket"],
      priority: alertDetails.severity === "critical" ? "urgent" : "normal",
      category: "system",
      data: alertDetails,
    });
  }

  async notifyWelcomeMessage(userId) {
    const user = await UserService.getUserById(userId);
    const userName = user.profile?.firstName || user.username;

    return await this.sendNotification({
      userId,
      type: "welcome",
      title: "Welcome to OmniDimension!",
      message: `Hello ${userName}! Welcome to OmniDimension Multi-Agent System. I'm here to help you with appointments, reservations, and more.`,
      channels: ["websocket", "email"],
      priority: "normal",
      category: "welcome",
      data: {
        actionUrl: `${process.env.FRONTEND_URL}/dashboard`,
        actionText: "Explore Dashboard",
      },
    });
  }

  // Analytics and management
  getQueueStats() {
    return {
      queueSize: this.notificationQueue.length,
      processingRate: "1 per second",
      uptime: process.uptime(),
      emailConfigured: !!this.emailTransporter,
      smsConfigured: !!this.twilioClient,
      timestamp: new Date().toISOString(),
    };
  }

  async getNotificationHistory(userId, limit = 50) {
    // In production, you'd store notification history in database
    // For now, return empty array
    return [];
  }

  shutdown() {
    try {
      logger.info("Shutting down notification service");

      if (this.processingInterval) {
        clearInterval(this.processingInterval);
      }

      // Process remaining notifications
      while (this.notificationQueue.length > 0) {
        const notification = this.notificationQueue.shift();
        // Mark as cancelled
        notification.status = "cancelled";
        notification.reason = "Service shutdown";
      }

      logger.info("Notification service shutdown complete");
    } catch (error) {
      logger.error("Notification service shutdown error:", error);
    }
  }
}

export default new NotificationService();