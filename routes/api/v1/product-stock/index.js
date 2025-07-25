"use strict";

const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

module.exports = async function (fastify, opts) {
  fastify.get(
    "/:technician_uuid",
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
          id: 61,
          name: "Read",
        });
        //  check access end

        const page = request.query.page;
        const limit = request.query.limit;
        const search = request.query.search;
        const skip = (page - 1) * limit;
        var where = {
          deleted_at: null,
          is_inventory: true,
          technician_uuid: request.params.technician_uuid,
          OR: [
            { products: { name: { contains: search, mode: "insensitive" } } },
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
            stock: true,
            is_inventory: true,
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
        body: {
          type: "object",
          required: ["products", "technician_uuid"],
          properties: {
            technician_uuid: {
              type: "string",
            },
            products: {
              type: "array",
              items: {
                type: "object",
                required: ["uuid", "stock"],
                properties: {
                  uuid: {
                    type: "string",
                  },
                  stock: {
                    type: "number",
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // check access start
        await fastify.access.isAuth(request, {
          id: 62,
          name: "Manage",
        });

        const { products, technician_uuid } = request.body;
        let updatedProducts = [];

        if (products && products.length > 0) {
          // Update each technician product individually
          for (const product of products) {
            const updatedProduct =
              await fastify.prisma.technician_products.update({
                where: {
                  uuid: product.uuid, // This is the technician_products UUID
                },
                data: {
                  stock: product.stock,
                  modified_at: moment().toISOString(),
                },
              });
            updatedProducts.push(updatedProduct);
          }
        }

        reply.send({
          success: true,
          updated_products: updatedProducts,
          count: updatedProducts.length,
        });
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({
          success: false,
          error: error.message || "Internal server error",
        });
      } finally {
        await fastify.prisma.$disconnect();
      }
    }
  );
};
