"use strict";

const moment = require("moment");
const { v4: uuidv4 } = require("uuid");
const _ = require("lodash");

module.exports = async function (fastify, opts) {
  fastify.get(
    "",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        query: {
          type: "object",
          properties: {
            page: {
              type: "integer",
              default: 1,
            },
            limit: {
              type: "integer",
              default: 10,
            },
            search: {
              type: "string",
              default: "",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 34,
          name: "Read",
        });
        //  check access end

        const page = request.query.page;
        const limit = request.query.limit;
        const search = request.query.search;
        const skip = (page - 1) * limit;
        var where = {
          deleted_at: null,
          OR: [
            {
              technician_orders: {
                name: { contains: search, mode: "insensitive" },
              },
            },
          ],
        };
        const items = await fastify.prisma.technician_invoices.findMany({
          where: where,
          skip: skip,
          take: limit,
          orderBy: {
            id: "desc",
          },
          select: {
            id: true,
            uuid: true,
            technician_orders: {
              select: {
                id: true,
                uuid: true,
                name: true,
              },
            },
            price: true,
            status: true,
            technicians: {
              select: {
                id: true,
                uuid: true,
                name: true,
                countries: {
                  select: {
                    currency: true,
                  },
                },
              },
            },
          },
        });
        const modifiedItems = items.map((item) => {
          const currency = _.get(item, "technicians.countries.currency", null);
          return {
            ...item,
            currency, 
          };
        });
        const totalCount = await fastify.prisma.technician_invoices.count({
          where: where,
        });

        const totalPages = Math.ceil(totalCount / limit);

        var res = {};
        res.page = page;
        res.limit = limit;
        res.totalPages = totalPages;
        res.totalCount = totalCount;
        res.data = modifiedItems;
        reply.send(res);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.get(
    "/:uuid",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: {
              type: "string",
              default: "",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 34,
          name: "Read",
        });
        //  check access end
        const item = await fastify.prisma.technician_invoices.findUnique({
          where: {
            uuid: request.params.uuid,
          },
          select: {
            id: true,
            uuid: true,
            technician_orders: {
              select: {
                id: true,
                uuid: true,
                name: true,
              },
            },
            technician_invoice_products: {
              select: {
                id: true,
                uuid: true,
                quantity: true,
                price: true,
                products: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            price: true,
            status: true,
            created_at: true,
            modified_at: true,
            technicians: {
              select: {
                id: true,
                uuid: true,
                name: true,
                countries: {
                  select: {
                    currency: true,
                  },
                },
              },
            },
          },
        });

        item.currency = item.technicians.countries.currency
        let deal = await fastify.prisma.deals.findUnique({
          where: {
            name: item.technician_orders.name,
          },
          select: {
            id: true,
            uuid: true,
            name: true,
            currency: true,
            deal_products: {
              select: {
                id: true,
                uuid: true,
                quantity: true,
                price: true,
                currency: true,
                products: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });
        reply.send({ invoice: item, deal: deal });
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.post(
    "/reject",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["uuid"],
          properties: {
            uuid: {
              type: "string",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 36,
          name: "Reject",
        });
        //  check access end
        const item = await fastify.prisma.technician_invoices.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            status: "rejected",
            modified_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Rejected invoice "${item.id}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Reject",
          "technician_invoices",
          item.id,
          message
        );
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.post(
    "/approve-old",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["uuid"],
          properties: {
            uuid: {
              type: "string",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 35,
          name: "Approve",
        });
        //  check access end

        // Get the invoice with related order and technician info
        const invoice = await fastify.prisma.technician_invoices.findUnique({
          where: {
            uuid: request.body.uuid,
          },
          select: {
            id: true,
            technician_uuid: true,
            technician_orders: {
              select: {
                id: true,
                uuid: true,
                name: true,
              },
            },
          },
        });

        if (!invoice) {
          throw new Error("Invoice not found");
        }

        // Get all products from the technician order
        const orderProducts =
          await fastify.prisma.technician_order_products.findMany({
            where: {
              technician_order_uuid: invoice.technician_orders.uuid,
              deleted_at: null,
            },
            select: {
              product_uuid: true,
              quantity: true,
            },
          });

        // Update stock for each product used in the order
        for (const orderProduct of orderProducts) {
          // Find the technician's product inventory
          const technicianProduct =
            await fastify.prisma.technician_products.findFirst({
              where: {
                technician_uuid: invoice.technician_uuid,
                product_uuid: orderProduct.product_uuid,
                deleted_at: null,
              },
            });

          if (technicianProduct) {
            // Check if there's enough stock
            if (technicianProduct.stock < orderProduct.quantity) {
              throw new Error(
                `Insufficient stock for product ${orderProduct.product_uuid}. Available: ${technicianProduct.stock}, Required: ${orderProduct.quantity}`
              );
            }

            // Reduce the stock
            await fastify.prisma.technician_products.update({
              where: {
                uuid: technicianProduct.uuid,
              },
              data: {
                stock: technicianProduct.stock - orderProduct.quantity,
                modified_at: moment().toISOString(),
              },
            });
          } else {
            // Log warning if technician doesn't have this product in inventory
            console.warn(
              `Technician ${invoice.technician_uuid} doesn't have product ${orderProduct.product_uuid} in inventory`
            );
          }
        }

        // Update the invoice status
        const item = await fastify.prisma.technician_invoices.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            status: "approved",
            modified_at: moment().toISOString(),
          },
          select: {
            id: true,
            technician_orders: true,
          },
        });

        const deal = await fastify.prisma.deals.findFirst({
          where: {
            name: item.technician_orders.name,
          },
        });

        if (deal) {
          await fastify.tiggerSecondInvoice(deal.uuid);
        }

        reply.send(item);

        let message = `Approved invoice "${item.id}" and reduced stock for ${orderProducts.length} products`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Approve",
          "technician_invoices",
          item.id,
          message
        );
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.post(
    "/approve",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["uuid", "products", "total_price"],
          properties: {
            uuid: {
              type: "string",
            },
            products: {
              type: "array",
            },
            total_price: {
              type: "number",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 35,
          name: "Approve",
        });
        //  check access end

        const item = await fastify.prisma.technician_invoices.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            status: "approved",
            modified_at: moment().toISOString(),
          },
          select: {
            technician_orders: true,
          },
        });

        const deal = await fastify.prisma.deals.findFirst({
          where: {
            name: item.technician_orders.name,
          },
        });

        const order = await fastify.prisma.technician_orders.findFirst({
          where: {
            deal_uuid: deal.uuid,
          },
        });
        await fastify.prisma.technician_orders.update({
          where: {
            uuid: order.uuid,
          },
          data: {
            status: "completed",
            modified_at: moment().toISOString(),
          },
        });
        // await fastify.axios.patch(
        //   `${fastify.config.HUBSPOT_API_URL}/crm/v3/objects/deals/${deal.hubspot_id}`,
        //   {
        //     properties: {
        //       amount: request.body.total_price.toString(),
        //     },
        //   },
        //   {
        //     headers: {
        //       Authorization: `Bearer ${fastify.config.HUBSPOT_APP_TOKEN}`,
        //     },
        //   }
        // );

        if (!deal) {
          throw new Error("Deal not found");
        }

        // Process products array
        for (const product of request.body.products) {
          // Check if product already exists in deal_products
          const existingDealProduct =
            await fastify.prisma.deal_products.findFirst({
              where: {
                deal_uuid: deal.uuid,
                product_uuid: product.uuid,
                deleted_at: null,
              },
            });

          if (existingDealProduct) {
            // Update existing product
            await fastify.prisma.deal_products.update({
              where: {
                uuid: existingDealProduct.uuid,
              },
              data: {
                quantity: product.quantity,
                price: product.price,
                modified_at: moment().toISOString(),
              },
            });
          } else {
            let orProduct = await fastify.prisma.products.findUnique({
              where: {
                uuid: product.uuid,
              },
            });
            // STEP 2: Create HubSpot Line Item
            // const lineItemRes = await fastify.axios.post(
            //   `${fastify.config.HUBSPOT_API_URL}/crm/v3/objects/line_items`,
            //   {
            //     properties: {
            //       name: product.name,
            //       quantity: product.quantity.toString(),
            //       price: product.price.toString(),
            //       hs_product_id: orProduct.hubspot_id,
            //     },
            //   },
            //   {
            //     headers: {
            //       Authorization: `Bearer ${fastify.config.HUBSPOT_APP_TOKEN}`,
            //       "Content-Type": "application/json",
            //     },
            //   }
            // );

            // STEP 3: Associate Line Item to Deal
            // const lineItemId = lineItemRes.data.id;
            const lineItemId = uuidv4();
            // await fastify.axios.put(
            //   `${fastify.config.HUBSPOT_API_URL}/crm/v3/objects/line_items/${lineItemId}/associations/deals/${dealId}/line_item_to_deal`,
            //   {},
            //   {
            //     headers: {
            //       Authorization: `Bearer ${fastify.config.HUBSPOT_APP_TOKEN}`,
            //     },
            //   }
            // );
            // Add new product with is_advance = true
            await fastify.prisma.deal_products.create({
              data: {
                uuid: uuidv4(),
                hubspot_id: lineItemId,
                deal_uuid: deal.uuid,
                product_uuid: product.uuid,
                quantity: product.quantity,
                price: product.price,
                currency: deal.currency,
                is_advance: true,
                created_at: moment().toISOString(),
              },
            });
          }
        }

        // Update deal total price
        await fastify.prisma.deals.update({
          where: {
            uuid: deal.uuid,
          },
          data: {
            price: request.body.total_price,
            modified_at: moment().toISOString(),
          },
        });

        await fastify.tiggerSecondInvoice(deal.uuid);
        reply.send(item);

        let message = `Approved invoice "${item.id}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Approve",
          "technician_invoices",
          item.id,
          message
        );
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.post(
    "/pay",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["uuid"],
          properties: {
            uuid: {
              type: "string",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 35,
          name: "Pay",
        });
        const invoice = await fastify.prisma.technician_invoices.findUnique({
          where: {
            uuid: request.body.uuid,
          },
          include: {
            technician_orders: {
              include: {
                deals: true, // This will get the deal associated with the order
              },
            },
          },
        });
        if (invoice.status == "paid") {
          throw new Error("The invoice alredy paid.");
        }
        const dealData = invoice.technician_orders.deals;
        // Calculate salary based on country (you can customize this logic)
        const amount = await fastify.prisma.utils.findFirst({
          where: {
            key: "TECHNICIAN_SALARY",
            country_code: dealData.country_code,
          },
        });
        const salary = (amount.value / 100) * dealData.price;
        let payment = await fastify.sendMoneyToTechnician(
          itemOld.technician_uuid,
          salary,
          "Salary"
        );
        //  check access end
        const item = await fastify.prisma.technician_invoices.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            status: "paid",
            modified_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Pay invoice "${item.id}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Pay",
          "technician_invoices",
          item.id,
          message
        );
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
