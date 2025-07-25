"use strict";

const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

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
          id: 43,
          name: "Read",
        });
        //  check access end

        const page = request.query.page;
        const limit = request.query.limit;
        const search = request.query.search;
        const skip = (page - 1) * limit;
        var where = {
          deleted_at: null,
          OR: [{ name: { contains: search, mode: "insensitive" } }],
        };
        if(request.user.technician_uuid){
          where.technician_uuid = request.user.technician_uuid
        }
        const items = await fastify.prisma.technician_orders.findMany({
          where: where,
          skip: skip,
          take: limit,
          orderBy: {
            id: "desc",
          },
          select: {
            id: true,
            uuid: true,
            name: true,
            status: true,
            product_image_url: true,
            technician_process: {
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
                name: true,
              },
            },
          },
        });
        const totalCount = await fastify.prisma.technician_orders.count({
          where: where,
        });

        const totalPages = Math.ceil(totalCount / limit);

        var res = {};
        res.page = page;
        res.limit = limit;
        res.totalPages = totalPages;
        res.totalCount = totalCount;
        res.data = items;
        reply.send(res);
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
          required: ["deal_uuid", "products"],
          properties: {
            deal_uuid: {
              type: "string",
            },
            order_image: {
              type: "string",
            },
            products: {
              type: "array",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 42,
          name: "Create",
        });
        //  check access end
        const itemOld = await fastify.prisma.technician_orders.findFirst({
          where: {
            deal_uuid: request.body.deal_uuid,
          },
        });

         const deal = await fastify.prisma.deals.findFirst({
          where: {
            uuid: request.body.deal_uuid,
          },
        });
        if (itemOld) {
          throw new Error("The order name alredy in our system.");
        }
         if (!request.user.technician_uuid) {
          throw new Error("The technician account is not found.");
        }
        let technician_process =
          await fastify.prisma.technician_process.findFirst({
            where: {
              deleted_at: null,
            },
          });
        const item = await fastify.prisma.technician_orders.create({
          data: {
            uuid: uuidv4(),
            deal_uuid: request.body.deal_uuid,
            name:deal.name,
            product_image_url: request.body.order_image || null,
            technician_uuid: request.user.technician_uuid,
            technician_process_uuid: technician_process.uuid,
            created_at: moment().toISOString(),
            modified_at: moment().toISOString(),
          },
          include: {
            deals: true,
          },
        });

        if (request.body.products && request.body.products.length > 0) {
          const orderProducts = request.body.products.map((product) => ({
            uuid: uuidv4(),
            technician_order_uuid: item.uuid,
            product_uuid: product.uuid,
            quantity: product.quantity || 1,
            created_at: moment().toISOString(),
            modified_at: moment().toISOString(),
          }));

          await fastify.prisma.technician_order_products.createMany({
            data: orderProducts,
          });
        }

        reply.send(item);
        let message = `Create a new order "${item.deals.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Create",
          "technician_orders",
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
          id: 43,
          name: "Read",
        });
        //  check access end
        const item = await fastify.prisma.technician_orders.findUnique({
          where: {
            uuid: request.params.uuid,
          },
          select: {
            id: true,
            uuid: true,
            name: true,
            product_image_url: true,
            deal_uuid: true,
            status: true,
            technician_process: {
              select: {
                id: true,
                uuid: true,
                name: true,
              },
            },
            created_at: true,
            modified_at: true,
          },
        });
        reply.send(item);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );

  fastify.post(
    "/edit",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["uuid"],
          properties: {
            deal_uuid: {
              type: "string",
            },
            order_image: {
              type: "string",
            },
            products: {
              type: "array",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 44, 
          name: "Update",
        });
        //  check access end

        // Check if the order exists
        const existingOrder = await fastify.prisma.technician_orders.findFirst({
          where: {
            uuid: request.body.uuid,
          },
        });

        if (!existingOrder) {
          throw new Error("Order not found.");
        }

        // Check if user has permission to update this order (optional security check)
        if (existingOrder.technician_uuid !== request.user.technician_uuid) {
          throw new Error("You don't have permission to update this order.");
        }

        // Prepare update data
        const updateData = {
          modified_at: moment().toISOString(),
        };

        // Update deal_uuid if provided
        if (request.body.deal_uuid) {
          // Check if deal_uuid is changing and new deal_uuid doesn't already exist
          if (request.body.deal_uuid !== existingOrder.deal_uuid) {
            const duplicateOrder = await fastify.prisma.technician_orders.findFirst({
              where: {
                deal_uuid: request.body.deal_uuid,
                uuid: {
                  not: request.body.uuid, // Exclude current order
                },
              },
            });

            if (duplicateOrder) {
              throw new Error("The order name already exists in our system.");
            }

            // Get the new deal information
            const deal = await fastify.prisma.deals.findFirst({
              where: {
                uuid: request.body.deal_uuid,
              },
            });

            if (!deal) {
              throw new Error("Deal not found.");
            }

            updateData.deal_uuid = request.body.deal_uuid;
            updateData.name = deal.name;
          }
        }

        // Update order image if provided
        if (request.body.order_image !== undefined) {
          updateData.product_image_url = request.body.order_image;
        }

        // Update the main order
        const updatedOrder = await fastify.prisma.technician_orders.update({
          where: {
            uuid: request.body.uuid,
          },
          data: updateData,
          include: {
            deals: true,
          },
        });

        // Handle products update if provided
        if (request.body.products !== undefined) {
          // Delete existing products
          await fastify.prisma.technician_order_products.deleteMany({
            where: {
              technician_order_uuid: request.body.uuid,
            },
          });

          // Add new products if any
          if (request.body.products.length > 0) {
            const orderProducts = request.body.products.map((product) => ({
              uuid: uuidv4(),
              technician_order_uuid: request.body.uuid,
              product_uuid: product.uuid,
              quantity: product.quantity || 1,
              created_at: moment().toISOString(),
              modified_at: moment().toISOString(),
            }));

            await fastify.prisma.technician_order_products.createMany({
              data: orderProducts,
            });
          }
        }

        reply.send(updatedOrder);
        
        let message = `Updated order "${updatedOrder.deals.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Update",
          "technician_orders",
          updatedOrder.id,
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
