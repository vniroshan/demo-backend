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
        params: {
          type: "object",
          properties: {
            technician_uuid: {
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
          id: 20,
          name: "Read",
        });
        //  check access end

        const page = request.query.page;
        const limit = request.query.limit;
        const search = request.query.search;
        const skip = (page - 1) * limit;
        var where = {
          deleted_at: null,
          technician_uuid: request.params.technician_uuid,
          OR: [
            {
              products: {
                name: { contains: search, mode: "insensitive" },
              },
            },
          ],
        };

        const items = await fastify.prisma.technician_products.findMany({
          where: where,
          skip: skip,
          take: limit,
          orderBy: {
            id: "desc",
          },
          select: {
            id: true,
            uuid: true,
            price: true,
            currency: true,
            products: {
              select: {
                id: true,
                uuid: true,
                name: true,
              },
            },
          },
        });
        const totalCount = await fastify.prisma.technician_products.count({
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
    "/manage",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            technician_uuid: {
              type: "string",
              default: "",
            },
          },
        },
        body: {
          type: "object",
          required: ["products"],
          properties: {
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
          id: 1,
          name: "Create",
        });
        let orderProducts = {};
        let technician = await fastify.prisma.technicians.findUnique({
          where: {
            uuid: request.params.technician_uuid,
          },
          select:{
            countries : true
          }
        });
        if (request.body.products && request.body.products.length > 0) {
          orderProducts = request.body.products.map((product) => ({
            uuid: uuidv4(),
            technician_uuid: request.params.technician_uuid,
            product_uuid: product.uuid,
            price: product.price,
            is_inventory: product.is_inventory,
            stock: product.stock,
            currency: technician.countries.currency,
            created_at: moment().toISOString(),
            modified_at: moment().toISOString(),
          }));

          await fastify.prisma.technician_products.createMany({
            data: orderProducts,
          });
        }

        reply.send(orderProducts);
      } catch (error) {
        reply.send(error);
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
