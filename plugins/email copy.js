// "use strict";

// const fp = require("fastify-plugin");
// const { Resend } = require("resend");

// module.exports = fp(async (fastify, opts) => {
//   const resend = new Resend(fastify.config.RESEND_API_KEY);

//   const email = {
//     sendInvoice: async (currentFastify, params) => {
//       try {
//         const emailTemplate = `
//         <!DOCTYPE html>
//         <html lang="en">
//         <head>
//           <meta charset="UTF-8">
//           <meta name="viewport" content="width=device-width, initial-scale=1.0">
//           <title>${params.title}</title>
//           <style>
//             * { margin: 0; padding: 0; box-sizing: border-box; }
//             body { 
//               font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
//               background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
//               margin: 0; 
//               padding: 20px;
//               line-height: 1.6;
//             }
//             .email-wrapper {
//               max-width: 650px;
//               margin: 0 auto;
//               background: #ffffff;
//               border-radius: 12px;
//               overflow: hidden;
//               box-shadow: 0 10px 30px rgba(0,0,0,0.1);
//             }
//             .email-header {
//               background: linear-gradient(135deg, #139393 0%, #0f7a7a 100%);
//               color: #ffffff;
//               padding: 40px 30px;
//               text-align: center;
//               position: relative;
//             }
//             .email-header::after {
//               content: '';
//               position: absolute;
//               bottom: -10px;
//               left: 50%;
//               transform: translateX(-50%);
//               width: 0;
//               height: 0;
//               border-left: 20px solid transparent;
//               border-right: 20px solid transparent;
//               border-top: 20px solid #139393;
//             }
//             .email-header h1 {
//               font-size: 28px;
//               font-weight: 700;
//               margin-bottom: 8px;
//               text-shadow: 0 2px 4px rgba(0,0,0,0.1);
//             }
//             .email-header .subtitle {
//               font-size: 16px;
//               opacity: 0.9;
//               font-weight: 300;
//             }
//             .email-body {
//               padding: 50px 40px 30px;
//               color: #333333;
//             }
//             .greeting {
//               font-size: 18px;
//               font-weight: 600;
//               color: #139393;
//               margin-bottom: 20px;
//             }
//             .content-section {
//               background: #f8fafb;
//               border-left: 4px solid #139393;
//               padding: 20px;
//               margin: 25px 0;
//               border-radius: 0 8px 8px 0;
//             }
//             .order-details {
//               display: flex;
//               justify-content: space-between;
//               flex-wrap: wrap;
//               gap: 15px;
//               margin: 20px 0;
//             }
//             .detail-item {
//               flex: 1;
//               min-width: 200px;
//             }
//             .detail-label {
//               font-weight: 600;
//               color: #666;
//               font-size: 14px;
//               text-transform: uppercase;
//               letter-spacing: 0.5px;
//             }
//             .detail-value {
//               font-size: 16px;
//               color: #333;
//               margin-top: 5px;
//             }
//             .button-container {
//               text-align: center;
//               margin: 35px 0;
//             }
//             .button {
//               display: inline-block;
//               padding: 16px 32px;
//               background: linear-gradient(135deg, #139393 0%, #0f7a7a 100%);
//               color: #ffffff;
//               text-decoration: none;
//               border-radius: 50px;
//               font-weight: 600;
//               font-size: 16px;
//               transition: all 0.3s ease;
//               box-shadow: 0 4px 15px rgba(19, 147, 147, 0.3);
//               text-transform: uppercase;
//               letter-spacing: 0.5px;
//             }
//             .button:hover {
//               transform: translateY(-2px);
//               box-shadow: 0 6px 20px rgba(19, 147, 147, 0.4);
//             }
//             .divider {
//               height: 1px;
//               background: linear-gradient(to right, transparent, #ddd, transparent);
//               margin: 30px 0;
//             }
//             .signature {
//               background: #f8fafb;
//               padding: 25px;
//               border-radius: 8px;
//               margin-top: 30px;
//             }
//             .signature-name {
//               font-weight: 600;
//               color: #139393;
//               font-size: 18px;
//               margin-bottom: 5px;
//             }
//             .signature-title {
//               color: #666;
//               font-style: italic;
//             }
//             .email-footer {
//               background: #2c3e50;
//               color: #ecf0f1;
//               text-align: center;
//               padding: 30px;
//               font-size: 14px;
//             }
//             .footer-logo {
//               font-size: 20px;
//               font-weight: 700;
//               color: #139393;
//               margin-bottom: 10px;
//             }
//             .footer-links {
//               margin: 15px 0;
//             }
//             .footer-links a {
//               color: #139393;
//               text-decoration: none;
//               margin: 0 10px;
//             }
//             @media (max-width: 600px) {
//               body { padding: 10px; }
//               .email-body { padding: 30px 20px; }
//               .order-details { flex-direction: column; }
//               .detail-item { min-width: auto; }
//               .button { padding: 14px 28px; font-size: 14px; }
//             }
//           </style>
//         </head>
//         <body>
//           <div class="email-wrapper">
//             <div class="email-header">
//               <h1>${params.title}</h1>
//               <div class="subtitle">Professional Service Invoice</div>
//             </div>
            
//             <div class="email-body">
//               <div class="greeting">Dear Logan,</div>
              
//               <p>We hope this message finds you well. We're pleased to provide you with the invoice for the professional services recently completed.</p>
              
//               <div class="content-section">
//                 <div class="order-details">
//                   <div class="detail-item">
//                     <div class="detail-label">Service Order</div>
//                     <div class="detail-value">${params.order_name || 'N/A'}</div>
//                   </div>
//                   <div class="detail-item">
//                     <div class="detail-label">Technician</div>
//                     <div class="detail-value">${params.technician_name || 'N/A'}</div>
//                   </div>
//                   <div class="detail-item">
//                     <div class="detail-label">Service Date</div>
//                     <div class="detail-value">${params.service_date || new Date().toLocaleDateString()}</div>
//                   </div>
//                 </div>
//               </div>
              
//               <p>We appreciate your continued trust in our services and are committed to delivering exceptional quality in every project we undertake.</p>
              
//               ${params.invoiceLink ? `
//               <div class="button-container">
//                 <a href="${params.invoiceLink}" class="button">View & Download Invoice</a>
//               </div>
//               ` : ''}
              
//               <div class="divider"></div>
              
//               <p>If you have any questions regarding this invoice or need any clarification about the services provided, please don't hesitate to reach out to us. We're here to help and ensure your complete satisfaction.</p>
              
//               <div class="signature">
//                 <div class="signature-name">${params.technician_name || 'Tape To Digital Team'}</div>
//                 <div class="signature-title">Professional Service Technician</div>
//               </div>
//             </div>
            
//             <div class="email-footer">
//               <div class="footer-logo">Tape To Digital</div>
//               <p>&copy; 2025 Tape To Digital. All Rights Reserved.</p>
//               <div class="footer-links">
//                 <a href="#">Privacy Policy</a> |
//                 <a href="#">Terms of Service</a> |
//                 <a href="#">Contact Support</a>
//               </div>
//               <p style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
//                 Preserving your memories with professional digitization services
//               </p>
//             </div>
//           </div>
//         </body>
//         </html>
//         `;

//         const response = await resend.emails.send({
//           from: "Tape To Digital <onboarding@resend.dev>",
//           to: params.email, 
//           subject: params.title,
//           html: emailTemplate,
//           // attachments: params.attachments || [],
//           // headers: params.headers || {},
//           // tags: params.tags || [],
//         });
        
//         console.log(response);
//         return response;
//       } catch (error) {
//         console.error("Error sending email:", error);
//         throw error;
//       }
//     },
//   };

//   fastify.decorate("email", email);
// });
