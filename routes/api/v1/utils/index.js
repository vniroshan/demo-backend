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
          id: 46,
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
            { key: { contains: search, mode: "insensitive" } },
            { country_code: { contains: search, mode: "insensitive" } },
          ],
        };
        const items = await fastify.prisma.utils.findMany({
          where: where,
          skip: skip,
          take: limit,
          orderBy: {
            key: "asc",
          },
          select: {
            id: true,
            uuid: true,
            key: true,
            value: true,
            country_code: true,
          },
        });
        const totalCount = await fastify.prisma.utils.count({
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
          required: ["value", "key", "country_code"],
          properties: {
            value: {
              type: "number",
            },
            key: {
              type: "string",
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
          id: 45,
          name: "Create",
        });
        //  check access end
        const itemOld = await fastify.prisma.utils.findUnique({
          where: {
            key_country_code: {
              key: request.body.key,
              country_code: request.body.country_code,
            },
          },
        });
        if (itemOld) {
          throw new Error("The util alredy in our system.");
        }

        const item = await fastify.prisma.utils.create({
          data: {
            uuid: uuidv4(),
            key: request.body.key,
            value: request.body.value,
            country_code: request.body.country_code,
            created_at: moment().toISOString(),
            modified_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Create a new util "${item.key} - ${item.country_code}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Create",
          "utils",
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
          id: 46,
          name: "Read",
        });
        //  check access end
        const item = await fastify.prisma.utils.findUnique({
          where: {
            uuid: request.params.uuid,
          },
          select: {
            id: true,
            uuid: true,
            key: true,
            value: true,
            country_code: true,
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
          required: ["uuid", "value"],
          properties: {
            uuid: {
              type: "string",
            },
            value: {
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
          id: 47,
          name: "Update",
        });
        //  check access end

        const item = await fastify.prisma.utils.update({
          where:{
            uuid: request.body.uuid
          },
          data: {
            value: request.body.value,
            modified_at: moment().toISOString(),
          },
        });
        reply.send(item);
        let message = `Update util "${item.key} - ${item.country_code}"`;
        await fastify.activityLogger.logAction(
          request.user.uuid,
          "Edit",
          "utils",
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
