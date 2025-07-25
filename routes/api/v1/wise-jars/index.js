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
          id: 54,
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
        const items = await fastify.prisma.wise_jars.findMany({
          where: where,
          skip: skip,
          take: limit,
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            uuid: true,
            name: true,
            transfer_percent: true,
          },
        });
        const totalCount = await fastify.prisma.wise_jars.count({
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
          id: 54,
          name: "Read",
        });
        //  check access end
        const item = await fastify.prisma.wise_jars.findUnique({
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
    "/edit",
    {
      schema: {
        tags: ["User"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["uuid", "transfer_percent"],
          properties: {
            uuid: {
              type: "string",
            },
            transfer_percent: {
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
          id: 55,
          name: "Update",
        });

        const item = await fastify.prisma.wise_jars.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            transfer_percent: request.body.transfer_percent,
            modified_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Update wise jar "${item.name}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Edit",
          "wise_jars",
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
