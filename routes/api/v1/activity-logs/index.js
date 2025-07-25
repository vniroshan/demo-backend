"use strict";

const moment = require("moment");

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
          id: 17,
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
            { model: { contains: search , mode: "insensitive", } },
            { action: { contains: search, mode: "insensitive", } },
            { description: { contains: search, mode: "insensitive", } },
          ],
        };
        const items = await fastify.prisma.activity_logs.findMany({
          where: where,
          skip: skip,
          take: limit,
          orderBy: {
            created_at: "desc",
          },
          select: {
            id: true,
            uuid: true,
            model: true,
            action: true,
            description: true,
            created_at: true,
            users: {
              select: {
                uuid: true,
                admins: {
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
            },
          },
        });
        const totalCount = await fastify.prisma.activity_logs.count({
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
          id: 17,
          name: "Read",
        });
        //  check access end
        const item = await fastify.prisma.activity_logs.findUnique({
          where: {
            uuid: request.params.uuid,
          },
          select: {
            id: true,
            uuid: true,
            model: true,
            action: true,
            description: true,
            created_at: true,
            users: {
              select: {
                uuid: true,
                admins: {
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
            },
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
          id: 18,
          name: "Delete",
        });
        //  check access end
        const item = await fastify.prisma.activity_logs.update({
          where: {
            uuid: request.body.uuid,
          },
          data: {
            deleted_at: moment().toISOString(),
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
};
