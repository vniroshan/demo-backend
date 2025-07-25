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
          id: 31,
          name: "Read",
        });
        //  check access end

        const page = request.query.page;
        const limit = request.query.limit;
        const search = request.query.search;
        const skip = (page - 1) * limit;
        var where = {
          deleted_at: null,
          technician_uuid: request.user.technician_uuid,
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
            technicians: {
              select: {
                id: true,
                uuid: true,
                countries: {
                  select: {
                    currency: true,
                  },
                },
              },
            },
            price: true,
            status: true,
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
          id: 31,
          name: "Read",
        });
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
        reply.send(item );
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.post(
    "/new",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["order_uuid", "total_price", "products", "invoice_link"],
          properties: {
            order_uuid: {
              type: "string",
            },
            invoice_link: {
              type: "string",
            },
            total_price: {
              type: "number",
            },
            products: {
              type: "array",
            },
            description: {
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
          id: 30,
          name: "Create",
        });

        //  check access end
        const itemOld = await fastify.prisma.technician_invoices.findFirst({
          where: {
            technician_order_uuid: request.body.order_uuid,
            deleted_at: null,
            status: { not: "rejected" },
          },
        });
        if (itemOld) {
          throw new Error("The invoice alredy in our system.");
        }

        let technician_order =
          await fastify.prisma.technician_orders.findUnique({
            where: {
              uuid: request.body.order_uuid,
            },
          });

        let technician = await fastify.prisma.technicians.findUnique({
          where: {
            uuid: request.user.technician_uuid,
          },
        });

        // Get deal products for comparison
        const dealProducts = await fastify.prisma.deal_products.findMany({
          where: {
            deals: {
              name: technician_order.name,
            },
          },
          select: {
            product_uuid: true,
            quantity: true,
          },
        });

        // Check if invoice products match deal products
        let invoiceStatus = "pending"; // default status

        if (
          request.body.products &&
          request.body.products.length > 0 &&
          dealProducts.length > 0
        ) {
          const isMatched = checkProductsMatch(
            request.body.products,
            dealProducts
          );
          if (isMatched) {
            invoiceStatus = "approved";
            await fastify.tiggerSecondInvoice(technician_order.deal_uuid);
          }
        }
        await fastify.prisma.technician_orders.update({
          where: {
            uuid: technician_order.uuid,
          },
          data: {
            status: "converted",
            modified_at: moment().toISOString(),
          },
        });
        const item = await fastify.prisma.technician_invoices.create({
          data: {
            uuid: uuidv4(),
            technician_order_uuid: request.body.order_uuid,
            price: request.body.total_price,
            technician_uuid: request.user.technician_uuid,
            status: invoiceStatus,
            invoice_link: request.body.invoice_link,
            description: request.body.description || null,
            created_at: moment().toISOString(),
            modified_at: moment().toISOString(),
          },
        });

        if (request.body.products && request.body.products.length > 0) {
          const orderProducts = request.body.products.map((product) => ({
            uuid: uuidv4(),
            technician_invoice_uuid: item.uuid,
            product_uuid: product.uuid,
            quantity: product.quantity,
            price: product.price,
            created_at: moment().toISOString(),
            modified_at: moment().toISOString(),
          }));

          await fastify.prisma.technician_invoice_products.createMany({
            data: orderProducts,
          });
        }
        await fastify.email.sendInvoice(fastify, {
          user_uuid: request.user.uuid,
          email: "logan@tapestodigital.com.au",
          title: `Invoice #${technician_order.name}`,
          technician_name: technician.name,
          order_name: technician_order.name,
          invoiceLink: request.body.invoice_link,
        });
        reply.send(item);
        let message = `Create a new invoice "${item.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Create",
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
    "/delete",
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
          id: 30,
          name: "Delete",
        });

      let item =  await fastify.prisma.technician_invoices.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            deleted_at: moment().toISOString(),
            modified_at: moment().toISOString(),
          },
        });

        reply.send(item);
        let message = `Delete invoice "${item.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Delete",
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

  // Helper function to check if products match
  function checkProductsMatch(invoiceProducts, dealProducts) {
    // Create a map of deal products for easier lookup
    const dealProductMap = new Map();
    dealProducts.forEach((dealProduct) => {
      dealProductMap.set(dealProduct.product_uuid, dealProduct.quantity);
    });

    // Check if all invoice products match deal products with same quantities
    for (const invoiceProduct of invoiceProducts) {
      const dealQuantity = dealProductMap.get(invoiceProduct.uuid);

      // If product doesn't exist in deal or quantities don't match
      if (!dealQuantity || dealQuantity !== invoiceProduct.quantity) {
        return false;
      }
    }

    // Check if invoice has same number of products as deal
    return invoiceProducts.length === dealProducts.length;
  }
};
