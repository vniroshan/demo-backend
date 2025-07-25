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
          id: 23,
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
            { name: { contains: search, mode: "insensitive", } },
            { country_code: { contains: search, mode: "insensitive", } },
          ],
        };
        const items = await fastify.prisma.products.findMany({
          where: where,
          skip: skip,
          take: limit,
          orderBy: {
            sort: "desc",
          },
          select: {
            id: true,
            uuid: true,
            name: true,
            sort: true,
            price: true,
            country_code: true,
          },
        });
        const totalCount = await fastify.prisma.products.count({
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
    "/edit",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["uuid", "name", "sort", "price", "country_code"],
          properties: {
            uuid: {
              type: "string",
            },
            name: {
              type: "string",
            },
            sort: {
              type: "number",
            },
            price: {
              type: "number",
            },
            country_code: {
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
          id: 24,
          name: "Update",
        });
        //  check access end

        const item = await fastify.prisma.products.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            name: request.body.name,
            sort: request.body.sort,
            price: request.body.price,
            country_code: request.body.country_code,
            modified_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Update product "${item.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Edit",
          "products",
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
          id: 23,
          name: "Read",
        });
        //  check access end
        const item = await fastify.prisma.products.findUnique({
          where: {
            uuid: request.params.uuid,
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
    "/delete",
    {
      schema: {
        tags: ["Main"],
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
          id: 25,
          name: "Delete",
        });
        //  check access end
        const item = await fastify.prisma.products.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            deleted_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Delete product "${item.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Delete",
          "products",
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
