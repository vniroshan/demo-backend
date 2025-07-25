"use strict";

const fp = require("fastify-plugin");
const { google } = require("googleapis");
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

module.exports = fp(async (fastify, opts) => {
  // Helper function to download file from URL
  async function downloadFile(url, filename) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith("https:") ? https : http;
      const file = fs.createWriteStream(filename);

      protocol
        .get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(
              new Error(`Failed to download file: ${response.statusCode}`)
            );
            return;
          }

          response.pipe(file);

          file.on("finish", () => {
            file.close();
            resolve(filename);
          });

          file.on("error", (err) => {
            fs.unlink(filename, () => {}); // Delete the file on error
            reject(err);
          });
        })
        .on("error", (err) => {
          reject(err);
        });
    });
  }

  // Helper function to send email via Gmail API with attachment
  async function sendGmailWithTokenOld(
    auth,
    to,
    subject,
    htmlBody,
    textBody = "",
    attachments = []
  ) {
    const gmail = google.gmail({ version: "v1", auth });

    // Create multipart email with attachments
    const boundary = `boundary_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    let emailContent = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=utf-8",
      "Content-Transfer-Encoding: 7bit",
      "",
      htmlBody || textBody,
      "",
    ];

    // Add attachments
    for (const attachment of attachments) {
      const fileContent = fs.readFileSync(attachment.path);
      const base64Content = fileContent.toString("base64");

      emailContent.push(`--${boundary}`);
      emailContent.push(
        `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`
      );
      emailContent.push(
        `Content-Disposition: attachment; filename="${attachment.filename}"`
      );
      emailContent.push("Content-Transfer-Encoding: base64");
      emailContent.push("");

      // Split base64 content into 76-character lines (RFC 2045)
      const lines = base64Content.match(/.{1,76}/g) || [];
      emailContent.push(...lines);
      emailContent.push("");
    }

    emailContent.push(`--${boundary}--`);

    const email = emailContent.join("\n");

    // Encode email in base64url format
    const encodedEmail = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    try {
      const result = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedEmail,
        },
      });

      return result.data;
    } catch (error) {
      console.error("Gmail API Error:", error);
      throw error;
    }
  }
  async function sendGmailWithTokenV2(
    auth,
    options,
    subject,
    htmlBody,
    textBody = "",
    attachments = []
  ) {
    const gmail = google.gmail({ version: "v1", auth });

    const boundary = `boundary_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Helper function to format email addresses
    const formatEmailList = (emails) => {
      if (!emails) return "";
      if (typeof emails === "string") return emails;
      if (Array.isArray(emails)) return emails.join(", ");
      return "";
    };

    // Support both old format (single to) and new format (options object)
    let to, cc, bcc;
    if (typeof options === "string") {
      // Backward compatibility: old format where second param was 'to'
      to = options;
      cc = "";
      bcc = "";
    } else {
      // New format: options object
      to = formatEmailList(options.to);
      cc = formatEmailList(options.cc);
      bcc = formatEmailList(options.bcc);
    }

    let emailContent = [
      `To: ${to}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ];

    // Add CC if provided
    if (cc) {
      emailContent.push(`Cc: ${cc}`);
    }

    // Add BCC if provided
    if (bcc) {
      emailContent.push(`Bcc: ${bcc}`);
    }

    // Add subject
    emailContent.push(`Subject: ${subject}`);

    // Add empty line before body
    emailContent.push("");

    // Add HTML/text body
    emailContent.push(`--${boundary}`);
    emailContent.push("Content-Type: text/html; charset=utf-8");
    emailContent.push("Content-Transfer-Encoding: 7bit");
    emailContent.push("");
    emailContent.push(htmlBody || textBody);
    emailContent.push("");

    // Add attachments
    for (const attachment of attachments) {
      let fileContent;

      if (attachment.content) {
        // In-memory buffer (recommended)
        fileContent = Buffer.isBuffer(attachment.content)
          ? attachment.content
          : Buffer.from(attachment.content);
      } else if (attachment.path) {
        // Disk-based file
        fileContent = fs.readFileSync(attachment.path);
      } else {
        console.warn("Invalid attachment: missing content or path");
        continue;
      }

      const base64Content = fileContent.toString("base64");
      const base64Lines = base64Content.match(/.{1,76}/g) || [];

      emailContent.push(`--${boundary}`);
      emailContent.push(
        `Content-Type: ${
          attachment.mimeType || "application/octet-stream"
        }; name="${attachment.filename}"`
      );
      emailContent.push(
        `Content-Disposition: attachment; filename="${attachment.filename}"`
      );
      emailContent.push("Content-Transfer-Encoding: base64");
      emailContent.push("");
      emailContent.push(...base64Lines);
      emailContent.push("");
    }

    emailContent.push(`--${boundary}--`);

    const email = emailContent.join("\n");

    const encodedEmail = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    try {
      const result = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedEmail,
        },
      });

      return result.data;
    } catch (error) {
      console.error("Gmail API Error:", error.errors || error.message || error);
      throw error;
    }
  }
  async function sendGmailWithToken(
    auth,
    to,
    subject,
    htmlBody,
    textBody = "",
    attachments = []
  ) {
    const gmail = google.gmail({ version: "v1", auth });

    const boundary = `boundary_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    let emailContent = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=utf-8",
      "Content-Transfer-Encoding: 7bit",
      "",
      htmlBody || textBody,
      "",
    ];

    for (const attachment of attachments) {
      let fileContent;

      if (attachment.content) {
        // In-memory buffer (recommended)
        fileContent = Buffer.isBuffer(attachment.content)
          ? attachment.content
          : Buffer.from(attachment.content);
      } else if (attachment.path) {
        // Disk-based file
        fileContent = fs.readFileSync(attachment.path);
      } else {
        console.warn("Invalid attachment: missing content or path");
        continue;
      }

      const base64Content = fileContent.toString("base64");
      const base64Lines = base64Content.match(/.{1,76}/g) || [];

      emailContent.push(`--${boundary}`);
      emailContent.push(
        `Content-Type: ${
          attachment.mimeType || "application/octet-stream"
        }; name="${attachment.filename}"`
      );
      emailContent.push(
        `Content-Disposition: attachment; filename="${attachment.filename}"`
      );
      emailContent.push("Content-Transfer-Encoding: base64");
      emailContent.push("");
      emailContent.push(...base64Lines);
      emailContent.push("");
    }

    emailContent.push(`--${boundary}--`);

    const email = emailContent.join("\n");

    const encodedEmail = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    try {
      const result = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedEmail,
        },
      });

      return result.data;
    } catch (error) {
      console.error("Gmail API Error:", error.errors || error.message || error);
      throw error;
    }
  }
  // Helper function to get Google Auth from technician/location
  async function getGoogleAuthForUser(userUuid) {
    const user = await fastify.prisma.users.findUnique({
      where: {
        uuid: userUuid,
      },
    });

    if (!user) {
      throw new Error("User or technician not found");
    }
    if (!user.google_calendar_token) {
      throw new Error("Google token not found for this technician");
    }

    const google_token = JSON.parse(user.google_calendar_token);

    const auth = new google.auth.OAuth2(
      fastify.config.GOOGLE_CLIENT_ID,
      fastify.config.GOOGLE_CLIENT_SECRET,
      fastify.config.CLIENT_APP_URL
    );

    auth.setCredentials(google_token);
    return auth;
  }

  // Helper function to get MIME type based on file extension
  function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".txt": "text/plain",
      ".csv": "text/csv",
    };
    return mimeTypes[ext] || "application/octet-stream";
  }

  // Helper function to clean up temporary files
  function cleanupTempFiles(files) {
    files.forEach((file) => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          console.log(`Cleaned up temp file: ${file}`);
        }
      } catch (error) {
        console.error(`Error cleaning up temp file ${file}:`, error);
      }
    });
  }

  const email = {
    sendInvoice: async (currentFastify, params) => {
      let tempFiles = [];

      try {
        // Get Google Auth for the location
        const auth = await getGoogleAuthForUser(params.user_uuid);

        // Prepare attachments array
        let attachments = [];

        // Download invoice if URL is provided
        if (params.invoiceLink) {
          try {
            // Create temp directory if it doesn't exist
            // const tempDir = path.join(__dirname, '..', 'temp');
            //  const tempDir = '/tmp'
            //   if (!fs.existsSync(tempDir)) {
            //     fs.mkdirSync(tempDir, { recursive: true });
            //   }

            // Generate unique filename for the invoice
            const timestamp = Date.now();
            const invoiceFilename = `invoice_${
              params.order_name || "invoice"
            }_${timestamp}.pdf`;
            // const tempFilePath = path.join(tempDir, invoiceFilename);

            // console.log(`Downloading invoice from: ${params.invoiceLink}`);
            // await downloadFile(params.invoiceLink, tempFilePath);

            const response = await fastify.axios.get(params.invoiceLink, {
              responseType: "arraybuffer",
            });
            attachments.push({
              filename: invoiceFilename,
              content: Buffer.from(response.data),
              contentType: getMimeType("invoice.pdf"), // optional
            });

            // // Add to attachments
            // attachments.push({
            //   path: tempFilePath,
            //   filename: invoiceFilename,
            //   mimeType: getMimeType(invoiceFilename)
            // });

            // Track temp file for cleanup
            // tempFiles.push(tempFilePath);

          } catch (downloadError) {
            console.error("Error downloading invoice:", downloadError);
            // Continue without attachment if download fails
          }
        }

        // Add any additional attachments if provided
        // if (params.attachments && Array.isArray(params.attachments)) {
        //   for (const attachment of params.attachments) {
        //     if (attachment.path && fs.existsSync(attachment.path)) {
        //       attachments.push({
        //         path: attachment.path,
        //         filename: attachment.filename || path.basename(attachment.path),
        //         mimeType: attachment.mimeType || getMimeType(attachment.path)
        //       });
        //     }
        //   }
        // }

        const emailTemplate = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${params.title}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              margin: 0; 
              padding: 20px;
              line-height: 1.6;
            }
            .email-wrapper {
              max-width: 650px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            .email-header {
              background: linear-gradient(135deg, #139393 0%, #0f7a7a 100%);
              color: #ffffff;
              padding: 40px 30px;
              text-align: center;
              position: relative;
            }
            .email-header::after {
              content: '';
              position: absolute;
              bottom: -10px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 20px solid transparent;
              border-right: 20px solid transparent;
              border-top: 20px solid #139393;
            }
            .email-header h1 {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 8px;
              text-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .email-header .subtitle {
              font-size: 16px;
              opacity: 0.9;
              font-weight: 300;
            }
            .email-body {
              padding: 50px 40px 30px;
              color: #333333;
            }
            .greeting {
              font-size: 18px;
              font-weight: 600;
              color: #139393;
              margin-bottom: 20px;
            }
            .content-section {
              background: #f8fafb;
              border-left: 4px solid #139393;
              padding: 20px;
              margin: 25px 0;
              border-radius: 0 8px 8px 0;
            }
            .order-details {
              display: flex;
              justify-content: space-between;
              flex-wrap: wrap;
              gap: 15px;
              margin: 20px 0;
            }
            .detail-item {
              flex: 1;
              min-width: 200px;
            }
            .detail-label {
              font-weight: 600;
              color: #666;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .detail-value {
              font-size: 16px;
              color: #333;
              margin-top: 5px;
            }
            .attachment-notice {
              background: #e8f5e8;
              border: 1px solid #4caf50;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
              color: #2e7d32;
            }
            .attachment-notice .icon {
              font-size: 18px;
              margin-right: 8px;
            }
            .divider {
              height: 1px;
              background: linear-gradient(to right, transparent, #ddd, transparent);
              margin: 30px 0;
            }
            .signature {
              background: #f8fafb;
              padding: 25px;
              border-radius: 8px;
              margin-top: 30px;
            }
            .signature-name {
              font-weight: 600;
              color: #139393;
              font-size: 18px;
              margin-bottom: 5px;
            }
            .signature-title {
              color: #666;
              font-style: italic;
            }
            .email-footer {
              background: #2c3e50;
              color: #ecf0f1;
              text-align: center;
              padding: 30px;
              font-size: 14px;
            }
            .footer-logo {
              font-size: 20px;
              font-weight: 700;
              color: #139393;
              margin-bottom: 10px;
            }
            .footer-links {
              margin: 15px 0;
            }
            .footer-links a {
              color: #139393;
              text-decoration: none;
              margin: 0 10px;
            }
            @media (max-width: 600px) {
              body { padding: 10px; }
              .email-body { padding: 30px 20px; }
              .order-details { flex-direction: column; }
              .detail-item { min-width: auto; }
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-header">
              <h1>${params.title}</h1>
              <div class="subtitle">Professional Service Invoice</div>
            </div>
            
            <div class="email-body">
              <div class="greeting">Dear Logan,</div>
              
              <p>I hope this message finds you well. I'm pleased to provide you with the invoice for the professional services recently completed.</p>
              
              <div class="content-section">
                <div class="order-details">
                  <div class="detail-item">
                    <div class="detail-label">Service Order</div>
                    <div class="detail-value">${
                      params.order_name || "N/A"
                    }</div>
                  </div>
                </div>
              </div>
              
              ${
                attachments.length > 0
                  ? `
              <div class="attachment-notice">
                <span class="icon">📎</span>
                <strong>Invoice Attached:</strong> Please find your invoice attached to this email as a PDF document.
              </div>
              `
                  : ""
              }
              
              <p>I appreciate your continued trust in our services and are committed to delivering exceptional quality in every project I undertake.</p>
              
              <div class="divider"></div>
              
              <p>If you have any questions regarding this invoice or need any clarification about the services provided, please don't hesitate to reach out to us. We're here to help and ensure your complete satisfaction.</p>
              
                            <div class="signature">
                <div class="signature-name">${params.technician_name}</div>
                <div class="signature-title">Professional Service Technician</div>
              </div>
            </div>
            
            <div class="email-footer">
              <div class="footer-logo">Tape To Digital</div>
              <p>&copy; 2025 Tape To Digital. All Rights Reserved.</p>
              <div class="footer-links">
                <a href="#">Privacy Policy</a> |
                <a href="#">Terms of Service</a> |
                <a href="#">Contact Support</a>
              </div>
              <p style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
                Preserving your memories with professional digitization services
              </p>
            </div>
          </div>
        </body>
        </html>
        `;

        const response = await sendGmailWithToken(
          auth,
          params.email,
          params.title,
          emailTemplate,
          "", // textBody
          attachments
        );

        return response;
      } catch (error) {
        console.error("Error sending invoice email:", error);
        throw error;
      } finally {
        // Clean up temporary files
        if (tempFiles.length > 0) {
          setTimeout(() => {
            cleanupTempFiles(tempFiles);
          }, 5000); // Wait 5 seconds before cleanup to ensure email is sent
        }
      }
    },

    // Updated booking confirmation method to support attachments
    sendBookingConfirmation: async (params) => {
      try {
        const auth = await getGoogleAuthForUser(params.user_uuid);

        const emailTemplate = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmation</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              margin: 0; 
              padding: 20px;
              line-height: 1.6;
            }
            .email-wrapper {
              max-width: 650px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            .email-header {
              background: linear-gradient(135deg, #139393 0%, #0f7a7a 100%);
              color: #ffffff;
              padding: 40px 30px;
              text-align: center;
            }
            .email-header h1 {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 8px;
            }
            .email-body {
              padding: 40px;
              color: #333333;
            }
            .greeting {
              font-size: 18px;
              font-weight: 600;
              color: #139393;
              margin-bottom: 20px;
            }
            .booking-details {
              background: #f8fafb;
              border-left: 4px solid #139393;
              padding: 20px;
              margin: 25px 0;
              border-radius: 0 8px 8px 0;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              padding: 8px 0;
              border-bottom: 1px solid #eee;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-weight: 600;
              color: #666;
            }
            .detail-value {
              color: #333;
            }
            .email-footer {
              background: #2c3e50;
              color: #ecf0f1;
              text-align: center;
              padding: 30px;
              font-size: 14px;
            }
            .footer-logo {
              font-size: 20px;
              font-weight: 700;
              color: #139393;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-header">
              <h1>Booking Confirmation</h1>
            </div>
            
            <div class="email-body">
              <div class="greeting">Dear ${params.first_name} ${params.last_name},</div>
              
              <p>Thank you for your booking! We're pleased to confirm your appointment with the following details:</p>
              
              <div class="booking-details">
                <div class="detail-row">
                  <span class="detail-label">Booking ID:</span>
                  <span class="detail-value">${params.booking_uuid}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Location:</span>
                  <span class="detail-value">${params.location_name}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${params.date}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">${params.time_start} - ${params.time_end}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Contact:</span>
                  <span class="detail-value">${params.mobile}</span>
                </div>
              </div>
              
              <p>Please arrive 10 minutes before your scheduled time. If you need to reschedule or cancel your appointment, please contact us as soon as possible.</p>
              
              <p>We look forward to serving you!</p>
            </div>
            
            <div class="email-footer">
              <div class="footer-logo">Tape To Digital</div>
              <p>&copy; 2025 Tape To Digital. All Rights Reserved.</p>
              <p style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
                Preserving your memories with professional digitization services
              </p>
            </div>
          </div>
        </body>
        </html>
        `;

        // Handle attachments if provided
        let attachments = [];
        if (params.attachments && Array.isArray(params.attachments)) {
          attachments = params.attachments
            .filter((att) => att.path && fs.existsSync(att.path))
            .map((att) => ({
              path: att.path,
              filename: att.filename || path.basename(att.path),
              mimeType: att.mimeType || getMimeType(att.path),
            }));
        }

        const response = await sendGmailWithToken(
          auth,
          params.email,
          `Booking Confirmation - ${params.location_name}`,
          emailTemplate,
          "", // textBody
          attachments
        );
        return response;
      } catch (error) {
        console.error("Error sending booking confirmation:", error);
        throw error;
      }
    },

    // Updated custom email method to support attachments
    sendCustomEmail: async (params) => {
      let tempFiles = [];

      try {
        const auth = await getGoogleAuthForUser(params.user_uuid);

        // Handle file downloads if URLs are provided
        let attachments = [];

        if (params.attachment_urls && Array.isArray(params.attachment_urls)) {
          const tempDir = path.join(__dirname, "..", "temp");
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          for (let i = 0; i < params.attachment_urls.length; i++) {
            const url = params.attachment_urls[i];
            try {
              const timestamp = Date.now();
              const filename =
                params.attachment_names?.[i] || `attachment_${i}_${timestamp}`;
              const tempFilePath = path.join(tempDir, filename);

              await downloadFile(url, tempFilePath);

              attachments.push({
                path: tempFilePath,
                filename: filename,
                mimeType: getMimeType(filename),
              });

              tempFiles.push(tempFilePath);
            } catch (downloadError) {
              console.error(
                `Error downloading attachment ${i}:`,
                downloadError
              );
            }
          }
        }

        // Handle local file attachments
        if (params.attachments && Array.isArray(params.attachments)) {
          for (const attachment of params.attachments) {
            if (attachment.path && fs.existsSync(attachment.path)) {
              attachments.push({
                path: attachment.path,
                filename: attachment.filename || path.basename(attachment.path),
                mimeType: attachment.mimeType || getMimeType(attachment.path),
              });
            }
          }
        }

        const response = await sendGmailWithToken(
          auth,
          params.to_email,
          params.subject,
          params.html_message || params.message,
          params.message,
          attachments
        );
        return response;
      } catch (error) {
        console.error("Error sending custom email:", error);
        throw error;
      } finally {
        // Clean up temporary files
        if (tempFiles.length > 0) {
          setTimeout(() => {
            cleanupTempFiles(tempFiles);
          }, 5000);
        }
      }
    },

    sendSimpleEmail: async (params) => {
      try {
        const auth = await getGoogleAuthForUser(params.user_uuid);

        const simpleTemplate = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${params.title}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            .header { 
              background: #139393; 
              color: white; 
              padding: 20px; 
              text-align: center; 
              border-radius: 8px 8px 0 0; 
            }
            .content { 
              background: #f9f9f9; 
              padding: 30px; 
              border-radius: 0 0 8px 8px; 
            }
            .footer { 
              text-align: center; 
              margin-top: 20px; 
              font-size: 12px; 
              color: #666; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Tape To Digital</h2>
          </div>
          <div class="content">
            ${
              params.html_message ||
              `<p>${params.message.replace(/\n/g, "<br>")}</p>`
            }
          </div>
          <div class="footer">
            <p>&copy; 2025 Tape To Digital. All Rights Reserved.</p>
          </div>
        </body>
        </html>
        `;

        const response = await sendGmailWithTokenV2(
          auth,
          {
            to: params.recipients,
            cc: [params.cc_email],
          },
          params.title,
          simpleTemplate,
          "", // textBody
        );
        return response;
      } catch (error) {
        console.error("Error sending simple email:", error);
        throw error;
      }
    },
  };

  fastify.decorate("email", email);
});
