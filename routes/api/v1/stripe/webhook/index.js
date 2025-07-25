"use strict";
const moment = require("moment");
const _ = require("lodash");
const { v4: uuidv4 } = require("uuid");

module.exports = async function (fastify, opts) {
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    function (request, body, done) {
      done(null, Buffer.from(body, "utf8"));
    }
  );

  fastify.post(
    "/:country_code",
    {
      schema: {
        tags: ["Stripe"],
        params: {
          type: "object",
          properties: {
            country_code: {
              type: "string",
              default: "AU",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { country_code } = request.params;
        const secretKeyName = `STRIPE_SECRET_KEY_${country_code.toUpperCase()}`;
        const secretKey = fastify.config[secretKeyName];

        const webhookKeyName = `STRIPE_WEBHOOK_SECRET_${country_code.toUpperCase()}`;
        const webhookKey = fastify.config[webhookKeyName];

        const stripe = require("stripe")(secretKey);
        const sig = request.headers["stripe-signature"];

        const rawBody = request.body;
        let event;
        try {
          event = stripe.webhooks.constructEvent(rawBody, sig, webhookKey);
        } catch (err) {
          console.error("Webhook signature verification failed.", err.message);
          reply.status(400).send(`Webhook Error: ${err.message}`);
          return;
        }

        // Handle the event
        if (event.type === "invoice.payment_succeeded") {
          const session = event.data.object;
          console.log(session);
          const deal_id = session.metadata.deal_id;
          let deal = await fastify.prisma.deals.findUnique({
            where: {
              hubspot_id: deal_id,
            },
          });
          if (!deal) {
            const res = await fastify.axios
              .post(`${fastify.config.APP_URL}/api/v1/hubspot/deal/new`, {
                dealId: deal_id,
              })
              .catch((e) => {
                console.log(e);
              });
            deal = await fastify.prisma.deals.findUnique({
              where: {
                hubspot_id: deal_id,
              },
            });
            console.log(res);
          }
          let payment = await fastify.prisma.stripe_transactions.create({
            data: {
              uuid: uuidv4(),
              technician_uuid: deal.technician_uuid,
              deal_uuid: deal.uuid,
              stripe_invoice_id: session.id,
              total_amount: session.total / 100,
              paid_amount: session.amount_paid / 100,
              total_amount_excluding_tax: session.subtotal_excluding_tax,
              currency: session.currency.toUpperCase(),
              status: "paid",
              created_at: moment().toISOString(),
              modified_at: moment().toISOString(),
            },
          });
        } else if (event.type === "payout.paid") {
          let payout = await fastify.prisma.stripe_payouts.create({
            data: {
              uuid: uuidv4(),
              stripe_payout_id: session.id,
              total_amount: session.amount / 100,
              paid_amount: session.amount_paid / 100,
              country_code: country_code,
              currency: session.currency.toUpperCase(),
              status: "paid",
              created_at: moment().toISOString(),
              modified_at: moment().toISOString(),
            },
          });
        }

        reply.send({ received: true });
      } catch (error) {
        console.error("Webhook error:", error);
        reply.status(500).send({ error: error.message });
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
