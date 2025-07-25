"use strict";

const fp = require("fastify-plugin");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");

module.exports = fp(async function (fastify, opts) {
  fastify.decorate("paySalary", async function (invoiceUuid) {
    try {
      const invoice = await fastify.prisma.technician_invoices.findUnique({
        where: {
          uuid: invoiceUuid,
        },
        include: {
          technician_orders: {
            include: {
              deals: true,
            },
          },
        },
      });
      if (invoice.status == "paid") {
        throw new Error("The invoice alredy paid.");
      }
      const dealData = invoice.technician_orders.deals;
      const amount = await fastify.prisma.utils.findFirst({
        where: {
          key: "TECHNICIAN_SALARY",
          country_code: dealData.country_code,
        },
      });
      const salary = invoice.price;
      let payment = await fastify.sendMoneyToTechnician(
        itemOld.technician_uuid,
        salary,
        "Salary"
      );
      const item = await fastify.prisma.technician_invoices.update({
        where: {
          uuid: request.body.uuid,
        },
        data: {
          status: "paid",
          modified_at: moment().toISOString(),
        },
      });
        const technician_payment = await fastify.prisma.technician_payments.create({
        where: {
          uuid: request.body.uuid,
        },
        data: {
          uuid: uuidv4(),
          status: "paid",
          technician_uuid: itemOld.technician_uuid,
          technician_order_uuid: invoice.technician_order_uuid,
          technician_invoice_uuid: invoice.uuid,
          invoice_amount: invoice.deals.price,
          paid_amount:invoice.price,
          salary_percent: amount.value,
          created_at:moment().toISOString(),
          modified_at: moment().toISOString(),
        },
      });

      return {
        success: true,
        message: `Invoice paid`,
        response: item,
      };
    } catch (error) {
      console.log("Error in tiggerSecondInvoice:", error);
      throw error;
    } finally {
      await fastify.prisma.$disconnect();
    }
  });
});
