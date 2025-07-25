"use strict";
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

module.exports = async function (fastify, opts) {
  fastify.get(
    "/sync/:country_code",
    {
      schema: {
        tags: ["Wise"],
      },
    },
    async (request, reply) => {
      try {
         // check access start
        await fastify.access.isAuth(request, {
          id: 0,
          name: "Read",
        });
        //  check access end
        let data = [];
  const apiKeyName = `WISE_API_KEY_${request.params.country_code.toUpperCase()}`
    const apiKey = fastify.config[apiKeyName]
        const res = await fastify.axios.get(
          `${fastify.config.WISE_API_URL}/v1/accounts`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        data = res.data;

        const userData = data.map((user) => ({
          uuid: uuidv4(),
          wise_id: user.id,
          profile: user.profile,
          name:
            user.accountHolderName ||
            `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          email: user.details.email,
          country_code: user.country,
          currency: user.currency || null,
          created_at: moment().toISOString(),
          modified_at: moment().toISOString(),
        }));

        if (userData.length > 0) {
          await fastify.prisma.wise_users.createMany({
            data: userData,
            skipDuplicates: true,
          });
        }
        reply.send({ length: userData.length, data: userData });
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  // fastify.get(
  //   "/send-email",
  //   {
  //     schema: {
  //       tags: ["Wise"],
  //     },
  //   },
  //   async (request, reply) => {
  //     try {
  //       // Send invoice
  //       await fastify.email.sendInvoice(fastify, {
  //         user_uuid: "cb60a272-f3f3-481b-8ef9-8d7783ffd321",
  //         email: "nnirosh447@gmail.com",
  //         title: "Invoice #123",
  //         customer_name: "John Doe",
  //         order_name: "Tape Digitization",
  //         technician_name: "Niroshan V",
  //         service_date: "2025-01-15",
  //         invoiceLink: "https://storage.googleapis.com/customer-orders/dev/invoices/1751304380694.pdf",
  //       });
  //       reply.send({ mesage: "Success" });
  //     } catch (error) {
  //       reply.send(error);
  //     } finally {
  //       await fastify.prisma.$disconnect();
  //     }
  //   }
  // );

  // // New API endpoint to send money
  // fastify.post(
  //   "/send-money",
  //   {
  //     schema: {
  //       tags: ["Wise"],
  //       body: {
  //         type: "object",
  //         required: ["amount", "currency", "recipientId"],
  //         properties: {
  //           amount: {
  //             type: "number",
  //             minimum: 0.01,
  //             description: "Amount to send",
  //           },
  //           currency: {
  //             type: "string",
  //             description: "Currency code (e.g., USD, EUR, GBP)",
  //           },
  //           recipientId: {
  //             type: "number",
  //             description: "Wise recipient ID",
  //           },
  //           reference: {
  //             type: "string",
  //             description: "Payment reference (optional)",
  //           },
  //         },
  //       },
  //     },
  //   },
  //   async (request, reply) => {
  //     try {
  //       const { amount, currency, recipientId, reference } = request.body;
  //       const profileId = 28784896;

  //       // Step 1: Create a quote
  //       const quoteResponse = await fastify.axios.post(
  //         `${fastify.config.WISE_API_URL}/v2/quotes`,
  //         {
  //           sourceCurrency: currency,
  //           targetCurrency: currency,
  //           sourceAmount: amount,
  //           profile: profileId,
  //           payOut: "BANK_TRANSFER",
  //         },
  //         {
  //           headers: {
  //             Authorization: `Bearer ${fastify.config.WISE_API_KEY}`,
  //             "Content-Type": "application/json",
  //           },
  //         }
  //       );

  //       const quote = quoteResponse.data;

  //       // Step 2: Create a transfer
  //       const transferResponse = await fastify.axios.post(
  //         `${fastify.config.WISE_API_URL}/v1/transfers`,
  //         {
  //           targetAccount: recipientId,
  //           quoteUuid: quote.id,
  //           customerTransactionId: uuidv4(),
  //           details: {
  //             reference:
  //               reference ||
  //               `Transfer ${moment().format("YYYY-MM-DD HH:mm:ss")}`,
  //           },
  //         },
  //         {
  //           headers: {
  //             Authorization: `Bearer ${fastify.config.WISE_API_KEY}`,
  //             "Content-Type": "application/json",
  //           },
  //         }
  //       );

  //       const transfer = transferResponse.data;

  //       // Step 3: Fund the transfer (this would typically require additional authentication)
  //       // Note: In production, you might need to handle different funding methods
  //       const fundResponse = await fastify.axios.post(
  //         `${fastify.config.WISE_API_URL}/v3/profiles/${profileId}/transfers/${transfer.id}/payments`,
  //         {
  //           type: "BALANCE",
  //         },
  //         {
  //           headers: {
  //             Authorization: `Bearer ${fastify.config.WISE_API_KEY}`,
  //             "Content-Type": "application/json",
  //           },
  //         }
  //       );
  //       console.log(fundResponse);

  //       // Store transaction record in database (optional)
  //       const transactionData = {
  //         uuid: uuidv4(),
  //         wise_transfer_id: transfer.id,
  //         wise_quote_id: quote.id,
  //         recipient_id: recipientId,
  //         profile_id: profileId,
  //         amount: amount,
  //         currency: currency,
  //         reference:
  //           reference || `Transfer ${moment().format("YYYY-MM-DD HH:mm:ss")}`,
  //         status: transfer.status,
  //         created_at: moment().toISOString(),
  //         modified_at: moment().toISOString(),
  //       };

  //       // Uncomment if you have a transactions table
  //       // await fastify.prisma.wise_transactions.create({
  //       //   data: transactionData
  //       // });

  //       reply.send({
  //         success: true,
  //         message: "Money sent successfully",
  //         data: {
  //           transferId: transfer.id,
  //           quoteId: quote.id,
  //           amount: amount,
  //           currency: currency,
  //           status: transfer.status,
  //           reference:
  //             reference || `Transfer ${moment().format("YYYY-MM-DD HH:mm:ss")}`,
  //           estimatedDelivery: quote.deliveryEstimate,
  //         },
  //       });
  //     } catch (error) {
  //       console.error(
  //         "Send money error:",
  //         error.response?.data || error.message
  //       );
  //       reply.status(500).send({
  //         success: false,
  //         error:
  //           error.response?.data?.errors ||
  //           error.message ||
  //           "Failed to send money",
  //       });
  //     } finally {
  //       await fastify.prisma.$disconnect();
  //     }
  //   }
  // );

  // // API endpoint to check transfer status
  // fastify.get(
  //   "/transfer-status/:transferId",
  //   {
  //     schema: {
  //       tags: ["Wise"],
  //       params: {
  //         type: "object",
  //         required: ["transferId"],
  //         properties: {
  //           transferId: {
  //             type: "string",
  //             description: "Wise transfer ID",
  //           },
  //         },
  //       },
  //     },
  //   },
  //   async (request, reply) => {
  //     try {
  //       const { transferId } = request.params;

  //       const transferResponse = await fastify.axios.get(
  //         `${fastify.config.WISE_API_URL}/v1/transfers/${transferId}`,
  //         {
  //           headers: {
  //             Authorization: `Bearer ${fastify.config.WISE_API_KEY}`,
  //             "Content-Type": "application/json",
  //           },
  //         }
  //       );

  //       reply.send({
  //         success: true,
  //         data: transferResponse.data,
  //       });
  //     } catch (error) {
  //       console.error(
  //         "Transfer status error:",
  //         error.response?.data || error.message
  //       );
  //       reply.status(500).send({
  //         success: false,
  //         error:
  //           error.response?.data?.errors ||
  //           error.message ||
  //           "Failed to get transfer status",
  //       });
  //     } finally {
  //       await fastify.prisma.$disconnect();
  //     }
  //   }
  // );
};
