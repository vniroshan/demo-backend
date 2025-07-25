"use strict";
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

module.exports = async function (fastify, opts) {
  // NEW: Sync jars (multi-currency accounts/balances) from Wise
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
      const { country_code } = request.params;
      const apiKeyName = `WISE_API_KEY_${country_code.toUpperCase()}`;
      const apiKey = fastify.config[apiKeyName];


      // If profileId is not provided, fetch business profile ID from Wise
        const profilesResponse = await fastify.axios.get(
          `${fastify.config.WISE_API_URL}/v1/profiles`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        const profiles = profilesResponse.data;
        const businessProfile = profiles.find((p) => p.type === "business");

        if (!businessProfile) {
          return reply.status(404).send({
            success: false,
            message: "Business profile not found",
          });
        }

        let profileId = businessProfile.id;

      // Get balances (jars) from Wise
      const balancesResponse = await fastify.axios.get(
        `${fastify.config.WISE_API_URL}/v4/profiles/${profileId}/balances?types=STANDARD`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const balances = balancesResponse.data;

      const jarData = balances.map((balance) => ({
        uuid: uuidv4(),
        wise_balance_id: balance.id,
        profile: profileId,
        currency: balance.currency,
        name: `${balance.currency} Jar`,
        country_code: request.params.country_code,
        type: balance.type || "STANDARD",
        created_at: moment().toISOString(),
        modified_at: moment().toISOString(),
      }));

      // Optional: Save jars to DB
      await fastify.prisma.wise_jars.createMany({
        data: jarData,
        skipDuplicates: true,
      });

      reply.send({
        success: true,
        message: "Jars synced successfully",
        profileId,
        length: jarData.length,
        data: jarData,
      });
    } catch (error) {
      console.error("Sync jars error:", error.response?.data || error.message);
      reply.status(500).send({
        success: false,
        error:
          error.response?.data?.errors || error.message || "Failed to sync jars",
      });
    } finally {
      await fastify.prisma.$disconnect();
    }
  }
);

  // // MODIFIED: Send money to selected jar
  // fastify.post(
  //   "/send-money-to-jar",
  //   {
  //     schema: {
  //       tags: ["Wise"],
  //       body: {
  //         type: "object",
  //         required: ["amount", "jarId", "recipientId"],
  //         properties: {
  //           amount: {
  //             type: "number",
  //             minimum: 0.01,
  //             description: "Amount to send",
  //           },
  //           jarId: {
  //             type: "string",
  //             description: "UUID of the jar to send money from",
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
  //       const { amount, jarId, recipientId, reference } = request.body;

  //       // Get jar details from database
  //       const jar = await fastify.prisma.wise_jars.findUnique({
  //         where: { uuid: jarId },
  //       });

  //       if (!jar) {
  //         return reply.status(404).send({
  //           success: false,
  //           error: "Jar not found",
  //         });
  //       }

  //       // Check if jar has sufficient balance
  //       if (jar.available_amount < amount) {
  //         return reply.status(400).send({
  //           success: false,
  //           error: "Insufficient balance in jar",
  //         });
  //       }

  //       const profileId = jar.profile_id;
  //       const currency = jar.currency;

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
  //               `Transfer from ${currency} jar ${moment().format(
  //                 "YYYY-MM-DD HH:mm:ss"
  //               )}`,
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

  //       // Step 3: Fund the transfer from the specific jar (balance)
  //       const fundResponse = await fastify.axios.post(
  //         `${fastify.config.WISE_API_URL}/v3/profiles/${profileId}/transfers/${transfer.id}/payments`,
  //         {
  //           type: "BALANCE",
  //           balanceId: jar.wise_balance_id, // Use specific jar's balance ID
  //         },
  //         {
  //           headers: {
  //             Authorization: `Bearer ${fastify.config.WISE_API_KEY}`,
  //             "Content-Type": "application/json",
  //           },
  //         }
  //       );

  //       // Store transaction record in database
  //       const transactionData = {
  //         uuid: uuidv4(),
  //         wise_transfer_id: transfer.id,
  //         wise_quote_id: quote.id,
  //         jar_id: jarId,
  //         recipient_id: recipientId,
  //         profile_id: profileId,
  //         amount: amount,
  //         currency: currency,
  //         reference:
  //           reference ||
  //           `Transfer from ${currency} jar ${moment().format(
  //             "YYYY-MM-DD HH:mm:ss"
  //           )}`,
  //         status: transfer.status,
  //         created_at: moment().toISOString(),
  //         modified_at: moment().toISOString(),
  //       };

  //       // Store transaction (uncomment if you have a transactions table)
  //       // await fastify.prisma.wise_transactions.create({
  //       //   data: transactionData
  //       // });

  //       // Update jar balance (optional - you might want to sync instead)
  //       await fastify.prisma.wise_jars.update({
  //         where: { uuid: jarId },
  //         data: {
  //           available_amount: jar.available_amount - amount,
  //           modified_at: moment().toISOString(),
  //         },
  //       });

  //       reply.send({
  //         success: true,
  //         message: "Money sent successfully from jar",
  //         data: {
  //           transferId: transfer.id,
  //           quoteId: quote.id,
  //           jarId: jarId,
  //           jarCurrency: currency,
  //           amount: amount,
  //           status: transfer.status,
  //           reference:
  //             reference ||
  //             `Transfer from ${currency} jar ${moment().format(
  //               "YYYY-MM-DD HH:mm:ss"
  //             )}`,
  //           estimatedDelivery: quote.deliveryEstimate,
  //         },
  //       });
  //     } catch (error) {
  //       console.error(
  //         "Send money to jar error:",
  //         error.response?.data || error.message
  //       );
  //       reply.status(500).send({
  //         success: false,
  //         error:
  //           error.response?.data?.errors ||
  //           error.message ||
  //           "Failed to send money from jar",
  //       });
  //     } finally {
  //       await fastify.prisma.$disconnect();
  //     }
  //   }
  // );

  // // NEW: Get jar balance in real-time from Wise
  // fastify.get(
  //   "/jar-balance/:jarId",
  //   {
  //     schema: {
  //       tags: ["Wise"],
  //       params: {
  //         type: "object",
  //         required: ["jarId"],
  //         properties: {
  //           jarId: {
  //             type: "string",
  //             description: "Jar UUID",
  //           },
  //         },
  //       },
  //     },
  //   },
  //   async (request, reply) => {
  //     try {
  //       const { jarId } = request.params;

  //       // Get jar from database
  //       const jar = await fastify.prisma.wise_jars.findUnique({
  //         where: { uuid: jarId },
  //       });

  //       if (!jar) {
  //         return reply.status(404).send({
  //           success: false,
  //           error: "Jar not found",
  //         });
  //       }

  //       // Get real-time balance from Wise
  //       const balanceResponse = await fastify.axios.get(
  //         `${fastify.config.WISE_API_URL}/v4/profiles/${jar.profile_id}/balances/${jar.wise_balance_id}`,
  //         {
  //           headers: {
  //             Authorization: `Bearer ${fastify.config.WISE_API_KEY}`,
  //             "Content-Type": "application/json",
  //           },
  //         }
  //       );

  //       const balance = balanceResponse.data;

  //       // Update jar in database with latest balance
  //       const updatedJar = await fastify.prisma.wise_jars.update({
  //         where: { uuid: jarId },
  //         data: {
  //           amount: balance.amount.value,
  //           reserved_amount: balance.reservedAmount?.value || 0,
  //           available_amount:
  //             balance.amount.value - (balance.reservedAmount?.value || 0),
  //           modified_at: moment().toISOString(),
  //         },
  //       });

  //       reply.send({
  //         success: true,
  //         data: {
  //           jarId: jarId,
  //           currency: balance.currency,
  //           totalAmount: balance.amount.value,
  //           reservedAmount: balance.reservedAmount?.value || 0,
  //           availableAmount:
  //             balance.amount.value - (balance.reservedAmount?.value || 0),
  //           lastUpdated: moment().toISOString(),
  //         },
  //       });
  //     } catch (error) {
  //       console.error(
  //         "Get jar balance error:",
  //         error.response?.data || error.message
  //       );
  //       reply.status(500).send({
  //         success: false,
  //         error:
  //           error.response?.data?.errors ||
  //           error.message ||
  //           "Failed to get jar balance",
  //       });
  //     } finally {
  //       await fastify.prisma.$disconnect();
  //     }
  //   }
  // );

  // // NEW: Transfer money between jars (currency conversion)
  // fastify.post(
  //   "/transfer-between-jars",
  //   {
  //     schema: {
  //       tags: ["Wise"],
  //       body: {
  //         type: "object",
  //         required: ["amount", "fromJarId", "toJarId"],
  //         properties: {
  //           amount: {
  //             type: "number",
  //             minimum: 0.01,
  //             description: "Amount to transfer",
  //           },
  //           fromJarId: {
  //             type: "string",
  //             description: "Source jar UUID",
  //           },
  //           toJarId: {
  //             type: "string",
  //             description: "Destination jar UUID",
  //           },
  //         },
  //       },
  //     },
  //   },
  //   async (request, reply) => {
  //     try {
  //       const { amount, fromJarId, toJarId } = request.body;

  //       // Get both jars from database
  //       const fromJar = await fastify.prisma.wise_jars.findUnique({
  //         where: { uuid: fromJarId },
  //       });

  //       const toJar = await fastify.prisma.wise_jars.findUnique({
  //         where: { uuid: toJarId },
  //       });

  //       if (!fromJar || !toJar) {
  //         return reply.status(404).send({
  //           success: false,
  //           error: "One or both jars not found",
  //         });
  //       }

  //       if (fromJar.available_amount < amount) {
  //         return reply.status(400).send({
  //           success: false,
  //           error: "Insufficient balance in source jar",
  //         });
  //       }

  //       // Create currency conversion transfer via Wise
  //       const conversionResponse = await fastify.axios.post(
  //         `${fastify.config.WISE_API_URL}/v2/profiles/${fromJar.profile_id}/balance-movements`,
  //         {
  //           sourceBalanceId: fromJar.wise_balance_id,
  //           targetBalanceId: toJar.wise_balance_id,
  //           sourceAmount: {
  //             value: amount,
  //             currency: fromJar.currency,
  //           },
  //         },
  //         {
  //           headers: {
  //             Authorization: `Bearer ${fastify.config.WISE_API_KEY}`,
  //             "Content-Type": "application/json",
  //           },
  //         }
  //       );

  //       const conversion = conversionResponse.data;

  //       // Update both jars in database (you might want to sync instead)
  //       await fastify.prisma.wise_jars.update({
  //         where: { uuid: fromJarId },
  //         data: {
  //           available_amount: fromJar.available_amount - amount,
  //           modified_at: moment().toISOString(),
  //         },
  //       });

  //       reply.send({
  //         success: true,
  //         message: "Transfer between jars completed successfully",
  //         data: {
  //           conversionId: conversion.id,
  //           fromJar: {
  //             id: fromJarId,
  //             currency: fromJar.currency,
  //             amountTransferred: amount,
  //           },
  //           toJar: {
  //             id: toJarId,
  //             currency: toJar.currency,
  //             estimatedAmount: conversion.targetAmount?.value || "Pending",
  //           },
  //           exchangeRate: conversion.rate,
  //           status: conversion.status,
  //         },
  //       });
  //     } catch (error) {
  //       console.error(
  //         "Transfer between jars error:",
  //         error.response?.data || error.message
  //       );
  //       reply.status(500).send({
  //         success: false,
  //         error:
  //           error.response?.data?.errors ||
  //           error.message ||
  //           "Failed to transfer between jars",
  //       });
  //     } finally {
  //       await fastify.prisma.$disconnect();
  //     }
  //   }
  // );

  // // NEW: Transfer money TO a selected jar from main account
  // fastify.post(
  //   "/fund-jar",
  //   {
  //     schema: {
  //       tags: ["Wise"],
  //       body: {
  //         type: "object",
  //         required: ["amount", "jarId", "sourceType"],
  //         properties: {
  //           amount: {
  //             type: "number",
  //             minimum: 0.01,
  //             description: "Amount to transfer to jar",
  //           },
  //           jarId: {
  //             type: "string",
  //             description: "Target jar UUID to fund",
  //           },
  //           sourceType: {
  //             type: "string",
  //             enum: ["BANK_TRANSFER", "DEBIT_CARD", "CREDIT_CARD", "BALANCE"],
  //             description: "Source of funding",
  //           },
  //           sourceBalanceId: {
  //             type: "number",
  //             description:
  //               "Source balance ID (if transferring from another balance)",
  //           },
  //           bankDetails: {
  //             type: "object",
  //             description: "Bank details if funding via bank transfer",
  //             properties: {
  //               accountNumber: { type: "string" },
  //               routingNumber: { type: "string" },
  //               bankName: { type: "string" },
  //             },
  //           },
  //         },
  //       },
  //     },
  //   },
  //   async (request, reply) => {
  //     try {
  //       const { amount, jarId, sourceType, sourceBalanceId, bankDetails } =
  //         request.body;

  //       // Get target jar from database
  //       const targetJar = await fastify.prisma.wise_jars.findUnique({
  //         where: { uuid: jarId },
  //       });

  //       if (!targetJar) {
  //         return reply.status(404).send({
  //           success: false,
  //           error: "Target jar not found",
  //         });
  //       }

  //       const profileId = targetJar.profile_id;
  //       let fundingResponse;

  //       switch (sourceType) {
  //         case "BALANCE":
  //           // Transfer from another balance to this jar
  //           if (!sourceBalanceId) {
  //             return reply.status(400).send({
  //               success: false,
  //               error: "Source balance ID required for balance transfer",
  //             });
  //           }

  //           fundingResponse = await fastify.axios.post(
  //             `${fastify.config.WISE_API_URL}/v2/profiles/${profileId}/balance-movements`,
  //             {
  //               sourceBalanceId: sourceBalanceId,
  //               targetBalanceId: targetJar.wise_balance_id,
  //               sourceAmount: {
  //                 value: amount,
  //                 currency: targetJar.currency,
  //               },
  //             },
  //             {
  //               headers: {
  //                 Authorization: `Bearer ${fastify.config.WISE_API_KEY}`,
  //                 "Content-Type": "application/json",
  //               },
  //             }
  //           );
  //           break;

  //         case "BANK_TRANSFER":
  //           // Fund jar via bank transfer
  //           fundingResponse = await fastify.axios.post(
  //             `${fastify.config.WISE_API_URL}/v3/profiles/${profileId}/balances/${targetJar.wise_balance_id}/top-ups`,
  //             {
  //               amount: {
  //                 value: amount,
  //                 currency: targetJar.currency,
  //               },
  //               type: "BANK_TRANSFER",
  //               details: bankDetails || {},
  //             },
  //             {
  //               headers: {
  //                 Authorization: `Bearer ${fastify.config.WISE_API_KEY}`,
  //                 "Content-Type": "application/json",
  //               },
  //             }
  //           );
  //           break;

  //         case "DEBIT_CARD":
  //         case "CREDIT_CARD":
  //           // Fund jar via card (requires additional card details)
  //           fundingResponse = await fastify.axios.post(
  //             `${fastify.config.WISE_API_URL}/v3/profiles/${profileId}/balances/${targetJar.wise_balance_id}/top-ups`,
  //             {
  //               amount: {
  //                 value: amount,
  //                 currency: targetJar.currency,
  //               },
  //               type: sourceType,
  //             },
  //             {
  //               headers: {
  //                 Authorization: `Bearer ${fastify.config.WISE_API_KEY}`,
  //                 "Content-Type": "application/json",
  //               },
  //             }
  //           );
  //           break;

  //         default:
  //           return reply.status(400).send({
  //             success: false,
  //             error: "Invalid source type",
  //           });
  //       }

  //       const funding = fundingResponse.data;

  //       // Store funding transaction record
  //       const fundingData = {
  //         uuid: uuidv4(),
  //         wise_funding_id: funding.id,
  //         jar_id: jarId,
  //         profile_id: profileId,
  //         amount: amount,
  //         currency: targetJar.currency,
  //         source_type: sourceType,
  //         status: funding.status,
  //         created_at: moment().toISOString(),
  //         modified_at: moment().toISOString(),
  //       };

  //       // Store funding record (uncomment if you have a jar_fundings table)
  //       // await fastify.prisma.jar_fundings.create({
  //       //   data: fundingData
  //       // });

  //       // Update jar balance (optional - you might want to sync instead)
  //       if (funding.status === "COMPLETED") {
  //         await fastify.prisma.wise_jars.update({
  //           where: { uuid: jarId },
  //           data: {
  //             amount: targetJar.amount + amount,
  //             available_amount: targetJar.available_amount + amount,
  //             modified_at: moment().toISOString(),
  //           },
  //         });
  //       }

  //       reply.send({
  //         success: true,
  //         message: "Jar funded successfully",
  //         data: {
  //           fundingId: funding.id,
  //           jarId: jarId,
  //           jarCurrency: targetJar.currency,
  //           amount: amount,
  //           sourceType: sourceType,
  //           status: funding.status,
  //           estimatedCompletion: funding.estimatedCompletion || "Immediate",
  //         },
  //       });
  //     } catch (error) {
  //       console.error("Fund jar error:", error.response?.data || error.message);
  //       reply.status(500).send({
  //         success: false,
  //         error:
  //           error.response?.data?.errors ||
  //           error.message ||
  //           "Failed to fund jar",
  //       });
  //     } finally {
  //       await fastify.prisma.$disconnect();
  //     }
  //   }
  // );

  // // NEW: Get available funding sources for a jar
  // fastify.get(
  //   "/funding-sources/:jarId",
  //   {
  //     schema: {
  //       tags: ["Wise"],
  //       params: {
  //         type: "object",
  //         required: ["jarId"],
  //         properties: {
  //           jarId: {
  //             type: "string",
  //             description: "Jar UUID",
  //           },
  //         },
  //       },
  //     },
  //   },
  //   async (request, reply) => {
  //     try {
  //       const { jarId } = request.params;

  //       // Get jar from database
  //       const jar = await fastify.prisma.wise_jars.findUnique({
  //         where: { uuid: jarId },
  //       });

  //       if (!jar) {
  //         return reply.status(404).send({
  //           success: false,
  //           error: "Jar not found",
  //         });
  //       }

  //       // Get all balances for the profile (potential source balances)
  //       const balancesResponse = await fastify.axios.get(
  //         `${fastify.config.WISE_API_URL}/v4/profiles/${jar.profile_id}/balances?types=STANDARD`,
  //         {
  //           headers: {
  //             Authorization: `Bearer ${fastify.config.WISE_API_KEY}`,
  //             "Content-Type": "application/json",
  //           },
  //         }
  //       );

  //       const balances = balancesResponse.data;

  //       // Filter out the target jar itself and only show balances with funds
  //       const availableSources = balances
  //         .filter(
  //           (balance) =>
  //             balance.id !== jar.wise_balance_id && balance.amount.value > 0
  //         )
  //         .map((balance) => ({
  //           balanceId: balance.id,
  //           currency: balance.currency,
  //           availableAmount:
  //             balance.amount.value - (balance.reservedAmount?.value || 0),
  //           type: "BALANCE",
  //         }));

  //       // Add other funding methods
  //       const fundingSources = [
  //         ...availableSources,
  //         {
  //           type: "BANK_TRANSFER",
  //           currency: jar.currency,
  //           description: "Fund via bank transfer",
  //         },
  //         {
  //           type: "DEBIT_CARD",
  //           currency: jar.currency,
  //           description: "Fund via debit card",
  //         },
  //         {
  //           type: "CREDIT_CARD",
  //           currency: jar.currency,
  //           description: "Fund via credit card",
  //         },
  //       ];

  //       reply.send({
  //         success: true,
  //         data: {
  //           targetJar: {
  //             id: jarId,
  //             currency: jar.currency,
  //             currentBalance: jar.available_amount,
  //           },
  //           availableSources: fundingSources,
  //         },
  //       });
  //     } catch (error) {
  //       console.error(
  //         "Get funding sources error:",
  //         error.response?.data || error.message
  //       );
  //       reply.status(500).send({
  //         success: false,
  //         error:
  //           error.response?.data?.errors ||
  //           error.message ||
  //           "Failed to get funding sources",
  //       });
  //     } finally {
  //       await fastify.prisma.$disconnect();
  //     }
  //   }
  // );

  // // NEW: Get funding history for a jar
  // fastify.get(
  //   "/jar-funding-history/:jarId",
  //   {
  //     schema: {
  //       tags: ["Wise"],
  //       params: {
  //         type: "object",
  //         required: ["jarId"],
  //         properties: {
  //           jarId: {
  //             type: "string",
  //             description: "Jar UUID",
  //           },
  //         },
  //       },
  //       querystring: {
  //         type: "object",
  //         properties: {
  //           limit: {
  //             type: "number",
  //             default: 10,
  //             description: "Number of records to return",
  //           },
  //           offset: {
  //             type: "number",
  //             default: 0,
  //             description: "Number of records to skip",
  //           },
  //         },
  //       },
  //     },
  //   },
  //   async (request, reply) => {
  //     try {
  //       const { jarId } = request.params;
  //       const { limit = 10, offset = 0 } = request.query;

  //       // Get jar from database
  //       const jar = await fastify.prisma.wise_jars.findUnique({
  //         where: { uuid: jarId },
  //       });

  //       if (!jar) {
  //         return reply.status(404).send({
  //           success: false,
  //           error: "Jar not found",
  //         });
  //       }

  //       // Get funding history from Wise API
  //       const historyResponse = await fastify.axios.get(
  //         `${fastify.config.WISE_API_URL}/v4/profiles/${
  //           jar.profile_id
  //         }/balances/${jar.wise_balance_id}/statement?intervalStart=${moment()
  //           .subtract(30, "days")
  //           .toISOString()}&intervalEnd=${moment().toISOString()}`,
  //         {
  //           headers: {
  //             Authorization: `Bearer ${fastify.config.WISE_API_KEY}`,
  //             "Content-Type": "application/json",
  //           },
  //         }
  //       );

  //       const transactions = historyResponse.data.transactions || [];

  //       // Filter for funding transactions (credits to the jar)
  //       const fundingTransactions = transactions
  //         .filter(
  //           (tx) => tx.type === "CREDIT" || tx.type === "CONVERSION_CREDIT"
  //         )
  //         .slice(offset, offset + limit)
  //         .map((tx) => ({
  //           id: tx.referenceNumber,
  //           amount: tx.amount.value,
  //           currency: tx.amount.currency,
  //           type: tx.type,
  //           description: tx.description,
  //           date: tx.date,
  //           status: "COMPLETED",
  //         }));

  //       reply.send({
  //         success: true,
  //         data: {
  //           jarId: jarId,
  //           jarCurrency: jar.currency,
  //           fundingHistory: fundingTransactions,
  //           pagination: {
  //             limit: limit,
  //             offset: offset,
  //             total: fundingTransactions.length,
  //           },
  //         },
  //       });
  //     } catch (error) {
  //       console.error(
  //         "Get jar funding history error:",
  //         error.response?.data || error.message
  //       );
  //       reply.status(500).send({
  //         success: false,
  //         error:
  //           error.response?.data?.errors ||
  //           error.message ||
  //           "Failed to get jar funding history",
  //       });
  //     } finally {
  //       await fastify.prisma.$disconnect();
  //     }
  //   }
  // );
};
